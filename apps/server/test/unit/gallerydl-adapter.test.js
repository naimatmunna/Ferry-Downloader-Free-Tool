/**
 * The gallery-dl adapter's probe decisions that local fixtures cannot reach
 * (Imgur's extractor only matches imgur.com). Only the gallery-dl process is
 * replaced; its output mirrors what gallery-dl 1.32.21 prints for Imgur.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GDL_FILE_MARKER } from '../../src/engines/galleryDl.js';
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
  'https://imgur.com/a/Mixed01': [
    [2, image(1, 'One1111', 'jpg', 1600, 1200, 412_345)], [3, 'https://i.imgur.com/One1111.jpg', image(1, 'One1111', 'jpg', 1600, 1200, 412_345)],
    [2, image(2, 'Two2222', 'jpg', 800, 800, 98_765)], [3, 'https://img.protected.example/still.jpg', image(2, 'Two2222', 'jpg', 800, 800, 98_765)],
  ],
};

/**
 * @param {{ download?: (args: string[], opts: any) => object, session?: object }} [o]
 *   download: what the fake gallery-dl does in download mode (write files, print lines).
 */
function setup({ download, session } = {}) {
  const calls = [];
  const run = (_bin, args, opts) => {
    calls.push(args.at(-1));
    const result = args.includes('-j')
      ? { code: 0, stdout: JSON.stringify(OUTPUT[args.at(-1)] ?? []), stderr: '' }
      : { code: 0, stdout: '', stderr: '', ...download(args, opts) };
    return Object.assign(Promise.resolve({ aborted: false, timedOut: false, stalled: false, overflow: false, ...result }), { touch() {} });
  };
  const egress = { issue: () => ({ url: 'http://u:p@127.0.0.1:9', session: { blocked: [], bytesIn: 0, exceeded: false, ...session }, revoke() {} }) };
  const adapter = createGalleryDlAdapter({
    config: { cacheDir, limits: { maxGalleryItems: 50, probeTimeoutMs: 5000, maxProbeOutputBytes: 1e6, maxImageBytes: 50, jobTimeoutMs: 5000, stallTimeoutMs: 5000 } },
    egress,
    engines: { galleryDl: 'gallery-dl' },
    runProcess: run,
    platformOf: (u) => (new URL(u).hostname.endsWith('imgur.com') ? 'imgur' : 'youtube'),
    policyAllows: (u) => new URL(u).hostname !== 'img.protected.example',
  });
  return { adapter, calls };
}

/** A download context for a gallery job choosing `items`. */
function job(items) {
  const tmpDir = mkdtempSync(path.join(cacheDir, 'job-'));
  return {
    tmpDir,
    ctx: {
      job: { id: 'job-1', request: { mode: 'gallery', gallery: { items } } },
      media: { raw: { gallery: { input: 'https://imgur.com/a/AbCdE12' } }, gallery: { items: items.map((index) => ({ index, sizeBytes: null })) } },
      tmpDir, jobDir: path.dirname(tmpDir), signal: new AbortController().signal, onProgress: () => {}, maxBytes: 1e9,
    },
  };
}
const outDirOf = (args) => args[args.indexOf('-D') + 1];

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

test('images hosted on a platform whose policy forbids downloads are not offered', async () => {
  const { adapter } = setup();
  const info = await adapter.probe({ url: 'https://imgur.com/a/Mixed01', platform: imgur, tag: 't' });
  assert.deepEqual(info.gallery.items.map((i) => i.url), ['https://i.imgur.com/One1111.jpg']);
  assert.equal(info.gallery.skipped.other, 1);
});

test('download keeps only files gallery-dl reported for a chosen index, inside its folder, within the size cap', async () => {
  const { ctx, tmpDir } = job([1, 2, 3, 4]);
  const { adapter } = setup({
    download(args, opts) {
      const out = outDirOf(args);
      writeFileSync(path.join(out, 'one.jpg'), Buffer.alloc(40)); // fine
      writeFileSync(path.join(out, 'two.png'), Buffer.alloc(80)); // over MAX_IMAGE_MB here (no Content-Length to stop it)
      writeFileSync(path.join(tmpDir, 'three.gif'), Buffer.alloc(10)); // outside the gallery folder
      for (const line of [`${GDL_FILE_MARKER} -`, path.join(out, 'one.jpg'), `${GDL_FILE_MARKER} -`, path.join(out, 'two.png'), `${GDL_FILE_MARKER} -`, path.join(tmpDir, 'three.gif'), `${GDL_FILE_MARKER} -`]) opts.onStdoutLine(line);
      return { code: 4 };
    },
  });
  const dl = await adapter.download(ctx);
  assert.deepEqual(dl.images.map((i) => [i.index, path.basename(i.path)]), [[1, 'one.jpg']]);
  assert.equal(dl.requested, 4);
});

test('when nothing arrives, the egress proxy’s verdict is the error', async () => {
  const nothing = () => ({ code: 4, stderr: '[download][error] Failed to download one.jpg' });
  const blocked = setup({ download: nothing, session: { blocked: [{ host: '10.0.0.1', reason: 'private address' }] } });
  await assert.rejects(blocked.adapter.download(job([1]).ctx), { code: 'BLOCKED_DESTINATION' });
  const capped = setup({ download: nothing, session: { exceeded: true } });
  await assert.rejects(capped.adapter.download(job([1]).ctx), { code: 'FILE_TOO_LARGE' });
  const plain = setup({ download: nothing });
  await assert.rejects(plain.adapter.download(job([1]).ctx), { code: 'DOWNLOAD_INTERRUPTED' });
});
