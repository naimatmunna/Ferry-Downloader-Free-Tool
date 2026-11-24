/**
 * Job service: creation (policy + validation), lifecycle control, execution
 * through the queue, expiry, and the public representation.
 */
import { FerryError, isFerryError } from '@ferry/shared/errors';
import { actionsFor, isActive, isSettled, MAX_ATTEMPTS } from '@ferry/shared/jobs';
import { canDownload, canProbe, policyErrorCode } from '@ferry/shared/platforms/policy';
import { LocalQueue } from './queue.js';
import { hashToken, newJobId, newToken, tokenMatches } from '../security/tokens.js';

const MINUTE = 60_000;

/**
 * @param {{ config: import('../config.js').Config, store: import('./store.js').MemoryJobStore, probeCache: any,
 *   registry: any, policies: any, probeService: any, pipeline: any, storage: any, logger: import('pino').Logger,
 *   metrics: any, urlHash: (u: string) => string }} deps
 */
export function createJobService({ config, store, probeCache, registry, policies, probeService, pipeline, storage, logger, metrics, urlHash }) {
  const ttl = config.limits.jobTtlMinutes * MINUTE;
  const maxRetention = config.limits.jobMaxRetentionMinutes * MINUTE;

  const queue = new LocalQueue({
    concurrency: config.limits.maxConcurrentJobs,
    maxLength: config.limits.maxQueueLength,
    keyLimit: (platformId) => registry.get(platformId)?.etiquette?.maxConcurrent ?? Infinity,
    run: (item, signal) => execute(item.id, signal),
    onError: (err, id) => logger.error({ err, jobId: id }, 'queue: unexpected error'),
  });

  // ---------------------------------------------------------------- creation

  function policyFor(platform, attest) {
    const policy = policies.effective(platform);
    if (!canProbe(policy.status)) {
      throw new FerryError(policyErrorCode(policy.status) ?? 'PLATFORM_DISABLED', {
        details: { platform: { id: platform.id, name: platform.name }, policy: policy.status, reason: policy.reason, routes: platform.routes ?? [] },
      });
    }
    if (!canDownload(policy.status, attest === true)) {
      throw new FerryError('ATTESTATION_REQUIRED', { details: { platform: { id: platform.id, name: platform.name }, attestation: policy.attestation } });
    }
    return policy;
  }

  /** Semantic validation of a selection against what the probe found. */
  function validateSelection(req, media) {
    if (!media) return;
    if (!media.capabilities.modes.includes(req.mode)) throw new FerryError('FORMAT_UNAVAILABLE', { message: 'That download mode is not available for this media.' });
    if (req.mode === 'gallery') {
      const items = new Map(media.gallery.items.map((i) => [i.index, i]));
      if (req.gallery.items.some((n) => !items.has(n))) throw new FerryError('FORMAT_UNAVAILABLE', { message: 'That image is not part of this gallery.' });
      const sizes = req.gallery.items.map((n) => items.get(n).sizeBytes);
      const known = sizes.every((s) => s != null) ? sizes.reduce((a, b) => a + b, 0) : null;
      if (known != null && known > config.limits.maxFileSizeBytes) {
        throw new FerryError('FILE_TOO_LARGE', { params: { size: `${Math.round(config.limits.maxFileSizeBytes / 1024 / 1024)} MB` } });
      }
      return;
    }
    if (req.mode !== 'audio') {
      const q = req.video.quality;
      if (q !== 'best' && !media.video.unknown && !media.video.qualities.some((x) => x.res === q)) {
        throw new FerryError('FORMAT_UNAVAILABLE', { message: `${q}p isn't available for this media.` });
      }
      const known = q === 'best' ? media.video.qualities[0] : media.video.qualities.find((x) => x.res === q);
      const size = known ? (req.mode === 'av' ? known.sizeBytes.av : known.sizeBytes.video) : null;
      if (size && size > config.limits.maxFileSizeBytes && !req.extras.trim && !req.video.compress) {
        throw new FerryError('FILE_TOO_LARGE', { params: { size: `${Math.round(config.limits.maxFileSizeBytes / 1024 / 1024)} MB` } });
      }
    }
    for (const lang of req.extras.subtitles) {
      if (!media.subtitles.some((s) => s.lang === lang)) throw new FerryError('FORMAT_UNAVAILABLE', { message: `Subtitles in "${lang}" aren't available.` });
    }
    const lang = req.audio?.language;
    if (lang && !media.audio.tracks.some((t) => t.language === lang)) throw new FerryError('FORMAT_UNAVAILABLE', { message: 'That audio language is not available.' });
    const trim = req.extras.trim;
    if (trim) {
      const { start = 0, end } = trim;
      if (end != null && end <= start) throw new FerryError('VALIDATION_FAILED', { message: 'The trim end must be after the start.' });
      if (media.durationSec != null && (start >= media.durationSec || (end != null && end > media.durationSec + 0.5))) {
        throw new FerryError('VALIDATION_FAILED', { message: 'The trim range is outside the media duration.' });
      }
    }
  }

  /**
   * @param {{ probeId: string, entryId?: string|null, request: any, attest?: boolean, clientKey: string }} p
   */
  async function create({ probeId, entryId = null, request, attest = false, clientKey }) {
    const probe = probeCache.get(probeId);
    if (!probe || probe.clientKey !== clientKey) throw new FerryError('PROBE_EXPIRED');
    let platform = registry.get(probe.platformId);
    let policy = policyFor(platform, attest);

    let url = probe.href;
    let media = probe.media;
    let title = media.title;
    let durationSec = media.durationSec;
    let adapterId = probe.adapterId;
    let mediaId = media.id;
    if (media.kind === 'playlist') {
      const entry = media.entries.find((e) => e.id === entryId);
      if (!entry?.url) throw new FerryError('VALIDATION_FAILED', { message: 'Choose an item from the playlist.' });
      // An entry can live on another platform (e.g. a page listing videos hosted elsewhere).
      const d = probeService.detect(entry.url);
      if (d.platform.id !== platform.id && d.platform.id !== 'generic' && d.platform.id !== 'direct') {
        platform = d.platform;
        policy = policyFor(platform, attest);
        probeService.gate(platform);
      }
      url = d.href;
      title = entry.title;
      durationSec = entry.durationSec;
      mediaId = entry.id;
      media = null; // formats are resolved at download time
      if (durationSec && durationSec > config.limits.maxDurationSec) throw new FerryError('DURATION_LIMIT', { params: { duration: `${Math.round(config.limits.maxDurationSec / 60)} min` } });
    } else if (entryId) {
      throw new FerryError('VALIDATION_FAILED', { message: 'This link is not a playlist.' });
    } else {
      validateSelection(request, media);
    }

    if (store.activeCountForClient(clientKey) >= config.limits.maxActiveJobsPerClient) {
      throw new FerryError('TOO_MANY_ACTIVE_JOBS', { params: { max: config.limits.maxActiveJobsPerClient }, retryAfter: 30 });
    }

    const token = newToken();
    const job = store.create({
      id: newJobId(),
      tokenHash: hashToken(token),
      clientKey,
      status: 'queued',
      attempt: 1,
      maxAttempts: MAX_ATTEMPTS,
      priority: 10,
      source: {
        url,
        urlHash: urlHash(url),
        platformId: platform.id,
        platformName: platform.name,
        policyStatus: policy.status,
        attested: attest === true,
        title,
        uploader: probe.media.uploader ?? null,
        durationSec: durationSec ?? null,
        thumbnailUrl: probe.media.kind === 'playlist' ? null : probe.thumbnailUrl ?? null,
        entryId,
      },
      request,
      internal: {
        adapterId,
        media,
        mediaId,
        thumbnailSource: probe.media.kind === 'playlist' ? null : probe.media.thumbnailSource,
        webpageUrl: probe.media.webpageUrl ?? null,
        uploadDate: probe.media.uploadDate ?? null,
      },
      progress: { phase: 'queued', stage: null, percent: null, downloadedBytes: null, totalBytes: null, totalIsEstimate: false, speedBps: null, etaSec: null },
      output: null,
      error: null,
      expiresAt: null,
    });
    try {
      queue.enqueue({ id: job.id, key: platform.id });
    } catch (err) {
      store.delete(job.id);
      throw err;
    }
    metrics.inc('ferry_jobs_total', { status: 'created', platform: platform.id });
    logger.info({ jobId: job.id, platform: platform.id, mode: request.mode, url: job.source.urlHash }, 'job created');
    return { job: view(job), token };
  }

  // --------------------------------------------------------------- execution

  async function execute(id, signal) {
    const job = store.get(id);
    if (!job || job.status !== 'queued') return;
    store.update(id, { status: 'downloading', startedAt: Date.now(), progress: { phase: 'downloading', percent: null, stage: null } });

    let last = 0;
    let pending = null;
    let timer = null;
    const flush = () => {
      timer = null;
      if (pending && store.get(id) && isActive(store.get(id).status)) store.update(id, { progress: pending });
      pending = null;
    };
    const onProgress = (p) => {
      pending = { ...(pending ?? {}), ...p };
      const now = Date.now();
      if (now - last >= 250) {
        last = now;
        flush();
      } else if (!timer) timer = setTimeout(flush, 250);
    };
    const onPhase = (phase) => {
      if (phase === 'processing' && store.get(id)?.status === 'downloading') store.update(id, { status: 'processing' });
    };

    try {
      const { files, notes, archiveName = null } = await pipeline.run(store.get(id), { signal, onProgress, onPhase });
      if (timer) clearTimeout(timer);
      const now = Date.now();
      store.update(id, {
        status: 'ready',
        finishedAt: now,
        expiresAt: now + ttl,
        output: { files, notes, archiveName },
        progress: { phase: null, stage: null, percent: 100, speedBps: null, etaSec: null },
      });
      const bytes = files.reduce((n, f) => n + (f.sizeBytes ?? 0), 0);
      metrics.inc('ferry_jobs_total', { status: 'ready', platform: job.source.platformId });
      metrics.inc('ferry_output_bytes_total', {}, bytes);
      metrics.recordOutcome(job.source.platformId, true);
      logger.info({ jobId: id, platform: job.source.platformId, bytes, ms: now - (store.get(id).startedAt ?? now) }, 'job ready');
    } catch (err) {
      if (timer) clearTimeout(timer);
      const reason = signal.aborted ? signal.reason : null;
      const current = store.get(id);
      if (!current) return;
      if (reason === 'cancel' || current.status === 'cancelled') {
        await storage.remove(id);
        return;
      }
      if (reason === 'pause' && current.status === 'downloading') {
        store.update(id, { status: 'paused', progress: { phase: null, speedBps: null, etaSec: null, stage: null } });
        return;
      }
      const ferr = isFerryError(err) ? err : new FerryError('INTERNAL_ERROR', { internal: err?.message });
      const code = reason === 'shutdown' ? 'DOWNLOAD_INTERRUPTED' : reason === 'pause' ? 'DOWNLOAD_INTERRUPTED' : ferr.code;
      const fe = code === ferr.code ? ferr : new FerryError(code);
      const now = Date.now();
      if (isActive(current.status)) {
        store.update(id, {
          status: 'failed',
          finishedAt: now,
          expiresAt: now + ttl,
          error: { code: fe.code, message: fe.message, retryable: fe.retryable, internal: ferr.internal ?? null },
          progress: { phase: null, speedBps: null, etaSec: null, stage: null },
        });
      }
      if (!fe.retryable) await storage.remove(id);
      metrics.inc('ferry_jobs_total', { status: 'failed', platform: job.source.platformId });
      metrics.inc('ferry_failures_total', { platform: job.source.platformId, code: fe.code });
      metrics.recordOutcome(job.source.platformId, false, fe.code);
      logger.warn({ jobId: id, platform: job.source.platformId, code: fe.code, internal: ferr.internal }, 'job failed');
    }
  }

  // ----------------------------------------------------------------- control

  function requireJob(id) {
    const job = store.get(id);
    if (!job) throw new FerryError('JOB_NOT_FOUND');
    return job;
  }

  function authorize(id, token) {
    const job = requireJob(id);
    if (!tokenMatches(token, job.tokenHash)) throw new FerryError('FORBIDDEN');
    return job;
  }

  async function cancel(id) {
    const job = requireJob(id);
    if (!isActive(job.status)) throw new FerryError('INVALID_STATE');
    const wasQueued = queue.remove(id);
    store.update(id, { status: 'cancelled', finishedAt: Date.now(), expiresAt: Date.now() + 5 * MINUTE, progress: { phase: null, speedBps: null, etaSec: null } });
    if (!queue.abort(id, 'cancel') || wasQueued || job.status === 'paused') await storage.remove(id);
    metrics.inc('ferry_jobs_total', { status: 'cancelled', platform: job.source.platformId });
    return view(store.get(id));
  }

  function pause(id) {
    const job = requireJob(id);
    if (job.status !== 'downloading') throw new FerryError('INVALID_STATE');
    queue.abort(id, 'pause');
    return view(job);
  }

  function resume(id) {
    const job = requireJob(id);
    if (job.status !== 'paused') throw new FerryError('INVALID_STATE');
    store.update(id, { status: 'queued', progress: { phase: 'queued' } });
    queue.enqueue({ id, key: job.source.platformId });
    return view(store.get(id));
  }

  function retry(id) {
    const job = requireJob(id);
    if (!actionsFor(job).retry) throw new FerryError('INVALID_STATE');
    store.update(id, { status: 'queued', attempt: job.attempt + 1, error: null, expiresAt: null, finishedAt: null, progress: { phase: 'queued', percent: null } });
    queue.enqueue({ id, key: job.source.platformId });
    return view(store.get(id));
  }

  async function remove(id) {
    const job = requireJob(id);
    if (isActive(job.status)) await cancel(id);
    await storage.remove(id);
    const current = store.get(id);
    if (current && current.status !== 'expired') store.update(id, { status: 'expired', output: null, expiresAt: Date.now() });
  }

  /** "Keep longer" (WCAG 2.2.1): extend retention of a ready job, bounded by the max retention. */
  function extend(id) {
    const job = requireJob(id);
    if (job.status !== 'ready') throw new FerryError('INVALID_STATE');
    const cap = (job.finishedAt ?? job.createdAt) + maxRetention;
    const next = Math.min(Date.now() + ttl, cap);
    if (next <= job.expiresAt + 1000) throw new FerryError('INVALID_STATE', { message: 'This file has reached the maximum retention time.' });
    store.update(id, { expiresAt: next });
    return view(store.get(id));
  }

  /** Expire old jobs and delete their files. */
  async function sweep(now = Date.now()) {
    let expired = 0;
    for (const job of [...store.all()]) {
      if (job.status === 'paused' && now - job.createdAt > maxRetention) {
        store.update(job.id, { status: 'expired', expiresAt: now });
        await storage.remove(job.id);
        expired += 1;
      } else if (isSettled(job.status) && job.status !== 'expired' && job.expiresAt && job.expiresAt <= now) {
        store.update(job.id, { status: 'expired', output: null });
        await storage.remove(job.id);
        expired += 1;
      } else if (job.status === 'expired' && now - (job.expiresAt ?? job.updatedAt) > 24 * 60 * MINUTE) {
        store.delete(job.id);
      }
    }
    return expired;
  }

  // ------------------------------------------------------------------ views

  function view(job) {
    const actions = actionsFor(job);
    const files = job.status === 'ready' ? job.output?.files ?? [] : [];
    return {
      id: job.id,
      status: job.status,
      createdAt: new Date(job.createdAt).toISOString(),
      updatedAt: new Date(job.updatedAt).toISOString(),
      expiresAt: job.expiresAt ? new Date(job.expiresAt).toISOString() : null,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
      source: {
        platformId: job.source.platformId,
        platformName: job.source.platformName,
        title: job.source.title,
        uploader: job.source.uploader,
        durationSec: job.source.durationSec,
        thumbnailUrl: job.source.thumbnailUrl,
      },
      request: job.request,
      progress: { ...job.progress, queuePosition: job.status === 'queued' ? queue.position(job.id) : null },
      output: job.status === 'ready'
        ? {
            files: files.map(({ diskName, ...f }) => ({ ...f, url: `/api/v1/jobs/${job.id}/files/${f.id}` })),
            archiveUrl: files.length > 1 ? `/api/v1/jobs/${job.id}/archive` : null,
            notes: job.output?.notes ?? [],
          }
        : null,
      error: job.error ? { code: job.error.code, message: job.error.message, retryable: job.error.retryable && job.attempt < job.maxAttempts } : null,
      actions: { ...actions, extend: job.status === 'ready' },
    };
  }

  /** Delete a ready job's files after a grace period (privacy: delete after download). */
  function scheduleRemoval(id, delayMs) {
    const job = store.get(id);
    if (!job || job.status !== 'ready') return;
    const at = Date.now() + delayMs;
    if (!job.expiresAt || at < job.expiresAt) store.update(id, { expiresAt: at });
  }

  return {
    create,
    scheduleRemoval,
    authorize,
    cancel,
    pause,
    resume,
    retry,
    remove,
    extend,
    sweep,
    view,
    queue,
    async shutdown() {
      await queue.close();
    },
  };
}
