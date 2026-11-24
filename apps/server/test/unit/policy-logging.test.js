import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import pino from 'pino';
import { createRegistry } from '@ferry/shared/platforms/registry';
import { createPolicyService } from '../../src/policy/policies.js';
import { createProbeService } from '../../src/media/probeService.js';
import { createMetrics } from '../../src/metrics.js';
import { createSigner } from '../../src/security/tokens.js';
import { safePath, urlHash } from '../../src/logger.js';

const base = { content: ['video'], auth: 'none', officialApi: null, restrictions: '', reliability: 'verified', lastChecked: '2026-11-24', routes: [] };
const CATALOG = [
  { ...base, id: 'tube', name: 'Tube', kind: 'video', hosts: ['tube.example'], extractors: ['youtube(:.*)?'], engine: 'yt-dlp', category: 2, policy: 'export_only', routes: [{ label: 'Studio', url: 'https://tube.example/studio' }] },
  { ...base, id: 'shortener', name: 'Short links', kind: 'social', hosts: ['sho.rt'], engine: 'yt-dlp', category: 4, policy: 'attestation' },
  { ...base, id: 'open', name: 'Open Library', kind: 'open-library', hosts: ['open.example'], extractors: ['openlib'], engine: 'yt-dlp', category: 3, policy: 'allowed' },
  { ...base, id: 'direct', name: 'Direct', kind: 'direct', hosts: [], engine: 'direct', category: 4, policy: 'attestation' },
  { ...base, id: 'generic', name: 'Other website', kind: 'generic', hosts: [], extractors: ['generic'], engine: 'yt-dlp', category: 4, policy: 'attestation' },
];

function setup(probeResult) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ferry-policy-'));
  const registry = createRegistry(CATALOG);
  const policies = createPolicyService({ file: path.join(dir, 'overrides.json'), registry, catalogVersion: 't', watch: false });
  const adapter = { id: 'yt-dlp', supports: () => true, probe: async () => probeResult };
  const adapters = { forPlatform: () => adapter, byId: () => adapter };
  const config = { limits: { probeCacheSize: 10, probeTtlMs: 60_000, maxConcurrentProbes: 2, probeQueueWaitMs: 1000, probeTimeoutMs: 5000, maxPlaylistItems: 10, maxDurationSec: 3600, maxFileSizeBytes: 1e9 }, egress: { allowHosts: [], allowedPorts: [80, 443] } };
  const logger = pino({ level: 'silent' });
  const service = createProbeService({ config, registry, policies, adapters, signer: createSigner('s'.repeat(32)), logger, metrics: createMetrics(), urlHash: (u) => urlHash('k', u) });
  return { service, policies, dir };
}

const media = (extra) => ({ title: 'x', duration: 10, formats: [{ format_id: '1', protocol: 'https', vcodec: 'h264', acodec: 'aac', width: 640, height: 360 }], ...extra });

test('a short link that resolves to an export-only platform is refused after extraction', async () => {
  const { service, dir } = setup(media({ extractor: 'youtube', webpage_url: 'https://tube.example/watch?v=1' }));
  await assert.rejects(service.probe({ url: 'https://sho.rt/abc', clientKey: 'c' }), (err) => err.code === 'EXPORT_ONLY' && err.details.platform.id === 'tube');
  rmSync(dir, { recursive: true, force: true });
});

test('an embed found on a generic page is attributed to its platform', async () => {
  const { service, dir } = setup(media({ extractor: 'openlib', webpage_url: 'https://open.example/item/1' }));
  const r = await service.probe({ url: 'https://news.example/story', clientKey: 'c' });
  assert.equal(r.source.platform.id, 'open');
  rmSync(dir, { recursive: true, force: true });
});

test('runtime overrides take effect without a restart, including the hand-edited file', async () => {
  const { service, policies, dir } = setup(media({ extractor: 'openlib' }));
  await policies.setOverride('open', { policy: 'disabled', reason: 'Maintenance' });
  await assert.rejects(service.probe({ url: 'https://open.example/item/1', clientKey: 'c' }), { code: 'PLATFORM_DISABLED' });
  await policies.clearOverride('open');
  assert.equal((await service.probe({ url: 'https://open.example/item/1', clientKey: 'c' })).source.policy.status, 'allowed');
  // A malformed file is rejected and the previous overrides stay active.
  writeFileSync(path.join(dir, 'overrides.json'), '{ not json');
  assert.equal(policies.effective(CATALOG[2]).status, 'allowed');
  assert.deepEqual(policies.excludedExtractors(), ['youtube(:.*)?']);
  rmSync(dir, { recursive: true, force: true });
});

test('logs redact tokens and authorization, and paths drop query strings', async () => {
  const lines = [];
  const sink = new Writable({
    write(chunk, _enc, cb) {
      lines.push(chunk.toString());
      cb();
    },
  });
  const { createLogger } = await import('../../src/logger.js');
  const logger = createLogger({ level: 'info', destination: sink }); // the production configuration
  logger.info({ token: 'secret-token-value', job: { token: 'nested-secret' }, req: { headers: { authorization: 'Bearer abc', 'proxy-authorization': 'Basic xyz' } } }, 'x');
  const out = lines.join('');
  assert.ok(!out.includes('secret-token-value'));
  assert.ok(!out.includes('nested-secret'));
  assert.ok(!out.includes('Bearer abc'));
  assert.equal(safePath('/api/v1/jobs/1/files/f0?token=abc'), '/api/v1/jobs/1/files/f0?…');
  assert.equal(urlHash('k', 'https://example.com/private?x=1').length, 16);
  assert.ok(!urlHash('k', 'https://example.com/private').includes('example'));
});
