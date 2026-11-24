/**
 * Client-side platform detection. The registry comes from the server
 * (`/api/v1/platforms`, effective policies included) and is cached locally
 * with its ETag, so detection is instant on every keystroke and always
 * reflects the operator's current policy overrides.
 */
import { create } from 'zustand';
import { createRegistry } from '@ferry/shared/platforms/registry';
import { DEFAULT_ALLOWED_PORTS } from '@ferry/shared/url';
import { api } from './api.js';
import { storage } from './storage.js';

const KEY = 'ferry:platforms:v1';

function toRegExp(src) {
  try {
    return typeof src === 'string' && src.length < 200 ? new RegExp(src) : null;
  } catch {
    return null;
  }
}

function build(platforms) {
  const list = platforms.map((p) => ({
    ...p,
    paths: (p.paths ?? []).map(toRegExp).filter(Boolean),
    patterns: (p.patterns ?? []).map(toRegExp).filter(Boolean),
  }));
  try {
    return createRegistry(list);
  } catch {
    return null;
  }
}

export const usePlatforms = create((set, get) => ({
  registry: null,
  platforms: [],
  etag: null,
  error: null,
  config: null,
  testHosts: [],

  async load() {
    const cached = storage.get(KEY);
    if (cached?.platforms && !get().registry) {
      set({ platforms: cached.platforms, etag: cached.etag, registry: build(cached.platforms) });
    }
    try {
      const [fresh, config] = await Promise.all([api.platforms(get().etag), api.config()]);
      set({ config, testHosts: config?.testHosts ?? [] });
      if (fresh) {
        set({ platforms: fresh.platforms, etag: fresh.etag, registry: build(fresh.platforms), error: null });
        storage.set(KEY, { etag: fresh.etag, platforms: fresh.platforms });
      }
    } catch (error) {
      set({ error });
    }
  },
}));

/**
 * Detect a platform for user input. Returns `{ ok:false, reason }` for
 * invalid input, or `{ ok:true, platform, href, via }`.
 */
export function detect(input) {
  const { registry, testHosts } = usePlatforms.getState();
  if (!registry) return null;
  const extraPorts = testHosts.map((h) => Number(h.split(':').pop())).filter(Boolean);
  const r = registry.detect(input, { allowLocal: testHosts.length > 0, allowedPorts: [...DEFAULT_ALLOWED_PORTS, ...extraPorts] });
  if (r.ok && testHosts.length === 0) return r;
  if (r.ok) {
    const authority = `${r.url.hostname}:${r.url.port || (r.url.protocol === 'https:' ? 443 : 80)}`;
    const local = /^(localhost|127\.|10\.|192\.168\.|\[?::1)/.test(r.url.hostname);
    if (local && !testHosts.includes(authority)) return { ok: false, reason: 'local' };
  }
  return r;
}
