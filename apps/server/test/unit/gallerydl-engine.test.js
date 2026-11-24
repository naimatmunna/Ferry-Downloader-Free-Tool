import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  GDL_FILE_MARKER,
  baseArgs,
  buildGallery,
  classifyGalleryError,
  createDownloadTracker,
  downloadArgs,
  galleryInput,
  parseMessages,
  probeArgs,
  rangeSpec,
} from '../../src/engines/galleryDl.js';

const PROXY = 'http://u:p@127.0.0.1:9';
const base = baseArgs({ proxyUrl: PROXY, cacheFile: '/tmp/job/gdl-cache.sqlite3' });

/** A Mastodon status as gallery-dl 1.32.21 prints it with -j (captured from a local fixture API). */
const account = { acct: 'ferry', display_name: 'Ferry Fixtures', id: '1', url: 'http://127.0.0.1:8931/@ferry', username: 'ferry' };
const post = {
  account, card: null, category: '127.0.0.1:8931', content: '<p>Three self-made <b>test</b> images &amp; a clip</p>', count: 4,
  created_at: '2026-11-20T10:00:00.000Z', date: '2026-11-20 10:00:00', emojis: [], id: '123456789', in_reply_to_id: null,
  instance: '127.0.0.1:8931', instance_remote: null, language: 'en', mentions: [], poll: null, reblog: null, sensitive: false,
  spoiler_text: '', subcategory: 'status', tags: [], uri: 'http://127.0.0.1:8931/users/ferry/statuses/123456789',
  url: 'http://127.0.0.1:8931/@ferry/123456789', visibility: 'public',
};
const media = (id, file, type, w, h) => ({
  blurhash: null, description: `Image ${id}`, id: String(id), meta: { original: { height: h, size: `${w}x${h}`, width: w } },
  preview_url: `http://127.0.0.1:8931/media/small/${file}`, remote_url: null, type, url: `http://127.0.0.1:8931/media/${file}`,
});
const fileMsg = (num, file, ext, m) => [3, m.url, { ...post, extension: ext, filename: file.replace(/\.[^.]+$/, ''), media: m, num }];
const MASTODON_JSON = JSON.stringify([
  [2, post],
  fileMsg(1, 'a.jpg', 'jpg', media(11, 'a.jpg', 'image', 800, 600)),
  fileMsg(2, 'b.png', 'png', media(12, 'b.png', 'image', 640, 640)),
  fileMsg(3, 'clip.mp4', 'mp4', media(13, 'clip.mp4', 'video', 320, 240)),
  fileMsg(4, 'c.gif', 'gif', media(14, 'c.gif', 'image', 320, 240)),
], null, 2);

test('hardened base profile: no config, no cookies or logins, no browser imitation, per-job proxy', () => {
  for (const flag of ['--config-ignore', '--no-input', '--no-colors']) assert.ok(base.includes(flag), flag);
  assert.equal(base[base.indexOf('--proxy') + 1], PROXY);
  assert.equal(base[base.indexOf('--cache-file') + 1], '/tmp/job/gdl-cache.sqlite3');
  const options = base.flatMap((a, i) => (a === '-o' ? [base[i + 1]] : []));
  assert.ok(options.includes('browser=false'), 'browser emulation must be off');
  assert.ok(options.includes('proxy-env=false'), 'only the explicit proxy may be used');
  for (const forbidden of ['--exec', '--exec-after', '-C', '--cookies', '--cookies-from-browser', '-u', '--username', '-p', '--password', '--netrc',
    '-c', '--config', '--config-json', '--config-yaml', '--config-toml', '-X', '--extractors', '--no-check-certificate', '--xff', '-U', '--update',
    '-J', '--resolve-json', '-i', '--input-file']) {
    assert.ok(!base.includes(forbidden), forbidden);
  }
});

test('probe lists one item more than the cap (to detect truncation) and keeps the input after "--"', () => {
  const args = probeArgs({ base, input: 'https://imgur.com/a/abc', maxItems: 100 });
  assert.ok(args.includes('-j'));
  assert.ok(args.includes('--no-postprocessors'));
  assert.equal(args[args.indexOf('--range') + 1], '1-101');
  assert.deepEqual(args.slice(-2), ['--', 'https://imgur.com/a/abc']);
});

test('download selects exactly the chosen indexes and never spawns child extractors or yt-dlp', () => {
  const args = downloadArgs({ base, input: 'https://imgur.com/a/abc', indexes: [4, 1, 2, 2], outDir: '/job/tmp/gallery', maxFileBytes: 5_000_000 });
  assert.equal(args[args.indexOf('--range') + 1], '1-2,4');
  assert.equal(args[args.indexOf('--child-filter') + 1], 'False');
  assert.equal(args[args.indexOf('-D') + 1], '/job/tmp/gallery');
  assert.equal(args[args.indexOf('--restrict-filenames') + 1], 'ascii');
  assert.equal(args[args.indexOf('--filesize-max') + 1], '5000000');
  assert.equal(args[args.indexOf('--Print') + 1], `prepare:${GDL_FILE_MARKER} {_url!q}`);
  const options = args.flatMap((a, i) => (a === '-o' ? [args[i + 1]] : []));
  assert.ok(options.includes('downloader.ytdl.enabled=false'));
  assert.ok(!args.includes('--no-postprocessors'), 'the marker hook is a post-processor');
  assert.deepEqual(args.slice(-2), ['--', 'https://imgur.com/a/abc']);
  assert.throws(() => downloadArgs({ base, input: 'https://imgur.com/a/abc', indexes: [], outDir: '/o', maxFileBytes: 1 }));
});

test('range specs merge runs and reject anything that is not a positive integer', () => {
  assert.equal(rangeSpec([7, 1, 3, 2, 8, 5]), '1-3,5,7-8');
  assert.equal(rangeSpec([9]), '9');
  for (const bad of [[0], [-1], [1.5], ['2'], [Number.NaN]]) assert.throws(() => rangeSpec(bad), String(bad));
});

test('only http(s) links become gallery-dl input; federated Mastodon posts get the instance prefix', () => {
  assert.equal(galleryInput('https://imgur.com/a/abc', 'imgur'), 'https://imgur.com/a/abc');
  assert.equal(galleryInput('https://social.example/@ann/111222333', 'mastodon'), 'mastodon:https://social.example/@ann/111222333');
  for (const bad of ['--exec=calc.exe', 'file:///etc/passwd', 'ytdl:https://www.youtube.com/watch?v=x', 'generic:https://example.com/', 'recursive:https://x.y/']) {
    assert.throws(() => galleryInput(bad, 'imgur'), bad);
  }
  const tricky = probeArgs({ base, input: galleryInput('https://imgur.com/a/--exec', 'imgur'), maxItems: 5 });
  assert.equal(tricky.at(-1), 'https://imgur.com/a/--exec');
});

test('JSON messages: posts, files (numbered in output order), child links and errors', () => {
  const m = parseMessages(`${MASTODON_JSON.slice(0, -2)},\n  [6, "https://imgur.com/a/xyz", {"category": "x"}],\n  [-1, {"error": "HttpError", "message": "boom"}]\n]`);
  assert.equal(m.posts.length, 1);
  assert.deepEqual(m.files.map((f) => [f.index, f.url]), [
    [1, 'http://127.0.0.1:8931/media/a.jpg'], [2, 'http://127.0.0.1:8931/media/b.png'], [3, 'http://127.0.0.1:8931/media/clip.mp4'], [4, 'http://127.0.0.1:8931/media/c.gif'],
  ]);
  assert.deepEqual(m.children.map((c) => c.url), ['https://imgur.com/a/xyz']);
  assert.deepEqual(m.errors, [{ name: 'HttpError', message: 'boom' }]);
  for (const bad of ['', 'not json', '{"a":1}', '[[3]]']) assert.throws(() => parseMessages(bad), { code: 'EXTRACTION_FAILED' }, bad);
});

test('a Mastodon post becomes a gallery of its images; the clip is counted, not offered', () => {
  const g = buildGallery({ messages: parseMessages(MASTODON_JSON), pageUrl: 'http://127.0.0.1:8931/@ferry/123456789', maxItems: 100, fallbackTitle: 'Mastodon post' });
  assert.equal(g._type, 'gallery');
  assert.equal(g.id, '123456789');
  assert.equal(g.title, 'Three self-made test images & a clip');
  assert.equal(g.uploader, 'Ferry Fixtures');
  assert.equal(g.upload_date, '20261120');
  assert.equal(g.webpage_url, 'http://127.0.0.1:8931/@ferry/123456789');
  assert.equal(g.thumbnail, 'http://127.0.0.1:8931/media/small/a.jpg');
  assert.deepEqual(g.gallery.items, [
    { index: 1, url: 'http://127.0.0.1:8931/media/a.jpg', ext: 'jpg', width: 800, height: 600, filesize: null, preview: 'http://127.0.0.1:8931/media/small/a.jpg' },
    { index: 2, url: 'http://127.0.0.1:8931/media/b.png', ext: 'png', width: 640, height: 640, filesize: null, preview: 'http://127.0.0.1:8931/media/small/b.png' },
    { index: 4, url: 'http://127.0.0.1:8931/media/c.gif', ext: 'gif', width: 320, height: 240, filesize: null, preview: 'http://127.0.0.1:8931/media/small/c.gif' },
  ]);
  assert.deepEqual(g.gallery.skipped, { videos: 1, other: 0, links: 0 });
  assert.equal(g.gallery.truncated, false);
});

test('embeds handed to yt-dlp (ytdl:), text blocks and non-http files are never gallery items', () => {
  const json = JSON.stringify([
    [2, { id: 'p1', name: 'Project', category: 'behance' }],
    [3, 'ytdl:https://www.youtube.com/embed/abc', { extension: 'mp4' }],
    [3, 'text:<p>hello</p>', { extension: 'txt' }],
    [3, 'https://cdn.example/1.jpg?x=1', { extension: 'jpg', width: '1200', height: '900', size: 34567 }],
    [3, 'https://cdn.example/2', { extension: 'PNG' }],
    [3, 'https://cdn.example/3.webm', {}],
    [3, 'https://cdn.example/4.svg', { extension: 'svg' }],
  ]);
  const g = buildGallery({ messages: parseMessages(json), pageUrl: 'https://www.behance.net/gallery/1/Project', maxItems: 100, fallbackTitle: 'x' });
  assert.equal(g.title, 'Project');
  assert.deepEqual(g.gallery.items.map((i) => [i.index, i.ext, i.width, i.height, i.filesize]), [[3, 'jpg', 1200, 900, 34567], [4, 'png', null, null, null]]);
  assert.deepEqual(g.gallery.skipped, { videos: 2, other: 2, links: 0 });
});

test('more files than the cap marks the gallery as truncated and drops the extra file', () => {
  const json = JSON.stringify([[2, { id: 'a' }], ...[1, 2, 3].map((n) => [3, `https://cdn.example/${n}.jpg`, { extension: 'jpg' }])]);
  const g = buildGallery({ messages: parseMessages(json), pageUrl: 'https://imgur.com/a/a', maxItems: 2, fallbackTitle: 'Imgur album' });
  assert.deepEqual(g.gallery.items.map((i) => i.index), [1, 2]);
  assert.equal(g.gallery.truncated, true);
  assert.equal(g.title, 'Imgur album');
});

test('download output: each marker belongs to the next chosen index; a missing path means that file failed', () => {
  const dir = path.join(path.sep, 'job', 'tmp', 'gallery');
  const t = createDownloadTracker([2, 5, 9, 11]);
  for (const line of [
    'stray output before any marker',
    `${GDL_FILE_MARKER} https%3A//cdn.example/b.jpg`,
    path.join(dir, 'imgur_b.jpg'),
    `${GDL_FILE_MARKER} https%3A//cdn.example/e.png`, // failed: no path follows
    `${GDL_FILE_MARKER} https%3A//cdn.example/i.gif`,
    `# ${path.join(dir, 'imgur_i.gif')}`, // already on disk from an earlier attempt
    `${GDL_FILE_MARKER} https%3A//cdn.example/k.jpg`,
    `# ${path.join(dir, 'imgur_b.jpg')}`, // name collision with index 2: not the same file
    `${GDL_FILE_MARKER} https%3A//cdn.example/extra.jpg`, // more markers than chosen: ignored
    path.join(dir, 'extra.jpg'),
  ]) t.onLine(line);
  assert.deepEqual(t.files(), [{ index: 2, name: 'imgur_b.jpg' }, { index: 9, name: 'imgur_i.gif' }]);
  assert.equal(t.started, 4);
});

test('gallery-dl failures map to Ferry error codes', () => {
  const c = (errors, stderr = '', exitCode = 0) => classifyGalleryError({ errors, stderr, exitCode });
  assert.equal(c([{ name: 'NotFoundError', message: 'Requested resource (gallery/image) could not be found' }]), 'CONTENT_UNAVAILABLE');
  for (const name of ['AuthorizationError', 'AuthRequired', 'AuthenticationError']) assert.equal(c([{ name, message: 'x' }]), 'AUTH_REQUIRED', name);
  assert.equal(c([{ name: 'HttpError', message: "'429 Too Many Requests' for 'https://x'" }]), 'SOURCE_RATE_LIMITED');
  assert.equal(c([{ name: 'ChallengeError', message: 'Cloudflare challenge' }]), 'SOURCE_RATE_LIMITED');
  assert.equal(c([{ name: 'HttpError', message: "'404 Not Found' for 'https://x'" }]), 'CONTENT_UNAVAILABLE');
  assert.equal(c([{ name: 'AbortExtraction', message: 'None' }], '[x][warning]  NewConnectionError: Failed to establish a new connection'), 'NETWORK_ERROR');
  assert.equal(c([], "[gallery-dl][error] Unsupported URL 'https://example.com/'", 64), 'UNSUPPORTED_PLATFORM');
  assert.equal(c([], "ProxyError('Unable to connect to proxy', OSError('Tunnel connection failed: 403 Ferry Blocked Destination'))", 128), 'BLOCKED_DESTINATION');
  assert.equal(c([{ name: 'AbortExtraction', message: 'None' }]), 'EXTRACTION_FAILED');
});
