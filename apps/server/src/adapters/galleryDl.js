/**
 * gallery-dl adapter — image posts, albums and carousels for registry entries
 * with `engine: 'gallery-dl'` (Imgur, Flickr, Mastodon, …). Metadata comes
 * from `-j`; downloads fetch only the files the user chose. Every request goes
 * through the per-job egress proxy. See SYSTEM-ARCHITECTURE.md §8.5.
 */
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { engineEnv, runProcess } from '../engines/process.js';
import { summarizeStderr } from '../engines/classify.js';
import {
  baseArgs,
  buildGallery,
  classifyGalleryError,
  createDownloadTracker,
  downloadArgs,
  galleryInput,
  parseMessages,
  probeArgs,
} from '../engines/galleryDl.js';

const MiB = 1024 * 1024;

/** Log-safe summary of gallery-dl's reported errors plus its stderr. */
function summarize(errors, stderr) {
  return summarizeStderr(`${errors.map((e) => `ERROR: ${e.name}: ${e.message}`).join('\n')}\n${stderr ?? ''}`);
}

/** @param {import('./index.js').AdapterDeps & { runProcess?: typeof runProcess }} deps */
export function createGalleryDlAdapter(deps) {
  const { config } = deps;
  const run = deps.runProcess ?? runProcess;
  const profile = (proxyUrl, home) => baseArgs({ proxyUrl, cacheFile: path.join(home, 'gallery-dl-cache.sqlite3') });

  /** One `-j` listing of a gallery-dl input, within the probe's overall deadline. */
  async function list({ input, home, signal, tag, deadline }) {
    const cred = deps.egress.issue({ tag: `probe:${tag}`, maxBytes: 64 * MiB });
    let r;
    try {
      r = await run(deps.engines.galleryDl, probeArgs({ base: profile(cred.url, home), input, maxItems: config.limits.maxGalleryItems }), {
        cwd: home,
        env: engineEnv({ proxyUrl: cred.url, homeDir: home }),
        timeoutMs: Math.max(1000, deadline - Date.now()),
        signal,
        collectStdout: true,
        maxStdoutBytes: config.limits.maxProbeOutputBytes,
      });
    } finally {
      cred.revoke();
    }
    if (r.aborted) throw new FerryError('CANCELLED');
    if (cred.session.blocked.length) throw new FerryError('BLOCKED_DESTINATION', { internal: cred.session.blocked[0].reason });
    if (r.timedOut) throw new FerryError('TIMEOUT', { internal: 'gallery-dl probe timeout' });
    if (r.overflow) throw new FerryError('EXTRACTION_FAILED', { internal: 'gallery-dl output too large' });
    if (!r.stdout.trim()) {
      throw new FerryError(classifyGalleryError({ stderr: r.stderr, exitCode: r.code }), { internal: summarizeStderr(r.stderr) || `gallery-dl exit ${r.code}` });
    }
    return { messages: parseMessages(r.stdout), stderr: r.stderr, code: r.code };
  }

  return {
    id: 'gallery-dl',

    supports(platform, detection) {
      // Direct video/audio files stay with the direct adapter, as on every other host.
      return platform.engine === 'gallery-dl' && !(detection?.directExt && detection.directExt !== 'gif');
    },

    async probe({ url, platform, signal, tag }) {
      const home = await mkdtemp(path.join(config.cacheDir, 'gdl-'));
      // One deadline for both listings, so a slow first one ends as TIMEOUT, not as an outer abort.
      const deadline = Date.now() + config.limits.probeTimeoutMs;
      try {
        let input = galleryInput(url, platform?.id);
        let result = await list({ input, home, signal, tag, deadline });
        if (!result.messages.files.length && !result.messages.errors.length && platform) {
          // A page that only points at one album of the same platform (Imgur /gallery/<id> → /a/<id>).
          // Links to other sites are never followed: their policies were not checked.
          const same = result.messages.children.filter((c) => /^https?:\/\//i.test(c.url) && deps.platformOf?.(c.url) === platform.id);
          if (same.length === 1) {
            input = galleryInput(same[0].url, platform.id);
            result = await list({ input, home, signal, tag, deadline });
          }
        }
        const { messages } = result;
        if (!messages.files.length) {
          if (messages.errors.length || result.code !== 0) {
            throw new FerryError(classifyGalleryError({ errors: messages.errors, stderr: result.stderr, exitCode: result.code }), { internal: summarize(messages.errors, result.stderr) });
          }
          throw new FerryError('NO_MEDIA_FOUND', { internal: `gallery-dl listed no files (${messages.children.length} links)` });
        }
        const info = buildGallery({ messages, pageUrl: url, maxItems: config.limits.maxGalleryItems, fallbackTitle: `${platform?.name ?? 'Image'} gallery` });
        // A post can point at files on another platform's servers: never offer files from a
        // platform whose policy does not allow downloads (protected, export-only, turned off).
        if (deps.policyAllows) {
          const allowed = info.gallery.items.filter((i) => deps.policyAllows(i.url));
          info.gallery.skipped.other += info.gallery.items.length - allowed.length;
          info.gallery.items = allowed;
          info.thumbnail = allowed[0]?.preview ?? null;
        }
        info.gallery.input = input;
        return info;
      } finally {
        await rm(home, { recursive: true, force: true }).catch(() => {});
      }
    },

    /**
     * Download the chosen files. Returns the raw files; jobs/pipeline.js proves
     * and re-encodes each one.
     * @param {import('./index.js').DownloadContext} ctx
     */
    async download({ job, media, tmpDir, signal, onProgress, maxBytes }) {
      const input = media?.raw?.gallery?.input;
      const indexes = job.request?.gallery?.items ?? [];
      if (!input || !indexes.length) throw new FerryError('INTERNAL_ERROR', { internal: 'gallery job without input or selection' });
      const outDir = path.join(tmpDir, 'gallery');
      const home = path.join(tmpDir, 'gallery-dl');
      await mkdir(outDir, { recursive: true });
      await mkdir(home, { recursive: true });

      let limitHit = false;
      const cred = deps.egress.issue({ tag: job.id, maxBytes: Math.round(maxBytes * 1.05) + 8 * MiB, onLimit: () => (limitHit = true) });
      const tracker = createDownloadTracker(indexes);
      const chosen = new Set(indexes);
      const sizes = (media.gallery?.items ?? []).filter((i) => chosen.has(i.index)).map((i) => i.sizeBytes);
      const totalBytes = sizes.length === chosen.size && sizes.every((n) => n != null) ? sizes.reduce((a, b) => a + b, 0) : null;

      /** @type {ReturnType<typeof runProcess>|null} */
      let proc = null;
      let lastBytes = 0;
      let lastAt = Date.now();
      const report = () => {
        const now = Date.now();
        const bytes = cred.session.bytesIn;
        // gallery-dl prints nothing while a file transfers: bytes through the proxy are the sign of life.
        if (bytes > lastBytes) proc?.touch();
        const speedBps = now > lastAt ? ((bytes - lastBytes) * 1000) / (now - lastAt) : null;
        lastBytes = bytes;
        lastAt = now;
        const done = tracker.files().length;
        onProgress({
          phase: 'downloading',
          stage: 'images',
          percent: Math.min(99.5, totalBytes ? (bytes / totalBytes) * 100 : (done / chosen.size) * 100),
          downloadedBytes: bytes,
          totalBytes,
          totalIsEstimate: false,
          speedBps,
          etaSec: totalBytes && speedBps > 0 ? Math.max(0, Math.round((totalBytes - bytes) / speedBps)) : null,
          itemsDone: done,
          itemsTotal: chosen.size,
        });
      };
      const ticker = setInterval(report, 500);
      let result;
      try {
        proc = run(deps.engines.galleryDl, downloadArgs({ base: profile(cred.url, home), input, indexes, outDir, maxFileBytes: Math.min(config.limits.maxImageBytes, maxBytes) }), {
          cwd: home,
          env: engineEnv({ proxyUrl: cred.url, homeDir: home }),
          timeoutMs: config.limits.jobTimeoutMs,
          stallTimeoutMs: config.limits.stallTimeoutMs,
          signal,
          onStdoutLine: (line) => tracker.onLine(line),
        });
        result = await proc;
      } finally {
        clearInterval(ticker);
        cred.revoke();
      }
      if (result.aborted) throw new FerryError('CANCELLED');
      if (limitHit || cred.session.exceeded) throw new FerryError('FILE_TOO_LARGE', { internal: 'egress byte cap' });
      if (result.timedOut) throw new FerryError('TIMEOUT', { internal: 'gallery download timeout' });
      if (result.stalled) throw new FerryError('DOWNLOAD_INTERRUPTED', { internal: 'stalled' });
      report();

      const images = [];
      for (const { index, name } of tracker.files()) {
        const full = path.join(outDir, name);
        if (path.dirname(full) !== outDir) continue; // only files gallery-dl wrote into this folder
        const st = await stat(full).catch(() => null);
        // --filesize-max only works when the server sends Content-Length: check the real size too.
        if (st?.isFile() && st.size > 0 && st.size <= config.limits.maxImageBytes) images.push({ index, path: full });
      }
      if (!images.length) {
        if (cred.session.blocked.length) throw new FerryError('BLOCKED_DESTINATION', { internal: cred.session.blocked[0].reason });
        throw new FerryError(classifyGalleryError({ stderr: result.stderr, exitCode: result.code, fallback: 'DOWNLOAD_INTERRUPTED' }), {
          internal: summarizeStderr(result.stderr) || `gallery-dl exit ${result.code}`,
        });
      }
      return { images, requested: chosen.size, blocked: cred.session.blocked.length };
    },
  };
}
