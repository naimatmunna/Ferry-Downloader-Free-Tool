import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMetrics } from '../../src/metrics.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
const T0 = Date.UTC(2026, 10, 24, 12, 0, 0);

/** Metrics with a controllable clock: `at(offsetMs)` moves time relative to T0. */
function clocked() {
  let now = T0;
  const metrics = createMetrics({ now: () => now });
  return {
    metrics,
    at(offset) {
      now = T0 + offset;
      return metrics;
    },
  };
}

function record(m, n, ok, code = null) {
  for (let i = 0; i < n; i += 1) m.recordOutcome('tiktok', ok, code);
}

test('live status uses the last hour when it has at least 3 attempts', () => {
  const c = clocked();
  record(c.at(-2 * HOUR), 10, true);
  record(c.at(0), 3, false, 'EXTRACTION_FAILED');
  const h = c.at(0).platformHealth().tiktok;
  assert.equal(h.window, '1h');
  assert.equal(h.attempts, 3);
  assert.equal(h.status, 'failing');
  assert.equal(h.successRate, 0);
});

test('live status falls back to 24 hours when the last hour is quiet', () => {
  const c = clocked();
  record(c.at(-3 * HOUR), 5, true);
  record(c.at(0), 1, true);
  const h = c.at(0).platformHealth().tiktok;
  assert.equal(h.window, '24h');
  assert.equal(h.attempts, 6);
  assert.equal(h.status, 'operational');
});

test('the last hour means the last 60 minutes, not the current clock hour', () => {
  const c = clocked();
  record(c.at(-50 * MIN), 3, false, 'NETWORK_ERROR');
  record(c.at(-70 * MIN), 20, true);
  const h = c.at(0).platformHealth().tiktok;
  assert.equal(h.window, '1h');
  assert.equal(h.attempts, 3);
  assert.equal(h.status, 'failing');
});

test('user-side failures do not count against a site', () => {
  const c = clocked();
  record(c.at(0), 5, false, 'ATTESTATION_REQUIRED');
  assert.equal(c.at(0).platformHealth().tiktok, undefined);
});

test('outcomes older than 24 hours are dropped', () => {
  const c = clocked();
  record(c.at(-25 * HOUR), 5, true);
  assert.equal(c.at(0).platformHealth().tiktok, undefined);
});

test('fewer than 3 attempts is unknown', () => {
  const c = clocked();
  record(c.at(0), 2, true);
  const h = c.at(0).platformHealth().tiktok;
  assert.equal(h.status, 'unknown');
  assert.equal(h.attempts, 2);
});

test('mixed results: 90 % or more is operational, 50 % or more is degraded', () => {
  const c = clocked();
  record(c.at(0), 9, true);
  record(c.at(0), 1, false, 'TIMEOUT');
  assert.equal(c.at(0).platformHealth().tiktok.status, 'operational');
  record(c.at(0), 4, false, 'TIMEOUT');
  assert.equal(c.at(0).platformHealth().tiktok.status, 'degraded');
});
