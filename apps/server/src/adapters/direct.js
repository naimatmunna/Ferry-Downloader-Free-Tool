/**
 * Direct media links (https://host/path/file.mp4). Probes with a small ranged
 * request + ffprobe on the partial file; downloads with resume support.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { ffprobe } from '../engines/ffmpeg.js';
import { downloadToFile } from './http.js';

const PROBE_BYTES = 2 * 1024 * 1024;
const HEADER_DURATION_FORMATS = /mov|mp4|m4a|matroska|webm|flac|ogg|wav/;

/**
 * The address ends like a media file but serves a web page (Wikimedia Commons
 * `…/wiki/File:x.webm`): the probe service reads it as a page instead.
 */
export class NotADirectFile extends Error {}

/** @param {import('./index.js').AdapterDeps} deps */
export function createDirectAdapter(deps) {
  return {
    id: 'direct',

    supports(_platform, detection) {
      return Boolean(detection?.directExt) && !['m3u8', 'mpd'].includes(detection.directExt);
    },

    async probe({ url, signal }) {
      const res = await deps.fetch(url, { headers: { range: `bytes=0-${PROBE_BYTES - 1}` }, signal, timeoutMs: 20_000 });
      if (res.status === 404 || res.status === 410) {
        res.discard();
        throw new FerryError('CONTENT_UNAVAILABLE', { internal: `HTTP ${res.status}` });
      }
      if (res.status === 401 || res.status === 403) {
        res.discard();
        throw new FerryError('AUTH_REQUIRED', { internal: `HTTP ${res.status}` });
      }
      if (res.status >= 400) {
        res.discard();
        throw new FerryError(res.status === 429 ? 'SOURCE_RATE_LIMITED' : 'NETWORK_ERROR', { internal: `HTTP ${res.status}` });
      }
      const type = String(res.headers['content-type'] ?? '').toLowerCase();
      if (type.startsWith('text/html') || type.startsWith('application/xhtml')) {
        res.discard();
        throw new NotADirectFile('direct link served HTML');
      }
      const range = /\/(\d+)$/.exec(String(res.headers['content-range'] ?? ''));
      const length = Number(res.headers['content-length']);
      const totalBytes = range ? Number(range[1]) : res.status === 200 && Number.isFinite(length) ? length : null;

      // Read at most PROBE_BYTES (servers that ignore Range send the whole file: stop early).
      const chunks = [];
      let got = 0;
      await new Promise((resolve, reject) => {
        res.stream.on('data', (c) => {
          chunks.push(c);
          got += c.length;
          if (got >= PROBE_BYTES) {
            res.stream.destroy();
            resolve(undefined);
          }
        });
        res.stream.on('end', () => resolve(undefined));
        res.stream.on('close', () => resolve(undefined));
        res.stream.on('error', (e) => (got >= PROBE_BYTES ? resolve(undefined) : reject(new FerryError('NETWORK_ERROR', { internal: e.message }))));
      });

      const u = new URL(url);
      const fileName = decodeURIComponent(u.pathname.split('/').pop() || 'media');
      const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase().slice(0, 8) : null;
      const title = fileName.replace(/\.[^.]+$/, '').replace(/[_+]+/g, ' ').trim() || 'Media file';

      const work = await mkdtemp(path.join(deps.config.cacheDir, 'direct-'));
      let probe = null;
      try {
        const partial = path.join(work, `head.${ext ?? 'bin'}`);
        await writeFile(partial, Buffer.concat(chunks).subarray(0, PROBE_BYTES));
        probe = await ffprobe({ bin: deps.engines.ffprobe, file: partial, cwd: work, timeoutMs: 15_000, signal }).catch(() => null);
      } finally {
        await rm(work, { recursive: true, force: true }).catch(() => {});
      }
      if (probe && !probe.streams.some((s) => s.kind === 'video' || s.kind === 'audio')) {
        throw new FerryError('NO_MEDIA_FOUND', { internal: 'no media streams in direct file' });
      }
      const v = probe?.streams.find((s) => s.kind === 'video' && !s.attachedPic) ?? null;
      const a = probe?.streams.find((s) => s.kind === 'audio') ?? null;
      const durationTrusted = probe?.durationSec && HEADER_DURATION_FORMATS.test(probe.format ?? '');
      return {
        id: fileName,
        title,
        extractor: 'direct',
        webpage_url: url,
        duration: durationTrusted ? probe.durationSec : null,
        formats: [
          {
            format_id: 'source',
            url,
            ext,
            protocol: u.protocol.slice(0, -1),
            vcodec: probe ? (v ? v.rawCodec : 'none') : null,
            acodec: probe ? (a ? a.rawCodec : 'none') : null,
            width: v?.width ?? null,
            height: v?.height ?? null,
            fps: v?.fps ?? null,
            abr: a?.bitrateKbps ?? null,
            filesize: totalBytes,
          },
        ],
      };
    },

    /** @param {import('./index.js').DownloadContext} ctx */
    async download({ url, media, jobDir, signal, onProgress, maxBytes, config }) {
      const ext = (media?.raw?.formats?.[0]?.ext ?? 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
      const file = path.join(jobDir, `src.${ext}`);
      await downloadToFile({
        fetch: deps.fetch,
        url,
        file,
        maxBytes,
        signal,
        stallTimeoutMs: config?.limits?.stallTimeoutMs ?? deps.config.limits.stallTimeoutMs,
        onProgress: (p) => onProgress({
          phase: 'downloading',
          percent: p.totalBytes ? Math.min(99.5, (p.downloadedBytes / p.totalBytes) * 100) : null,
          downloadedBytes: p.downloadedBytes,
          totalBytes: p.totalBytes,
          totalIsEstimate: false,
          speedBps: p.speedBps,
          etaSec: p.etaSec,
        }),
      });
      return { srcFile: file, subtitles: [] };
    },
  };
}
