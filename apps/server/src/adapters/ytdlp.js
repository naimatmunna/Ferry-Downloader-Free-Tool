/**
 * yt-dlp adapter — every yt-dlp-supported site plus the generic extractor
 * (embedded players, HLS/DASH manifests).
 */
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { AUDIO_FORMATS } from '@ferry/shared/formats';
import { engineEnv, runProcess } from '../engines/process.js';
import { baseArgs, downloadArgs, formatSpec, parseProgressLine, probeArgs, runProbe } from '../engines/ytdlp.js';
import { classifyEngineError, summarizeStderr } from '../engines/classify.js';

/** @param {import('./index.js').AdapterDeps} deps */
export function createYtDlpAdapter(deps) {
  const { config } = deps;

  function base(proxyUrl) {
    return baseArgs({
      proxyUrl,
      cacheDir: path.join(config.cacheDir, 'yt-dlp'),
      jsRuntime: config.engines.jsRuntime,
      excludedExtractors: deps.excludedExtractors(),
    });
  }

  return {
    id: 'yt-dlp',

    supports(platform, detection) {
      if (platform.engine === 'yt-dlp') return true;
      if (platform.id === 'generic') return true;
      return detection?.directExt === 'm3u8' || detection?.directExt === 'mpd';
    },

    async probe({ url, playlist = false, signal, tag }) {
      const cred = deps.egress.issue({ tag: `probe:${tag}`, maxBytes: 128 * 1024 * 1024 });
      const home = await mkdtemp(path.join(config.cacheDir, 'probe-'));
      try {
        return await runProbe({
          bin: deps.engines.ytdlp,
          args: probeArgs({ base: base(cred.url), url, playlist, maxPlaylistItems: config.limits.maxPlaylistItems }),
          cwd: home,
          homeDir: home,
          proxyUrl: cred.url,
          timeoutMs: config.limits.probeTimeoutMs,
          signal,
          maxStdoutBytes: config.limits.maxProbeOutputBytes,
        });
      } catch (err) {
        if (cred.session.blocked.length) throw new FerryError('BLOCKED_DESTINATION', { internal: cred.session.blocked[0].reason });
        throw err;
      } finally {
        cred.revoke();
        await rm(home, { recursive: true, force: true }).catch(() => {});
      }
    },

    /**
     * @param {import('./index.js').DownloadContext} ctx
     */
    async download(ctx) {
      const { job, url, selection, media, jobDir, tmpDir, signal, onProgress, maxBytes } = ctx;
      let limitHit = false;
      const cred = deps.egress.issue({ tag: job.id, maxBytes: Math.round(maxBytes * 1.05) + 8 * 1024 * 1024, onLimit: () => (limitHit = true) });

      const sourceCodec = media?.audio?.best?.codec ?? null;
      const target = selection.mode === 'audio' ? AUDIO_FORMATS[selection.audio?.format]?.codec : null;
      const audioCodecHint = selection.mode === 'audio' && selection.audio?.bitrate === 'source' && target && target === sourceCodec ? target : null;
      const spec = formatSpec({ ...selection, audioCodecHint });
      const subtitles = selection.extras?.subtitles ?? [];
      const includeAutoSubs = subtitles.some((l) => media?.subtitles?.find((s) => s.lang === l)?.auto);
      const args = downloadArgs({
        base: base(cred.url),
        url,
        jobDir,
        tmpDir,
        ffmpegPath: deps.engines.ffmpeg,
        spec,
        maxBytes,
        subtitles,
        includeAutoSubs,
      });

      // Progress across several streams (e.g. video then audio), weighted by
      // the sizes the source reported for the formats yt-dlp picked.
      const formats = media?.raw?.formats ?? [];
      let expected = [];
      let streamIndex = 0;
      let completedBytes = 0;
      const sizeOfId = (id) => {
        const f = formats.find((x) => x.id === id);
        return f ? f.filesize ?? f.filesizeApprox ?? null : null;
      };

      const proc = runProcess(deps.engines.ytdlp, args, {
        cwd: jobDir,
        env: engineEnv({ proxyUrl: cred.url, homeDir: tmpDir }),
        timeoutMs: config.limits.jobTimeoutMs,
        stallTimeoutMs: config.limits.stallTimeoutMs,
        signal,
        onStdoutLine: (line) => {
          const picked = /Downloading \d+ format\(s\): (\S+)/.exec(line);
          if (picked) {
            expected = picked[1].split('+').map(sizeOfId);
            return;
          }
          const p = parseProgressLine(line);
          if (!p) return;
          if (p.type === 'postprocess') {
            onProgress({ phase: 'downloading', stage: 'merging' });
            return;
          }
          if (p.status === 'finished') {
            completedBytes += p.totalBytes ?? p.downloadedBytes ?? 0;
            streamIndex += 1;
            return;
          }
          if (p.status !== 'downloading') return;
          const streams = Math.max(1, expected.length);
          const current = p.totalBytes ?? p.totalEstimate;
          let percent = null;
          let totalBytes = null;
          if (expected.length && expected.every((n) => n != null)) {
            totalBytes = expected.reduce((a, b) => a + b, 0);
            percent = ((completedBytes + (p.downloadedBytes ?? 0)) / totalBytes) * 100;
          } else if (current) {
            const frac = (p.downloadedBytes ?? 0) / current;
            percent = ((Math.min(streamIndex, streams - 1) + frac) / streams) * 100;
            totalBytes = streams === 1 ? current : null;
          } else if (p.fragmentCount) {
            percent = (((p.fragmentIndex ?? 0) / p.fragmentCount + Math.min(streamIndex, streams - 1)) / streams) * 100;
          }
          onProgress({
            phase: 'downloading',
            stage: streams > 1 ? (streamIndex === 0 ? 'video' : 'audio') : null,
            percent: percent != null ? Math.max(0, Math.min(99.5, percent)) : null,
            downloadedBytes: completedBytes + (p.downloadedBytes ?? 0),
            totalBytes,
            totalIsEstimate: p.totalBytes == null && p.totalEstimate != null,
            speedBps: p.speedBps,
            etaSec: streamIndex === streams - 1 || streams === 1 ? p.etaSec : null,
          });
        },
      });

      let result;
      try {
        result = await proc;
      } finally {
        cred.revoke();
      }
      if (result.aborted) throw new FerryError('CANCELLED');
      if (limitHit || cred.session.exceeded) throw new FerryError('FILE_TOO_LARGE', { internal: 'egress byte cap' });
      if (cred.session.blocked.length) throw new FerryError('BLOCKED_DESTINATION', { internal: cred.session.blocked[0].reason });
      if (result.timedOut) throw new FerryError('TIMEOUT', { internal: 'download timeout' });
      if (result.stalled) throw new FerryError('DOWNLOAD_INTERRUPTED', { internal: 'stalled' });
      if (result.code !== 0) throw new FerryError(classifyEngineError(result.stderr, 'DOWNLOAD_INTERRUPTED'), { internal: summarizeStderr(result.stderr) });

      return collectOutputs(jobDir);
    },
  };
}

/** Find the downloaded media file and any subtitle files yt-dlp wrote. */
export async function collectOutputs(jobDir) {
  const names = await readdir(jobDir);
  let srcFile = null;
  let best = -1;
  const subtitles = [];
  for (const name of names) {
    const full = path.join(jobDir, name);
    if (/^sub\.([A-Za-z0-9_-]{1,20})\.(srt|vtt)$/.test(name)) {
      subtitles.push({ path: full, lang: name.split('.')[1] });
      continue;
    }
    if (!name.startsWith('src.') || /\.(part|ytdl|temp|tmp)$/.test(name) || /\.f\d+\./.test(name)) continue;
    const s = await stat(full);
    if (s.isFile() && s.size > best) {
      best = s.size;
      srcFile = full;
    }
  }
  if (!srcFile) throw new FerryError('NO_MEDIA_FOUND', { internal: 'yt-dlp produced no file' });
  return { srcFile, subtitles };
}
