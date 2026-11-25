import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeLinkError } from '../src/lib/linkError.js';

const x = { id: 'x', name: 'X (Twitter)', content: ['video', 'image', 'gif'], pictures: false };
const instagram = { id: 'instagram', name: 'Instagram', content: ['video', 'image', 'playlist'], pictures: true };
const soundcloud = { id: 'soundcloud', name: 'SoundCloud', content: ['audio', 'playlist'], pictures: false };
const generic = { id: 'generic', name: 'Other website', content: ['video'], pictures: false };
const err = (code, extra = {}) => ({ code, retryable: false, ...extra });

test('a post with no video on a site whose pictures Ferry can’t save yet is "coming soon", with what works', () => {
  const d = describeLinkError(err('NO_MEDIA_FOUND'), { platform: x, host: 'x.com' });
  assert.equal(d.kind, 'pictures-soon');
  assert.equal(d.pill, 'soon');
  assert.deepEqual(d.works, [{ what: 'video', ok: true }, { what: 'pictures', ok: false }]);
  assert.equal(d.primary, 'paste');
  assert.equal(d.siteLink, 'x');
  // A link yt-dlp has no reader for on a known site (a Facebook photo page) reads the same way.
  assert.equal(describeLinkError(err('UNSUPPORTED_PLATFORM'), { platform: x, host: 'x.com' }).kind, 'pictures-soon');
});

test('a site this server can’t read at all never claims its videos work', () => {
  const pixabay = { id: 'pixabay', name: 'Pixabay', content: ['video', 'image'], pictures: false, available: false };
  const d = describeLinkError(err('UNSUPPORTED_PLATFORM'), { platform: pixabay, host: 'pixabay.com' });
  assert.equal(d.kind, 'other');
  assert.deepEqual(d.works, []);
});

test('sites whose pictures already work, or that have no pictures, never promise them', () => {
  assert.equal(describeLinkError(err('NO_MEDIA_FOUND'), { platform: instagram, host: 'instagram.com' }).kind, 'other');
  assert.equal(describeLinkError(err('NO_MEDIA_FOUND'), { platform: soundcloud, host: 'soundcloud.com' }).kind, 'other');
});

test('a website Ferry can’t read is "coming soon" under its own address', () => {
  for (const platform of [generic, null]) {
    const d = describeLinkError(err('UNSUPPORTED_PLATFORM'), { platform, host: 'www.example-news.com' });
    assert.equal(d.kind, 'website-soon');
    assert.equal(d.pill, 'soon');
    assert.equal(d.name, 'example-news.com');
    assert.equal(d.siteLink, null);
  }
  assert.equal(describeLinkError(err('NO_MEDIA_FOUND'), { platform: generic, host: 'example.org' }).kind, 'website-soon');
});

test('sign-in walls, removed posts and temporary trouble each get their own honest card', () => {
  const signin = describeLinkError(err('AUTH_REQUIRED'), { platform: x, host: 'x.com' });
  assert.equal(signin.kind, 'signin');
  assert.equal(signin.pill, 'signin');
  for (const code of ['CONTENT_UNAVAILABLE', 'PRIVATE_CONTENT']) assert.equal(describeLinkError(err(code), { platform: x, host: 'x.com' }).kind, 'gone');
  const wait = describeLinkError(err('SOURCE_RATE_LIMITED', { retryable: true }), { platform: x, host: 'x.com' });
  assert.equal(wait.kind, 'wait');
  assert.equal(wait.primary, 'retry');
});

test('anything else keeps its own message, with the site named when Ferry knows it', () => {
  const d = describeLinkError(err('GEO_RESTRICTED'), { platform: x, host: 'x.com' });
  assert.equal(d.kind, 'other');
  assert.equal(d.name, 'X (Twitter)');
  assert.equal(d.primary, 'paste');
  assert.equal(describeLinkError(err('EXTRACTION_FAILED', { retryable: true }), { platform: null, host: null }).primary, 'retry');
});
