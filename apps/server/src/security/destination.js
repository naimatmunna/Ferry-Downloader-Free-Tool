/**
 * Destination guard: the single place where outbound hostnames are resolved
 * and validated. Every outbound connection (egress proxy tunnels and the
 * API's own fetches) goes through `resolveDestination`, which returns the
 * validated IP to connect to — so the address that was checked is the
 * address that is used (no DNS-rebinding window).
 */
import dns from 'node:dns';
import { FerryError } from '@ferry/shared/errors';
import { classifyIp, isIpLiteral } from './ip.js';

/**
 * @typedef {{ address: string, family: 4|6 }} ResolvedAddress
 * @typedef {(host: string, family: 4|6) => Promise<ResolvedAddress[]>} Resolver
 */

/** The operating system's resolver (hosts file, search domains…), one address family at a time. */
/** @type {Resolver} */
export const systemResolver = async (host, family) => {
  const res = await dns.promises.lookup(host, { family, all: true, verbatim: true });
  return res.map((r) => ({ address: r.address, family: r.family }));
};

/** How long to wait for the second address family once the first has answered. */
const FAMILY_GRACE_MS = 150;
/** Validated answers are reused this long (each connection still goes to a checked IP). */
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 1000;

function blocked(reason, host) {
  return new FerryError('BLOCKED_DESTINATION', { internal: `${reason}: ${host}` });
}

/**
 * @param {{ allowedPorts: number[], allowHosts?: string[], resolver?: Resolver, timeoutMs?: number }} opts
 */
export function createDestinationGuard({ allowedPorts, allowHosts = [], resolver = systemResolver, timeoutMs = 10_000 }) {
  const allow = new Set(allowHosts.map((h) => h.toLowerCase()));
  /** @type {Map<string, { addresses: ResolvedAddress[], expires: number }>} */
  const cache = new Map();

  /**
   * Resolve IPv4 and IPv6 separately. Some networks never answer one family
   * (measured: AAAA for a TikTok CDN host timed out after 15 s while A took
   * 50 ms), and a combined lookup waits for the slower one. The first family
   * with addresses wins, after a short grace period for the other; every
   * address that did arrive is validated by the caller. IPv4 is listed first.
   * @param {string} host
   * @returns {Promise<ResolvedAddress[]>}
   */
  async function resolveHost(host) {
    const hit = cache.get(host);
    if (hit && hit.expires > Date.now()) return hit.addresses;
    /** @type {({ list: ResolvedAddress[] } | { err: any } | null)[]} */
    const results = [null, null];
    await new Promise((resolve) => {
      let grace = null;
      const done = () => {
        clearTimeout(grace);
        resolve(undefined);
      };
      const check = () => {
        if (results.every(Boolean)) done();
        else if (!grace && results.some((r) => r?.list?.length)) grace = setTimeout(done, FAMILY_GRACE_MS);
      };
      [4, 6].forEach((family, i) => {
        withTimeout(Promise.resolve().then(() => resolver(host, family)), timeoutMs, host)
          .then((list) => (results[i] = { list: Array.isArray(list) ? list : [] }), (err) => (results[i] = { err }))
          .then(check);
      });
    });
    const seen = new Set();
    const addresses = results.flatMap((r) => r?.list ?? []).filter((a) => a && !seen.has(a.address) && seen.add(a.address));
    if (!addresses.length) {
      const err = results.find((r) => r?.err)?.err;
      if (err instanceof FerryError) throw err;
      throw new FerryError('NETWORK_ERROR', { internal: `DNS lookup failed for ${host}: ${err?.code ?? err?.message ?? 'no addresses'}` });
    }
    cache.delete(host);
    cache.set(host, { addresses, expires: Date.now() + CACHE_TTL_MS });
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return addresses;
  }

  /**
   * Resolve and validate. Throws BLOCKED_DESTINATION (or NETWORK_ERROR when
   * resolution fails). Returns the address to connect to.
   * @param {string} hostname
   * @param {number} port
   * @returns {Promise<ResolvedAddress & { allowlisted: boolean }>}
   */
  async function resolveDestination(hostname, port) {
    let host = String(hostname ?? '').toLowerCase();
    if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
    if (!host) throw blocked('empty host', hostname);
    const allowlisted = allow.has(`${host}:${port}`);
    if (!allowlisted && !allowedPorts.includes(Number(port))) throw blocked(`port ${port} not allowed`, host);

    let addresses;
    if (isIpLiteral(host)) {
      addresses = [{ address: host, family: host.includes(':') ? 6 : 4 }];
    } else {
      // Hostnames must look like DNS names (no spaces/controls/odd chars).
      if (!/^[a-z0-9._-]+$/.test(host) || host.length > 253) throw blocked('invalid hostname', host);
      addresses = await resolveHost(host);
    }
    if (!addresses?.length) throw new FerryError('NETWORK_ERROR', { internal: `No addresses for ${host}` });
    if (!allowlisted) {
      // Strict: every returned address must be public, otherwise refuse the host entirely.
      for (const a of addresses) {
        const c = classifyIp(a.address);
        if (!c.public) throw blocked(`${a.address} is ${c.kind}`, host);
      }
    }
    const first = addresses[0];
    return { address: first.address, family: first.family === 6 ? 6 : 4, allowlisted };
  }

  /**
   * `lookup` implementation for http(s).request / net.connect. Validates the
   * resolved address at connection time, which also covers redirects.
   * @param {number} port
   */
  function lookupFor(port) {
    return (hostname, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      const all = typeof options === 'object' && options?.all;
      resolveDestination(hostname, port).then(
        (r) => (all ? cb(null, [{ address: r.address, family: r.family }]) : cb(null, r.address, r.family)),
        (err) => cb(Object.assign(err, { code: err.code ?? 'BLOCKED_DESTINATION' })),
      );
    };
  }

  return { resolveDestination, lookupFor };
}

function withTimeout(promise, ms, host) {
  let t;
  return Promise.race([
    promise.finally(() => clearTimeout(t)),
    new Promise((_, reject) => {
      t = setTimeout(() => reject(new FerryError('NETWORK_ERROR', { internal: `DNS timeout: ${host}` })), ms);
    }),
  ]);
}
