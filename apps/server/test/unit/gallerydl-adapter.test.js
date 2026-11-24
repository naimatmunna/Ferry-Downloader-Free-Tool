/**
 * The gallery-dl adapter's probe decisions that local fixtures cannot reach
 * (Imgur's extractor only matches imgur.com). Only the gallery-dl process is
 * replaced; its output mirrors what gallery-dl 1.32.21 prints for Imgur.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createGalleryDlAdapter } from '../../src/adapters/galleryDl.js';

let cacheDir;
before(() => {
  cacheDir = mkdtempSync(path.join(os.tmpdir(), 'ferry-gdl-unit-'));
});
after(() => rmSync(cacheDir, { recursive: true, force: true }));

const album = { id: 'AbCdE12', title: 'Harbour at dawn', description: '', created_at: '2026-11-20T08:00:00Z', image_count: 2, is_album: true };
const image = (num, id, ext, w, h, size) => ({
  id, title: '', description: '', width: w, height: h, size, ext, extension: ext, filename: id, is_animated: false, mime_type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  created_at: '2026-11-20T08:00:00Z', date: '2026-11-20 08:00:00', url: `https://i.imgur.com/${id}.${ext}`, num, count: 2, album, category: 'imgur', subcategory: 'album',
});
const OUTPUT = {
  'https://imgur.com/gallery/AbCdE12': [[6, 'https://imgur.com/a/AbCdE12', { category: 'imgur', subcategory: 'gallery' }]],
  'https://imgur.com/a/AbCdE12': [
    [2, image(1, 'One1111', 'jpg', 1600, 1200, 412_345)], [3, 'https://i.imgur.com/One1111.jpg', image(1, 'One1111', 'jpg', 1600, 1200, 412_345)],
    [2, image(2, 'Two2222', 'png', 800, 800, 98_765)], [3, 'https://i.imgur.com/Two2222.png', image(2, 'Two2222', 'png', 800, 800, 98_765)],
  ],
  'https://imgur.com/gallery/Embed01': [[6, 'https://www.youtube.com/watch?v=abcdefghijk', { category: 'imgur', subcategory: 'gallery' }]],
  'https://imgur.com/user/someone': [
    [6, 'https://imgur.com/a/First01', { category: 'imgur', subcategory: 'user' }],
    [6, 'https://imgur.com/a/Second2', { category: 'imgur', subcategory: 'user' }],
  ],
};

function setup() {
  const calls = [];
  const run = (_bin, args) => {
    calls.push(args.at(-1));
    const out = OUTPUT[args.at(-1)];
    return Object.assign(Promise.resolve({ code: 0, stdout: JSON.stringify(out ?? []), stderr: '', aborted: false, timedOut: false, stalled: false, overflow: false }), { touch() {} });
  };
  const egress = { issue: () => ({ url: 'http://u:p@127.0.0.1:9', session: { blocked: [], bytesIn: 0, exceeded: false }, revoke() {} }) };
  const adapter = createGalleryDlAdapter({
    config: { cacheDir, limits: { maxGalleryItems: 50, probeTimeoutMs: 5000, maxProbeOutputBytes: 1e6 } },
    egress,
    engines: { galleryDl: 'gallery-dl' },
    runProcess: run,
    platformOf: (u) => (new URL(u).hostname.endsWith('imgur.com') ? 'imgur' : 'youtube'),
  });
  return { adapter, calls };
}

const imgur = { id: 'imgur', name: 'Imgur', engine: 'gallery-dl' };

test('an Imgur gallery link is followed once to its album on the same platform', async () => {
  const { adapter, calls } = setup();
  const info = await adapter.probe({ url: 'https://imgur.com/gallery/AbCdE12', platform: imgur, tag: 't' });
  assert.deepEqual(calls, ['https://imgur.com/gallery/AbCdE12', 'https://imgur.com/a/AbCdE12']);
  assert.equal(info.gallery.input, 'https://imgur.com/a/AbCdE12', 'the download runs on the album');
  assert.equal(info.webpage_url, 'https://imgur.com/gallery/AbCdE12');
  assert.equal(info.title, 'Harbour at dawn');
  assert.equal(info.id, 'AbCdE12');
  assert.deepEqual(info.gallery.items.map((i) => [i.index, i.ext, i.width, i.height, i.filesize]), [[1, 'jpg', 1600, 1200, 412_345], [2, 'png', 800, 800, 98_765]]);
});

test('a link to another site is never followed', async () => {
  const { adapter, calls } = setup();
  await assert.rejects(adapter.probe({ url: 'https://imgur.com/gallery/Embed01', platform: imgur, tag: 't' }), { code: 'NO_MEDIA_FOUND' });
  assert.deepEqual(calls, ['https://imgur.com/gallery/Embed01']);
});

test('a page listing several posts is not crawled', async () => {
  const { adapter, calls } = setup();
  await assert.rejects(adapter.probe({ url: 'https://imgur.com/user/someone', platform: imgur, tag: 't' }), { code: 'NO_MEDIA_FOUND' });
  assert.equal(calls.length, 1);
});
