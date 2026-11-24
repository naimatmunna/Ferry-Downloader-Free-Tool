/**
 * Outbound HTTP for the API process itself (official APIs, thumbnails,
 * direct-file probing and downloads). Every connection — including each
 * redirect hop — resolves through the destination guard and connects to the
 * validated IP. Bodies are size-capped; nothing unbounded is buffered.
 */
import http from 'node:http';
import https from 'node:https';
import { FerryError } from '@ferry/shared/errors';
import { isIpLiteral } from './ip.js';

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
export const DEFAULT_USER_AGENT = 'Ferry/1.0 (self-hosted media downloader)';

/**
 * @param {{ guard: ReturnType<import('./destination.js').createDestinationGuard>, userAgent?: string }} deps
 */
export function createGuardedFetch({ guard, userAgent = DEFAULT_USER_AGENT }) {
  /**
   * @param {string|URL} input
   * @param {{ method?: string, headers?: Record<string,string>, timeoutMs?: number, maxRedirects?: number, signal?: AbortSignal }} [opts]
   * @returns {Promise<GuardedResponse>}
   */
  async function guardedFetch(input, opts = {}) {
    const { method = 'GET', headers = {}, timeoutMs = 15_000, maxRedirects = 5, signal } = opts;
    let url = new URL(String(input));
    let verb = method;
    for (let hop = 0; ; hop += 1) {
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new FerryError('BLOCKED_DESTINATION', { internal: `scheme ${url.protocol}` });
      if (url.username || url.password) throw new FerryError('BLOCKED_DESTINATION', { internal: 'credentials in URL' });
      const res = await requestOnce(url, verb, headers, timeoutMs, signal);
      if (REDIRECTS.has(res.statusCode ?? 0) && res.headers.location) {
        res.resume();
        if (hop >= maxRedirects) throw new FerryError('NETWORK_ERROR', { internal: 'too many redirects' });
        url = new URL(res.headers.location, url);
        if (res.statusCode === 303) verb = 'GET';
        continue;
      }
      return wrap(res, url);
    }
  }

  function requestOnce(url, method, headers, timeoutMs, signal) {
    const port = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
    const mod = url.protocol === 'https:' ? https : http;
    // Resolve + validate explicitly (Node skips `lookup` for IP literals), then
    // connect to the validated address; the hostname is kept for SNI and Host.
    const hostname = url.hostname.startsWith('[') ? url.hostname.slice(1, -1) : url.hostname;
    const destination = guard.resolveDestination(hostname, port);
    return destination.then((resolved) => new Promise((resolve, reject) => {
      const req = mod.request(
        {
          protocol: url.protocol,
          hostname: resolved.address,
          family: resolved.family,
          port,
          path: `${url.pathname}${url.search}`,
          method,
          headers: { 'user-agent': userAgent, accept: '*/*', ...headers, host: url.host },
          ...(url.protocol === 'https:' && !isIpLiteral(hostname) ? { servername: hostname } : {}),
          timeout: timeoutMs,
          signal,
          agent: false,
        },
        resolve,
      );
      req.on('timeout', () => req.destroy(new FerryError('TIMEOUT', { internal: `request timeout ${url.hostname}` })));
      req.on('error', (err) => {
        if (err instanceof FerryError) return reject(err);
        if (err?.code === 'BLOCKED_DESTINATION' || err?.name === 'FerryError') return reject(err);
        if (err?.name === 'AbortError') return reject(new FerryError('CANCELLED'));
        reject(new FerryError('NETWORK_ERROR', { internal: `${url.hostname}: ${err?.code ?? err?.message}`, cause: err }));
      });
      req.end();
    }));
  }

  return guardedFetch;
}

/**
 * @typedef {{
 *   status: number, headers: http.IncomingHttpHeaders, url: URL, stream: http.IncomingMessage,
 *   buffer: (maxBytes: number) => Promise<Buffer>, text: (maxBytes: number) => Promise<string>,
 *   json: (maxBytes: number) => Promise<any>, discard: () => void,
 * }} GuardedResponse
 */

/** @param {http.IncomingMessage} res @param {URL} url @returns {GuardedResponse} */
function wrap(res, url) {
  const buffer = (maxBytes) =>
    new Promise((resolve, reject) => {
      const declared = Number(res.headers['content-length']);
      if (Number.isFinite(declared) && declared > maxBytes) {
        res.destroy();
        reject(new FerryError('FILE_TOO_LARGE', { internal: `declared ${declared} > ${maxBytes}`, params: { size: `${maxBytes} bytes` } }));
        return;
      }
      const chunks = [];
      let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size > maxBytes) {
          res.destroy();
          reject(new FerryError('FILE_TOO_LARGE', { internal: `body > ${maxBytes}`, params: { size: `${maxBytes} bytes` } }));
          return;
        }
        chunks.push(c);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', (err) => reject(new FerryError('NETWORK_ERROR', { internal: err.message })));
    });
  return {
    status: res.statusCode ?? 0,
    headers: res.headers,
    url,
    stream: res,
    buffer,
    text: async (maxBytes) => (await buffer(maxBytes)).toString('utf8'),
    json: async (maxBytes) => {
      const t = (await buffer(maxBytes)).toString('utf8');
      try {
        return JSON.parse(t);
      } catch {
        throw new FerryError('EXTRACTION_FAILED', { internal: `invalid JSON from ${url.hostname}` });
      }
    },
    discard: () => res.resume(),
  };
}
