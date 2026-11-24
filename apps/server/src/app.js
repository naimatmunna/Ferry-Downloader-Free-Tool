/**
 * Express application: middleware, validation and routes. All business logic
 * lives in services injected by bootstrap.js, so this file is easy to test.
 */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { BRAND } from '@ferry/shared/brand';
import { FerryError, isFerryError } from '@ferry/shared/errors';
import { contentDisposition, validateTemplate } from '@ferry/shared/filename';
import { AUDIO_BITRATES, AUDIO_FORMAT_IDS, QUALITY_LADDER, VIDEO_CONTAINER_IDS } from '@ferry/shared/formats';
import { safePath } from './logger.js';
import { createRateLimiter } from './security/rateLimit.js';
import { safeEqual, UUID_RE } from './security/tokens.js';
import { fetchImage } from './adapters/http.js';
import { writeZip, zipSize } from './storage/zip.js';

// ------------------------------------------------------------------ schemas

const probeSchema = z.object({ url: z.string().min(1).max(4096), playlist: z.boolean().optional() }).strict();

const qualitySchema = z.union([z.literal('best'), z.number().int().refine((q) => QUALITY_LADDER.includes(q), 'unknown quality')]);
const jobSchema = z
  .object({
    probeId: z.string().regex(/^p_[A-Za-z0-9_-]{16,40}$/),
    entryId: z.string().min(1).max(300).nullable().optional(),
    mode: z.enum(['av', 'video', 'audio', 'gallery']),
    // Image galleries: 1-based file indexes from the probe (validated against it in jobs/service.js).
    gallery: z.object({ items: z.array(z.number().int().min(1).max(100_000)).min(1).max(500) }).strict().optional(),
    video: z.object({ container: z.enum(VIDEO_CONTAINER_IDS), quality: qualitySchema, compress: z.boolean().optional() }).strict().optional(),
    audio: z
      .object({
        format: z.enum(AUDIO_FORMAT_IDS),
        bitrate: z.union([z.literal('source'), z.number().int().refine((b) => AUDIO_BITRATES.includes(b), 'unknown bitrate')]),
        language: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/).nullable().optional(),
      })
      .strict()
      .optional(),
    extras: z
      .object({
        subtitles: z.array(z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/)).max(10).optional(),
        embedSubtitles: z.boolean().optional(),
        thumbnail: z.boolean().optional(),
        metadata: z.boolean().optional(),
        trim: z.object({ start: z.number().min(0).max(86_400).optional(), end: z.number().min(0).max(86_400).optional() }).strict().nullable().optional(),
      })
      .strict()
      .optional(),
    filename: z.object({ template: z.string().min(1).max(120) }).strict().optional(),
    privacy: z.object({ deleteAfterDownload: z.boolean().optional() }).strict().optional(),
    attest: z.boolean().optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.mode === 'gallery' && !b.gallery) ctx.addIssue({ code: 'custom', path: ['gallery'], message: 'choose the images to download' });
    if (b.mode !== 'gallery' && b.gallery) ctx.addIssue({ code: 'custom', path: ['gallery'], message: 'only for gallery downloads' });
    if (b.mode !== 'audio' && b.mode !== 'gallery' && !b.video) ctx.addIssue({ code: 'custom', path: ['video'], message: 'video options are required' });
    if (b.mode === 'audio' && !b.audio) ctx.addIssue({ code: 'custom', path: ['audio'], message: 'audio options are required' });
    if (b.filename && !validateTemplate(b.filename.template).ok) ctx.addIssue({ code: 'custom', path: ['filename', 'template'], message: 'invalid template' });
  });

const statusSchema = z.object({ jobs: z.array(z.object({ id: z.string().max(64), token: z.string().max(200) }).strict()).max(50) }).strict();
const policySchema = z.object({ policy: z.enum(['allowed', 'attestation', 'export_only', 'blocked', 'disabled']), reason: z.string().max(300).optional() }).strict();

function normalizeRequest(b) {
  if (b.mode === 'gallery') {
    return {
      mode: 'gallery',
      video: null,
      audio: null,
      gallery: { items: [...new Set(b.gallery.items)].sort((x, y) => x - y) },
      // Images are always re-encoded without metadata; video-only extras do not apply.
      extras: { subtitles: [], embedSubtitles: false, thumbnail: false, metadata: false, trim: null },
      filename: { template: b.filename?.template ?? '{title}' },
      privacy: { deleteAfterDownload: Boolean(b.privacy?.deleteAfterDownload) },
    };
  }
  const trim = b.extras?.trim && (b.extras.trim.start || b.extras.trim.end) ? { start: b.extras.trim.start ?? 0, end: b.extras.trim.end ?? null } : null;
  return {
    mode: b.mode,
    video: b.mode !== 'audio' ? { container: b.video.container, quality: b.video.quality, compress: Boolean(b.video.compress) } : null,
    audio: b.audio ? { format: b.audio.format, bitrate: b.audio.bitrate, language: b.audio.language ?? null } : null,
    extras: {
      subtitles: [...new Set(b.extras?.subtitles ?? [])],
      embedSubtitles: Boolean(b.extras?.embedSubtitles),
      thumbnail: Boolean(b.extras?.thumbnail),
      metadata: b.extras?.metadata ?? true,
      trim,
    },
    filename: { template: b.filename?.template ?? '{title}' },
    privacy: { deleteAfterDownload: Boolean(b.privacy?.deleteAfterDownload) },
  };
}

// --------------------------------------------------------------- helpers

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function bearer(req) {
  const h = req.headers.authorization;
  return typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new FerryError('VALIDATION_FAILED', { details: { issues: r.error.issues.slice(0, 10).map((i) => ({ path: i.path.join('.'), message: i.message })) } });
  }
  return r.data;
}

/**
 * @param {{ config: import('./config.js').Config, logger: import('pino').Logger, services: any }} p
 */
export function createApp({ config, logger, services }) {
  const { policies, probeService, jobs, storage, signer, fetch, metrics, engineStatus } = services;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('etag', false);

  const limiters = {
    api: createRateLimiter(config.rateLimits.api),
    probe: createRateLimiter(config.rateLimits.probe),
    jobs: createRateLimiter(config.rateLimits.jobs),
    admin: createRateLimiter(config.rateLimits.admin),
  };
  const sweepTimer = setInterval(() => Object.values(limiters).forEach((l) => l.sweep()), 60_000);
  sweepTimer.unref();

  // request id + access log
  app.use((req, res, next) => {
    const incoming = req.headers['x-request-id'];
    req.id = typeof incoming === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', req.id);
    req.clientKey = signer.clientKey(req.ip);
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      const entry = { reqId: req.id, method: req.method, path: safePath(req.originalUrl), status: res.statusCode, ms: Math.round(ms) };
      if (config.log.clientIp) entry.ip = req.ip;
      if (req.path.startsWith('/api/') || res.statusCode >= 400) logger.info(entry, 'request');
    });
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          ...(config.isProd ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      strictTransportSecurity: config.isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
    next();
  });

  // CORS: off unless explicitly configured (the web app is same-origin).
  if (config.corsOrigins.length) {
    app.use('/api', (req, res, next) => {
      const origin = req.headers.origin;
      if (origin && config.corsOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        if (req.method === 'OPTIONS') return void res.status(204).end();
      }
      next();
    });
  }

  // JSON only for bodies (forces a CORS preflight for cross-site requests = CSRF defence).
  app.use('/api', (req, _res, next) => {
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method) && (Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding']);
    if (hasBody && !req.is('application/json')) return next(new FerryError('UNSUPPORTED_MEDIA_TYPE'));
    next();
  });
  app.use('/api', express.json({ limit: '64kb', strict: true, type: 'application/json' }));

  const rate = (name, cost = 1) => (req, res, next) => {
    const r = limiters[name].take(`${name}:${req.clientKey}`, cost);
    res.setHeader('RateLimit-Limit', String(r.limit));
    res.setHeader('RateLimit-Remaining', String(r.remaining));
    res.setHeader('RateLimit-Reset', String(r.resetSec));
    if (!r.ok) return next(new FerryError('RATE_LIMITED', { params: { seconds: r.retryAfterSec }, retryAfter: r.retryAfterSec }));
    next();
  };
  app.use('/api/v1', rate('api'));

  // ---------------------------------------------------------- service
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.get('/readyz', asyncRoute(async (_req, res) => {
    const free = await storage.freeBytes();
    const checks = { ytdlp: engineStatus.ytdlp.ok, ffmpeg: engineStatus.ffmpeg.ok, ffprobe: engineStatus.ffprobe.ok, disk: free == null || free > config.limits.minFreeDiskMb * 1024 * 1024 };
    const ready = Object.values(checks).every(Boolean);
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks });
  }));

  app.get('/api/v1/config', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      app: { name: BRAND.name, version: BRAND.version },
      limits: {
        maxDurationSec: config.limits.maxDurationSec,
        maxFileSizeBytes: config.limits.maxFileSizeBytes,
        maxBatchUrls: config.limits.maxBatchUrls,
        maxPlaylistItems: config.limits.maxPlaylistItems,
        jobTtlMinutes: config.limits.jobTtlMinutes,
        jobMaxRetentionMinutes: config.limits.jobMaxRetentionMinutes,
        maxActiveJobsPerClient: config.limits.maxActiveJobsPerClient,
        maxGalleryItems: config.limits.maxGalleryItems,
      },
      features: { pauseResume: true, playlists: true, subtitles: true, trim: true, compress: true, thumbnails: true, extend: true, galleries: policies.engineReady('gallery-dl') },
      // Test fixtures only (refused in production): lets the client accept the allowlisted local hosts.
      ...(config.egress.allowHosts.length ? { testHosts: config.egress.allowHosts } : {}),
    });
  });

  app.get('/api/v1/platforms', (req, res) => {
    res.setHeader('ETag', policies.version);
    res.setHeader('Cache-Control', 'no-cache');
    if (req.headers['if-none-match'] === policies.version) return void res.status(304).end();
    res.json({ version: policies.version, platforms: policies.list() });
  });

  app.get('/api/v1/status', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json({
      updatedAt: new Date().toISOString(),
      engines: { extraction: engineStatus.ytdlp.ok, conversion: engineStatus.ffmpeg.ok && engineStatus.ffprobe.ok, galleries: policies.engineReady('gallery-dl') },
      queue: { active: jobs.queue.active, waiting: jobs.queue.waiting, concurrency: config.limits.maxConcurrentJobs },
      platforms: metrics.platformHealth(),
    });
  });

  // ---------------------------------------------------------- analysis
  app.post('/api/v1/probe', rate('probe'), asyncRoute(async (req, res) => {
    const body = parse(probeSchema, req.body);
    const ac = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) ac.abort();
    });
    const result = await probeService.probe({ url: body.url, playlist: Boolean(body.playlist), clientKey: req.clientKey, signal: ac.signal });
    res.json(result);
  }));

  // ---------------------------------------------------------- jobs
  app.post('/api/v1/jobs', rate('jobs'), asyncRoute(async (req, res) => {
    const body = parse(jobSchema, req.body);
    const { job, token } = await jobs.create({ probeId: body.probeId, entryId: body.entryId ?? null, request: normalizeRequest(body), attest: body.attest === true, clientKey: req.clientKey });
    res.status(202).json({ job, token });
  }));

  app.post('/api/v1/jobs/status', asyncRoute(async (req, res) => {
    const body = parse(statusSchema, req.body);
    const out = body.jobs.map(({ id, token }) => {
      try {
        if (!UUID_RE.test(id)) throw new FerryError('JOB_NOT_FOUND');
        return { id, job: jobs.view(jobs.authorize(id, token)) };
      } catch (err) {
        const e = isFerryError(err) ? err : new FerryError('INTERNAL_ERROR');
        return { id, error: e.toJSON() };
      }
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ jobs: out });
  }));

  const withJob = (handler) => asyncRoute(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) throw new FerryError('JOB_NOT_FOUND');
    const token = bearer(req) ?? (typeof req.query.token === 'string' ? req.query.token : null);
    const job = jobs.authorize(req.params.id, token);
    await handler(req, res, job);
  });

  app.get('/api/v1/jobs/:id', withJob((_req, res, job) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ job: jobs.view(job) });
  }));
  app.post('/api/v1/jobs/:id/cancel', withJob(async (_req, res, job) => res.json({ job: await jobs.cancel(job.id) })));
  app.post('/api/v1/jobs/:id/pause', withJob((_req, res, job) => res.json({ job: jobs.pause(job.id) })));
  app.post('/api/v1/jobs/:id/resume', withJob((_req, res, job) => res.json({ job: jobs.resume(job.id) })));
  app.post('/api/v1/jobs/:id/retry', withJob((_req, res, job) => res.json({ job: jobs.retry(job.id) })));
  app.post('/api/v1/jobs/:id/extend', withJob((_req, res, job) => res.json({ job: jobs.extend(job.id) })));
  app.delete('/api/v1/jobs/:id', withJob(async (_req, res, job) => {
    await jobs.remove(job.id);
    res.status(204).end();
  }));

  const fileHeaders = (res, { name, mime, disposition }) => {
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', contentDisposition(name, disposition));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  };

  app.get('/api/v1/jobs/:id/files/:fileId', withJob(async (req, res, job) => {
    if (job.status === 'expired') throw new FerryError('JOB_EXPIRED');
    if (job.status !== 'ready') throw new FerryError('INVALID_STATE');
    const file = job.output.files.find((f) => f.id === req.params.fileId);
    if (!file) throw new FerryError('NOT_FOUND');
    const abs = storage.filePath(job.id, file.diskName);
    const st = await stat(abs).catch(() => null);
    if (!st) throw new FerryError('JOB_EXPIRED');
    // Strong validator so browsers can resume interrupted downloads (If-Range).
    const etag = `"${createHash('sha256').update(`${job.id}:${file.id}:${st.size}:${st.mtimeMs}`).digest('base64url').slice(0, 32)}"`;
    res.setHeader('ETag', etag);
    fileHeaders(res, { name: file.name, mime: file.mime, disposition: req.query.disposition === 'inline' && file.kind !== 'subtitle' ? 'inline' : 'attachment' });
    res.on('finish', () => {
      metrics.inc('ferry_bytes_served_total', {}, Number(res.getHeader('content-length') ?? 0));
      // Privacy option: once the main file has been delivered in full, delete the job's files
      // (after a grace period so an interrupted transfer can still resume). A gallery's
      // "main file" is its only image; larger galleries count as delivered with the ZIP.
      const main = file.kind === 'media' || (file.kind === 'image' && job.output.files.length === 1);
      if (res.statusCode === 200 && main && job.request.privacy?.deleteAfterDownload) jobs.scheduleRemoval(job.id, 2 * 60_000);
    });
    await new Promise((resolve, reject) => {
      res.sendFile(abs, { etag: false, lastModified: true, acceptRanges: true, cacheControl: false, dotfiles: 'deny' }, (err) => {
        if (err && !res.headersSent) reject(err.code === 'ENOENT' ? new FerryError('JOB_EXPIRED') : err);
        else resolve(undefined);
      });
    });
  }));

  app.get('/api/v1/jobs/:id/archive', withJob(async (_req, res, job) => {
    if (job.status !== 'ready') throw new FerryError(job.status === 'expired' ? 'JOB_EXPIRED' : 'INVALID_STATE');
    const names = new Set();
    const entries = job.output.files.map((f) => {
      let name = f.name;
      for (let i = 2; names.has(name); i += 1) name = f.name.replace(/(\.[^.]+)?$/, ` (${i})$1`);
      names.add(name);
      return { name, path: storage.filePath(job.id, f.diskName) };
    });
    const size = await zipSize(entries);
    if (size == null) throw new FerryError('FILE_TOO_LARGE', { params: { size: '4 GB' } });
    const name = job.output.archiveName ?? `${job.output.files[0].name.replace(/\.[^.]+$/, '')}.zip`;
    fileHeaders(res, { name, mime: 'application/zip', disposition: 'attachment' });
    res.setHeader('Content-Length', String(size));
    let complete = false;
    await writeZip(entries, res)
      .then(() => (complete = true))
      .catch((err) => logger.debug({ err }, 'archive stream aborted'));
    res.end();
    if (complete && job.request.mode === 'gallery' && job.request.privacy?.deleteAfterDownload) jobs.scheduleRemoval(job.id, 2 * 60_000);
  }));

  // ---------------------------------------------------------- thumbnails
  const thumbCache = new Map();
  app.get('/api/v1/thumb', asyncRoute(async (req, res) => {
    const remote = signer.verifyThumbnail(req.query.u, req.query.e, req.query.s);
    if (!remote) throw new FerryError('FORBIDDEN');
    let entry = thumbCache.get(remote);
    if (!entry) {
      entry = await fetchImage({ fetch, url: remote });
      thumbCache.set(remote, entry);
      if (thumbCache.size > 40) thumbCache.delete(thumbCache.keys().next().value);
    }
    res.setHeader('Content-Type', entry.type);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.end(entry.body);
  }));

  // ---------------------------------------------------------- admin
  const admin = express.Router();
  admin.use((req, _res, next) => {
    if (!config.security.adminToken) return next(new FerryError('NOT_FOUND'));
    const r = limiters.admin.take(`admin:${req.clientKey}`);
    if (!r.ok) return next(new FerryError('RATE_LIMITED', { params: { seconds: r.retryAfterSec }, retryAfter: r.retryAfterSec }));
    const token = bearer(req);
    if (!token || !safeEqual(token, config.security.adminToken)) return next(new FerryError('FORBIDDEN'));
    next();
  });
  admin.get('/policies', (_req, res) => res.json({ version: policies.version, overrides: policies.overrides, platforms: policies.list() }));
  admin.put('/policies/:platformId', asyncRoute(async (req, res) => {
    const body = parse(policySchema, req.body);
    try {
      await policies.setOverride(req.params.platformId, body, 'admin');
    } catch (err) {
      if (err.code === 'NOT_FOUND') throw new FerryError('NOT_FOUND', { message: 'Unknown platform.' });
      throw err;
    }
    logger.info({ platform: req.params.platformId, policy: body.policy }, 'admin: policy override set');
    res.json({ version: policies.version, override: policies.overrides[req.params.platformId] });
  }));
  admin.delete('/policies/:platformId', asyncRoute(async (req, res) => {
    const removed = await policies.clearOverride(req.params.platformId, 'admin');
    logger.info({ platform: req.params.platformId, removed }, 'admin: policy override cleared');
    res.status(removed ? 204 : 404).end();
  }));
  admin.get('/status', asyncRoute(async (_req, res) => {
    res.json({
      engines: engineStatus,
      queue: { active: jobs.queue.active, waiting: jobs.queue.waiting },
      jobs: services.store.stats(),
      storage: { usedBytes: await storage.usageBytes(), freeBytes: await storage.freeBytes() },
      egress: services.egress.stats,
      uptimeSec: Math.round(process.uptime()),
    });
  }));
  admin.get('/metrics', (_req, res) => {
    res.type('text/plain; version=0.0.4').send(metrics.prometheus({ ferry_queue_depth: jobs.queue.waiting, ferry_active_jobs: jobs.queue.active }));
  });
  app.use('/api/v1/admin', admin);

  app.use('/api', (_req, _res, next) => next(new FerryError('NOT_FOUND')));

  // ---------------------------------------------------------- web app
  if (existsSync(path.join(config.webDist, 'index.html'))) {
    app.use(
      express.static(config.webDist, {
        index: false,
        setHeaders(res, filePath) {
          if (/[\\/]assets[\\/]/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    app.get(/^(?!\/api\/).*/, (req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(config.webDist, 'index.html'));
    });
  }

  // ---------------------------------------------------------- errors
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    let e = err;
    if (err?.type === 'entity.too.large') e = new FerryError('PAYLOAD_TOO_LARGE');
    else if (err?.type === 'entity.parse.failed') e = new FerryError('VALIDATION_FAILED', { message: 'The request body is not valid JSON.' });
    else if (!isFerryError(err)) {
      logger.error({ err, reqId: req.id }, 'unhandled error');
      e = new FerryError('INTERNAL_ERROR');
    }
    if (e.retryAfter) res.setHeader('Retry-After', String(e.retryAfter));
    if (res.headersSent) return void res.destroy();
    res.status(e.status).json({ error: { ...e.toJSON(), requestId: req.id } });
  });

  app.locals.close = () => clearInterval(sweepTimer);
  return app;
}
