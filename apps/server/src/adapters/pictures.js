/**
 * Pictures whose addresses the probe already found: yt-dlp lists the pictures
 * of an Instagram post but downloads only video and audio (see
 * engines/ytdlp.js#pictureGallery). Each chosen picture is fetched with the
 * guarded fetch under a size cap; jobs/pipeline.js#finishGallery then proves
 * and re-encodes every file, as for gallery-dl galleries.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { downloadToFile } from './http.js';

const IMAGE_EXT = /^(jpg|png|gif|webp|avif)$/;

/**
 * @param {{ fetch: Function, job: any, media: any, tmpDir: string, signal: AbortSignal, onProgress: (p: object) => void,
 *   maxBytes: number, maxImageBytes: number, stallTimeoutMs: number }} p
 * @returns {Promise<{ images: { index: number, path: string }[], requested: number }>}
 */
export async function downloadPictures({ fetch, job, media, tmpDir, signal, onProgress, maxBytes, maxImageBytes, stallTimeoutMs }) {
  const urls = media?.raw?.gallery?.urls ?? {};
  const indexes = job.request?.gallery?.items ?? [];
  if (!indexes.length || indexes.some((i) => typeof urls[i] !== 'string')) {
    throw new FerryError('INTERNAL_ERROR', { internal: 'picture job without picture addresses' });
  }
  const extOf = new Map((media.gallery?.items ?? []).map((i) => [i.index, IMAGE_EXT.test(i.ext ?? '') ? i.ext : 'img']));
  const outDir = path.join(tmpDir, 'pictures');
  await mkdir(outDir, { recursive: true });

  const images = [];
  let received = 0;
  let lastError = null;
  // One picture may be at most this big; going over it skips that picture only.
  const cap = Math.min(maxImageBytes, maxBytes);
  for (const [n, index] of indexes.entries()) {
    if (signal.aborted) throw new FerryError('CANCELLED');
    const room = maxBytes - received;
    const file = path.join(outDir, `picture-${index}.${extOf.get(index) ?? 'img'}`);
    try {
      const { bytes } = await downloadToFile({
        fetch,
        url: urls[index],
        file,
        maxBytes: Math.min(cap, room),
        signal,
        stallTimeoutMs,
        onProgress: (p) =>
          onProgress({
            phase: 'downloading',
            stage: 'images',
            percent: Math.min(99.5, ((n + (p.totalBytes ? p.downloadedBytes / p.totalBytes : 0)) / indexes.length) * 100),
            downloadedBytes: received + p.downloadedBytes,
            totalBytes: null,
            totalIsEstimate: false,
            speedBps: p.speedBps,
            etaSec: null,
            itemsDone: n,
            itemsTotal: indexes.length,
          }),
      });
      received += bytes;
      images.push({ index, path: file });
    } catch (err) {
      if (signal.aborted || err?.code === 'CANCELLED') throw new FerryError('CANCELLED');
      // Over the whole download's cap (not just this picture's): stop, as other downloads do.
      if (err?.code === 'FILE_TOO_LARGE' && room < cap) throw err;
      // Picture links are signed and expire; reading the post again gives fresh ones. Ferry never signs in.
      lastError = err?.code === 'AUTH_REQUIRED' ? new FerryError('PROBE_EXPIRED', { internal: err.internal ?? 'picture link refused' }) : err;
    }
  }
  if (!images.length) throw lastError ?? new FerryError('DOWNLOAD_INTERRUPTED', { internal: 'no picture arrived' });
  onProgress({
    phase: 'downloading',
    stage: 'images',
    percent: 99.5,
    downloadedBytes: received,
    totalBytes: received,
    totalIsEstimate: false,
    speedBps: null,
    etaSec: 0,
    itemsDone: images.length,
    itemsTotal: indexes.length,
  });
  return { images, requested: indexes.length };
}
