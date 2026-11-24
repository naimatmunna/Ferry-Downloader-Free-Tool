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
 * @typedef {(host: string) => Promise<ResolvedAddress[]>} Resolver
 */

/** @type {Resolver} */
export const systemResolver = async (host) => {
  const res = await dns.promises.lookup(host, { all: true, verbatim: true });
  return res.map((r) => ({ address: r.address, family: r.family }));
};

function blocked(reason, host) {
  return new FerryError('BLOCKED_DESTINATION', { internal: `${reason}: ${host}` });
}

/**
 * @param {{ allowedPorts: number[], allowHosts?: string[], resolver?: Resolver, timeoutMs?: number }} opts
 */
export function createDestinationGuard({ allowedPorts, allowHosts = [], resolver = systemResolver, timeoutMs = 10_000 }) {
  const allow = new Set(allowHosts.map((h) => h.toLowerCase()));

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
      try {
        addresses = await withTimeout(resolver(host), timeoutMs);
      } catch (err) {
        if (err instanceof FerryError) throw err;
        throw new FerryError('NETWORK_ERROR', { internal: `DNS lookup failed for ${host}: ${err?.code ?? err?.message}` });
      }
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

function withTimeout(promise, ms) {
  let t;
  return Promise.race([
    promise.finally(() => clearTimeout(t)),
    new Promise((_, reject) => {
      t = setTimeout(() => reject(new FerryError('NETWORK_ERROR', { internal: 'DNS timeout' })), ms);
    }),
  ]);
}
