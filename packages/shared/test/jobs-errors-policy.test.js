import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionsFor, assertTransition, canTransition, isActive, isSettled, JOB_STATUSES, TRANSITIONS } from '../src/jobs.js';
import { ERRORS, FerryError, fillTemplate, isFerryError, isRetryable } from '../src/errors.js';
import { canDownload, canProbe, defaultAttestation, effectivePolicy, moreRestrictive, policyErrorCode } from '../src/platforms/policy.js';

test('every status has a transition list and terminal states are reachable', () => {
  for (const s of JOB_STATUSES) assert.ok(Array.isArray(TRANSITIONS[s]), s);
  assert.equal(canTransition('queued', 'downloading'), true);
  assert.equal(canTransition('downloading', 'processing'), true);
  assert.equal(canTransition('processing', 'ready'), true);
  assert.equal(canTransition('ready', 'expired'), true);
  assert.equal(canTransition('failed', 'queued'), true); // retry
  assert.equal(canTransition('paused', 'queued'), true); // resume
});

test('illegal transitions are rejected', () => {
  assert.equal(canTransition('ready', 'downloading'), false);
  assert.equal(canTransition('expired', 'queued'), false);
  assert.equal(canTransition('cancelled', 'queued'), false);
  assert.equal(canTransition('processing', 'paused'), false);
  assert.throws(() => assertTransition('ready', 'queued'), { code: 'INVALID_STATE' });
});

test('active/settled partitions all statuses', () => {
  for (const s of JOB_STATUSES) assert.notEqual(isActive(s), isSettled(s), s);
});

test('actionsFor exposes only valid actions', () => {
  assert.deepEqual(actionsFor({ status: 'downloading' }), { pause: true, resume: false, cancel: true, retry: false, delete: true });
  assert.equal(actionsFor({ status: 'failed', attempt: 1, error: { retryable: true } }).retry, true);
  assert.equal(actionsFor({ status: 'failed', attempt: 3, maxAttempts: 3, error: { retryable: true } }).retry, false);
  assert.equal(actionsFor({ status: 'failed', attempt: 1, error: { retryable: false } }).retry, false);
  assert.equal(actionsFor({ status: 'expired' }).delete, false);
});

test('error catalog entries are complete', () => {
  for (const [code, spec] of Object.entries(ERRORS)) {
    assert.ok(spec.status >= 400 && spec.status < 600, code);
    assert.equal(typeof spec.retryable, 'boolean', code);
    assert.ok(spec.message.length > 5, code);
  }
  assert.equal(isRetryable('NETWORK_ERROR'), true);
  assert.equal(isRetryable('PRIVATE_CONTENT'), false);
  assert.equal(isRetryable('UNKNOWN_CODE'), true); // falls back to INTERNAL_ERROR
});

test('FerryError fills templates and serializes safely', () => {
  const e = new FerryError('RATE_LIMITED', { params: { seconds: 12 }, internal: 'secret detail', retryAfter: 12 });
  assert.equal(e.status, 429);
  assert.equal(e.message, "You're going a bit fast. Try again in 12 s.");
  assert.deepEqual(JSON.parse(JSON.stringify(e)), { code: 'RATE_LIMITED', message: e.message, retryable: true });
  assert.equal(isFerryError(e), true);
  assert.equal(new FerryError('NOPE').code, 'INTERNAL_ERROR');
  assert.equal(fillTemplate('{a}-{b}', { a: 1 }), '1-');
});

const yt = { id: 'yt', name: 'Tube', category: 4, policy: 'attestation' };
const ia = { id: 'ia', name: 'Archive', category: 1, policy: 'allowed' };
const drm = { id: 'drm', name: 'Stream+', category: 5, policy: 'blocked' };

test('effectivePolicy applies per-platform overrides', () => {
  assert.equal(effectivePolicy(yt).status, 'attestation');
  assert.match(effectivePolicy(yt).attestation, /Tube's terms restrict downloading/);
  const o = effectivePolicy(ia, { ia: { policy: 'disabled', reason: 'maintenance' } });
  assert.deepEqual([o.status, o.reason, o.overridden], ['disabled', 'maintenance', true]);
  assert.equal(effectivePolicy(drm, { drm: { policy: 'nonsense' } }).status, 'blocked');
});

test('a global override can restrict but never relax', () => {
  assert.equal(effectivePolicy(ia, { '*': { policy: 'disabled' } }).status, 'disabled');
  assert.equal(effectivePolicy(ia, { '*': { policy: 'attestation' } }).status, 'attestation');
  assert.equal(effectivePolicy(drm, { '*': { policy: 'allowed' } }).status, 'blocked');
  assert.equal(effectivePolicy(drm, { '*': { policy: 'attestation' } }).status, 'blocked');
  assert.equal(moreRestrictive('allowed', 'blocked'), 'blocked');
});

test('probe/download gates', () => {
  assert.equal(canProbe('allowed'), true);
  assert.equal(canProbe('attestation'), true);
  assert.equal(canProbe('export_only'), false);
  assert.equal(canProbe('blocked'), false);
  assert.equal(canDownload('attestation', false), false);
  assert.equal(canDownload('attestation', true), true);
  assert.equal(canDownload('blocked', true), false);
  assert.equal(policyErrorCode('blocked'), 'PLATFORM_BLOCKED');
  assert.equal(policyErrorCode('allowed'), null);
  assert.match(defaultAttestation({ id: 'generic', name: 'x' }), /doesn't know this site/);
});
