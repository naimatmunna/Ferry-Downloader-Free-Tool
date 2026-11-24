/**
 * Effective platform policies = registry defaults + runtime overrides.
 *
 * Overrides live in DATA_DIR/policy-overrides.json. Writes are atomic
 * (temp file + rename); the file is re-read when its mtime changes, so an
 * operator can also edit it by hand — no restart or deploy required.
 */
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { readFileSync, unwatchFile, watchFile } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { canProbe, effectivePolicy, isPolicy } from '@ferry/shared/platforms/policy';

const AVAILABLE_ENGINES = new Set(['yt-dlp', 'internet-archive-api', 'peertube-api', 'direct']);

function parseOverrides(text) {
  const json = JSON.parse(text);
  if (!json || typeof json !== 'object' || typeof json.overrides !== 'object' || json.overrides === null) throw new Error('missing "overrides" object');
  const out = {};
  for (const [id, o] of Object.entries(json.overrides)) {
    if (!/^[a-z0-9*][a-z0-9-]{0,63}$/.test(id)) throw new Error(`invalid platform id "${id}"`);
    if (!o || !isPolicy(o.policy)) throw new Error(`invalid policy for "${id}"`);
    out[id] = {
      policy: o.policy,
      reason: typeof o.reason === 'string' ? o.reason.slice(0, 300) : null,
      updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : null,
      updatedBy: typeof o.updatedBy === 'string' ? o.updatedBy.slice(0, 60) : null,
    };
  }
  return out;
}

/**
 * @param {{ file: string, registry: ReturnType<import('@ferry/shared/platforms/registry').createRegistry>,
 *   catalogVersion: string, logger?: import('pino').Logger, watch?: boolean, engineAvailable?: (engine: string) => boolean }} opts
 */
export function createPolicyService({ file, registry, catalogVersion, logger, watch = true, engineAvailable = (e) => AVAILABLE_ENGINES.has(e) }) {
  const events = new EventEmitter();
  /** @type {Record<string, any>} */
  let overrides = {};
  let version = '';

  function recompute() {
    const h = createHash('sha256').update(catalogVersion).update(JSON.stringify(overrides)).digest('base64url').slice(0, 12);
    version = `W/"p-${h}"`;
  }

  function load() {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        overrides = {};
        recompute();
        return;
      }
      logger?.error({ err }, 'policy: cannot read overrides file; keeping previous overrides');
      return;
    }
    try {
      overrides = parseOverrides(text);
      recompute();
      logger?.info({ count: Object.keys(overrides).length }, 'policy: overrides loaded');
      events.emit('change');
    } catch (err) {
      logger?.error({ err: { message: err.message } }, 'policy: invalid overrides file rejected; keeping previous overrides');
    }
  }

  async function persist(next, by) {
    await mkdir(path.dirname(file), { recursive: true });
    const body = { version: 1, overrides: next };
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(body, null, 2)}\n`, { mode: 0o600 });
    await rename(tmp, file);
    overrides = next;
    recompute();
    logger?.info({ by }, 'policy: overrides updated');
    events.emit('change');
  }

  load();
  if (watch) watchFile(file, { interval: 2000 }, () => load());

  /** @param {import('@ferry/shared/platforms/registry').Platform} platform */
  function effective(platform) {
    return effectivePolicy(platform, overrides);
  }

  function isAvailable(platform) {
    return engineAvailable(platform.engine);
  }

  return {
    events,
    effective,
    isAvailable,
    get version() {
      return version;
    },
    get overrides() {
      return { ...overrides };
    },

    /** Public registry view with effective policies. */
    list() {
      return registry.all.map((p) => {
        const e = effective(p);
        return {
          id: p.id,
          name: p.name,
          kind: p.kind,
          hosts: p.hosts,
          // Regex sources let the web client detect platforms locally (no catalog in the bundle).
          paths: p.paths?.map((r) => r.source) ?? [],
          patterns: p.patterns?.map((r) => r.source) ?? [],
          content: p.content,
          category: p.category,
          policy: e.status,
          reason: e.reason,
          overridden: e.overridden,
          attestation: e.attestation,
          routes: p.routes,
          restrictions: p.restrictions,
          auth: p.auth,
          officialApi: p.officialApi,
          license: p.license ?? null,
          reliability: p.reliability,
          available: isAvailable(p),
          lastChecked: p.lastChecked,
        };
      });
    },

    /** yt-dlp extractor regexes that must never run (blocked/export-only/disabled platforms). */
    excludedExtractors() {
      return registry.excludedExtractors((p) => !canProbe(effective(p).status));
    },

    async setOverride(platformId, { policy, reason }, by = 'admin') {
      if (platformId !== '*' && !registry.get(platformId)) {
        const err = new Error('unknown platform');
        err.code = 'NOT_FOUND';
        throw err;
      }
      if (!isPolicy(policy)) {
        const err = new Error('invalid policy');
        err.code = 'VALIDATION_FAILED';
        throw err;
      }
      const next = { ...overrides, [platformId]: { policy, reason: reason ? String(reason).slice(0, 300) : null, updatedAt: new Date().toISOString(), updatedBy: by } };
      await persist(next, by);
    },

    async clearOverride(platformId, by = 'admin') {
      if (!(platformId in overrides)) return false;
      const next = { ...overrides };
      delete next[platformId];
      await persist(next, by);
      return true;
    },

    close() {
      if (watch) unwatchFile(file);
    },
  };
}
