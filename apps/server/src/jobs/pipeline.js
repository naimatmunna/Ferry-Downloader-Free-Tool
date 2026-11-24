/**
 * The media pipeline for one job attempt:
 *   download (adapter) → ffprobe → finalize (ffmpeg) → verify → extras → cleanup
 * Galleries: download (gallery-dl) → per image: sniff → ffprobe → re-encode → verify → cleanup
 */
import { open, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { buildDownloadName } from '@ferry/shared/filename';
import { formatDuration, qualityClass } from '@ferry/shared/formats';
import { ffprobe, runFfmpeg, SAFE_INPUT } from '../engines/ffmpeg.js';
import { buildFinalizePlan, verifyOutput } from '../media/finalize.js';
import { planImage, verifyImage } from '../media/gallery.js';
import { fetchImage, sniffImage } from '../adapters/http.js';

/** First bytes of a file (magic bytes, EXIF orientation, WebP header). */
async function readHead(file, bytes = 256 * 1024) {
  const fh = await open(file, 'r');
  try {
    const buf = Buffer.alloc(bytes);
    const { bytesRead } = await fh.read(buf, 0, bytes, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

/** Delete everything in a job directory that is not a deliverable. */
async function keepOnly(jobDir, files) {
  const keep = new Set(files.map((f) => f.diskName));
  for (const name of await readdir(jobDir)) {
    if (!keep.has(name)) await rm(path.join(jobDir, name), { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * @param {{ config: import('../config.js').Config, storage: any, adapters: any, fetch: Function,
 *   engines: { ffmpeg: string, ffprobe: string }, logger: import('pino').Logger }} deps
 */
export function createPipeline({ config, storage, adapters, fetch, engines, logger }) {
  /**
   * @param {any} job
   * @param {{ signal: AbortSignal, onProgress: (p: object) => void, onPhase: (phase: 'processing') => void }} hooks
   */
  async function run(job, { signal, onProgress, onPhase }) {
    const { jobDir, tmpDir } = await storage.ensure(job.id);
    await storage.assertCapacity();
    const adapter = adapters.byId(job.internal.adapterId);
    if (!adapter) throw new FerryError('INTERNAL_ERROR', { internal: `adapter ${job.internal.adapterId} missing` });

    const dl = await adapter.download({
      job,
      url: job.source.url,
      selection: job.request,
      media: job.internal.media,
      jobDir,
      tmpDir,
      signal,
      onProgress,
      maxBytes: config.limits.maxFileSizeBytes,
    });
    if (signal.aborted) throw new FerryError('CANCELLED');

    onPhase('processing');
    if (job.request.mode === 'gallery') return finishGallery(job, dl, { jobDir, signal, onProgress });
    onProgress({ phase: 'processing', stage: null, percent: 0, speedBps: null, etaSec: null });
    const srcProbe = await ffprobe({ bin: engines.ffprobe, file: dl.srcFile, cwd: jobDir, signal });
    if (srcProbe.durationSec && srcProbe.durationSec > config.limits.maxDurationSec + 5) {
      throw new FerryError('DURATION_LIMIT', { params: { duration: formatDuration(config.limits.maxDurationSec) } });
    }

    const extras = job.request.extras ?? {};
    const subtitles = dl.subtitles ?? [];
    const metadata = extras.metadata
      ? {
          title: job.source.title,
          artist: job.source.uploader,
          date: job.internal.uploadDate,
          comment: job.internal.webpageUrl ?? job.source.url,
        }
      : null;
    const plan = buildFinalizePlan({
      src: dl.srcFile,
      srcProbe,
      selection: job.request,
      subtitles: extras.embedSubtitles ? subtitles : [],
      metadata,
      threads: config.engines.threads,
      outDir: jobDir,
    });

    await runFfmpeg({
      bin: engines.ffmpeg,
      args: plan.args,
      cwd: jobDir,
      durationSec: plan.durationSec,
      timeoutMs: config.limits.jobTimeoutMs,
      stallTimeoutMs: config.limits.stallTimeoutMs,
      signal,
      onProgress: (p) => onProgress({ phase: 'processing', percent: p.percent, speedBps: null, etaSec: null }),
    });

    onProgress({ phase: 'finalizing', percent: null });
    const out = await ffprobe({ bin: engines.ffprobe, file: plan.outputFile, cwd: jobDir, signal });
    verifyOutput(out, plan);
    const v = out.streams.find((s) => s.kind === 'video' && !s.attachedPic) ?? null;
    const a = out.streams.find((s) => s.kind === 'audio') ?? null;

    const q = v ? qualityClass(v.width, v.height) : null;
    const vars = {
      title: job.source.title,
      uploader: job.source.uploader,
      platform: job.source.platformName,
      id: job.internal.mediaId,
      quality: v && q ? `${q}p` : a?.bitrateKbps ? `${a.bitrateKbps}k` : null,
      date: job.internal.uploadDate,
    };
    const template = job.request.filename?.template;
    const mainName = buildDownloadName({ template, vars, ext: plan.ext });
    const baseName = mainName.replace(/\.[^.]+$/, '');

    const files = [
      {
        id: 'f0',
        kind: 'media',
        diskName: path.basename(plan.outputFile),
        name: mainName,
        sizeBytes: out.sizeBytes,
        mime: plan.mime,
        container: plan.container,
        vcodec: v?.codec ?? null,
        acodec: a?.codec ?? null,
        width: v?.width ?? null,
        height: v?.height ?? null,
        durationSec: out.durationSec,
        bitrateKbps: plan.ext === 'wav' || plan.ext === 'flac' ? null : (a && !v ? a.bitrateKbps ?? out.bitrateKbps : out.bitrateKbps),
        transcoded: plan.transcode,
      },
    ];

    // Subtitles as separate, normalized SRT files (when not embedded).
    if (!extras.embedSubtitles) {
      for (const [i, s] of subtitles.entries()) {
        const diskName = `sub-${i}.srt`;
        try {
          await runFfmpeg({ bin: engines.ffmpeg, args: [...SAFE_INPUT, '-i', s.path, '-c:s', 'srt', '-f', 'srt', path.join(jobDir, diskName)], cwd: jobDir, durationSec: null, timeoutMs: 60_000, signal });
          const { size } = await stat(path.join(jobDir, diskName));
          files.push({ id: `f${files.length}`, kind: 'subtitle', diskName, name: `${baseName}.${s.lang}.srt`, sizeBytes: size, mime: 'application/x-subrip', container: 'srt', language: s.lang });
        } catch (err) {
          logger.warn({ jobId: job.id, err }, 'subtitle conversion failed');
        }
      }
    }

    // Thumbnail: fetched through the guard, sniffed, and re-encoded (strips metadata/polyglots).
    if (extras.thumbnail && job.internal.thumbnailSource) {
      try {
        const img = await fetchImage({ fetch, url: job.internal.thumbnailSource, signal });
        const raw = path.join(tmpDir, 'thumb.src');
        await writeFile(raw, img.body);
        const diskName = 'thumb.jpg';
        await runFfmpeg({ bin: engines.ffmpeg, args: [...SAFE_INPUT, '-i', raw, '-frames:v', '1', '-q:v', '3', '-map_metadata', '-1', '-f', 'image2', path.join(jobDir, diskName)], cwd: jobDir, durationSec: null, timeoutMs: 60_000, signal });
        const { size } = await stat(path.join(jobDir, diskName));
        files.push({ id: `f${files.length}`, kind: 'thumbnail', diskName, name: `${baseName}.jpg`, sizeBytes: size, mime: 'image/jpeg', container: 'jpg' });
      } catch (err) {
        logger.warn({ jobId: job.id, err }, 'thumbnail failed (non-fatal)');
      }
    }

    // Remove everything that is not a deliverable.
    await keepOnly(jobDir, files);
    return { files, notes: plan.notes };
  }

  /**
   * Prove and re-encode every downloaded gallery file. Files that fail are
   * dropped (note `gallery-partial`); none surviving fails the job.
   * @param {any} job
   * @param {{ images: { index: number, path: string }[], requested: number }} dl
   */
  async function finishGallery(job, dl, { jobDir, signal, onProgress }) {
    if (!Array.isArray(dl?.images)) throw new FerryError('FORMAT_UNAVAILABLE', { internal: `gallery job on adapter ${job.internal.adapterId}` });
    const images = [...dl.images].sort((a, b) => a.index - b.index);
    const vars = {
      title: job.source.title,
      uploader: job.source.uploader,
      platform: job.source.platformName,
      id: job.internal.mediaId,
      quality: null,
      date: job.internal.uploadDate,
    };
    const base = buildDownloadName({ template: job.request.filename?.template, vars, ext: '' });
    // Same width as the numbers on the picker's tiles (all items, not just the chosen ones).
    const allIndexes = job.internal.media?.gallery?.items?.map((i) => i.index) ?? job.request.gallery.items;
    const digits = Math.max(2, String(Math.max(...allIndexes)).length);
    const files = [];
    let lastError = null;
    for (const [n, img] of images.entries()) {
      if (signal.aborted) throw new FerryError('CANCELLED');
      onProgress({ phase: 'processing', stage: 'images', percent: (n / images.length) * 100, itemsDone: n, itemsTotal: images.length, speedBps: null, etaSec: null });
      try {
        const head = await readHead(img.path);
        const sniffed = sniffImage(head);
        // ffprobe only ever sees files whose magic bytes are an image.
        const srcProbe = sniffed ? await ffprobe({ bin: engines.ffprobe, file: img.path, cwd: jobDir, signal }) : null;
        const plan = planImage({
          src: img.path,
          sniffed,
          head,
          probe: srcProbe,
          outDir: jobDir,
          name: `img-${String(img.index).padStart(4, '0')}`,
          maxPixels: config.limits.maxImagePixels,
          threads: config.engines.threads,
        });
        await runFfmpeg({ bin: engines.ffmpeg, args: plan.args, cwd: jobDir, durationSec: null, timeoutMs: 120_000, stallTimeoutMs: config.limits.stallTimeoutMs, signal });
        const out = await ffprobe({ bin: engines.ffprobe, file: plan.outputFile, cwd: jobDir, signal });
        const { width, height } = verifyImage(out, plan);
        const { size } = await stat(plan.outputFile);
        files.push({
          id: `f${files.length}`,
          kind: 'image',
          diskName: path.basename(plan.outputFile),
          name: `${base} - ${String(img.index).padStart(digits, '0')}.${plan.ext}`,
          sizeBytes: size,
          mime: plan.mime,
          container: plan.ext,
          width,
          height,
          index: img.index,
          converted: plan.converted,
        });
      } catch (err) {
        if (signal.aborted || err?.code === 'CANCELLED') throw err;
        lastError = err;
        logger.warn({ jobId: job.id, index: img.index, code: err?.code, internal: err?.internal }, 'gallery image rejected');
      }
    }
    if (!files.length) throw lastError ?? new FerryError('NO_MEDIA_FOUND', { internal: 'no gallery image survived' });
    onProgress({ phase: 'finalizing', percent: null });
    await keepOnly(jobDir, files);
    const notes = files.length < dl.requested ? ['gallery-partial'] : [];
    return { files, notes, archiveName: `${base}.zip` };
  }

  return { run };
}
