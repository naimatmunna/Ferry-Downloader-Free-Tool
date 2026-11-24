import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, CATALOG_VERSION } from '../src/platforms/catalog.js';
import { createRegistry } from '../src/platforms/registry.js';
import { canProbe, effectivePolicy } from '../src/platforms/policy.js';

const KINDS = ['social', 'video', 'live', 'audio', 'podcast', 'education', 'news', 'open-library', 'images', 'gif', 'regional', 'protected', 'direct', 'generic'];
const ENGINES = ['yt-dlp', 'internet-archive-api', 'peertube-api', 'gallery-dl', 'streamlink', 'direct', 'none'];
const CONTENT = ['video', 'audio', 'image', 'gif', 'playlist', 'live', 'subtitles'];
const registry = createRegistry(CATALOG);

test('catalog covers at least 150 distinct platforms plus the two fallbacks', () => {
  const real = CATALOG.filter((p) => p.id !== 'generic' && p.id !== 'direct');
  assert.ok(real.length >= 150, `only ${real.length} platforms`);
  assert.match(CATALOG_VERSION, /^\d{4}-\d{2}-\d{2}$/);
});

test('every entry is complete and uses valid enums', () => {
  for (const p of CATALOG) {
    assert.match(p.id, /^[a-z0-9][a-z0-9-]*$/, p.id);
    assert.ok(p.name, p.id);
    assert.ok(KINDS.includes(p.kind), `${p.id} kind ${p.kind}`);
    assert.ok(ENGINES.includes(p.engine), `${p.id} engine ${p.engine}`);
    assert.ok([1, 2, 3, 4, 5].includes(p.category), `${p.id} category`);
    assert.ok(['none', 'sometimes', 'always'].includes(p.auth), `${p.id} auth`);
    assert.ok(['verified', 'experimental', 'unstable', 'unsupported'].includes(p.reliability), `${p.id} reliability`);
    assert.ok(Array.isArray(p.content) && p.content.every((c) => CONTENT.includes(c)), `${p.id} content`);
    assert.ok(Array.isArray(p.routes), `${p.id} routes`);
    for (const r of p.routes) {
      assert.ok(r.label, `${p.id} route label`);
      assert.ok(r.url === null || /^https:\/\//.test(r.url), `${p.id} route url ${r.url}`);
    }
    assert.equal(typeof p.restrictions, 'string', p.id);
    assert.match(p.lastChecked, /^\d{4}-\d{2}-\d{2}$/, p.id);
    for (const h of p.hosts) assert.equal(h, h.toLowerCase(), `${p.id} host ${h}`);
  }
});

test('category and default policy agree', () => {
  const allowed = { 1: ['allowed', 'export_only'], 2: ['export_only'], 3: ['allowed'], 4: ['attestation'], 5: ['blocked'] };
  for (const p of CATALOG) assert.ok(allowed[p.category].includes(p.policy), `${p.id}: category ${p.category} with policy ${p.policy}`);
});

test('ids are unique and a hostname belongs to one entry unless paths disambiguate', () => {
  const seen = new Map();
  for (const p of CATALOG) {
    for (const h of p.hosts) {
      if (seen.has(h) && !p.paths?.length && !CATALOG.find((x) => x.id === seen.get(h))?.paths?.length) assert.fail(`host ${h} in ${seen.get(h)} and ${p.id}`);
      seen.set(h, p.id);
    }
  }
});

test('extractor patterns compile, have no commas, and only the generic entry claims the generic extractor', () => {
  for (const p of CATALOG) {
    if (p.id === 'generic') continue; // disabling "Other website" correctly excludes yt-dlp's generic extractor
    for (const src of p.extractors ?? []) {
      assert.ok(!src.includes(','), `${p.id}: comma in ${src}`);
      const re = new RegExp(`^(?:${src})$`, 'i');
      assert.equal(re.test('generic'), false, `${p.id} would exclude the generic extractor`);
    }
  }
});

test('key platforms are classified as decided (see RESEARCH.md)', () => {
  const expect = [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'export_only'],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube', 'export_only'],
    ['https://www.netflix.com/title/80057281', 'netflix', 'blocked'],
    ['https://open.spotify.com/track/1', 'spotify', 'blocked'],
    ['https://archive.org/details/night_of_the_living_dead', 'internet-archive', 'allowed'],
    ['https://video.example.org/w/kkGMgK9ZtnKfYAgnEtQxbv', 'peertube', 'allowed'],
    ['https://video.example.org/w/9c9de5e8-0a1e-484a-b099-e80766180a6d', 'peertube', 'allowed'],
    ['https://vimeo.com/76979871', 'vimeo', 'attestation'],
    ['https://www.tiktok.com/@a/video/1', 'tiktok', 'attestation'],
    ['https://x.com/a/status/1', 'x', 'attestation'],
    ['https://twitter.com/a/status/1', 'x', 'attestation'],
    ['https://soundcloud.com/artist/track', 'soundcloud', 'export_only'],
    ['https://www.facebook.com/watch?v=1', 'facebook', 'export_only'],
    ['https://podcasts.apple.com/us/podcast/x/id1', 'apple-podcasts', 'allowed'],
    ['https://music.apple.com/us/album/x/1', 'apple-music', 'blocked'],
    ['https://commons.wikimedia.org/wiki/File:Example.webm', 'wikimedia-commons', 'allowed'],
    ['https://files.example.com/talk.mp4', 'direct', 'attestation'],
    ['https://news.example.com/story', 'generic', 'attestation'],
  ];
  for (const [url, id, policy] of expect) {
    const d = registry.detect(url);
    assert.equal(d.ok, true, url);
    assert.equal(d.platform.id, id, url);
    assert.equal(d.platform.policy, policy, url);
  }
});

test('YouTube extractors are excluded from yt-dlp by default; open platforms are not', () => {
  const excluded = registry.excludedExtractors((p) => !canProbe(effectivePolicy(p).status));
  assert.ok(excluded.some((e) => new RegExp(`^(?:${e})$`, 'i').test('youtube')), 'youtube must be excluded');
  assert.ok(excluded.some((e) => new RegExp(`^(?:${e})$`, 'i').test('youtube:tab')), 'youtube:tab must be excluded');
  assert.ok(!excluded.some((e) => new RegExp(`^(?:${e})$`, 'i').test('vimeo')), 'vimeo is attestation, not excluded');
  assert.equal(registry.byExtractor('youtube').id, 'youtube');
});

test('detection is fast enough to run on every keystroke', () => {
  const t0 = performance.now();
  for (let i = 0; i < 2000; i += 1) registry.detect(`https://www.example${i % 50}.com/watch?v=${i}`);
  const perCall = (performance.now() - t0) / 2000;
  assert.ok(perCall < 1, `detection took ${perCall.toFixed(3)} ms per call`);
});
