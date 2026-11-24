/**
 * Environment configuration. Every value has a safe default for local
 * development; production refuses to start without required secrets and
 * rejects test-only escape hatches.
 */
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { locateTool } from './engines/locate.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '../../..');
export const SERVER_ROOT = path.resolve(here, '..');

function int(value, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, name } = {}) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Invalid integer for ${name}: ${value}`);
  return n;
}

function bool(value, fallback) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function list(value) {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTrustProxy(value) {
  if (value == null || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return list(value); // e.g. "loopback, 10.0.0.0/8"
}

/** Locate a project-local engine (virtualenv) before falling back to PATH. */
function detectVenvTool(name) {
  const candidates = [
    path.join(REPO_ROOT, '.venv', 'Scripts', `${name}.exe`),
    path.join(REPO_ROOT, '.venv', 'bin', name),
  ];
  return candidates.find((p) => existsSync(p)) ?? name;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  const role = env.ROLE || 'all';
  if (!['all'].includes(role)) {
    throw new Error(`ROLE=${role} requires the scale-out drivers (Redis/BullMQ), which are not part of this release. Use ROLE=all.`);
  }

  let signingSecret = env.SIGNING_SECRET || '';
  if (!signingSecret) {
    if (isProd) throw new Error('SIGNING_SECRET is required in production (32+ random bytes, e.g. `openssl rand -base64 48`).');
    signingSecret = randomBytes(32).toString('base64url');
  }
  if (isProd && signingSecret.length < 32) throw new Error('SIGNING_SECRET must be at least 32 characters.');

  const adminToken = env.ADMIN_TOKEN || null;
  if (isProd && adminToken && adminToken.length < 32) throw new Error('ADMIN_TOKEN must be at least 32 characters.');

  // host:port pairs that may bypass the private-address guard. Test fixtures only.
  const allowHosts = list(env.SSRF_ALLOW_HOSTS).map((s) => s.toLowerCase());
  if (allowHosts.length && isProd) throw new Error('SSRF_ALLOW_HOSTS is a test-only setting and is refused in production.');

  const dataDir = path.resolve(env.DATA_DIR || path.join(SERVER_ROOT, 'var'));

  const cfg = {
    env: nodeEnv,
    isProd,
    isTest,
    role,
    host: env.HOST || (isProd ? '0.0.0.0' : '127.0.0.1'),
    port: int(env.PORT, 8787, { min: 0, max: 65535, name: 'PORT' }),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    corsOrigins: list(env.CORS_ORIGINS),
    dataDir,
    jobsDir: path.join(dataDir, 'jobs'),
    cacheDir: path.join(dataDir, 'cache'),
    policyFile: path.join(dataDir, 'policy-overrides.json'),
    webDist: env.WEB_DIST ? path.resolve(env.WEB_DIST) : path.join(REPO_ROOT, 'apps', 'web', 'dist'),
    engines: {
      ytdlp: env.YTDLP_PATH || detectVenvTool('yt-dlp'),
      // Image galleries (optional engine; GPL-2.0, run as a separate program only).
      galleryDl: env.GALLERYDL_PATH || detectVenvTool('gallery-dl'),
      // PATH first, then (Windows) winget/Chocolatey/Scoop locations; see engines/locate.js.
      ffmpeg: env.FFMPEG_PATH || locateTool('ffmpeg', { env }) || 'ffmpeg',
      ffprobe: env.FFPROBE_PATH || locateTool('ffprobe', { env }) || 'ffprobe',
      // No JavaScript runtime by default: yt-dlp only needs one to solve
      // YouTube's player challenges, which Ferry does not do (see RESEARCH.md).
      jsRuntime: env.YTDLP_JS_RUNTIME || 'none',
      threads: int(env.FFMPEG_THREADS, Math.max(1, Math.min(4, os.availableParallelism?.() ?? 2)), { min: 1, max: 64, name: 'FFMPEG_THREADS' }),
    },
    limits: {
      maxDurationSec: int(env.MAX_DURATION_SECONDS, 3 * 60 * 60, { min: 1, name: 'MAX_DURATION_SECONDS' }),
      maxFileSizeBytes: int(env.MAX_FILESIZE_MB, 2048, { min: 1, name: 'MAX_FILESIZE_MB' }) * 1024 * 1024,
      maxConcurrentJobs: int(env.MAX_CONCURRENT_JOBS, Math.max(1, Math.min(4, Math.floor((os.availableParallelism?.() ?? 2) / 2) || 1)), { min: 1, max: 64, name: 'MAX_CONCURRENT_JOBS' }),
      maxConcurrentProbes: int(env.MAX_CONCURRENT_PROBES, 4, { min: 1, max: 64, name: 'MAX_CONCURRENT_PROBES' }),
      probeQueueWaitMs: int(env.PROBE_QUEUE_WAIT_MS, 10_000, { min: 0, name: 'PROBE_QUEUE_WAIT_MS' }),
      maxQueueLength: int(env.MAX_QUEUE_LENGTH, 100, { min: 1, name: 'MAX_QUEUE_LENGTH' }),
      maxActiveJobsPerClient: int(env.MAX_ACTIVE_JOBS_PER_CLIENT, 4, { min: 1, name: 'MAX_ACTIVE_JOBS_PER_CLIENT' }),
      jobTtlMinutes: int(env.JOB_TTL_MINUTES, 60, { min: 1, name: 'JOB_TTL_MINUTES' }),
      jobMaxRetentionMinutes: int(env.JOB_MAX_RETENTION_MINUTES, 24 * 60, { min: 1, name: 'JOB_MAX_RETENTION_MINUTES' }),
      probeTimeoutMs: int(env.PROBE_TIMEOUT_MS, 45_000, { min: 1000, name: 'PROBE_TIMEOUT_MS' }),
      jobTimeoutMs: int(env.JOB_TIMEOUT_MS, 60 * 60 * 1000, { min: 1000, name: 'JOB_TIMEOUT_MS' }),
      stallTimeoutMs: int(env.STALL_TIMEOUT_MS, 120_000, { min: 1000, name: 'STALL_TIMEOUT_MS' }),
      minFreeDiskMb: int(env.MIN_FREE_DISK_MB, 1024, { min: 0, name: 'MIN_FREE_DISK_MB' }),
      maxStorageMb: int(env.MAX_STORAGE_MB, 20 * 1024, { min: 1, name: 'MAX_STORAGE_MB' }),
      maxPlaylistItems: int(env.MAX_PLAYLIST_ITEMS, 50, { min: 1, max: 500, name: 'MAX_PLAYLIST_ITEMS' }),
      maxBatchUrls: int(env.MAX_BATCH_URLS, 20, { min: 1, max: 100, name: 'MAX_BATCH_URLS' }),
      maxGalleryItems: int(env.MAX_GALLERY_ITEMS, 100, { min: 1, max: 500, name: 'MAX_GALLERY_ITEMS' }),
      maxImageBytes: int(env.MAX_IMAGE_MB, 100, { min: 1, max: 4096, name: 'MAX_IMAGE_MB' }) * 1024 * 1024,
      maxImagePixels: int(env.MAX_IMAGE_MEGAPIXELS, 100, { min: 1, max: 900, name: 'MAX_IMAGE_MEGAPIXELS' }) * 1_000_000,
      probeCacheSize: int(env.PROBE_CACHE_SIZE, 500, { min: 10, name: 'PROBE_CACHE_SIZE' }),
      probeTtlMs: int(env.PROBE_TTL_MINUTES, 15, { min: 1, name: 'PROBE_TTL_MINUTES' }) * 60 * 1000,
      maxProbeOutputBytes: 32 * 1024 * 1024,
    },
    rateLimits: {
      api: { limit: int(env.RATE_LIMIT_API_PER_MIN, 300, { min: 1, name: 'RATE_LIMIT_API_PER_MIN' }), windowMs: 60_000 },
      probe: { limit: int(env.RATE_LIMIT_PROBE_PER_MIN, 30, { min: 1, name: 'RATE_LIMIT_PROBE_PER_MIN' }), windowMs: 60_000 },
      jobs: { limit: int(env.RATE_LIMIT_JOBS_PER_MIN, 20, { min: 1, name: 'RATE_LIMIT_JOBS_PER_MIN' }), windowMs: 60_000 },
      admin: { limit: 60, windowMs: 60_000 },
    },
    egress: {
      allowedPorts: list(env.EGRESS_ALLOWED_PORTS || '80,443,8080,8443').map(Number),
      allowHosts,
      maxConnections: int(env.EGRESS_MAX_CONNECTIONS, 256, { min: 1, name: 'EGRESS_MAX_CONNECTIONS' }),
    },
    security: { signingSecret, adminToken },
    userAgent: env.USER_AGENT || 'Ferry/1.0 (self-hosted media downloader)',
    log: {
      level: env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
      clientIp: bool(env.LOG_CLIENT_IP, false),
      pretty: bool(env.LOG_PRETTY, !isProd && !isTest),
    },
  };
  return cfg;
}

/** @typedef {ReturnType<typeof loadConfig>} Config */
