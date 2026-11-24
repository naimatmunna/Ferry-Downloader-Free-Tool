import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from '../src/platforms/registry.js';

const base = { content: ['video'], engine: 'yt-dlp', auth: 'none', officialApi: null, routes: [], restrictions: '', reliability: 'verified', lastChecked: '2026-11-24' };
const mini = [
  { ...base, id: 'tube', name: 'Tube', kind: 'video', hosts: ['tube.example', 'tu.be'], extractors: ['tube(:.*)?'], category: 4, policy: 'attestation' },
  { ...base, id: 'tube-music', name: 'Tube Music', kind: 'audio', hosts: ['music.tube.example'], category: 4, policy: 'attestation' },
  { ...base, id: 'shop-vod', name: 'Shop VOD', kind: 'video', hosts: ['shop.example'], paths: [/^\/ondemand\//], category: 5, policy: 'blocked' },
  { ...base, id: 'shop', name: 'Shop', kind: 'video', hosts: ['shop.example'], category: 4, policy: 'attestation' },
  { ...base, id: 'fedi', name: 'Fedi', kind: 'video', hosts: [], patterns: [/^\/w\/[0-9A-Za-z]{22}$/], category: 1, policy: 'allowed' },
  { ...base, id: 'direct', name: 'Direct link', kind: 'direct', hosts: [], category: 3, policy: 'attestation' },
  { ...base, id: 'generic', name: 'Other website', kind: 'generic', hosts: [], category: 4, policy: 'attestation' },
];

test('detects by most specific host first', () => {
  const r = createRegistry(mini);
  assert.equal(r.detect('https://tube.example/watch?v=1').platform.id, 'tube');
  assert.equal(r.detect('https://m.tube.example/watch?v=1').platform.id, 'tube');
  assert.equal(r.detect('https://music.tube.example/x').platform.id, 'tube-music');
  assert.equal(r.detect('https://tu.be/abc').platform.id, 'tube');
  assert.equal(r.detect('https://tube.example.evil.test/watch').platform.id, 'generic');
});

test('path filters disambiguate entries that share a host', () => {
  const r = createRegistry(mini);
  assert.equal(r.detect('https://shop.example/ondemand/film').platform.id, 'shop-vod');
  assert.equal(r.detect('https://shop.example/123').platform.id, 'shop');
});

test('federated path patterns, direct links and generic fallback', () => {
  const r = createRegistry(mini);
  const fedi = r.detect('https://video.someinstance.example/w/9c9de5e8-0a1e-484a-b099-e80766180a6d'.replace(/\/w\/.*/, '/w/kkGMgK9ZtnKfYAgnEtQxbv'));
  assert.equal(fedi.platform.id, 'fedi');
  assert.equal(fedi.via, 'pattern');
  const direct = r.detect('https://files.example.org/media/talk.webm');
  assert.deepEqual([direct.platform.id, direct.via, direct.directExt], ['direct', 'direct', 'webm']);
  const host = r.detect('https://tube.example/file.mp4');
  assert.deepEqual([host.platform.id, host.directExt], ['tube', 'mp4']);
  assert.equal(r.detect('https://news.example/article').platform.id, 'generic');
});

test('invalid input is reported, not detected', () => {
  const r = createRegistry(mini);
  assert.deepEqual(r.detect('ftp://tube.example/x'), { ok: false, reason: 'scheme' });
  assert.equal(r.detect('http://127.0.0.1/').reason, 'local');
});

test('extractor mapping and exclusion list', () => {
  const r = createRegistry(mini);
  assert.equal(r.byExtractor('tube:tab').id, 'tube');
  assert.equal(r.byExtractor('Tube').id, 'tube');
  assert.equal(r.byExtractor('other'), null);
  assert.deepEqual(r.excludedExtractors((p) => p.id === 'tube'), ['tube(:.*)?']);
});

test('rejects duplicate ids and catalogs without fallbacks', () => {
  assert.throws(() => createRegistry([...mini, mini[0]]), /Duplicate platform id/);
  assert.throws(() => createRegistry(mini.filter((p) => p.id !== 'generic')), /generic/);
});
