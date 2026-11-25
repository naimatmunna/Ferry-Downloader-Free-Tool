/**
 * End-to-end API tests against the real engines (yt-dlp, FFmpeg) using only
 * self-authored fixture media served from a local server.
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
import { startFixtureServer } from '../helpers/fixtureServer.js';

const ADMIN = 'test-admin-token-0123456789abcdef0123456789';
const base = { content: ['video', 'audio'], auth: 'none', officialApi: null, restrictions: '', reliability: 'verified', lastChecked: '2026-11-24', routes: [] };
const CATALOG = [
  { ...base, id: 'fixture', name: 'Fixture Library', kind: 'open-library', hosts: ['127.0.0.1'], engine: 'yt-dlp', category: 3, policy: 'allowed' },
  { ...base, id: 'protected-tv', name: 'Protected TV', kind: 'protected', hosts: ['protected.example'], engine: 'none', category: 5, policy: 'blocked', routes: [{ label: 'Use the official app', url: 'https://protected.example/app' }] },
  { ...base, id: 'tube', name: 'Tube', kind: 'video', hosts: ['tube.example'], extractors: ['youtube(:.*)?'], engine: 'yt-dlp', category: 2, policy: 'export_only', routes: [{ label: 'Studio download', url: 'https://tube.example/studio' }] },
  { ...base, id: 'direct', name: 'Direct media link', kind: 'direct', hosts: [], engine: 'direct', category: 4, policy: 'attestation' },
  { ...base, id: 'generic', name: 'Other website', kind: 'generic', hosts: [], engine: 'yt-dlp', category: 4, policy: 'attestation' },
];

let fx;
let ferry;
let origin;
let dataDir;
let FFPROBE;

before(async () => {
  fx = await startFixtureServer();
  dataDir = mkdtempSync(path.join(os.tmpdir(), 'ferry-api-'));
  FFPROBE = await which('ffprobe');
  const config = loadConfig({
    NODE_ENV: 'test',
    ASK_PERMISSION: 'true', // these tests cover the tick box; with it off, see job-service.test.js and e2e
    DATA_DIR: dataDir,
    PORT: '0',
    SSRF_ALLOW_HOSTS: fx.authority,
    ADMIN_TOKEN: ADMIN,
    MAX_CONCURRENT_JOBS: '2',
    MAX_ACTIVE_JOBS_PER_CLIENT: '6',
    RATE_LIMIT_PROBE_PER_MIN: '200',
    RATE_LIMIT_JOBS_PER_MIN: '200',
    PATH: process.env.PATH,
  });
  ferry = await createFerry(config, { logger: createLogger({ level: 'silent' }), catalog: CATALOG, catalogVersion: 'test' });
  const addr = await ferry.listen(0, '127.0.0.1');
  origin = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await ferry?.close();
  await fx?.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const api = (p, init = {}) =>
  fetch(`${origin}${p}`, {
    ...init,
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) },
  });
const json = async (res) => ({ status: res.status, headers: res.headers, body: res.status === 204 ? null : await res.json() });
const post = async (p, body, headers) => json(await api(p, { method: 'POST', body: JSON.stringify(body), headers }));

async function probe(url, extra = {}) {
  return post('/api/v1/probe', { url, ...extra });
}

async function waitFor(id, token, pred = (j) => ['ready', 'failed', 'cancelled', 'paused'].includes(j.status), timeoutMs = 90_000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const r = await json(await api(`/api/v1/jobs/${id}`, { headers: { authorization: `Bearer ${token}` } }));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    if (pred(r.body.job)) return r.body.job;
    if (Date.now() > end) throw new Error(`timeout waiting for job ${id}: ${JSON.stringify(r.body.job)}`);
    await sleep(250);
  }
}

async function downloadAndProbe(job, token, fileId = 'f0') {
  const res = await api(`/api/v1/jobs/${job.id}/files/${fileId}?token=${encodeURIComponent(token)}`);
  assert.equal(res.status, 200);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.join(dataDir, `dl-${job.id}-${fileId}`);
  writeFileSync(out, buf);
  return { res, info: await ffprobe({ bin: FFPROBE, file: out, cwd: dataDir }) };
}

test('service endpoints', async () => {
  assert.deepEqual((await json(await api('/healthz'))).body, { status: 'ok' });
  const ready = await json(await api('/readyz'));
  assert.equal(ready.status, 200, JSON.stringify(ready.body));
  const cfg = await json(await api('/api/v1/config'));
  assert.equal(cfg.body.app.name, 'Ferry');
  const platforms = await api('/api/v1/platforms');
  const etag = platforms.headers.get('etag');
  assert.ok(etag);
  assert.equal((await platforms.json()).platforms.length, CATALOG.length);
  assert.equal((await api('/api/v1/platforms', { headers: { 'if-none-match': etag } })).status, 304);
  assert.equal((await api('/api/v1/nope')).status, 404);
  assert.equal(platforms.headers.get('x-powered-by'), null);
  assert.match(platforms.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('input validation and transport rules', async () => {
  assert.equal((await probe('not a link')).body.error.code, 'INVALID_URL');
  assert.equal((await probe('ftp://127.0.0.1/x.mp4')).body.error.code, 'INVALID_URL');
  assert.equal((await probe('http://127.0.0.1:9/x.mp4')).body.error.code, 'INVALID_URL', 'port not allowed');
  assert.equal((await probe('http://localhost/x.mp4')).body.error.code, 'BLOCKED_DESTINATION');
  assert.equal((await probe('http://169.254.169.254/latest/meta-data/')).body.error.code, 'BLOCKED_DESTINATION');
  const form = await json(await api('/api/v1/probe', { method: 'POST', body: 'url=x', headers: { 'content-type': 'application/x-www-form-urlencoded' } }));
  assert.equal(form.status, 415);
  const big = await post('/api/v1/probe', { url: `https://a.example/${'x'.repeat(70_000)}` });
  assert.equal(big.status, 413);
  const extra = await post('/api/v1/probe', { url: fx.url('/clip-h264-aac.mp4'), evil: true });
  assert.equal(extra.body.error.code, 'VALIDATION_FAILED');
});

test('policy gates: blocked and export-only platforms are never probed', async () => {
  const blocked = await probe('https://protected.example/watch/1');
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.error.code, 'PLATFORM_BLOCKED');
  assert.equal(blocked.body.error.details.routes[0].url, 'https://protected.example/app');
  const exportOnly = await probe('https://tube.example/watch?v=1');
  assert.equal(exportOnly.body.error.code, 'EXPORT_ONLY');
});

test('direct file: video + audio MP4 with resumable delivery', async () => {
  const p = await probe(fx.url('/clip-h264-aac.mp4'));
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.equal(p.body.source.platform.id, 'fixture');
  assert.equal(p.body.media.durationSec > 5, true);
  assert.deepEqual(p.body.media.video.qualities.map((q) => q.res), [360]);
  assert.equal(p.body.media.raw, undefined, 'raw formats never leave the server');

  const c = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'av', video: { container: 'mp4', quality: 360 } });
  assert.equal(c.status, 202, JSON.stringify(c.body));
  const { token } = c.body;
  const job = await waitFor(c.body.job.id, token);
  assert.equal(job.status, 'ready', JSON.stringify(job.error));
  assert.equal(job.output.files[0].mime, 'video/mp4');
  assert.match(job.output.files[0].name, /^clip-h264-aac\.mp4$/);

  const { res, info } = await downloadAndProbe(job, token);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy'), /sandbox/);
  assert.match(res.headers.get('content-disposition'), /^attachment; filename="clip-h264-aac\.mp4"; filename\*=UTF-8''clip-h264-aac\.mp4$/);
  const etag = res.headers.get('etag');
  assert.match(etag, /^"[A-Za-z0-9_-]{32}"$/, 'strong ETag');
  assert.deepEqual(info.streams.filter((s) => s.kind !== 'other').map((s) => s.codec).sort(), ['aac', 'h264']);

  const ranged = await api(`/api/v1/jobs/${job.id}/files/f0?token=${token}`, { headers: { range: 'bytes=100-199', 'if-range': etag } });
  assert.equal(ranged.status, 206);
  assert.equal(ranged.headers.get('content-range').startsWith('bytes 100-199/'), true);
  assert.equal((await ranged.arrayBuffer()).byteLength, 100);
  const staleRange = await api(`/api/v1/jobs/${job.id}/files/f0?token=${token}`, { headers: { range: 'bytes=100-199', 'if-range': '"stale"' } });
  assert.equal(staleRange.status, 200, 'mismatched If-Range returns the full file');
  await staleRange.arrayBuffer();
});

test('video without audio, and audio only', async () => {
  const p = await probe(fx.url('/clip-vp9-opus.webm'));
  const v = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'video', video: { container: 'webm', quality: 'best' } });
  const a = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'audio', audio: { format: 'mp3', bitrate: 192 } });
  const vj = await waitFor(v.body.job.id, v.body.token);
  const aj = await waitFor(a.body.job.id, a.body.token);
  assert.equal(vj.status, 'ready');
  assert.equal(aj.status, 'ready');
  const vi = (await downloadAndProbe(vj, v.body.token)).info;
  assert.deepEqual(vi.streams.map((s) => s.kind), ['video']);
  const ai = (await downloadAndProbe(aj, a.body.token)).info;
  assert.deepEqual(ai.streams.map((s) => [s.kind, s.codec]), [['audio', 'mp3']]);
  assert.equal(aj.output.files[0].mime, 'audio/mpeg');
});

test('without FFmpeg/ffprobe the server refuses links up front with a clear reason', async () => {
  // Seen live: a dev server started from a shell without FFmpeg on PATH probed fine, downloaded,
  // then failed every job with a bare "server error" ("ffprobe: executable not found").
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ferry-noff-'));
  const other = await createFerry(
    loadConfig({ NODE_ENV: 'test', DATA_DIR: dir, PORT: '0', SSRF_ALLOW_HOSTS: fx.authority, FFPROBE_PATH: path.join(dir, 'missing', 'ffprobe.exe'), PATH: process.env.PATH }),
    { logger: createLogger({ level: 'silent' }), catalog: CATALOG, catalogVersion: 'test' },
  );
  try {
    const at = `http://127.0.0.1:${(await other.listen(0, '127.0.0.1')).port}`;
    const r = await fetch(`${at}/api/v1/probe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: fx.url('/clip-h264-aac.mp4') }) });
    const body = await r.json();
    assert.equal(r.status, 503);
    assert.equal(body.error.code, 'ENGINE_UNAVAILABLE');
    assert.equal((await fetch(`${at}/readyz`)).status, 503);
  } finally {
    await other.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a web page whose address ends like a media file is still read as a page', async () => {
  // e.g. https://commons.wikimedia.org/wiki/File:Something.webm is an HTML page, not the file.
  const p = await probe(fx.url('/wiki/File:Fixture_clip.webm'));
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.equal(p.body.source.platform.id, 'fixture', 'the platform (and its policy) stay the same');
  assert.equal(p.body.media.kind, 'video');
  assert.equal(p.body.media.title, 'Fixture clip on a file page (1)', 'the page itself was read (first video on it)');
});

test('yt-dlp generic extractor through the egress proxy (embedded page + HLS)', async () => {
  const page = await probe(fx.url('/page.html'));
  assert.equal(page.status, 200, JSON.stringify(page.body));
  assert.equal(page.body.media.title, 'Ferry Fixture Clip (1)');
  assert.ok(page.body.media.thumbnailUrl.startsWith('/api/v1/thumb?'));
  const j = await post('/api/v1/jobs', { probeId: page.body.probe.id, mode: 'av', video: { container: 'mkv', quality: 'best' }, extras: { thumbnail: true } });
  assert.equal(j.status, 202, JSON.stringify(j.body));
  const done = await waitFor(j.body.job.id, j.body.token);
  assert.equal(done.status, 'ready', JSON.stringify(done.error));
  assert.deepEqual(done.output.files.map((f) => f.kind), ['media', 'thumbnail']);
  assert.ok(done.output.archiveUrl);
  const zip = await api(`${done.output.archiveUrl}?token=${j.body.token}`);
  assert.equal(zip.status, 200);
  const zbuf = Buffer.from(await zip.arrayBuffer());
  assert.equal(zbuf.subarray(0, 2).toString(), 'PK');
  assert.equal(zbuf.length, Number(zip.headers.get('content-length')));

  const thumb = await api(page.body.media.thumbnailUrl);
  assert.equal(thumb.status, 200);
  assert.equal(thumb.headers.get('content-type'), 'image/jpeg');
  assert.equal((await api(page.body.media.thumbnailUrl.replace(/s=[^&]+/, 's=forged'))).status, 403);

  const hls = await probe(fx.url('/hls/index.m3u8'));
  assert.equal(hls.status, 200, JSON.stringify(hls.body));
  const hj = await post('/api/v1/jobs', { probeId: hls.body.probe.id, mode: 'audio', audio: { format: 'm4a', bitrate: 'source' } });
  const hd = await waitFor(hj.body.job.id, hj.body.token);
  assert.equal(hd.status, 'ready', JSON.stringify(hd.error));
  assert.equal(hd.output.files[0].acodec, 'aac');
});

test('SSRF: a redirect to a private address is blocked inside the engine', async () => {
  const r = await probe(fx.url(`/redirect-to?url=${encodeURIComponent('http://127.0.0.2:8080/secret')}`));
  assert.equal(r.status, 403, JSON.stringify(r.body));
  assert.equal(r.body.error.code, 'BLOCKED_DESTINATION');
});

test('job access requires the job token', async () => {
  const p = await probe(fx.url('/tone.mp3'));
  const c = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'audio', audio: { format: 'opus', bitrate: 96 } });
  const id = c.body.job.id;
  assert.equal((await api(`/api/v1/jobs/${id}`)).status, 403);
  assert.equal((await api(`/api/v1/jobs/${id}`, { headers: { authorization: 'Bearer wrong-token-wrong-token-wrong' } })).status, 403);
  assert.equal((await api('/api/v1/jobs/00000000-0000-4000-8000-000000000000', { headers: { authorization: `Bearer ${c.body.token}` } })).status, 404);
  assert.equal((await api('/api/v1/jobs/..%2F..%2Fetc', { headers: { authorization: `Bearer ${c.body.token}` } })).status, 404);
  const batch = await post('/api/v1/jobs/status', { jobs: [{ id, token: c.body.token }, { id, token: 'x'.repeat(43) }] });
  assert.equal(batch.body.jobs[0].job.id, id);
  assert.equal(batch.body.jobs[1].error.code, 'FORBIDDEN');
  await waitFor(id, c.body.token);
  // another client's probe cannot be used
  const stolen = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'audio', audio: { format: 'mp3', bitrate: 128 } }, { 'x-forwarded-for': '1.2.3.4' });
  assert.equal(stolen.status, 202, 'same client (trust proxy is off, XFF ignored)');
});

test('selection is validated against what the source actually has', async () => {
  const p = await probe(fx.url('/clip-h264-aac.mp4'));
  const up = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'av', video: { container: 'mp4', quality: 1080 } });
  assert.equal(up.body.error.code, 'FORMAT_UNAVAILABLE', 'no upscaling');
  const badTrim = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'av', video: { container: 'mp4', quality: 'best' }, extras: { trim: { start: 5, end: 2 } } });
  assert.equal(badTrim.body.error.code, 'VALIDATION_FAILED');
  const badTemplate = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'av', video: { container: 'mp4', quality: 'best' }, filename: { template: '{password}' } });
  assert.equal(badTemplate.body.error.code, 'VALIDATION_FAILED');
  const expired = await post('/api/v1/jobs', { probeId: 'p_AAAAAAAAAAAAAAAAAAAAAA', mode: 'audio', audio: { format: 'mp3', bitrate: 128 } });
  assert.equal(expired.body.error.code, 'PROBE_EXPIRED');
});

test('pause, resume and cancel', async () => {
  const p = await probe(fx.url('/slow/clip-1080.mp4?bps=150000'));
  assert.equal(p.status, 200, JSON.stringify(p.body));
  const c = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'av', video: { container: 'mp4', quality: 'best' } });
  const auth = { authorization: `Bearer ${c.body.token}` };
  const id = c.body.job.id;
  const downloading = await waitFor(id, c.body.token, (j) => j.status === 'downloading' && (j.progress.downloadedBytes ?? 0) > 100_000);
  assert.ok(downloading.progress.percent > 0 && downloading.progress.percent < 100);
  assert.ok(downloading.progress.totalBytes > 2_000_000);
  assert.equal((await post(`/api/v1/jobs/${id}/pause`, {}, auth)).status, 200);
  const paused = await waitFor(id, c.body.token, (j) => j.status === 'paused');
  assert.equal(paused.actions.resume, true);
  assert.equal((await post(`/api/v1/jobs/${id}/resume`, {}, auth)).status, 200);
  const resumedDone = await waitFor(id, c.body.token, (j) => j.status === 'ready' || j.status === 'failed', 120_000);
  assert.equal(resumedDone.status, 'ready', JSON.stringify(resumedDone.error));

  const p2 = await probe(fx.url('/slow/clip-1080.mp4?bps=100000'));
  const c2 = await post('/api/v1/jobs', { probeId: p2.body.probe.id, mode: 'av', video: { container: 'mp4', quality: 'best' } });
  await waitFor(c2.body.job.id, c2.body.token, (j) => j.status === 'downloading');
  const cancelled = await post(`/api/v1/jobs/${c2.body.job.id}/cancel`, {}, { authorization: `Bearer ${c2.body.token}` });
  assert.equal(cancelled.body.job.status, 'cancelled');
  assert.equal((await post(`/api/v1/jobs/${c2.body.job.id}/resume`, {}, { authorization: `Bearer ${c2.body.token}` })).body.error.code, 'INVALID_STATE');
});

test('retry after a transient failure', async () => {
  const p = await probe(fx.url('/flaky-download/clip-h264-aac.mp4'));
  assert.equal(p.status, 200, JSON.stringify(p.body));
  const c = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'av', video: { container: 'mp4', quality: 'best' } });
  const failed = await waitFor(c.body.job.id, c.body.token);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error.retryable, true, JSON.stringify(failed.error));
  assert.equal(failed.actions.retry, true);
  const r = await post(`/api/v1/jobs/${c.body.job.id}/retry`, {}, { authorization: `Bearer ${c.body.token}` });
  assert.equal(r.body.job.attempt, 2);
  const done = await waitFor(c.body.job.id, c.body.token);
  assert.equal(done.status, 'ready', JSON.stringify(done.error));
});

test('runtime policy overrides via the admin API (no redeploy)', async () => {
  const noAuth = await json(await api('/api/v1/admin/policies', { method: 'PUT' }));
  assert.equal(noAuth.status, 403);
  const auth = { authorization: `Bearer ${ADMIN}` };
  const set = await json(await api('/api/v1/admin/policies/fixture', { method: 'PUT', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ policy: 'attestation', reason: 'Test restriction' }) }));
  assert.equal(set.status, 200, JSON.stringify(set.body));

  const p = await probe(fx.url('/tone.m4a'));
  assert.equal(p.body.source.policy.status, 'attestation');
  assert.ok(p.body.source.policy.attestation);
  assert.equal(p.body.source.policy.confirm, true, 'the client is told to show the tick box');
  const without = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'audio', audio: { format: 'flac', bitrate: 'source' } });
  assert.equal(without.body.error.code, 'ATTESTATION_REQUIRED');
  const withAttest = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'audio', audio: { format: 'flac', bitrate: 'source' }, attest: true });
  assert.equal(withAttest.status, 202);
  await waitFor(withAttest.body.job.id, withAttest.body.token);

  await json(await api('/api/v1/admin/policies/fixture', { method: 'PUT', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ policy: 'disabled', reason: 'Maintenance window' }) }));
  const disabled = await probe(fx.url('/tone.m4a'));
  assert.equal(disabled.body.error.code, 'PLATFORM_DISABLED');
  assert.equal(disabled.body.error.message, 'Maintenance window');
  const platforms = await json(await api('/api/v1/platforms'));
  assert.equal(platforms.body.platforms.find((x) => x.id === 'fixture').policy, 'disabled');

  assert.equal((await api('/api/v1/admin/policies/fixture', { method: 'DELETE', headers: auth })).status, 204);
  assert.equal((await probe(fx.url('/tone.m4a'))).status, 200);
  const metrics = await api('/api/v1/admin/metrics', { headers: auth });
  assert.match(await metrics.text(), /ferry_jobs_total\{status="ready"/);
});

test('extend, expiry sweep and deletion', async () => {
  const p = await probe(fx.url('/tone.ogg'));
  const c = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'audio', audio: { format: 'wav', bitrate: 'source' } });
  const job = await waitFor(c.body.job.id, c.body.token);
  assert.equal(job.status, 'ready');
  const stored = ferry.services.store.get(job.id);
  stored.expiresAt = Date.now() + 5_000;
  const ext = await post(`/api/v1/jobs/${job.id}/extend`, {}, { authorization: `Bearer ${c.body.token}` });
  assert.ok(Date.parse(ext.body.job.expiresAt) > Date.now() + 30 * 60_000);

  stored.expiresAt = Date.now() - 1;
  assert.equal(await ferry.services.jobs.sweep(), 1);
  const gone = await json(await api(`/api/v1/jobs/${job.id}/files/f0?token=${c.body.token}`));
  assert.equal(gone.body.error.code, 'JOB_EXPIRED');

  const p2 = await probe(fx.url('/tone.mp3'));
  const c2 = await post('/api/v1/jobs', { probeId: p2.body.probe.id, mode: 'audio', audio: { format: 'aac', bitrate: 'source' } });
  await waitFor(c2.body.job.id, c2.body.token);
  const del = await api(`/api/v1/jobs/${c2.body.job.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${c2.body.token}` } });
  assert.equal(del.status, 204);
  assert.equal((await json(await api(`/api/v1/jobs/${c2.body.job.id}`, { headers: { authorization: `Bearer ${c2.body.token}` } }))).body.job.status, 'expired');
});

test('rate limiting returns 429 with Retry-After', async () => {
  const limiter = ferry.services; // limits are per client: hammer the probe bucket with invalid URLs
  void limiter;
  let last;
  for (let i = 0; i < 260; i += 1) {
    last = await api('/api/v1/probe', { method: 'POST', body: JSON.stringify({ url: 'not a url' }) });
    if (last.status === 429) break;
    await last.arrayBuffer();
  }
  assert.equal(last.status, 429);
  assert.ok(Number(last.headers.get('retry-after')) >= 1);
  assert.equal((await last.json()).error.code, 'RATE_LIMITED');
});

test('a broken Save link shows browsers a readable page, never a JSON file to save', async () => {
  const BROWSER = { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };
  const missing = '00000000-0000-4000-8000-000000000000';
  for (const link of [`/api/v1/jobs/${missing}/files/f0?token=x`, `/api/v1/jobs/${missing}/archive?token=x`]) {
    const res = await api(link, { headers: BROWSER });
    assert.equal(res.status, 404, link);
    assert.match(res.headers.get('content-type'), /^text\/html/, link);
    assert.doesNotMatch(res.headers.get('content-disposition') ?? '', /attachment/, link);
    const html = await res.text();
    assert.match(html, /<h1>This file isn’t on the server anymore<\/h1>/, link);
    assert.match(html, /<a [^>]*href="\/downloads"[^>]*>Back to Ferry<\/a>/, link);
    assert.match(html, /JOB_NOT_FOUND/, link);
  }

  // A real download opened with someone else's link.
  const p = await probe(fx.url('/tone.m4a'));
  const c = await post('/api/v1/jobs', { probeId: p.body.probe.id, mode: 'audio', audio: { format: 'm4a', bitrate: 'source' }, attest: true });
  assert.equal(c.status, 202, JSON.stringify(c.body));
  const wrong = await api(`/api/v1/jobs/${c.body.job.id}/files/f0?token=not-the-token`, { headers: BROWSER });
  assert.equal(wrong.status, 403);
  assert.match(await wrong.text(), /<h1>This download belongs to another browser<\/h1>/);

  // Apps and Ferry's own requests still get JSON, and other routes are unchanged.
  const forApps = await json(await api(`/api/v1/jobs/${missing}/files/f0?token=x`, { headers: { accept: 'application/json' } }));
  assert.equal(forApps.body.error.code, 'JOB_NOT_FOUND');
  const noAccept = await json(await api(`/api/v1/jobs/${missing}/files/f0?token=x`));
  assert.equal(noAccept.body.error.code, 'JOB_NOT_FOUND');
  assert.match((await api(`/api/v1/jobs/${missing}?token=x`, { headers: BROWSER })).headers.get('content-type'), /json/);
});
