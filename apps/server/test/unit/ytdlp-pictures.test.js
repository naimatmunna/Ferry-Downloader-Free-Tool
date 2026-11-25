/**
 * Pictures that yt-dlp lists but cannot download (Instagram carousels and
 * photo posts). The shapes mirror what yt-dlp 2026.11.23 prints for public
 * Instagram posts read without signing in (checked 2026-11-25); the values are
 * made up. Only the yt-dlp process and the guarded fetch are replaced.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { baseArgs, pictureGallery, probeArgs } from '../../src/engines/ytdlp.js';
import { createYtDlpAdapter } from '../../src/adapters/ytdlp.js';
import { normalizeInfo } from '../../src/media/normalize.js';

let cacheDir;
before(() => {
  cacheDir = mkdtempSync(path.join(os.tmpdir(), 'ferry-ytdlp-pictures-'));
});
after(() => rmSync(cacheDir, { recursive: true, force: true }));

const POST = 'https://www.instagram.com/p/POST1/';
const CDN = 'https://scontent-xx.cdninstagram.com/v/t51.82787-15';
const full = (n) => `${CDN}/${n}_n.jpg?stp=dst-jpg_e35_tt6&oe=6A3F0000`;
const shared = {
  description: 'Harbour at dawn\nTaken on the first ferry of the day.',
  channel: 'ferrytest',
  uploader: 'Ferry Test',
  timestamp: 1795500000,
  upload_date: '20261124',
  extractor: 'Instagram',
  extractor_key: 'Instagram',
  webpage_url: POST,
};
/** One picture as yt-dlp prints it: no formats, its sizes as thumbnails (worst first, best last). */
const picture = (id, n) => ({
  ...shared,
  id,
  title: 'Video by ferrytest',
  formats: [],
  thumbnails: [
    { id: '0', url: `${CDN}/${n}_n.jpg?stp=dst-jpg_e35_s150x150_tt6` },
    { id: '1', url: `${CDN}/${n}_n.jpg?stp=dst-jpg_e35_s640x640_tt6` },
    { id: '2', url: full(n) },
  ],
  thumbnail: full(n),
  http_headers: { Referer: 'https://www.instagram.com/' },
});
const clip = 'https://scontent-xx.cdninstagram.com/o1/v/t16/clip.mp4';
const video = (id) => ({
  ...shared,
  id,
  title: 'Video by ferrytest',
  formats: [{ format_id: '0', url: clip, ext: 'mp4', protocol: 'https', width: 720, height: 1280 }],
  url: clip,
  ext: 'mp4',
  thumbnails: [{ id: '0', url: `${CDN}/cover_n.jpg` }],
  thumbnail: `${CDN}/cover_n.jpg`,
});
const carousel = (entries, extra = {}) => ({ ...shared, _type: 'playlist', id: 'POST1', title: 'Post by ferrytest', playlist_count: entries.length, entries, ...extra });
const opts = { maxItems: 100, fallbackTitle: 'Instagram post' };

test('probes for picture posts keep the items yt-dlp finds no video formats for', () => {
  const base = baseArgs({ proxyUrl: 'http://u:p@127.0.0.1:9', cacheDir: '/tmp/c' });
  const args = probeArgs({ base, url: POST, pictures: true });
  assert.ok(args.includes('--ignore-no-formats-error'));
  assert.deepEqual(args.slice(-2), ['--', POST], 'the URL stays last, after "--"');
  assert.ok(!probeArgs({ base, url: POST }).includes('--ignore-no-formats-error'), 'other sites fail as before');
});

test('a post of pictures becomes a picture gallery in post order, at full size', () => {
  const g = pictureGallery(carousel([picture('A1', 1), picture('A2', 2), picture('A3', 3)]), opts);
  assert.equal(g._type, 'gallery');
  assert.deepEqual(
    g.gallery.items.map((i) => [i.index, i.url, i.ext]),
    [[1, full(1), 'jpg'], [2, full(2), 'jpg'], [3, full(3), 'jpg']],
  );
  assert.equal(g.title, 'Harbour at dawn', 'the first line of the caption');
  assert.equal(g.uploader, 'Ferry Test');
  assert.equal(g.upload_date, '20261124');
  assert.equal(g.extractor, 'Instagram', 'attributed to the same platform when the probe re-checks policy');
  assert.equal(g.webpage_url, POST);
  assert.equal(g.thumbnail, g.gallery.items[0].preview, 'the card shows the first picture’s preview');
  assert.deepEqual(g.gallery.skipped, { videos: 0, other: 0, links: 0 });
  assert.equal(g.gallery.truncated, false);

  const media = normalizeInfo(g);
  assert.equal(media.kind, 'gallery');
  assert.deepEqual(media.capabilities.modes, ['gallery']);
  assert.deepEqual(media.gallery.items.map((i) => i.index), [1, 2, 3]);
  assert.equal(media.raw.gallery.urls[2], full(2), 'addresses stay on the server, in raw');
  assert.equal(media.raw.gallery.input, null, 'nothing for gallery-dl to run');
});

test('a mixed post offers its pictures where they are and counts the videos it leaves out', () => {
  const g = pictureGallery(carousel([picture('A1', 1), video('V2'), picture('A3', 3)]), opts);
  assert.deepEqual(g.gallery.items.map((i) => i.index), [1, 3]);
  assert.equal(g.gallery.skipped.videos, 1);
});

test('a single picture is a one-picture gallery; posts without pictures keep the usual path', () => {
  const single = { ...picture('B1', 9), _type: 'video' };
  const g = pictureGallery(single, opts);
  assert.deepEqual(g.gallery.items.map((i) => [i.index, i.url]), [[1, full(9)]]);
  assert.equal(g.id, 'B1');
  assert.equal(pictureGallery({ ...video('V1'), _type: 'video' }, opts), null);
  assert.equal(pictureGallery(carousel([video('V1'), video('V2')]), opts), null);
});

test('without a caption the title is the post title, or a plain name for a single picture', () => {
  const quiet = (p) => ({ ...p, description: null });
  assert.equal(pictureGallery(carousel([quiet(picture('A1', 1))], { description: null }), opts).title, 'Post by ferrytest');
  assert.equal(pictureGallery({ ...quiet(picture('B1', 9)), _type: 'video' }, opts).title, 'Instagram post', 'never "Video by …" for a picture');
});

test('only http(s) images are offered, and long posts are capped', () => {
  const odd = { ...picture('A2', 2), thumbnail: 'file:///etc/passwd', thumbnails: [{ url: 'data:image/png;base64,AAAA' }] };
  const g = pictureGallery(carousel([picture('A1', 1), odd, picture('A3', 3)]), opts);
  assert.deepEqual(g.gallery.items.map((i) => i.index), [1, 3]);
  assert.equal(g.gallery.skipped.other, 1);

  const capped = pictureGallery(carousel([picture('A1', 1), picture('A2', 2), picture('A3', 3)]), { ...opts, maxItems: 2 });
  assert.deepEqual(capped.gallery.items.map((i) => i.index), [1, 2]);
  assert.equal(capped.gallery.truncated, true);
});

test('a video whose formats went missing is never passed off as a picture of its cover', () => {
  const lostFormats = { ...picture('R1', 5), duration: 14.2 }; // a reel: yt-dlp fills duration from video_duration
  const drm = { ...picture('D1', 6), _has_drm: true };
  assert.equal(pictureGallery({ ...lostFormats, _type: 'video' }, opts), null);
  assert.equal(pictureGallery({ ...drm, _type: 'video' }, opts), null);
  const g = pictureGallery(carousel([picture('A1', 1), lostFormats, { _type: 'playlist', id: 'X', entries: [] }]), opts);
  assert.deepEqual(g.gallery.items.map((i) => i.index), [1]);
  assert.equal(g.gallery.skipped.videos, 1);
  assert.equal(g.gallery.skipped.other, 1, 'nested lists are not pictures');
});

test('previews use a smaller size of the picture when yt-dlp lists one', () => {
  const g = pictureGallery(carousel([picture('A1', 1)]), opts);
  assert.equal(g.gallery.items[0].url, full(1));
  assert.equal(g.gallery.items[0].preview, `${CDN}/1_n.jpg?stp=dst-jpg_e35_s640x640_tt6`, 'size from the address');
  const sized = { ...picture('A2', 2), thumbnails: [{ url: 'https://x.example/150.jpg', width: 150 }, { url: 'https://x.example/480.jpg', width: 480 }, { url: full(2), width: 1080 }] };
  assert.equal(pictureGallery(carousel([sized]), opts).gallery.items[0].preview, 'https://x.example/480.jpg');
  const only = { ...picture('A3', 3), thumbnails: [{ url: full(3) }] };
  assert.equal(pictureGallery(carousel([only]), opts).gallery.items[0].preview, full(3), 'full size when nothing smaller exists');
  assert.equal(g.thumbnail, g.gallery.items[0].preview);
});

// ------------------------------------------------------------------ adapter

const JPEG = (n) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n - 4, 7)]);

/** A guarded-fetch stand-in serving `files` (url → body or HTTP status). */
function fakeFetch(files, seen = []) {
  return async (url) => {
    seen.push(url);
    const body = files[url];
    if (!Buffer.isBuffer(body)) return { status: typeof body === 'number' ? body : 404, headers: {}, stream: Readable.from([]), discard() {} };
    return { status: 200, headers: { 'content-type': 'image/jpeg', 'content-length': String(body.length) }, stream: Readable.from([body]), discard() {} };
  };
}

/**
 * @param {{ output?: object, files?: Record<string, Buffer|number>, maxImageBytes?: number }} [o]
 */
function setup({ output = {}, files = {}, maxImageBytes = 1000 } = {}) {
  const calls = [];
  const fetched = [];
  const run = (_bin, args) => {
    calls.push(args);
    return Object.assign(Promise.resolve({ code: 0, stdout: JSON.stringify(output), stderr: '', aborted: false, timedOut: false, stalled: false, overflow: false }), { touch() {} });
  };
  const adapter = createYtDlpAdapter({
    config: {
      cacheDir,
      engines: { jsRuntime: 'none' },
      limits: { maxGalleryItems: 50, maxPlaylistItems: 50, probeTimeoutMs: 5000, maxProbeOutputBytes: 1e6, maxImageBytes, jobTimeoutMs: 5000, stallTimeoutMs: 5000 },
    },
    egress: { issue: () => ({ url: 'http://u:p@127.0.0.1:9', session: { blocked: [], bytesIn: 0, exceeded: false }, revoke() {} }) },
    engines: { ytdlp: 'yt-dlp' },
    excludedExtractors: () => [],
    runProcess: run,
    fetch: fakeFetch(files, fetched),
    policyAllows: (u) => new URL(u).hostname !== 'img.protected.example',
  });
  return { adapter, calls, fetched };
}

const instagram = { id: 'instagram', name: 'Instagram', engine: 'yt-dlp', ytdlpPictures: true };

test('the adapter asks yt-dlp to keep pictures only on sites that list them, and offers them as a gallery', async () => {
  const { adapter, calls } = setup({ output: carousel([picture('A1', 1), picture('A2', 2)]) });
  const info = await adapter.probe({ url: POST, platform: instagram, tag: 't' });
  assert.ok(calls[0].includes('--ignore-no-formats-error'));
  assert.equal(info._type, 'gallery');
  assert.deepEqual(info.gallery.items.map((i) => i.url), [full(1), full(2)]);

  const plain = setup({ output: { ...video('V1'), _type: 'video' } });
  const v = await plain.adapter.probe({ url: 'https://www.youtube.com/watch?v=x', platform: { id: 'youtube', name: 'YouTube', engine: 'yt-dlp' }, tag: 't' });
  assert.ok(!plain.calls[0].includes('--ignore-no-formats-error'));
  assert.equal(v.id, 'V1', 'other sites get yt-dlp’s answer unchanged');
});

test('pictures on a platform whose policy forbids downloads are not offered', async () => {
  const elsewhere = { ...picture('A2', 2), thumbnail: 'https://img.protected.example/2.jpg', thumbnails: [{ url: 'https://img.protected.example/2.jpg' }] };
  const { adapter } = setup({ output: carousel([picture('A1', 1), elsewhere]) });
  const info = await adapter.probe({ url: POST, platform: instagram, tag: 't' });
  assert.deepEqual(info.gallery.items.map((i) => i.index), [1]);
  assert.equal(info.gallery.skipped.other, 1);
});

/** A download context for a gallery job choosing `urls` (index → picture address). */
function job(urls) {
  const tmpDir = mkdtempSync(path.join(cacheDir, 'job-'));
  const items = Object.keys(urls).map(Number);
  return {
    job: { id: 'job-1', request: { mode: 'gallery', gallery: { items } } },
    selection: { mode: 'gallery', gallery: { items } },
    media: { kind: 'gallery', raw: { formats: [], gallery: { input: null, urls } }, gallery: { items: items.map((index) => ({ index, sizeBytes: null })) } },
    url: POST,
    tmpDir,
    jobDir: path.dirname(tmpDir),
    signal: new AbortController().signal,
    onProgress: () => {},
    maxBytes: 1e9,
  };
}

test('a picture download fetches exactly the chosen pictures through the guarded fetch', async () => {
  const { adapter, calls, fetched } = setup({ files: { [full(1)]: JPEG(400), [full(3)]: JPEG(500) } });
  const dl = await adapter.download(job({ 1: full(1), 3: full(3) }));
  assert.equal(calls.length, 0, 'yt-dlp is not run: it cannot download pictures');
  assert.deepEqual(fetched, [full(1), full(3)]);
  assert.deepEqual(dl.images.map((i) => i.index), [1, 3]);
  assert.equal(dl.requested, 2);
  assert.deepEqual(readFileSync(dl.images[1].path), JPEG(500));
});

test('a picture over the size cap is left out; the others still arrive', async () => {
  const { adapter } = setup({ files: { [full(1)]: JPEG(400), [full(2)]: JPEG(5000) } });
  const dl = await adapter.download(job({ 1: full(1), 2: full(2) }));
  assert.deepEqual(dl.images.map((i) => i.index), [1]);
  assert.equal(dl.requested, 2);
});

test('one oversized picture is skipped even when the job cap is smaller than the picture cap', async () => {
  const { adapter } = setup({ files: { [full(1)]: JPEG(600), [full(2)]: JPEG(300) }, maxImageBytes: 1000 });
  const ctx = { ...job({ 1: full(1), 2: full(2) }), maxBytes: 500 };
  const dl = await adapter.download(ctx);
  assert.deepEqual(dl.images.map((i) => i.index), [2]);
  // The whole download over its cap still stops the job.
  const over = setup({ files: { [full(1)]: JPEG(400), [full(2)]: JPEG(400) }, maxImageBytes: 1000 });
  await assert.rejects(over.adapter.download({ ...job({ 1: full(1), 2: full(2) }), maxBytes: 600 }), { code: 'FILE_TOO_LARGE' });
});

test('an Instagram post whose items are all formatless videos fails clearly instead of listing them', async () => {
  const lost = { ...picture('R1', 5), duration: 14.2 };
  const { adapter } = setup({ output: carousel([lost, { ...lost, id: 'R2' }]) });
  const info = await adapter.probe({ url: POST, platform: instagram, tag: 't' });
  assert.throws(() => normalizeInfo(info), { code: 'NO_MEDIA_FOUND' });
  const drm = setup({ output: { ...picture('D1', 6), _type: 'video', _has_drm: true } });
  await assert.rejects(drm.adapter.probe({ url: POST, platform: instagram, tag: 't' }), { code: 'DRM_PROTECTED' });
});

test('when no picture arrives, the error says what to do', async () => {
  const gone = setup({ files: { [full(1)]: 404 } });
  await assert.rejects(gone.adapter.download(job({ 1: full(1) })), { code: 'CONTENT_UNAVAILABLE' });
  // Instagram's picture links are signed and expire: the fix is to paste the link again, not to sign in.
  const expired = setup({ files: { [full(1)]: 403 } });
  await assert.rejects(expired.adapter.download(job({ 1: full(1) })), { code: 'PROBE_EXPIRED' });
});
