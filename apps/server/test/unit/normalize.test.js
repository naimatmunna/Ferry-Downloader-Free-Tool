import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInfo, publicMedia, sanitizeFormats } from '../../src/media/normalize.js';

const fmt = (o) => ({ protocol: 'https', ...o });
// Structure mirrors yt-dlp info dicts (adaptive video-only + audio-only formats).
const adaptive = {
  id: 'abc',
  title: 'Test clip',
  uploader: 'Uploader',
  duration: 100,
  upload_date: '20261124',
  webpage_url: 'https://video.example/watch/abc',
  extractor: 'example',
  thumbnails: [
    { url: 'https://img.example/small.jpg', width: 320 },
    { url: 'https://img.example/hq.jpg', width: 1280 },
    { url: 'https://img.example/max.jpg', width: 3840 },
  ],
  formats: [
    fmt({ format_id: 'sb0', ext: 'mhtml', vcodec: 'none', acodec: 'none', format_note: 'storyboard' }),
    fmt({ format_id: 'a-en', ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2', abr: 129, filesize: 1_600_000, language: 'en' }),
    fmt({ format_id: 'a-en-opus', ext: 'webm', vcodec: 'none', acodec: 'opus', abr: 135, filesize_approx: 1_700_000, language: 'en' }),
    fmt({ format_id: 'a-es', ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2', abr: 128, filesize: 1_600_000, language: 'es' }),
    fmt({ format_id: 'v360', ext: 'mp4', vcodec: 'avc1.4d401e', acodec: 'none', width: 640, height: 360, fps: 30, tbr: 400, filesize: 5_000_000 }),
    fmt({ format_id: 'v1080', ext: 'mp4', vcodec: 'avc1.640028', acodec: 'none', width: 1920, height: 1080, fps: 30, tbr: 2500, filesize: 30_000_000 }),
    fmt({ format_id: 'v1080vp9', ext: 'webm', vcodec: 'vp09.00.40.08', acodec: 'none', width: 1920, height: 1080, fps: 60, tbr: 2200, filesize_approx: 28_000_000, dynamic_range: 'HDR10' }),
    fmt({ format_id: 'v2160', ext: 'webm', vcodec: 'vp9', acodec: 'none', width: 3840, height: 2160, fps: 30, tbr: 12000, has_drm: 'maybe' }),
    fmt({ format_id: 'rtmp1', protocol: 'rtmp', vcodec: 'avc1', acodec: 'mp4a.40.2', width: 1280, height: 720 }),
  ],
  subtitles: { en: [{ ext: 'vtt', name: 'English' }, { ext: 'srt' }], live_chat: [{ ext: 'json' }] },
  automatic_captions: { 'en-orig': [{ ext: 'vtt', name: 'English (original)' }], fr: [{ ext: 'vtt' }], de: [{ ext: 'vtt' }] },
};

test('sanitizeFormats removes DRM (incl. "maybe"), storyboards and non-HTTP protocols', () => {
  const { kept, drm, unsupportedProtocol } = sanitizeFormats(adaptive.formats);
  assert.equal(drm, 1);
  assert.equal(unsupportedProtocol, 1);
  assert.deepEqual(kept.map((f) => f.id), ['a-en', 'a-en-opus', 'a-es', 'v360', 'v1080', 'v1080vp9']);
  assert.equal(kept.find((f) => f.id === 'v1080').vcodec, 'h264');
});

test('normalizeInfo builds honest qualities, sizes and audio tracks', () => {
  const m = normalizeInfo(adaptive);
  assert.equal(m.kind, 'video');
  assert.deepEqual(m.video.qualities.map((q) => q.res), [1080, 360], 'no 4K: it was DRM-flagged');
  const q1080 = m.video.qualities[0];
  assert.equal(q1080.label, '1080p');
  assert.equal(q1080.tag, 'Full HD');
  assert.equal(q1080.fps, 60);
  assert.equal(q1080.hdr, true);
  assert.deepEqual(q1080.codecs.sort(), ['h264', 'vp9']);
  // best video-only (by bitrate) + best audio track
  assert.equal(q1080.sizeBytes.video, 30_000_000);
  assert.equal(q1080.sizeBytes.av, 30_000_000 + 1_700_000);
  assert.equal(q1080.approx, true, 'audio size was approximate');
  assert.deepEqual(m.audio.tracks.map((t) => [t.id, t.codec, t.abrKbps]), [['en', 'opus', 135], ['es', 'aac', 128]]);
  assert.equal(m.audio.best.codec, 'opus');
  assert.deepEqual(m.capabilities.modes, ['av', 'video', 'audio']);
  assert.equal(m.capabilities.trim, true);
  assert.equal(m.uploadDate, '2026-11-24');
  assert.equal(m.thumbnailSource, 'https://img.example/hq.jpg');
});

test('subtitles: manual tracks plus only the original automatic track', () => {
  const m = normalizeInfo(adaptive);
  assert.deepEqual(m.subtitles.map((s) => [s.lang, s.auto]), [['en', false], ['en-orig', true]]);
  assert.deepEqual(m.subtitles[0].formats, ['vtt', 'srt']);
});

test('portrait formats are labelled by class, not raw height', () => {
  const m = normalizeInfo({ title: 'Vertical', duration: 10, formats: [fmt({ format_id: 'p', vcodec: 'h264', acodec: 'aac', width: 1080, height: 1920, tbr: 3000 })] });
  assert.deepEqual(m.video.qualities.map((q) => q.res), [1080]);
  assert.equal(m.audio.tracks.length, 1, 'audio comes from the combined format');
});

test('all-DRM media is refused; live and upcoming streams are refused', () => {
  assert.throws(() => normalizeInfo({ title: 'x', formats: [fmt({ format_id: '1', vcodec: 'h264', acodec: 'aac', has_drm: true })] }), { code: 'DRM_PROTECTED' });
  assert.throws(() => normalizeInfo({ title: 'x', formats: [] }), { code: 'NO_MEDIA_FOUND' });
  assert.throws(() => normalizeInfo({ ...adaptive, is_live: true }), { code: 'LIVE_NOT_SUPPORTED' });
  assert.throws(() => normalizeInfo({ ...adaptive, live_status: 'is_upcoming' }), { code: 'LIVE_NOT_SUPPORTED' });
  assert.doesNotThrow(() => normalizeInfo({ ...adaptive, live_status: 'was_live' }));
});

test('unknown generic formats stay unknown (no invented details)', () => {
  const m = normalizeInfo({ title: 'Page clip', extractor: 'html5', formats: [{ format_id: '0', ext: 'mp4', protocol: 'http', vcodec: null, url: 'http://x/y.mp4' }] });
  assert.equal(m.video.unknown, true);
  assert.deepEqual(m.video.qualities, []);
  assert.deepEqual(m.capabilities.modes, ['av', 'video', 'audio']);
  assert.equal(m.durationSec, null);
  assert.equal(m.capabilities.trim, false);
});

test('flat playlists list entries with http(s) URLs only', () => {
  const m = normalizeInfo({
    _type: 'playlist',
    title: 'My list',
    playlist_count: 3,
    entries: [
      { id: 'a', title: 'One', url: 'https://video.example/a', duration: 60 },
      { id: 'b', title: 'Two', url: 'b-relative-id' },
      { id: 'c', title: 'Three', webpage_url: 'https://video.example/c' },
    ],
  });
  assert.equal(m.kind, 'playlist');
  assert.deepEqual(m.entries.map((e) => e.id), ['a', 'c']);
  const pub = publicMedia(m);
  assert.equal(pub.entries[0].url, undefined, 'entry URLs stay server-side');
  assert.equal(pub.raw, undefined);
});
