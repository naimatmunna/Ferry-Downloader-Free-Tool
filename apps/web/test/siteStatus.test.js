import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveDot, shelfOf, siteStatus } from '../src/lib/siteStatus.js';

const site = (policy, extra = {}) => ({ id: 'example', policy, available: true, ...extra });

test('each effective policy maps to one plain status', () => {
  assert.equal(siteStatus(site('allowed')), 'free');
  assert.equal(siteStatus(site('attestation')), 'perm');
  assert.equal(siteStatus(site('export_only')), 'off');
  assert.equal(siteStatus(site('blocked')), 'lock');
});

test('an operator who turns a site off wins over its policy', () => {
  assert.equal(siteStatus(site('disabled')), 'off-server');
  assert.equal(siteStatus({ id: 'generic', policy: 'disabled', available: true }), 'off-server');
});

test('a downloadable site whose engine is missing is not on this server yet', () => {
  assert.equal(siteStatus(site('allowed', { available: false })), 'unavailable');
  assert.equal(siteStatus(site('attestation', { available: false })), 'unavailable');
});

test('official-only and protected sites keep their status without an engine', () => {
  assert.equal(siteStatus(site('export_only', { available: false })), 'off');
  assert.equal(siteStatus(site('blocked', { available: false })), 'lock');
});

test('any other website is its own status', () => {
  assert.equal(siteStatus({ id: 'generic', policy: 'attestation', available: true }), 'any');
  assert.equal(siteStatus({ id: 'direct', policy: 'attestation', available: true }), 'any');
});

test('statuses group into the three Home shelves', () => {
  assert.equal(shelfOf('free'), 'direct');
  assert.equal(shelfOf('perm'), 'direct');
  assert.equal(shelfOf('off'), 'official');
  assert.equal(shelfOf('lock'), 'protected');
  for (const s of ['any', 'off-server', 'unavailable', null]) assert.equal(shelfOf(s), null);
});

test('live dots appear only when the server has data', () => {
  assert.equal(liveDot(undefined), null);
  assert.equal(liveDot({ status: 'unknown', window: '1h', attempts: 2, successRate: 100 }), null);
  assert.deepEqual(liveDot({ status: 'operational', window: '1h', attempts: 12, successRate: 91.7 }), { tone: 'ok', window: '1h', attempts: 12, successRate: 91.7 });
  assert.equal(liveDot({ status: 'degraded', window: '24h', attempts: 8, successRate: 62.5 }).tone, 'warn');
  assert.equal(liveDot({ status: 'failing', window: '1h', attempts: 3, successRate: 0 }).tone, 'bad');
});
