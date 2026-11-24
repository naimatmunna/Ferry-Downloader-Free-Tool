/**
 * Probe service: URL → policy-checked, normalized MediaInfo (cached).
 */
import { FerryError } from '@ferry/shared/errors';
import { canProbe, moreRestrictive, policyErrorCode } from '@ferry/shared/platforms/policy';
import { isObviouslyLocalHost } from '@ferry/shared/url';
import { formatDuration } from '@ferry/shared/formats';
import { Semaphore } from '../jobs/queue.js';
import { newProbeId } from '../security/tokens.js';
import { NotThisPlatform } from '../adapters/peertube.js';
import { normalizeInfo, publicMedia } from './normalize.js';

/** Small LRU with TTL. */
export class ProbeCache {
  /** @type {Map<string, any>} */
  #map = new Map();

  constructor(max, ttlMs) {
    this.max = max;
    this.ttlMs = ttlMs;
  }

  set(id, value) {
    this.#map.delete(id);
    this.#map.set(id, { ...value, expiresAt: Date.now() + this.ttlMs });
    while (this.#map.size > this.max) this.#map.delete(this.#map.keys().next().value);
    return this.#map.get(id);
  }

  get(id) {
    const v = this.#map.get(id);
    if (!v) return null;
    if (v.expiresAt < Date.now()) {
      this.#map.delete(id);
      return null;
    }
    return v;
  }

  get size() {
    return this.#map.size;
  }
}

function policyError(platform, policy) {
  const code = policyErrorCode(policy.status) ?? 'PLATFORM_DISABLED';
  return new FerryError(code, {
    ...(policy.reason && code === 'PLATFORM_DISABLED' ? { message: policy.reason } : {}),
    details: {
      platform: { id: platform.id, name: platform.name },
      policy: policy.status,
      category: policy.category,
      reason: policy.reason,
      routes: platform.routes ?? [],
    },
  });
}

/**
 * @param {{ config: import('../config.js').Config, registry: any, policies: any, adapters: any, signer: any,
 *   logger: import('pino').Logger, metrics: any, urlHash: (u: string) => string }} deps
 */
export function createProbeService({ config, registry, policies, adapters, signer, logger, metrics, urlHash }) {
  const cache = new ProbeCache(config.limits.probeCacheSize, config.limits.probeTtlMs);
  const semaphore = new Semaphore(config.limits.maxConcurrentProbes);
  const allowHosts = new Set(config.egress.allowHosts);
  const allowedPorts = [...config.egress.allowedPorts, ...config.egress.allowHosts.map((h) => Number(h.split(':').pop())).filter(Boolean)];

  /** Parse + detect, rejecting obvious local targets (the egress guard is authoritative). */
  function detect(url) {
    const d = registry.detect(String(url ?? ''), { allowLocal: true, allowedPorts });
    if (!d.ok) {
      const reason = d.reason === 'local' ? 'local' : d.reason;
      throw new FerryError(reason === 'local' ? 'BLOCKED_DESTINATION' : 'INVALID_URL', { details: { reason } });
    }
    const authority = `${d.url.hostname}:${d.url.port || (d.url.protocol === 'https:' ? 443 : 80)}`.toLowerCase();
    if (isObviouslyLocalHost(d.url.hostname) && !allowHosts.has(authority)) throw new FerryError('BLOCKED_DESTINATION');
    return d;
  }

  /** Policy for a detected platform, refusing what may not be probed. */
  function gate(platform) {
    const policy = policies.effective(platform);
    if (!canProbe(policy.status)) throw policyError(platform, policy);
    if (!policies.isAvailable(platform)) {
      throw new FerryError('UNSUPPORTED_PLATFORM', {
        message: `${platform.name} isn't available on this server yet.`,
        details: { platform: { id: platform.id, name: platform.name }, routes: platform.routes ?? [] },
      });
    }
    return policy;
  }

  /**
   * After extraction, the real source may differ from the pasted URL (short
   * links, embeds, redirects). Apply the strictest applicable policy.
   */
  function recheck(platform, policy, media) {
    const candidates = [];
    const byIe = registry.byExtractor(media.extractor);
    if (byIe) candidates.push(byIe);
    if (media.webpageUrl) {
      const d = registry.detect(media.webpageUrl, { allowLocal: true, allowedPorts });
      if (d.ok) candidates.push(d.platform);
    }
    let finalPlatform = platform;
    let finalPolicy = policy;
    for (const p of candidates) {
      if (p.id === platform.id || p.id === 'generic' || p.id === 'direct') continue;
      const pol = policies.effective(p);
      if (!canProbe(pol.status)) throw policyError(p, pol);
      if (moreRestrictive(pol.status, finalPolicy.status) === pol.status && pol.status !== finalPolicy.status) {
        finalPlatform = p;
        finalPolicy = pol;
      } else if (finalPlatform.id === 'generic') {
        finalPlatform = p; // more specific attribution, same policy class
        finalPolicy = pol;
      }
    }
    return { platform: finalPlatform, policy: finalPolicy };
  }

  /**
   * @param {{ url: string, playlist?: boolean, clientKey: string, signal?: AbortSignal }} p
   */
  async function probe({ url, playlist = false, clientKey, signal }) {
    const started = Date.now();
    let detection = detect(url);
    let platform = detection.platform;
    let policy = gate(platform);
    let adapter = adapters.forPlatform(platform, detection);
    if (!adapter) throw new FerryError('UNSUPPORTED_PLATFORM');

    const release = await semaphore.acquire(config.limits.probeQueueWaitMs);
    let info;
    try {
      const timeout = AbortSignal.timeout(config.limits.probeTimeoutMs + 5000);
      const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
      try {
        info = await adapter.probe({ url: detection.href, playlist, signal: combined, tag: urlHash(detection.href) });
      } catch (err) {
        if (!(err instanceof NotThisPlatform)) throw err;
        // Looked federated but isn't: treat as an ordinary website.
        platform = registry.get('generic');
        policy = gate(platform);
        adapter = adapters.byId('yt-dlp');
        detection = { ...detection, platform, via: 'generic' };
        info = await adapter.probe({ url: detection.href, playlist, signal: combined, tag: urlHash(detection.href) });
      }
    } catch (err) {
      metrics.inc('ferry_probes_total', { result: 'error', code: err?.code ?? 'INTERNAL_ERROR' });
      metrics.recordOutcome(platform.id, false, err?.code);
      throw err;
    } finally {
      release();
    }

    const media = normalizeInfo(info, { maxPlaylistItems: config.limits.maxPlaylistItems });
    ({ platform, policy } = recheck(platform, policy, media));

    if (media.durationSec != null && media.durationSec > config.limits.maxDurationSec) {
      throw new FerryError('DURATION_LIMIT', { params: { duration: formatDuration(config.limits.maxDurationSec) } });
    }

    const id = newProbeId();
    const thumbnailUrl = media.thumbnailSource ? signer.thumbnailUrl(media.thumbnailSource) : null;
    const entry = cache.set(id, {
      id,
      clientKey,
      href: detection.href,
      platformId: platform.id,
      adapterId: adapter.id,
      policy,
      media,
      thumbnailUrl,
      detection: { via: detection.via, directExt: detection.directExt ?? null },
    });
    metrics.inc('ferry_probes_total', { result: 'ok' });
    metrics.observe('ferry_probe_duration_seconds', (Date.now() - started) / 1000);
    metrics.recordOutcome(platform.id, true);
    logger.info({ platform: platform.id, url: urlHash(detection.href), kind: media.kind, ms: Date.now() - started }, 'probe ok');

    return {
      probe: { id, expiresAt: new Date(entry.expiresAt).toISOString() },
      source: {
        url: detection.href,
        platform: { id: platform.id, name: platform.name, kind: platform.kind },
        policy: { status: policy.status, category: policy.category, attestation: policy.attestation, reason: policy.reason, routes: platform.routes ?? [] },
      },
      media: publicMedia(media, { thumbnailUrl }),
      limits: { maxFileSizeBytes: config.limits.maxFileSizeBytes, maxDurationSec: config.limits.maxDurationSec },
    };
  }

  return { probe, detect, cache, gate };
}
