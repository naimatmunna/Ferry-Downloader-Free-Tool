#!/usr/bin/env node
/**
 * Performance measurements against the real server, engines and fixtures.
 * Writes docs/PERFORMANCE.md.     node scripts/perf.mjs
 */
import { createWriteStream, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { startFixtureServer } from '../apps/server/test/helpers/fixtureServer.js';
import { loadConfig } from '../apps/server/src/config.js';
import { createFerry } from '../apps/server/src/bootstrap.js';
import { createLogger } from '../apps/server/src/logger.js';
import { hashToken, newJobId, newToken } from '../apps/server/src/security/tokens.js';
import { ffprobe, runFfmpeg } from '../apps/server/src/engines/ffmpeg.js';
import { buildFinalizePlan } from '../apps/server/src/media/finalize.js';
import { which } from '../apps/server/src/engines/process.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fx = await startFixtureServer();
const dataDir = mkdtempSync(path.join(os.tmpdir(), 'ferry-perf-'));
const config = loadConfig({
  ...process.env,
  NODE_ENV: 'test',
  DATA_DIR: dataDir,
  SSRF_ALLOW_HOSTS: fx.authority,
  MAX_CONCURRENT_JOBS: '2',
  MAX_ACTIVE_JOBS_PER_CLIENT: '50',
  RATE_LIMIT_API_PER_MIN: '100000',
  RATE_LIMIT_PROBE_PER_MIN: '1000',
  RATE_LIMIT_JOBS_PER_MIN: '1000',
});
const ferry = await createFerry(config, { logger: createLogger({ level: 'silent' }) });
const { port } = await ferry.listen(0, '127.0.0.1');
const base = `http://127.0.0.1:${port}`;
const rows = [];
const pct = (arr, p) => arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))];
const ms = (n) => `${n.toFixed(1)} ms`;
const post = (p, body) => fetch(`${base}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

// 1. API latency (non-probe endpoints). A raw keep-alive client is used because
// undici's fetch adds a constant ~15 ms per request on Windows (a client artifact).
const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
const raw = (method, p, body) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port, path: p, method, agent, headers: data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {} }, (r) => {
      r.resume();
      r.on('end', resolve);
    });
    req.on('error', reject);
    req.end(data);
  });
for (const [label, fn] of [
  ['GET /api/v1/config', () => raw('GET', '/api/v1/config')],
  ['GET /api/v1/platforms (251 entries)', () => raw('GET', '/api/v1/platforms')],
  ['POST /api/v1/jobs/status (10 jobs)', () => raw('POST', '/api/v1/jobs/status', { jobs: Array.from({ length: 10 }, () => ({ id: newJobId(), token: newToken() })) })],
]) {
  for (let i = 0; i < 20; i += 1) await fn(); // warm-up
  const samples = [];
  for (let i = 0; i < 300; i += 1) {
    const t0 = performance.now();
    await fn();
    samples.push(performance.now() - t0);
  }
  rows.push(['API latency', label, `p50 ${ms(pct(samples, 50))}, p95 ${ms(pct(samples, 95))}, p99 ${ms(pct(samples, 99))}`]);
}

// 2. Probe latency per adapter path
for (const [label, url, n] of [
  ['Direct file (ranged read + ffprobe)', fx.url('/clip-h264-aac.mp4'), 5],
  ['Embedded page via yt-dlp generic', fx.url('/page.html'), 3],
  ['HLS manifest via yt-dlp', fx.url('/hls/index.m3u8'), 3],
]) {
  const samples = [];
  for (let i = 0; i < n; i += 1) {
    const t0 = performance.now();
    const r = await post('/api/v1/probe', { url });
    if (!r.probe) throw new Error(`probe failed: ${JSON.stringify(r)}`);
    samples.push(performance.now() - t0);
  }
  rows.push(['Analysis (probe) latency', label, `median ${ms(pct(samples, 50))} over ${n} runs`]);
}

// 3. Worker throughput: 8 audio extractions with 2 workers
{
  const probe = await post('/api/v1/probe', { url: fx.url('/clip-h264-aac.mp4') });
  const t0 = performance.now();
  const jobs = [];
  for (let i = 0; i < 8; i += 1) jobs.push(await post('/api/v1/jobs', { probeId: probe.probe.id, mode: 'audio', audio: { format: 'mp3', bitrate: 128 }, attest: true }));
  for (;;) {
    const st = await post('/api/v1/jobs/status', { jobs: jobs.map((j) => ({ id: j.job.id, token: j.token })) });
    if (st.jobs.every((x) => x.job && ['ready', 'failed'].includes(x.job.status))) {
      const failed = st.jobs.filter((x) => x.job.status !== 'ready').length;
      const secs = (performance.now() - t0) / 1000;
      rows.push(['Worker throughput', '8 × (6 s clip → MP3 128 kbps), 2 workers', `${secs.toFixed(1)} s total, ${((8 / secs) * 60).toFixed(0)} jobs/min${failed ? `, ${failed} failed` : ''}`]);
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

// 4. Copy vs re-encode cost (FFmpeg, 3 s 1080p clip)
{
  const FFMPEG = await which('ffmpeg');
  const FFPROBE = await which('ffprobe');
  const src = path.join(root, '.fixtures', 'clip-1080.mp4');
  const srcProbe = await ffprobe({ bin: FFPROBE, file: src, cwd: dataDir });
  for (const [label, selection] of [
    ['Remux 1080p H.264 → MP4 (copy)', { mode: 'av', video: { container: 'mp4', quality: 'best' } }],
    ['Re-encode 1080p H.264 → WebM (VP9 + Opus)', { mode: 'av', video: { container: 'webm', quality: 'best' } }],
    ['Re-encode 1080p → MP4 720p (downscale)', { mode: 'av', video: { container: 'mp4', quality: 720 } }],
  ]) {
    const outDir = mkdtempSync(path.join(dataDir, 'ff-'));
    const plan = buildFinalizePlan({ src, srcProbe, selection, outDir, threads: config.engines.threads });
    const t0 = performance.now();
    await runFfmpeg({ bin: FFMPEG, args: plan.args, cwd: outDir, durationSec: plan.durationSec, timeoutMs: 300_000 });
    rows.push(['Conversion cost (3 s of 1080p)', label, ms(performance.now() - t0)]);
  }
}

// 5. Memory while streaming a 512 MB file
{
  const id = newJobId();
  const token = newToken();
  const { jobDir } = await ferry.services.storage.ensure(id);
  const big = path.join(jobDir, 'big.bin');
  await new Promise((resolve, reject) => {
    const w = createWriteStream(big);
    const chunk = Buffer.alloc(8 * 1024 * 1024, 7);
    let n = 0;
    const write = () => {
      while (n < 64) {
        n += 1;
        if (!w.write(chunk)) return void w.once('drain', write);
      }
      w.end(resolve);
    };
    w.on('error', reject);
    write();
  });
  const now = Date.now();
  ferry.services.store.create({
    id, tokenHash: hashToken(token), clientKey: 'perf', status: 'ready', attempt: 1, maxAttempts: 3, priority: 10,
    source: { url: 'https://example.invalid/', platformId: 'direct', platformName: 'Direct', title: 'big' },
    request: { mode: 'av', extras: {}, privacy: {} }, internal: {}, progress: {}, error: null,
    output: { files: [{ id: 'f0', kind: 'media', diskName: 'big.bin', name: 'big.bin', sizeBytes: 512 * 1024 * 1024, mime: 'application/octet-stream' }], notes: [] },
    finishedAt: now, expiresAt: now + 3_600_000,
  });
  global.gc?.();
  const before = process.memoryUsage().rss;
  let peak = before;
  const timer = setInterval(() => (peak = Math.max(peak, process.memoryUsage().rss)), 50);
  const t0 = performance.now();
  const res = await fetch(`${base}/api/v1/jobs/${id}/files/f0?token=${token}`);
  let bytes = 0;
  for await (const c of res.body) bytes += c.length;
  const secs = (performance.now() - t0) / 1000;
  clearInterval(timer);
  rows.push(['Delivery (512 MB file, loopback)', 'Server RSS before → peak while streaming', `${(before / 2 ** 20).toFixed(0)} MB → ${(peak / 2 ** 20).toFixed(0)} MB (Δ ${((peak - before) / 2 ** 20).toFixed(0)} MB, incl. this test's own reader); ${(bytes / 2 ** 20 / secs).toFixed(0)} MB/s`]);
}

// 6. Client bundle (from the last production build)
try {
  const dist = path.join(root, 'apps/web/dist');
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const entry = html.match(/src="\/(assets\/index-[^"]+\.js)"/)[1];
  const seen = new Set();
  let gz = 0;
  (function walk(f) {
    if (seen.has(f)) return;
    seen.add(f);
    const code = readFileSync(path.join(dist, f), 'utf8');
    gz += zlib.gzipSync(code).length;
    for (const m of code.matchAll(/(?:^|[;}\n])\s*import\s*(?:[^'"]*from\s*)?["']\.\/([^"']+\.js)["']/g)) walk(`assets/${m[1]}`);
  })(entry);
  const css = html.match(/href="\/(assets\/index-[^"]+\.css)"/)?.[1];
  const cssGz = css ? zlib.gzipSync(readFileSync(path.join(dist, css))).length : 0;
  rows.push(['Client bundle', 'Initial JavaScript (gzip, static import graph)', `${(gz / 1024).toFixed(1)} KB in ${seen.size} files; CSS ${(cssGz / 1024).toFixed(1)} KB`]);
} catch {
  rows.push(['Client bundle', 'Initial JavaScript', 'run `npm run build` first']);
}

await ferry.close();
await fx.close();
rmSync(dataDir, { recursive: true, force: true });

const env = `${os.cpus()[0].model.trim()} (${os.cpus().length} threads), ${(os.totalmem() / 2 ** 30).toFixed(1)} GB RAM, ${os.platform()} ${os.release()}, Node ${process.version}`;
const md = `# Performance — Ferry

Measured ${new Date().toISOString().slice(0, 10)} with \`node scripts/perf.mjs\` (real server, real yt-dlp/FFmpeg,
self-authored fixtures on a loopback server). Machine: ${env}.
Numbers are for this development machine; source-site latency dominates analysis time in production.

| Area | Measurement | Result |
|---|---|---|
${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}

## Budgets

| Budget | Target | Status |
|---|---|---|
| Initial JS (gzip) | ≤ 135 KB | see "Client bundle" above |
| Non-probe API p99 | ≤ 50 ms | see "API latency" |
| Detection per keystroke | ≤ 1 ms | verified by \`packages/shared/test/catalog.test.js\` |
| Memory while delivering large files | flat (no buffering) | see "Delivery" |

## How the design keeps it fast

* Detection runs locally against the cached registry — no request per keystroke.
* The analysis workspace and secondary screens are code-split and prefetched as soon as a link is typed.
* Media never passes through Node's heap: engines write to disk, delivery streams with Range support.
* Stream copy is the default; re-encoding happens only for incompatible streams (compare the conversion rows).
* Engines run at below-normal priority with an FFmpeg thread cap, so the API stays responsive under load.
`;
writeFileSync(path.join(root, 'docs', 'PERFORMANCE.md'), md);
console.log(md);
