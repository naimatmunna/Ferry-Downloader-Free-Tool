import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  coerceUrl,
  directMediaExtension,
  extractUrls,
  hasPlaylistParam,
  hostCandidates,
  hostMatches,
  isObviouslyLocalHost,
  MAX_URL_LENGTH,
  parseMediaUrl,
} from '../src/url.js';

test('hostMatches only matches on label boundaries', () => {
  assert.equal(hostMatches('youtube.com', 'youtube.com'), true);
  assert.equal(hostMatches('m.youtube.com', 'youtube.com'), true);
  assert.equal(hostMatches('notyoutube.com', 'youtube.com'), false);
  assert.equal(hostMatches('youtube.com.evil.example', 'youtube.com'), false);
  assert.equal(hostMatches('', 'youtube.com'), false);
});

test('hostCandidates walks from most to least specific', () => {
  assert.deepEqual(hostCandidates('a.b.example.co.uk'), ['a.b.example.co.uk', 'b.example.co.uk', 'example.co.uk', 'co.uk', 'uk']);
});

test('coerceUrl adds https to bare domains and strips wrappers', () => {
  assert.equal(coerceUrl('  <https://vimeo.com/1>  '), 'https://vimeo.com/1');
  assert.equal(coerceUrl('"https://vimeo.com/1"'), 'https://vimeo.com/1');
  assert.equal(coerceUrl('www.ted.com/talks/x'), 'https://www.ted.com/talks/x');
  assert.equal(coerceUrl('archive.org/details/foo'), 'https://archive.org/details/foo');
  assert.equal(coerceUrl('//cdn.example.com/a.mp4'), 'https://cdn.example.com/a.mp4');
  assert.equal(coerceUrl('hello world'), 'hello world');
});

test('parseMediaUrl rejects bad input with a specific reason', () => {
  assert.deepEqual(parseMediaUrl(''), { ok: false, reason: 'empty' });
  assert.deepEqual(parseMediaUrl('   '), { ok: false, reason: 'empty' });
  assert.equal(parseMediaUrl('not a url').reason, 'invalid');
  assert.equal(parseMediaUrl('ftp://example.com/a.mp4').reason, 'scheme');
  assert.equal(parseMediaUrl('file:///etc/passwd').reason, 'scheme');
  assert.equal(parseMediaUrl('javascript:alert(1)').reason, 'scheme');
  assert.equal(parseMediaUrl('gopher://example.com').reason, 'scheme');
  assert.equal(parseMediaUrl('https://user:pass@example.com/v').reason, 'credentials');
  assert.equal(parseMediaUrl('https://example.com:6379/').reason, 'port');
  assert.equal(parseMediaUrl(`https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`).reason, 'too_long');
});

test('parseMediaUrl flags obviously local destinations, including encoded IPv4', () => {
  for (const u of [
    'http://localhost/',
    'http://127.0.0.1/',
    'http://127.1/',
    'http://0x7f000001/',
    'http://2130706433/',
    'http://0177.0.0.1/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://0.0.0.0/',
    'http://10.0.0.5/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://100.64.0.1/',
    'http://router.lan/',
    'http://printer.local/',
    'http://intranet/',
    'http://app.localhost/',
    'http://[fd00::1]/',
    'http://[fe80::1]/',
  ]) {
    assert.equal(parseMediaUrl(u).reason, 'local', u);
  }
  assert.equal(parseMediaUrl('http://127.0.0.1:8080/', { allowLocal: true }).ok, true);
});

test('parseMediaUrl normalizes and strips tracking parameters', () => {
  const r = parseMediaUrl('https://vimeo.com/76979871?utm_source=x&fbclid=abc&share=copy#t=10');
  assert.equal(r.ok, true);
  assert.equal(r.href, 'https://vimeo.com/76979871');

  const tt = parseMediaUrl('https://www.tiktok.com/@user/video/7300000000000000000?is_from_webapp=1&sender_device=pc&_r=1');
  assert.equal(tt.href, 'https://www.tiktok.com/@user/video/7300000000000000000');

  const x = parseMediaUrl('https://x.com/user/status/1234567890?s=20&t=abcdef');
  assert.equal(x.href, 'https://x.com/user/status/1234567890');
});

test('parseMediaUrl keeps functional parameters', () => {
  const yt = parseMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42&list=PL123&si=tracking');
  assert.equal(yt.href, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42&list=PL123');
});

test('youtu.be and mobile YouTube links are canonicalized', () => {
  assert.equal(parseMediaUrl('https://youtu.be/dQw4w9WgXcQ?si=abc&t=5').href, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5');
  assert.equal(parseMediaUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ').href, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('trailing dots in hostnames are removed and default ports dropped', () => {
  assert.equal(parseMediaUrl('https://vimeo.com./1').href, 'https://vimeo.com/1');
  assert.equal(parseMediaUrl('https://vimeo.com:443/1').href, 'https://vimeo.com/1');
});

test('IDN homographs are punycoded and therefore never equal a real domain', () => {
  const r = parseMediaUrl('https://yоutube.com/watch?v=1'); // Cyrillic "о"
  assert.equal(r.ok, true);
  assert.ok(r.url.hostname.startsWith('xn--'));
  assert.equal(hostMatches(r.url.hostname, 'youtube.com'), false);
});

test('directMediaExtension recognizes media files only', () => {
  assert.equal(directMediaExtension(new URL('https://cdn.example.com/v/clip.MP4?sig=1')), 'mp4');
  assert.equal(directMediaExtension(new URL('https://cdn.example.com/a/song.flac')), 'flac');
  assert.equal(directMediaExtension(new URL('https://cdn.example.com/master.m3u8')), 'm3u8');
  assert.equal(directMediaExtension(new URL('https://example.com/page.html')), null);
  assert.equal(directMediaExtension(new URL('https://example.com/.mp4')), null);
  assert.equal(directMediaExtension(new URL('https://example.com/')), null);
});

test('extractUrls pulls links out of free text, trims punctuation, de-duplicates', () => {
  const text = `Check this (https://vimeo.com/1). Also https://vimeo.com/1?utm_source=a and
    www.ted.com/talks/foo, plus https://en.wikipedia.org/wiki/Foo_(bar) and junk http://localhost/x`;
  assert.deepEqual(extractUrls(text), [
    'https://vimeo.com/1',
    'https://www.ted.com/talks/foo',
    'https://en.wikipedia.org/wiki/Foo_(bar)',
  ]);
  assert.equal(extractUrls('https://a.example/1 https://b.example/2 https://c.example/3', { max: 2 }).length, 2);
});

test('extractUrls is linear on adversarial input', () => {
  const evil = `https://${'a'.repeat(50_000)}${')'.repeat(5_000)}`;
  const t0 = performance.now();
  extractUrls(evil);
  assert.ok(performance.now() - t0 < 500);
});

test('hasPlaylistParam ignores mixes and personal lists', () => {
  assert.equal(hasPlaylistParam('https://www.youtube.com/watch?v=x&list=PLabc'), true);
  assert.equal(hasPlaylistParam('https://www.youtube.com/watch?v=x&list=RDabc'), false);
  assert.equal(hasPlaylistParam('https://www.youtube.com/watch?v=x'), false);
});

test('isObviouslyLocalHost accepts public names', () => {
  assert.equal(isObviouslyLocalHost('archive.org'), false);
  assert.equal(isObviouslyLocalHost('8.8.8.8'), false);
  assert.equal(isObviouslyLocalHost('[2606:4700::1111]'), false);
});
