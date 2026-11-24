/**
 * Capability tokens, client keys and signed URLs.
 */
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import ipaddr from 'ipaddr.js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const newJobId = () => randomUUID();
export const newToken = () => randomBytes(32).toString('base64url');
export const newProbeId = () => `p_${randomBytes(16).toString('base64url')}`;
export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');

/** Constant-time comparison of a presented token with a stored hash. */
export function tokenMatches(token, storedHash) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200 || typeof storedHash !== 'string') return false;
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Constant-time string comparison (admin token). */
export function safeEqual(a, b) {
  const x = createHash('sha256').update(String(a)).digest();
  const y = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(x, y) && String(a).length === String(b).length;
}

/** @param {string} secret */
export function createSigner(secret) {
  const mac = (data) => createHmac('sha256', secret).update(data).digest('base64url');

  /**
   * Pseudonymous client identifier for fairness limits. IPv6 addresses are
   * grouped by /64 so a single host cannot rotate through its subnet.
   * @param {string} ip
   */
  function clientKey(ip) {
    let key = String(ip ?? 'unknown');
    try {
      let addr = ipaddr.parse(key);
      if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) addr = addr.toIPv4Address();
      if (addr.kind() === 'ipv6') {
        const parts = addr.toNormalizedString().split(':').slice(0, 4);
        key = `${parts.join(':')}::/64`;
      } else key = addr.toString();
    } catch {
      /* keep raw */
    }
    return createHmac('sha256', secret).update(`client:${key}`).digest('hex').slice(0, 32);
  }

  /** Signed, expiring thumbnail-proxy URL for a remote image. */
  function thumbnailUrl(remoteUrl, ttlSec = 6 * 3600) {
    if (!remoteUrl) return null;
    const u = Buffer.from(remoteUrl).toString('base64url');
    const e = Math.floor(Date.now() / 1000) + ttlSec;
    return `/api/v1/thumb?u=${u}&e=${e}&s=${mac(`thumb:${u}:${e}`)}`;
  }

  /** @returns {string|null} the remote URL when the signature is valid and fresh */
  function verifyThumbnail(u, e, s) {
    if (typeof u !== 'string' || typeof e !== 'string' || typeof s !== 'string' || u.length > 4096) return null;
    if (!/^\d{9,12}$/.test(e) || Number(e) < Date.now() / 1000) return null;
    const expected = Buffer.from(mac(`thumb:${u}:${e}`));
    const given = Buffer.from(s);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
      const url = Buffer.from(u, 'base64url').toString('utf8');
      return /^https?:\/\//i.test(url) ? url : null;
    } catch {
      return null;
    }
  }

  return { clientKey, thumbnailUrl, verifyThumbnail, mac };
}
