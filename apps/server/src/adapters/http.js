/**
 * HTTP helpers for adapters that download files themselves (direct links,
 * official APIs). All traffic uses the guarded fetch (validated, pinned IPs).
 */
import { createWriteStream } from 'node:fs';
import { readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { FerryError } from '@ferry/shared/errors';

/**
 * Stream a URL to a file with a byte cap, progress, stall detection and
 * resume (Range + If-Range) when a partial file exists.
 * Resume is only attempted with a validator from the original response
 * (strong ETag or Last-Modified, sent as If-Range); otherwise the partial
 * file is discarded — appending to a resource that changed would corrupt it.
 * @param {{ fetch: Function, url: string, file: string, maxBytes: number, signal?: AbortSignal,
 *   onProgress?: (p: { downloadedBytes: number, totalBytes: number|null, speedBps: number|null, etaSec: number|null }) => void,
 *   stallTimeoutMs?: number }} p
 * @returns {Promise<{ bytes: number, contentType: string|null, etag: string|null }>}
 */
export async function downloadToFile({ fetch, url, file, maxBytes, signal, onProgress, stallTimeoutMs = 120_000 }) {
  const sidecar = `${file}.validator.json`;
  let offset = 0;
  let validator = null;
  try {
    offset = (await stat(file)).size;
    const saved = JSON.parse(await readFile(sidecar, 'utf8'));
    if (saved?.url === url && typeof saved.validator === 'string') validator = saved.validator;
  } catch {
    /* no partial file or no validator */
  }
  if (offset > 0 && !validator) {
    await unlink(file).catch(() => {});
    offset = 0;
  }
  const headers = {};
  if (offset > 0) {
    headers.range = `bytes=${offset}-`;
    headers['if-range'] = validator;
  }
  const res = await fetch(url, { headers, signal, timeoutMs: 30_000 });
  if (res.status === 416 && offset > 0) {
    res.discard();
    return { bytes: offset, contentType: null, etag: null };
  }
  if (res.status >= 400) {
    res.discard();
    if (res.status === 404 || res.status === 410) throw new FerryError('CONTENT_UNAVAILABLE', { internal: `HTTP ${res.status}` });
    if (res.status === 401 || res.status === 403) throw new FerryError('AUTH_REQUIRED', { internal: `HTTP ${res.status}` });
    if (res.status === 429) throw new FerryError('SOURCE_RATE_LIMITED', { internal: 'HTTP 429' });
    throw new FerryError('NETWORK_ERROR', { internal: `HTTP ${res.status}` });
  }
  const resumed = res.status === 206 && offset > 0;
  if (!resumed && offset > 0) {
    offset = 0; // server ignored the range or the resource changed: start over
    await unlink(file).catch(() => {});
  }
  if (!resumed) {
    // Remember a validator so an interrupted transfer can be resumed safely.
    const etag = typeof res.headers.etag === 'string' && !res.headers.etag.startsWith('W/') ? res.headers.etag : null;
    const lastModified = typeof res.headers['last-modified'] === 'string' ? res.headers['last-modified'] : null;
    const v = etag ?? lastModified;
    if (v && res.headers['accept-ranges'] === 'bytes') await writeFile(sidecar, JSON.stringify({ url, validator: v })).catch(() => {});
    else await unlink(sidecar).catch(() => {});
  }
  const length = Number(res.headers['content-length']);
  const totalBytes = Number.isFinite(length) && length >= 0 ? length + (resumed ? offset : 0) : null;
  if (totalBytes != null && totalBytes > maxBytes) {
    res.discard();
    throw new FerryError('FILE_TOO_LARGE', { internal: `content-length ${totalBytes}` });
  }

  let downloaded = offset;
  let lastTick = Date.now();
  let lastBytes = downloaded;
  let speed = null;
  let lastData = Date.now();
  const stall = setInterval(() => {
    if (Date.now() - lastData > stallTimeoutMs) res.stream.destroy(new FerryError('DOWNLOAD_INTERRUPTED', { internal: 'stalled' }));
  }, Math.min(5000, stallTimeoutMs));

  const meter = new Transform({
    transform(chunk, _enc, cb) {
      downloaded += chunk.length;
      lastData = Date.now();
      if (downloaded > maxBytes) {
        cb(new FerryError('FILE_TOO_LARGE', { internal: 'stream exceeded cap' }));
        return;
      }
      const now = Date.now();
      if (now - lastTick >= 500) {
        speed = ((downloaded - lastBytes) * 1000) / (now - lastTick);
        lastTick = now;
        lastBytes = downloaded;
        onProgress?.({
          downloadedBytes: downloaded,
          totalBytes,
          speedBps: speed,
          etaSec: totalBytes != null && speed > 0 ? Math.round((totalBytes - downloaded) / speed) : null,
        });
      }
      cb(null, chunk);
    },
  });
  try {
    await pipeline(res.stream, meter, createWriteStream(file, { flags: resumed ? 'a' : 'w' }), { signal });
  } catch (err) {
    if (err instanceof FerryError) throw err;
    if (err?.name === 'AbortError') throw new FerryError('CANCELLED');
    throw new FerryError('DOWNLOAD_INTERRUPTED', { internal: err?.message });
  } finally {
    clearInterval(stall);
  }
  onProgress?.({ downloadedBytes: downloaded, totalBytes: totalBytes ?? downloaded, speedBps: speed, etaSec: 0 });
  return { bytes: downloaded, contentType: res.headers['content-type'] ?? null, etag: res.headers.etag ?? null };
}

const IMAGE_MAGIC = [
  ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/png', (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
  ['image/gif', (b) => b.subarray(0, 6).toString('latin1') === 'GIF87a' || b.subarray(0, 6).toString('latin1') === 'GIF89a'],
  ['image/webp', (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'],
  ['image/avif', (b) => b.subarray(4, 12).toString('latin1') === 'ftypavif' || b.subarray(4, 12).toString('latin1') === 'ftypavis'],
];

/** Identify an image by magic bytes (never trust Content-Type). */
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  for (const [type, test] of IMAGE_MAGIC) if (test(buf)) return type;
  return null;
}

/** Fetch a remote image safely (size cap + magic-byte check). */
export async function fetchImage({ fetch, url, maxBytes = 2 * 1024 * 1024, signal }) {
  const res = await fetch(url, { signal, timeoutMs: 10_000, headers: { accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.8' } });
  if (res.status !== 200) {
    res.discard();
    throw new FerryError('CONTENT_UNAVAILABLE', { internal: `thumbnail HTTP ${res.status}` });
  }
  const body = await res.buffer(maxBytes);
  const type = sniffImage(body);
  if (!type) throw new FerryError('CONTENT_UNAVAILABLE', { internal: 'thumbnail is not an image' });
  return { body, type };
}
