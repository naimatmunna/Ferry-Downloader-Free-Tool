/**
 * Minimal Prometheus-style metrics and per-site live status (aggregate counts
 * only — no URLs, no IPs). Outcomes go into 5-minute buckets kept for 24 hours;
 * a site's status comes from the last 60 minutes when they hold at least 3
 * attempts, otherwise from the last 24 hours.
 */

const BUCKET_MS = 5 * 60_000;
const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;
const MIN_ATTEMPTS = 3;

export function createMetrics({ now = () => Date.now() } = {}) {
  const counters = new Map(); // name{labels} -> value
  const histograms = new Map();
  /** @type {Map<string, { slot: number, ok: number, failed: number, codes: Record<string, number> }[]>} */
  const health = new Map();
  const startedAt = now();

  const key = (name, labels = {}) => {
    const l = Object.entries(labels)
      .map(([k, v]) => `${k}="${String(v).replace(/["\\\n]/g, '_')}"`)
      .join(',');
    return l ? `${name}{${l}}` : name;
  };

  function inc(name, labels, by = 1) {
    const k = key(name, labels);
    counters.set(k, (counters.get(k) ?? 0) + by);
  }

  const BUCKETS = [0.5, 1, 2, 5, 10, 20, 45];
  function observe(name, seconds) {
    const h = histograms.get(name) ?? { buckets: BUCKETS.map(() => 0), sum: 0, count: 0 };
    BUCKETS.forEach((b, i) => {
      if (seconds <= b) h.buckets[i] += 1;
    });
    h.sum += seconds;
    h.count += 1;
    histograms.set(name, h);
  }

  /** Record an outcome for the public status page. */
  function recordOutcome(platformId, ok, code = null) {
    const t = now();
    const slot = Math.floor(t / BUCKET_MS);
    const list = health.get(platformId) ?? [];
    let bucket = list[list.length - 1];
    if (!bucket || bucket.slot !== slot) {
      bucket = { slot, ok: 0, failed: 0, codes: {} };
      list.push(bucket);
    }
    if (ok) bucket.ok += 1;
    else {
      bucket.failed += 1;
      if (code) bucket.codes[code] = (bucket.codes[code] ?? 0) + 1;
    }
    while (list.length && (list[0].slot + 1) * BUCKET_MS <= t - DAY_MS) list.shift();
    health.set(platformId, list);
  }

  /** Source-side failures count against a platform; user-side ones (limits, policy) don't. */
  const SOURCE_CODES = new Set(['EXTRACTION_FAILED', 'NETWORK_ERROR', 'DOWNLOAD_INTERRUPTED', 'SOURCE_RATE_LIMITED', 'TIMEOUT', 'CONVERSION_FAILED']);

  /** ok / source-failure totals of the buckets that end after `since`. */
  function tally(list, since) {
    let ok = 0;
    let failed = 0;
    const codes = {};
    for (const b of list) {
      if ((b.slot + 1) * BUCKET_MS <= since) continue;
      ok += b.ok;
      for (const [c, n] of Object.entries(b.codes)) {
        codes[c] = (codes[c] ?? 0) + n;
        if (SOURCE_CODES.has(c)) failed += n;
      }
    }
    return { ok, total: ok + failed, codes };
  }

  function platformHealth() {
    const t = now();
    const out = {};
    for (const [id, list] of health) {
      const day = tally(list, t - DAY_MS);
      if (!day.total) continue;
      const hour = tally(list, t - HOUR_MS);
      const win = hour.total >= MIN_ATTEMPTS ? hour : day;
      const rate = win.ok / win.total;
      out[id] = {
        window: win === hour ? '1h' : '24h',
        attempts: win.total,
        successRate: Math.round(rate * 1000) / 10,
        status: win.total < MIN_ATTEMPTS ? 'unknown' : rate >= 0.9 ? 'operational' : rate >= 0.5 ? 'degraded' : 'failing',
        topErrors: Object.entries(day.codes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([code, count]) => ({ code, count })),
      };
    }
    return out;
  }

  function prometheus(gauges = {}) {
    const lines = ['# Ferry metrics', `ferry_uptime_seconds ${Math.round((now() - startedAt) / 1000)}`];
    for (const [k, v] of counters) lines.push(`${k} ${v}`);
    for (const [name, value] of Object.entries(gauges)) lines.push(`${name} ${value}`);
    for (const [name, h] of histograms) {
      BUCKETS.forEach((b, i) => lines.push(`${name}_bucket{le="${b}"} ${h.buckets[i]}`));
      lines.push(`${name}_bucket{le="+Inf"} ${h.count}`, `${name}_sum ${h.sum.toFixed(3)}`, `${name}_count ${h.count}`);
    }
    return `${lines.join('\n')}\n`;
  }

  return { inc, observe, recordOutcome, platformHealth, prometheus };
}
