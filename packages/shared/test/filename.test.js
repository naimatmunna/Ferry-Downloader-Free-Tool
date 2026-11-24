import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDownloadName, contentDisposition, renderTemplate, sanitizeFilename, truncateBytes, validateTemplate } from '../src/filename.js';

test('sanitizeFilename removes separators, controls and reserved characters', () => {
  assert.equal(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j'), 'a b c d e f g h i j');
  assert.equal(sanitizeFilename('line\r\nbreak\tand\u0000null'), 'line break and null');
  assert.equal(sanitizeFilename('../../etc/passwd'), 'etc passwd');
  assert.equal(sanitizeFilename('   ...hidden...   '), 'hidden');
  assert.equal(sanitizeFilename(''), 'download');
  assert.equal(sanitizeFilename(null, { fallback: 'x' }), 'x');
});

test('sanitizeFilename strips bidi overrides used for extension spoofing', () => {
  // "photo‮gpj.exe" renders as "photoexe.jpg" in some UIs.
  assert.equal(sanitizeFilename('photo‮gpj.exe'), 'photogpj.exe');
  assert.equal(sanitizeFilename('zero​width﻿'), 'zerowidth');
});

test('sanitizeFilename avoids Windows device names', () => {
  assert.equal(sanitizeFilename('CON'), '_CON');
  assert.equal(sanitizeFilename('nul.txt'), '_nul.txt');
  assert.equal(sanitizeFilename('com1'), '_com1');
  assert.equal(sanitizeFilename('console'), 'console');
});

test('sanitizeFilename keeps unicode and truncates on grapheme boundaries', () => {
  assert.equal(sanitizeFilename('Café — 東京 🎬'), 'Café — 東京 🎬');
  const long = '👩‍👩‍👧‍👦'.repeat(40); // 25 bytes per family emoji
  const out = sanitizeFilename(long);
  assert.ok(new TextEncoder().encode(out).length <= 180);
  assert.equal(out.length % '👩‍👩‍👧‍👦'.length, 0, 'no partial grapheme');
  assert.equal(truncateBytes('abc', 2), 'ab');
});

test('renderTemplate fills known tokens and drops unknown/empty ones', () => {
  const vars = { title: 'My: Video', uploader: 'Ana', platform: 'Vimeo', id: '42', quality: '1080p', date: '2026-11-24' };
  assert.equal(renderTemplate('{title}', vars), 'My Video');
  assert.equal(renderTemplate('{uploader} - {title} [{quality}]', vars), 'Ana - My Video [1080p]');
  assert.equal(renderTemplate('{title} [{quality}]', { title: 'X' }), 'X');
  assert.equal(renderTemplate('{evil}{title}', vars), 'My Video');
  assert.equal(renderTemplate('{uploader} - {title}', { title: 'Solo' }), 'Solo');
});

test('buildDownloadName forces the server extension', () => {
  assert.equal(buildDownloadName({ template: '{title}', vars: { title: 'clip.exe' }, ext: 'mp4' }), 'clip.exe.mp4');
  assert.equal(buildDownloadName({ template: '{title}', vars: { title: '' }, ext: 'mp3' }), 'download.mp3');
  assert.equal(buildDownloadName({ template: '{title}', vars: { title: 'a' }, ext: 'm p/4' }), 'a.mp4');
});

test('validateTemplate', () => {
  assert.deepEqual(validateTemplate('{title} - {date}'), { ok: true });
  assert.equal(validateTemplate('{password}').reason, 'unknown_token');
  assert.equal(validateTemplate('').reason, 'length');
  assert.equal(validateTemplate('x'.repeat(121)).reason, 'length');
});

test('contentDisposition provides ASCII fallback and RFC 5987 UTF-8 name, no header injection', () => {
  const h = contentDisposition('Café "quoted"\r\nX-Evil: 1.mp4');
  assert.ok(!/[\r\n]/.test(h));
  // Quotes, colons and CR/LF are reserved characters: they become spaces and collapse.
  assert.equal(h, `attachment; filename="Cafe quoted X-Evil 1.mp4"; filename*=UTF-8''Caf%C3%A9%20quoted%20X-Evil%201.mp4`);
  assert.equal(contentDisposition('ملف.mp3'), `attachment; filename="download.mp3"; filename*=UTF-8''%D9%85%D9%84%D9%81.mp3`);
  assert.match(contentDisposition('😀 a‍b.mp4'), /filename\*=UTF-8''%F0%9F%98%80%20a%E2%80%8Db\.mp4/);
  assert.match(contentDisposition('a.mp4', 'inline'), /^inline;/);
  assert.match(contentDisposition("it's (1).mp3"), /filename\*=UTF-8''it%27s%20%281%29\.mp3/);
});
