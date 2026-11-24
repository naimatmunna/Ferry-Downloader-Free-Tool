/**
 * yt-dlp wrapper: argument construction (hardened profile), metadata probe,
 * and download with structured progress.
 *
 * Hardening (see SECURITY-AUDIT.md §4): no config files, no plugins, no
 * JavaScript runtime, no header spoofing, no cookies/credentials/exec, all
 * traffic through the egress guard proxy, the URL after `--`.
 */
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { runProcess, engineEnv } from './process.js';
import { classifyEngineError, summarizeStderr } from './classify.js';

/** Protocols whose traffic goes through the HTTP egress proxy. */
export const ALLOWED_PROTOCOL_RE = "^(?:https?|m3u8(?:_native)?|http_dash_segments(?:_generator)?)$";
const PROTO = `[protocol~='${ALLOWED_PROTOCOL_RE}']`;

/**
 * @param {{ proxyUrl: string, cacheDir: string, jsRuntime?: string, excludedExtractors?: string[] }} p
 */
export function baseArgs({ proxyUrl, cacheDir, jsRuntime = 'none', excludedExtractors = [] }) {
  const args = [
    '--ignore-config',
    '--no-plugin-dirs',
    '--no-js-runtimes',
    '--no-remote-components',
    '--no-cookies',
    '--proxy', proxyUrl,
    '--xff', 'never',
    '--socket-timeout', '30',
    '--retries', '3',
    '--fragment-retries', '5',
    '--extractor-retries', '1',
    '--color', 'never',
    '--cache-dir', cacheDir,
    '--no-mtime',
    '--encoding', 'utf-8',
  ];
  if (jsRuntime && jsRuntime !== 'none') args.push('--js-runtimes', jsRuntime);
  if (excludedExtractors.length) {
    // Never run extractors for platforms whose policy forbids it (e.g. an embedded YouTube player).
    args.push('--use-extractors', ['default', ...excludedExtractors.map((e) => `-${e}`)].join(','));
  }
  return args;
}

function assertSafeUrl(url) {
  const u = new URL(url); // throws on garbage
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new FerryError('INVALID_URL');
  return u.href;
}

/**
 * @param {{ base: string[], url: string, playlist?: boolean, maxPlaylistItems?: number }} p
 */
export function probeArgs({ base, url, playlist = false, maxPlaylistItems = 50 }) {
  const args = [...base, '--dump-single-json', '--skip-download', '--no-write-comments'];
  if (playlist) args.push('--yes-playlist', '--flat-playlist', '--playlist-items', `1:${maxPlaylistItems}`);
  else args.push('--no-playlist');
  return [...args, '--', assertSafeUrl(url)];
}

/**
 * Translate the user's intent into a yt-dlp format selector + sort order.
 * Formats are resolved by yt-dlp at download time (robust to formats that
 * change between probe and download); the finalizer then works from facts.
 * @param {{ mode: 'av'|'video'|'audio', video?: { container: string, quality: 'best'|number }, audio?: { format: string, bitrate: 'source'|number, language?: string|null }, audioCodecHint?: string|null }} sel
 */
export function formatSpec(sel) {
  const sort = [];
  const res = sel.video && sel.video.quality !== 'best' ? Number(sel.video.quality) : null;
  if (sel.mode !== 'audio' && res) sort.push(`res:${res}`);
  const container = sel.video?.container;
  if (sel.mode !== 'audio') {
    if (container === 'mp4' || container === 'mov' || container === 'avi') sort.push('vcodec:h264');
    else if (container === 'webm') sort.push('vcodec:vp9');
  }
  if (sel.mode === 'av') {
    if (container === 'webm') sort.push('acodec:opus');
    else if (container === 'mp4' || container === 'mov') sort.push('acodec:aac');
  }
  if (sel.mode === 'audio' && sel.audioCodecHint) sort.push(`acodec:${sel.audioCodecHint}`);

  const lang = sel.audio?.language && /^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/.test(sel.audio.language) ? `[language=${sel.audio.language}]` : '';
  let format;
  if (sel.mode === 'av') {
    format = lang
      ? `bv*${PROTO}+ba${lang}${PROTO}/bv*${PROTO}+ba${PROTO}/b${PROTO}`
      : `bv*${PROTO}+ba${PROTO}/b${PROTO}`;
  } else if (sel.mode === 'video') {
    format = `bv${PROTO}/bv*${PROTO}/b${PROTO}`;
  } else {
    format = lang ? `ba${lang}${PROTO}/ba${PROTO}/b${PROTO}` : `ba${PROTO}/b${PROTO}`;
  }

  let merge = null;
  if (sel.mode === 'av') merge = container === 'mkv' || container === 'avi' ? 'mkv' : `${container}/mkv`;
  return { format, sort: sort.join(','), merge };
}

/**
 * @param {{ base: string[], url: string, jobDir: string, tmpDir: string, ffmpegPath: string, spec: ReturnType<typeof formatSpec>,
 *   maxBytes: number, subtitles?: string[], includeAutoSubs?: boolean }} p
 */
export function downloadArgs({ base, url, jobDir, tmpDir, ffmpegPath, spec, maxBytes, subtitles = [], includeAutoSubs = false }) {
  const args = [
    ...base,
    '--no-playlist',
    '-f', spec.format,
    ...(spec.sort ? ['-S', spec.sort] : []),
    ...(spec.merge ? ['--merge-output-format', spec.merge] : []),
    '--paths', `home:${jobDir}`,
    '--paths', `temp:${tmpDir}`,
    '-o', 'src.%(ext)s',
    '-o', 'subtitle:sub.%(ext)s',
    '--max-filesize', String(maxBytes),
    '--downloader', 'native',
    '--ffmpeg-location', ffmpegPath,
    '--concurrent-fragments', '3',
    '--continue',
    '--newline',
    '--progress-delta', '0.5',
    '--progress-template', 'download:FERRY_DL %(progress)j',
    '--progress-template', 'postprocess:FERRY_PP %(progress)j',
  ];
  const langs = subtitles.filter((l) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/.test(l));
  if (langs.length) {
    args.push('--write-subs', '--sub-langs', langs.join(','), '--sub-format', 'vtt/srt/best', '--convert-subs', 'srt');
    if (includeAutoSubs) args.push('--write-auto-subs');
  }
  return [...args, '--', assertSafeUrl(url)];
}

/** Parse one stdout line from a download run. */
export function parseProgressLine(line) {
  if (line.startsWith('FERRY_DL ')) {
    try {
      const p = JSON.parse(line.slice(9));
      return {
        type: 'download',
        status: p.status ?? null,
        downloadedBytes: num(p.downloaded_bytes),
        totalBytes: num(p.total_bytes),
        totalEstimate: num(p.total_bytes_estimate),
        speedBps: num(p.speed),
        etaSec: num(p.eta),
        fragmentIndex: num(p.fragment_index),
        fragmentCount: num(p.fragment_count),
        file: typeof p.filename === 'string' ? path.basename(p.filename) : null,
      };
    } catch {
      return null;
    }
  }
  if (line.startsWith('FERRY_PP ')) {
    try {
      const p = JSON.parse(line.slice(9));
      return { type: 'postprocess', status: p.status ?? null, postprocessor: p.postprocessor ?? null };
    } catch {
      return null;
    }
  }
  return null;
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * @param {{ bin: string, args: string[], cwd: string, homeDir: string, proxyUrl: string, timeoutMs: number, signal?: AbortSignal, maxStdoutBytes: number }} p
 */
export async function runProbe({ bin, args, cwd, homeDir, proxyUrl, timeoutMs, signal, maxStdoutBytes }) {
  const r = await runProcess(bin, args, {
    cwd,
    env: engineEnv({ proxyUrl, homeDir }),
    timeoutMs,
    signal,
    collectStdout: true,
    maxStdoutBytes,
  });
  if (r.aborted) throw new FerryError('CANCELLED');
  if (r.timedOut) throw new FerryError('TIMEOUT', { internal: 'probe timeout' });
  if (r.overflow) throw new FerryError('EXTRACTION_FAILED', { internal: 'probe output too large' });
  if (r.code !== 0) {
    const code = classifyEngineError(r.stderr);
    throw new FerryError(code, { internal: summarizeStderr(r.stderr) });
  }
  try {
    const info = JSON.parse(r.stdout);
    if (!info || typeof info !== 'object') throw new Error('not an object');
    return info;
  } catch {
    throw new FerryError('EXTRACTION_FAILED', { internal: 'invalid probe JSON' });
  }
}
