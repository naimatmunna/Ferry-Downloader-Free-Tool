import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { normalizeInfo, publicMedia } from '../../src/media/normalize.js';
import { jpegOrientation, planImage, verifyImage, webpFeatures } from '../../src/media/gallery.js';

// ---------------------------------------------------------------- normalize

/** What the gallery-dl adapter hands to normalizeInfo (see engines/galleryDl.js#buildGallery). */
const galleryInfo = () => ({
  _type: 'gallery',
  id: '123456789',
  title: 'Three self-made test images',
  uploader: 'Ferry Fixtures',
  upload_date: '20261120',
  webpage_url: 'https://social.example/@ferry/123456789',
  extractor: 'gallery-dl:social.example',
  thumbnail: 'https://files.example/small/a.jpg',
  gallery: {
    input: 'mastodon:https://social.example/@ferry/123456789',
    truncated: false,
    skipped: { videos: 1, other: 0, links: 2 },
    items: [
      { index: 1, url: 'https://files.example/a.jpg', ext: 'jpg', width: 800, height: 600, filesize: 38064, preview: 'https://files.example/small/a.jpg' },
      { index: 3, url: 'https://files.example/c.gif', ext: 'gif', width: 320, height: 240, filesize: null, preview: 'https://files.example/small/c.gif' },
      { index: 4, url: 'file:///etc/passwd', ext: 'jpg', width: 1, height: 1, filesize: null, preview: null },
    ],
  },
});

test('a gallery normalizes to kind "gallery" with only http(s) items, offering the gallery mode only', () => {
  const m = normalizeInfo(galleryInfo());
  assert.equal(m.kind, 'gallery');
  assert.deepEqual(m.capabilities.modes, ['gallery']);
  assert.equal(m.durationSec, null);
  assert.deepEqual(m.gallery.items.map((i) => [i.index, i.ext, i.width, i.height, i.sizeBytes]), [[1, 'jpg', 800, 600, 38064], [3, 'gif', 320, 240, null]]);
  assert.deepEqual(m.gallery.skipped, { videos: 1, other: 0, links: 2 });
  assert.equal(m.raw.gallery.input, 'mastodon:https://social.example/@ferry/123456789');
  assert.deepEqual(m.raw.gallery.urls, { 1: 'https://files.example/a.jpg', 3: 'https://files.example/c.gif' });
  assert.equal(m.thumbnailSource, 'https://files.example/small/a.jpg');
});

test('the public view of a gallery carries signed previews but no source URLs', () => {
  const pub = publicMedia(normalizeInfo(galleryInfo()), { thumbnailUrl: '/t', previewUrl: (u) => `/api/v1/thumb?u=${Buffer.from(u).toString('base64url')}` });
  assert.equal(pub.raw, undefined);
  assert.equal(pub.gallery.items[0].previewUrl, `/api/v1/thumb?u=${Buffer.from('https://files.example/small/a.jpg').toString('base64url')}`);
  const text = JSON.stringify(pub);
  assert.ok(!text.includes('https://files.example/a.jpg'), 'item URLs must stay on the server');
  assert.ok(!text.includes('previewSource'));
});

test('a post without any image is "no media found"', () => {
  const info = galleryInfo();
  info.gallery.items = [];
  assert.throws(() => normalizeInfo(info), { code: 'NO_MEDIA_FOUND' });
});

// ---------------------------------------------------------------- headers

/** JPEG SOI + APP1 Exif (IFD0 with one Orientation entry) + a fake APP0. */
function jpegWithOrientation(value, order = 'II') {
  const le = order === 'II';
  const tiff = Buffer.alloc(26);
  tiff.write(order, 0, 'latin1');
  const u16 = (v, o) => (le ? tiff.writeUInt16LE(v, o) : tiff.writeUInt16BE(v, o));
  const u32 = (v, o) => (le ? tiff.writeUInt32LE(v, o) : tiff.writeUInt32BE(v, o));
  u16(42, 2);
  u32(8, 4);
  u16(1, 8);
  u16(0x0112, 10);
  u16(3, 12);
  u32(1, 14);
  u16(value, 18);
  const exif = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const app1 = Buffer.from([0xff, 0xe1, 0, 0]);
  app1.writeUInt16BE(exif.length + 2, 2);
  const app0 = Buffer.from([0xff, 0xe0, 0, 4, 1, 2]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, app1, exif, Buffer.from([0xff, 0xda, 0, 2])]);
}

test('EXIF orientation is read from both byte orders; anything malformed means "upright"', () => {
  assert.equal(jpegOrientation(jpegWithOrientation(6)), 6);
  assert.equal(jpegOrientation(jpegWithOrientation(8, 'MM')), 8);
  assert.equal(jpegOrientation(jpegWithOrientation(42)), 1);
  assert.equal(jpegOrientation(Buffer.from([0xff, 0xd8, 0xff, 0xda, 0, 2])), 1);
  assert.equal(jpegOrientation(jpegWithOrientation(6).subarray(0, 20)), 1);
  assert.equal(jpegOrientation(Buffer.from('<html>')), 1);
});

/** RIFF/WEBP headers: simple lossy, lossless (VP8L), and extended (VP8X) with flags. */
function webp(chunk, flags = 0) {
  const b = Buffer.alloc(40);
  b.write('RIFF', 0, 'latin1');
  b.writeUInt32LE(32, 4);
  b.write('WEBP', 8, 'latin1');
  b.write(chunk, 12, 'latin1');
  if (chunk === 'VP8X') b[20] = flags;
  if (chunk === 'VP8L') b.writeUInt32LE(0x10000000, 21); // alpha_is_used
  return b;
}

test('WebP headers tell lossy, lossless, alpha and animation apart', () => {
  assert.deepEqual(webpFeatures(webp('VP8 ')), { animated: false, alpha: false, lossless: false });
  assert.deepEqual(webpFeatures(webp('VP8L')), { animated: false, alpha: true, lossless: true });
  assert.deepEqual(webpFeatures(webp('VP8X', 0x10)), { animated: false, alpha: true, lossless: false });
  assert.deepEqual(webpFeatures(webp('VP8X', 0x02)), { animated: true, alpha: false, lossless: false });
  assert.equal(webpFeatures(Buffer.from('RIFF....WAVEfmt ')), null);
});

// ---------------------------------------------------------------- planner

const src = path.join(path.sep, 'job', 'tmp', 'gallery', 'a.bin');
const outDir = path.join(path.sep, 'job');
const stream = (o) => ({ index: 0, kind: 'video', attachedPic: false, width: 800, height: 600, pixFmt: 'yuvj420p', frames: null, ...o });
const probe = (o, streams = [stream(o)]) => ({ format: 'image2', durationSec: null, sizeBytes: 1000, bitrateKbps: null, streams });
const plan = (sniffed, p, head = Buffer.alloc(0)) => planImage({ src, sniffed, head, probe: p, outDir, name: 'img-001', maxPixels: 50e6 });
const after = (args, flag) => args[args.indexOf(flag) + 1];

test('every plan reads one local file, keeps one image stream and strips all metadata', () => {
  for (const [sniffed, p] of [['image/jpeg', probe({ rawCodec: 'mjpeg' })], ['image/png', probe({ rawCodec: 'png', pixFmt: 'rgba' })], ['image/gif', probe({ rawCodec: 'gif' })]]) {
    const { args } = plan(sniffed, p);
    assert.deepEqual(args.slice(args.indexOf('-i') - 2, args.indexOf('-i') + 2), ['-protocol_whitelist', 'file,pipe', '-i', src], sniffed);
    assert.equal(after(args, '-map_metadata'), '-1', sniffed);
    assert.ok(args.includes('0:v:0') || args.some((a) => a.startsWith('[0:v:0]')), sniffed);
  }
});

test('JPEG stays JPEG and is turned upright from its EXIF orientation (never auto-rotated twice)', () => {
  const r = plan('image/jpeg', probe({ rawCodec: 'mjpeg' }), jpegWithOrientation(6));
  assert.equal(r.ext, 'jpg');
  assert.equal(r.mime, 'image/jpeg');
  assert.equal(r.outputFile, path.join(outDir, 'img-001.jpg'));
  assert.ok(r.args.indexOf('-noautorotate') < r.args.indexOf('-i'));
  assert.equal(after(r.args, '-vf'), 'transpose=1');
  assert.equal(after(r.args, '-c:v'), 'mjpeg');
  assert.equal(after(r.args, '-frames:v'), '1');
  assert.ok(!plan('image/jpeg', probe({ rawCodec: 'mjpeg' })).args.includes('-vf'), 'upright JPEGs need no filter');
});

test('output formats follow the source: PNG, GIF (animation kept), JPEG for lossy WebP/AVIF, PNG when there is alpha', () => {
  const cases = [
    ['image/png', probe({ rawCodec: 'png', pixFmt: 'rgba' }), Buffer.alloc(0), 'png', false],
    ['image/png', probe({ rawCodec: 'apng', pixFmt: 'rgb24' }), Buffer.alloc(0), 'gif', true],
    ['image/gif', probe({ rawCodec: 'gif', pixFmt: 'bgra', frames: 5 }), Buffer.alloc(0), 'gif', false],
    ['image/webp', probe({ rawCodec: 'webp', pixFmt: 'yuv420p' }), webp('VP8 '), 'jpg', true],
    ['image/webp', probe({ rawCodec: 'webp', pixFmt: 'yuv420p' }), webp('VP8X', 0x10), 'png', true],
    ['image/webp', probe({ rawCodec: 'webp', pixFmt: 'argb' }), webp('VP8L'), 'png', true],
    ['image/webp', probe({ rawCodec: 'webp_anim', pixFmt: 'argb' }), webp('VP8X', 0x12), 'gif', true],
    ['image/avif', probe({ rawCodec: 'av1', pixFmt: 'yuv420p' }), Buffer.alloc(0), 'jpg', true],
    ['image/avif', probe({ rawCodec: 'av1', pixFmt: 'yuva420p' }), Buffer.alloc(0), 'png', true],
  ];
  for (const [sniffed, p, head, ext, converted] of cases) {
    const r = plan(sniffed, p, head);
    assert.deepEqual([r.ext, r.converted], [ext, converted], `${sniffed} ${p.streams[0].rawCodec} ${p.streams[0].pixFmt}`);
    assert.equal(r.outputFile, path.join(outDir, `img-001.${ext}`));
    if (ext === 'gif') assert.match(after(r.args, '-filter_complex'), /palettegen.*paletteuse/);
  }
});

test('anything that is not really a single image is refused before FFmpeg runs', () => {
  assert.throws(() => plan(null, probe({ rawCodec: 'mjpeg' })), { code: 'NO_MEDIA_FOUND' }, 'unknown magic bytes');
  assert.throws(() => plan('image/jpeg', probe({ rawCodec: 'png' })), { code: 'NO_MEDIA_FOUND' }, 'magic bytes and decoder disagree');
  assert.throws(() => plan('image/png', probe({ rawCodec: 'png' }, [stream({ rawCodec: 'png' }), { index: 1, kind: 'audio', rawCodec: 'aac' }])), { code: 'NO_MEDIA_FOUND' }, 'an image with sound');
  assert.throws(() => plan('image/png', probe({}, [])), { code: 'NO_MEDIA_FOUND' }, 'no stream');
  assert.throws(() => plan('image/png', probe({ rawCodec: 'png', width: 0 })), { code: 'NO_MEDIA_FOUND' }, 'no dimensions');
  assert.throws(() => plan('image/png', probe({ rawCodec: 'png', width: 10000, height: 6000 })), { code: 'FILE_TOO_LARGE' }, 'over the pixel budget');
});

test('the re-encoded file must be the promised format with real dimensions', () => {
  const r = plan('image/jpeg', probe({ rawCodec: 'mjpeg' }));
  assert.deepEqual(verifyImage(probe({ rawCodec: 'mjpeg', width: 600, height: 800 }), r), { width: 600, height: 800 });
  assert.throws(() => verifyImage(probe({ rawCodec: 'png' }), r), { code: 'CONVERSION_FAILED' });
  assert.throws(() => verifyImage({ ...probe({ rawCodec: 'mjpeg' }), sizeBytes: 0 }, r), { code: 'CONVERSION_FAILED' });
});
