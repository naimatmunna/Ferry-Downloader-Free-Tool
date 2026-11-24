/**
 * Wires configuration, engines and services into a runnable Ferry instance.
 * Used by main.js and by integration tests (which inject their own config).
 */
import http from 'node:http';
import { mkdir } from 'node:fs/promises';
import { canProbe } from '@ferry/shared/platforms/policy';
import { createRegistry } from '@ferry/shared/platforms/registry';
import { createApp } from './app.js';
import { createAdapters } from './adapters/index.js';
import { runProcess, engineEnv, which } from './engines/process.js';
import { MemoryJobStore } from './jobs/store.js';
import { createJobService } from './jobs/service.js';
import { createPipeline } from './jobs/pipeline.js';
import { createLogger, urlHash } from './logger.js';
import { createProbeService } from './media/probeService.js';
import { createMetrics } from './metrics.js';
import { createPolicyService } from './policy/policies.js';
import { createDestinationGuard } from './security/destination.js';
import { startEgressProxy } from './security/egressProxy.js';
import { createGuardedFetch, DEFAULT_USER_AGENT } from './security/guardedFetch.js';
import { createSigner } from './security/tokens.js';
import { createJobStorage } from './storage/jobFiles.js';

async function checkEngine(bin, args) {
  const resolved = await which(bin);
  if (!resolved) return { ok: false, path: bin, version: null };
  try {
    const r = await runProcess(resolved, args, { env: engineEnv(), timeoutMs: 20_000, collectStdout: true, lowPriority: false });
    const version = r.stdout.split(/\r?\n/)[0]?.trim().slice(0, 120) || null;
    return { ok: r.code === 0, path: resolved, version };
  } catch {
    return { ok: false, path: resolved, version: null };
  }
}

/**
 * @param {import('./config.js').Config} config
 * @param {{ logger?: import('pino').Logger, catalog?: any[], catalogVersion?: string }} [opts]
 */
export async function createFerry(config, opts = {}) {
  const logger = opts.logger ?? createLogger(config.log);
  let catalog = opts.catalog;
  let catalogVersion = opts.catalogVersion ?? 'test';
  if (!catalog) {
    const mod = await import('@ferry/shared/platforms/catalog');
    catalog = mod.CATALOG;
    catalogVersion = mod.CATALOG_VERSION;
  }

  await mkdir(config.dataDir, { recursive: true, mode: 0o700 });
  await mkdir(config.cacheDir, { recursive: true, mode: 0o700 });

  const [ytdlp, ffmpeg, ffprobe, galleryDl] = await Promise.all([
    checkEngine(config.engines.ytdlp, ['--version']),
    checkEngine(config.engines.ffmpeg, ['-version']),
    checkEngine(config.engines.ffprobe, ['-version']),
    checkEngine(config.engines.galleryDl, ['--version']),
  ]);
  const engineStatus = { ytdlp, ffmpeg, ffprobe, galleryDl };
  for (const [name, s] of Object.entries(engineStatus)) {
    if (!s.ok) logger.warn({ engine: name, path: s.path }, 'engine unavailable — related features are disabled');
  }
  if (!ffmpeg.ok || !ffprobe.ok) {
    logger.error(
      { ffmpeg: ffmpeg.path, ffprobe: ffprobe.path },
      'FFmpeg/ffprobe not found: every link is refused until they are installed. Install FFmpeg, or set FFMPEG_PATH and FFPROBE_PATH (then restart).',
    );
  }

  const registry = createRegistry(catalog);
  const guard = createDestinationGuard({ allowedPorts: config.egress.allowedPorts, allowHosts: config.egress.allowHosts });
  if (config.egress.allowHosts.length) logger.warn({ hosts: config.egress.allowHosts }, 'SSRF_ALLOW_HOSTS is set (test only)');
  const egress = await startEgressProxy({ guard, logger, maxConnections: config.egress.maxConnections });
  const fetch = createGuardedFetch({ guard, userAgent: config.userAgent ?? DEFAULT_USER_AGENT });
  const signer = createSigner(config.security.signingSecret);
  const metrics = createMetrics();
  const hash = (u) => urlHash(config.security.signingSecret, u);

  const nativeEngines = new Set(['internet-archive-api', 'peertube-api', 'direct']);
  const policies = createPolicyService({
    file: config.policyFile,
    registry,
    catalogVersion,
    logger,
    watch: !config.isTest,
    engineAvailable: (engine) => {
      if (engine === 'yt-dlp') return ytdlp.ok;
      // Every gallery image is re-encoded, so galleries need FFmpeg and ffprobe as well.
      if (engine === 'gallery-dl') return galleryDl.ok && ffmpeg.ok && ffprobe.ok;
      return nativeEngines.has(engine) && ffmpeg.ok;
    },
  });

  // Same port rules as the probe service, so links found by engines are attributed identically.
  const allowedPorts = [...config.egress.allowedPorts, ...config.egress.allowHosts.map((h) => Number(h.split(':').pop())).filter(Boolean)];
  const adapters = createAdapters({
    config,
    logger,
    egress,
    fetch,
    engines: { ytdlp: ytdlp.path, ffmpeg: ffmpeg.path, ffprobe: ffprobe.path, galleryDl: galleryDl.path },
    excludedExtractors: () => policies.excludedExtractors(),
    platformOf: (url) => {
      const d = registry.detect(url, { allowLocal: true, allowedPorts });
      return d.ok ? d.platform.id : null;
    },
    // Files an engine lists on a *known* platform's servers inherit that platform's policy.
    policyAllows: (url) => {
      const d = registry.detect(url, { allowLocal: true, allowedPorts });
      if (!d.ok) return false;
      if (d.platform.id === 'generic' || d.platform.id === 'direct') return true;
      return canProbe(policies.effective(d.platform).status);
    },
  });
  const storage = createJobStorage({ jobsDir: config.jobsDir, limits: config.limits, logger });
  await storage.init();
  const store = new MemoryJobStore();
  const probeService = createProbeService({ config, registry, policies, adapters, signer, logger, metrics, urlHash: hash, processingReady: () => ffmpeg.ok && ffprobe.ok });
  const pipeline = createPipeline({ config, storage, adapters, fetch, engines: { ffmpeg: ffmpeg.path, ffprobe: ffprobe.path }, logger });
  const jobs = createJobService({ config, store, probeCache: probeService.cache, registry, policies, probeService, pipeline, storage, logger, metrics, urlHash: hash });

  const services = { registry, policies, probeService, jobs, storage, signer, fetch, metrics, engineStatus, store, egress, adapters };
  const app = createApp({ config, logger, services });

  const sweeper = setInterval(() => {
    jobs.sweep().catch((err) => logger.error({ err }, 'sweep failed'));
  }, 30_000);
  sweeper.unref();

  /** @type {http.Server|null} */
  let server = null;
  return {
    app,
    services,
    config,
    logger,
    async listen(port = config.port, host = config.host) {
      server = http.createServer(app);
      server.headersTimeout = 20_000;
      server.requestTimeout = 60_000;
      server.keepAliveTimeout = 5_000;
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => resolve(undefined));
      });
      return /** @type {import('node:net').AddressInfo} */ (server.address());
    },
    async close() {
      clearInterval(sweeper);
      app.locals.close?.();
      await jobs.shutdown();
      policies.close();
      await egress.close();
      if (server) {
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(() => resolve(undefined)));
      }
    },
  };
}
