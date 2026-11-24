/**
 * Image galleries end to end: real gallery-dl (through the egress proxy),
 * real FFmpeg, and only self-authored fixture images served by a local
 * Mastodon-style status API (see helpers/fixtureServer.js#GALLERY_POSTS).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { loadConfig } from '../../src/config.js';
import { createFerry } from '../../src/bootstrap.js';
import { createLogger } from '../../src/logger.js';
import { ffprobe } from '../../src/engines/ffmpeg.js';
import { which } from '../../src/engines/process.js';
import { sniffImage } from '../../src/adapters/http.js';
import { startFixtureServer } from '../helpers/fixtureServer.js';

const ADMIN = 'test-admin-token-0123456789abcdef0123456789';
const PRIVATE_MARK = 'FERRY-PRIVATE-METADATA';
const base = { auth: 'none', officialApi: null, restrictions: '', reliability: 'verified', lastChecked: '2026-11-24', routes: [] };
const CATALOG = [
  // Same detection as the real registry entry: Mastodon post URLs on any server.
  { ...base, id: 'mastodon', name: 'Mastodon (fediverse)', kind: 'social', hosts: [], patterns: [/^\/@[\w.]+\/\d{6,}$/], content: ['image'], engine: 'gallery-dl', category: 4, policy: 'attestation', routes: [{ label: 'Export your posts', url: 'https://docs.joinmastodon.org/user/moving/' }] },
  { ...base, id: 'direct', name: 'Direct media link', kind: 'direct', hosts: [], content: ['video'], engine: 'direct', category: 4, policy: 'attestation' },
  { ...base, id: 'generic', name: 'Other website', kind: 'generic', hosts: [], content: ['video'], engine: 'yt-dlp', category: 4, policy: 'attestation' },
];

let fx;
let ferry;
let origin;
let dataDir;
let FFPROBE;

function configFor(dir, extra = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    DATA_DIR: dir,
    PORT: '0',
    SSRF_ALLOW_HOSTS: fx.authority,
    ADMIN_TOKEN: ADMIN,
    MAX_ACTIVE_JOBS_PER_CLIENT: '6',
    RATE_LIMIT_PROBE_PER_MIN: '200',
    RATE_LIMIT_JOBS_PER_MIN: '200',
    PATH: process.env.PATH,
    ...extra,
  });
}

before(async () => {
  fx = await startFixtureServer();
  dataDir = mkdtempSync(path.join(os.tmpdir(), 'ferry-gallery-'));
  FFPROBE = await which('ffprobe');
  ferry = await createFerry(configFor(dataDir), { logger: createLogger({ level: 'silent' }), catalog: CATALOG, catalogVersion: 'test' });
  origin = `http://127.0.0.1:${(await ferry.listen(0, '127.0.0.1')).port}`;
});

after(async () => {
  await ferry?.close();
  await fx?.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const api = (p, init = {}, at = origin) =>
  fetch(`${at}${p}`, { ...init, headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) } });
const json = async (res) => ({ status: res.status, headers: res.headers, body: res.status === 204 ? null : await res.json() });
const post = async (p, body, headers, at) => json(await api(p, { method: 'POST', body: JSON.stringify(body), headers }, at));
const postUrl = (id) => `${fx.origin}/@ferry/${id}`;

async function waitFor(id, token, timeoutMs = 90_000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const r = await json(await api(`/api/v1/jobs/${id}`, { headers: { authorization: `Bearer ${token}` } }));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    if (['ready', 'failed', 'cancelled'].includes(r.body.job.status)) return r.body.job;
    if (Date.now() > end) throw new Error(`timeout waiting for job ${id}: ${JSON.stringify(r.body.job)}`);
    await sleep(250);
  }
}

async function fetchBytes(p) {
  const res = await api(p);
  assert.equal(res.status, 200, p);
  return { res, buf: Buffer.from(await res.arrayBuffer()) };
}

/** Entries of a STORE-only ZIP (what storage/zip.js writes), read from its central directory. */
function unzip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocd >= 0, 'end of central directory');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const dataAt = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    entries.push({ name, data: buf.subarray(dataAt, dataAt + size) });
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return entries;
}

test('a Mastodon post becomes a gallery preview: images only, source URLs stay on the server', async () => {
  const p = await post('/api/v1/probe', { url: postUrl(111111111) });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.equal(p.body.source.platform.id, 'mastodon');
  assert.equal(p.body.source.policy.status, 'attestation');
  const { media } = p.body;
  assert.equal(media.kind, 'gallery');
  assert.equal(media.title, 'Harbour pictures & a clip');
  assert.equal(media.uploader, 'Ferry Fixtures');
  assert.deepEqual(media.capabilities.modes, ['gallery']);
  assert.deepEqual(media.gallery.items.map((i) => [i.index, i.ext, i.width, i.height]), [[1, 'jpg', 800, 400], [2, 'png', 640, 640], [3, 'gif', 320, 240], [5, 'webp', 400, 300]]);
  assert.deepEqual(media.gallery.skipped, { videos: 1, other: 0, links: 0 });
  assert.equal(media.raw, undefined);
  assert.ok(!JSON.stringify(p.body).includes(`${fx.origin}/gallery/`), 'item URLs never reach the client');

  const preview = await fetchBytes(media.gallery.items[1].previewUrl);
  assert.equal(preview.res.headers.get('content-type'), 'image/png');
});

test('gallery jobs need the attestation and may only pick offered images', async () => {
  const p = await post('/api/v1/probe', { url: postUrl(111111111) });
  const probeId = p.body.probe.id;
  const noAttest = await post('/api/v1/jobs', { probeId, mode: 'gallery', gallery: { items: [1] } });
  assert.equal(noAttest.body.error.code, 'ATTESTATION_REQUIRED');
  for (const items of [[4], [99]]) {
    const r = await post('/api/v1/jobs', { probeId, mode: 'gallery', gallery: { items }, attest: true });
    assert.equal(r.body.error.code, 'FORMAT_UNAVAILABLE', `items ${items}`);
  }
  assert.equal((await post('/api/v1/jobs', { probeId, mode: 'av', video: { container: 'mp4', quality: 'best' }, attest: true })).body.error.code, 'FORMAT_UNAVAILABLE');
  assert.equal((await post('/api/v1/jobs', { probeId, mode: 'gallery', attest: true })).body.error.code, 'VALIDATION_FAILED');
  assert.equal((await post('/api/v1/jobs', { probeId, mode: 'gallery', gallery: { items: [] }, attest: true })).body.error.code, 'VALIDATION_FAILED');
});

test('chosen images are fetched through the egress proxy, re-encoded without metadata, and zipped', async () => {
  const p = await post('/api/v1/probe', { url: postUrl(111111111) });
  const pngHitsBefore = fx.hits.get('/gallery/photo-2.png') ?? 0;
  const c = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'gallery', gallery: { items: [5, 1, 3] }, attest: true });
  assert.equal(c.status, 202, JSON.stringify(c.body));
  const job = await waitFor(c.body.job.id, c.body.token);
  assert.equal(job.status, 'ready', JSON.stringify(job.error));
  assert.deepEqual(job.request.gallery.items, [1, 3, 5]);

  const files = job.output.files;
  assert.deepEqual(files.map((f) => [f.name, f.kind, f.mime]), [
    ['Harbour pictures & a clip - 01.jpg', 'image', 'image/jpeg'],
    ['Harbour pictures & a clip - 03.gif', 'image', 'image/gif'],
    ['Harbour pictures & a clip - 05.jpg', 'image', 'image/jpeg'],
  ]);
  assert.deepEqual(job.output.notes, []);

  const bytes = [];
  for (const f of files) {
    const { buf } = await fetchBytes(`${f.url}?token=${encodeURIComponent(c.body.token)}`);
    bytes.push(buf);
    assert.equal(sniffImage(buf), f.mime, f.name);
    assert.ok(!buf.includes(PRIVATE_MARK), `${f.name} still carries source metadata`);
  }
  const probeOf = async (buf, n) => {
    const file = path.join(dataDir, `g-${job.id}-${n}`);
    writeFileSync(file, buf);
    return ffprobe({ bin: FFPROBE, file, cwd: dataDir });
  };
  const photo = (await probeOf(bytes[0], 0)).streams[0];
  assert.deepEqual([photo.rawCodec, photo.width, photo.height], ['mjpeg', 400, 800], 'EXIF orientation applied: the landscape source is shown upright');
  const gif = (await probeOf(bytes[1], 1)).streams[0];
  assert.deepEqual([gif.rawCodec, gif.frames], ['gif', 5], 'animation kept');
  const webp = (await probeOf(bytes[2], 2)).streams[0];
  assert.deepEqual([webp.rawCodec, webp.width, webp.height], ['mjpeg', 400, 300]);
  assert.deepEqual([files[0].width, files[0].height], [400, 800]);

  assert.ok(job.output.archiveUrl);
  const zip = await fetchBytes(`${job.output.archiveUrl}?token=${encodeURIComponent(c.body.token)}`);
  assert.match(zip.res.headers.get('content-disposition'), /filename\*=UTF-8''Harbour%20pictures%20%26%20a%20clip\.zip/);
  const entries = unzip(zip.buf);
  assert.deepEqual(entries.map((e) => e.name), files.map((f) => f.name));
  entries.forEach((e, i) => assert.ok(e.data.equals(bytes[i]), e.name));

  assert.equal(fx.hits.get('/gallery/photo-2.png') ?? 0, pngHitsBefore, 'an image that was not chosen is never fetched');
  assert.equal(fx.hits.get('/clip-h264-aac.mp4'), undefined, 'videos in a post are never fetched');
});

test('"delete after download" counts a gallery as delivered once every image, or the ZIP, has been saved', async () => {
  const minutesLeft = async (id, token) => (Date.parse((await json(await api(`/api/v1/jobs/${id}`, { headers: { authorization: `Bearer ${token}` } }))).body.job.expiresAt) - Date.now()) / 60_000;
  const privateJob = async () => {
    const p = await post('/api/v1/probe', { url: postUrl(111111111) });
    const c = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'gallery', gallery: { items: [1, 3] }, attest: true, privacy: { deleteAfterDownload: true } });
    const job = await waitFor(c.body.job.id, c.body.token);
    assert.equal(job.status, 'ready', JSON.stringify(job.error));
    return { job, token: c.body.token };
  };

  const one = await privateJob();
  await fetchBytes(`${one.job.output.files[0].url}?token=${encodeURIComponent(one.token)}`);
  assert.ok((await minutesLeft(one.job.id, one.token)) > 30, 'one image of two is not the whole gallery');
  await fetchBytes(`${one.job.output.files[1].url}?token=${encodeURIComponent(one.token)}`);
  assert.ok((await minutesLeft(one.job.id, one.token)) <= 2.5, 'every image saved: removed after the grace period');

  const two = await privateJob();
  await fetchBytes(`${two.job.output.archiveUrl}?token=${encodeURIComponent(two.token)}`);
  assert.ok((await minutesLeft(two.job.id, two.token)) <= 2.5, 'the ZIP is the whole gallery');
});

test('a file that is not really an image is dropped; the real picture is still delivered', async () => {
  const p = await post('/api/v1/probe', { url: postUrl(222222222) });
  assert.deepEqual(p.body.media.gallery.items.map((i) => i.index), [1, 2]);
  const c = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'gallery', gallery: { items: [1, 2] }, attest: true });
  const job = await waitFor(c.body.job.id, c.body.token);
  assert.equal(job.status, 'ready', JSON.stringify(job.error));
  assert.deepEqual(job.output.files.map((f) => [f.name, f.mime]), [['One picture and an impostor - 01.png', 'image/png']]);
  assert.deepEqual(job.output.notes, ['gallery-partial']);
  assert.equal(job.output.archiveUrl, null);
});

test('SSRF: an image on a private address is never fetched', async () => {
  const p = await post('/api/v1/probe', { url: postUrl(333333333) });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  const c = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'gallery', gallery: { items: [1] }, attest: true });
  const job = await waitFor(c.body.job.id, c.body.token);
  assert.equal(job.status, 'failed');
  assert.equal(job.error.code, 'BLOCKED_DESTINATION');
  assert.equal(fx.hits.get('/gallery/secret.png'), undefined);
});

test('missing posts, and runtime policy overrides apply to galleries too', async () => {
  const missing = await post('/api/v1/probe', { url: postUrl(999999999) });
  assert.equal(missing.body.error.code, 'CONTENT_UNAVAILABLE');
  const auth = { authorization: `Bearer ${ADMIN}` };
  const set = await json(await api('/api/v1/admin/policies/mastodon', { method: 'PUT', body: JSON.stringify({ policy: 'blocked', reason: 'test' }), headers: auth }));
  assert.equal(set.status, 200);
  const blocked = await post('/api/v1/probe', { url: postUrl(111111111) });
  assert.equal(blocked.body.error.code, 'PLATFORM_BLOCKED');
  assert.equal(blocked.body.error.details.routes[0].url, 'https://docs.joinmastodon.org/user/moving/');
  assert.equal((await api('/api/v1/admin/policies/mastodon', { method: 'DELETE', headers: auth })).status, 204);
});

test('without gallery-dl, gallery platforms are listed as unavailable and never probed', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ferry-nogdl-'));
  const other = await createFerry(configFor(dir, { GALLERYDL_PATH: path.join(dir, 'missing', 'gallery-dl.exe') }), { logger: createLogger({ level: 'silent' }), catalog: CATALOG, catalogVersion: 'test' });
  try {
    const at = `http://127.0.0.1:${(await other.listen(0, '127.0.0.1')).port}`;
    const list = await json(await api('/api/v1/platforms', {}, at));
    assert.equal(list.body.platforms.find((x) => x.id === 'mastodon').available, false);
    const p = await post('/api/v1/probe', { url: postUrl(111111111) }, undefined, at);
    assert.equal(p.status, 422);
    assert.equal(p.body.error.code, 'UNSUPPORTED_PLATFORM');
    assert.equal((await json(await api('/api/v1/config', {}, at))).body.features.galleries, false);
    assert.equal((await json(await api('/api/v1/config'))).body.features.galleries, true);
  } finally {
    await other.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
