import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG } from '@ferry/shared/platforms/catalog';
import { ICONS as FEATURED } from '../src/lib/brands/featured.js';
import { ICONS as ALL } from '../src/lib/brands/all.js';

// The sites shown on Home and in the "After pasting" states (see the approved mockup).
const FEATURED_IDS = [
  'tiktok', 'instagram', 'x', 'vimeo', 'twitch', 'reddit', 'pinterest', 'bluesky', 'dailymotion', 'tumblr',
  'internet-archive', 'peertube', 'flickr', 'imgur', 'youtube', 'facebook', 'soundcloud', 'bandcamp', 'threads',
  'snapchat', 'vk', 'netflix', 'spotify', 'apple-music', 'tidal', 'deezer', 'hbo-max', 'kick', 'rumble', 'bilibili',
  'mastodon', 'ted', 'nasa', 'wikimedia-commons',
];
const PATH = /^[MmZzLlHhVvCcSsQqTtAa0-9.,\-\s eE]+$/;
const HEX = /^#[0-9A-F]{6}$/;
const catalogIds = new Set(CATALOG.map((p) => p.id));
const entries = [...Object.entries(FEATURED), ...Object.entries(ALL)];

test('every featured site has a logo in the featured module', () => {
  assert.deepEqual(Object.keys(FEATURED).sort(), [...FEATURED_IDS].sort());
});

test('logo paths are plain SVG path data', () => {
  for (const [id, icon] of entries) assert.match(icon.path, PATH, id);
});

test('no site appears in both modules', () => {
  for (const id of Object.keys(ALL)) assert.equal(FEATURED[id], undefined, id);
});

test('every logo belongs to a catalog site', () => {
  for (const [id] of entries) assert.ok(catalogIds.has(id), id);
});

test('tile colours are set and the glyph differs from the tile', () => {
  for (const [id, icon] of entries) {
    assert.ok(icon.title, id);
    assert.match(icon.fg, HEX, id);
    assert.ok(icon.bg.startsWith('#') || icon.bg.includes('gradient('), id);
    assert.notEqual(icon.fg, icon.bg, id);
    assert.ok(icon.accent === null || HEX.test(icon.accent), id);
  }
});

test('hand-tuned featured tiles keep their mockup styles', () => {
  assert.equal(FEATURED.tiktok.fx, 'tiktok');
  assert.equal(FEATURED.snapchat.fx, 'outline');
  assert.ok(FEATURED.instagram.bg.includes('radial-gradient('));
  for (const id of ['youtube', 'facebook', 'pinterest', 'flickr', 'internet-archive', 'nasa', 'dailymotion']) {
    assert.equal(FEATURED[id].light, true, id);
    assert.equal(FEATURED[id].bg, '#FFFFFF', id);
  }
});

test('the rest of the catalog gets readable automatic tiles', () => {
  assert.ok(Object.keys(ALL).length > 40, 'expected most catalog sites to have a Simple Icons logo');
  for (const [id, icon] of Object.entries(ALL)) assert.ok(icon.fg === '#FFFFFF' || icon.fg === '#000000', id);
});
