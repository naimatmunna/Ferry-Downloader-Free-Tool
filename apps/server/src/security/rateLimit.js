/**
 * Token-bucket rate limiter (memory driver). Keys are pseudonymous client
 * keys (HMAC of IP, IPv6 grouped by /64). A Redis driver would implement
 * the same `take` contract for multi-instance deployments.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 100_000 }) {
  /** @type {Map<string, { tokens: number, at: number }>} */
  const buckets = new Map();
  const refillPerMs = limit / windowMs;

  function take(key, cost = 1, now = Date.now()) {
    let b = buckets.get(key);
    if (!b) {
      if (buckets.size >= maxKeys) buckets.delete(buckets.keys().next().value);
      b = { tokens: limit, at: now };
      buckets.set(key, b);
    } else {
      b.tokens = Math.min(limit, b.tokens + (now - b.at) * refillPerMs);
      b.at = now;
    }
    if (b.tokens >= cost) {
      b.tokens -= cost;
      return { ok: true, limit, remaining: Math.floor(b.tokens), resetSec: Math.ceil((limit - b.tokens) / refillPerMs / 1000), retryAfterSec: 0 };
    }
    const retryAfterSec = Math.max(1, Math.ceil((cost - b.tokens) / refillPerMs / 1000));
    return { ok: false, limit, remaining: 0, resetSec: retryAfterSec, retryAfterSec };
  }

  function sweep(now = Date.now()) {
    for (const [k, b] of buckets) if (b.tokens + (now - b.at) * refillPerMs >= limit) buckets.delete(k);
  }

  return { take, sweep, get size() { return buckets.size; } };
}
