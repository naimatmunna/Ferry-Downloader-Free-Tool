/**
 * Job service rules that need no engines: which modes a probe accepts, and
 * the policy check when a queued job starts. The pipeline is replaced by a
 * gate the test opens, so only the service's own decisions are exercised.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import pino from 'pino';
import { createRegistry } from '@ferry/shared/platforms/registry';
import { createJobService } from '../../src/jobs/service.js';
import { MemoryJobStore } from '../../src/jobs/store.js';
import { ProbeCache } from '../../src/media/probeService.js';
import { createPolicyService } from '../../src/policy/policies.js';
import { createMetrics } from '../../src/metrics.js';

const base = { content: ['image'], auth: 'none', officialApi: null, restrictions: '', reliability: 'verified', lastChecked: '2026-11-24', routes: [] };
const CATALOG = [
  { ...base, id: 'pics', name: 'Pics', kind: 'images', hosts: ['pics.example'], engine: 'gallery-dl', category: 3, policy: 'allowed' },
  { ...base, id: 'tube', name: 'Tube', kind: 'video', hosts: ['tube.example'], content: ['video'], engine: 'yt-dlp', category: 3, policy: 'allowed' },
  { ...base, id: 'direct', name: 'Direct', kind: 'direct', hosts: [], engine: 'direct', category: 4, policy: 'attestation' },
  { ...base, id: 'generic', name: 'Other website', kind: 'generic', hosts: [], engine: 'yt-dlp', category: 4, policy: 'attestation' },
];

const item = (index) => ({ index, ext: 'jpg', width: 10, height: 10, sizeBytes: 100, previewSource: null });
const GALLERY = {
  kind: 'gallery', id: 'a1', title: 'Album', uploader: null, durationSec: null, uploadDate: null, webpageUrl: 'https://pics.example/a/1', license: null,
  extractor: 'gallery-dl:pics', thumbnailSource: null, isLive: false, entryCount: 2, entries: null,
  gallery: { items: [item(1), item(2)], truncated: false, skipped: { videos: 0, other: 0, links: 0 } },
  video: { qualities: [], unknown: false }, audio: { tracks: [], best: null }, subtitles: [],
  capabilities: { modes: ['gallery'], containers: [], audioFormats: [], trim: false },
  raw: { formats: [], gallery: { input: 'https://pics.example/a/1', urls: { 1: 'https://cdn.pics.example/1.jpg', 2: 'https://cdn.pics.example/2.jpg' } } },
};
const PLAYLIST = {
  kind: 'playlist', id: 'l1', title: 'List', uploader: null, durationSec: null, uploadDate: null, webpageUrl: 'https://tube.example/list/1', license: null,
  extractor: 'tube', thumbnailSource: null, isLive: false, entryCount: 1,
  entries: [{ id: 'e1', title: 'One', durationSec: 10, url: 'https://tube.example/v/1', extractor: 'tube', thumbnailSource: null }],
  video: { qualities: [], unknown: true }, audio: { tracks: [], best: null }, subtitles: [],
  capabilities: { modes: ['av', 'video', 'audio'], containers: ['mp4'], audioFormats: ['mp3'], trim: false }, raw: { formats: [] },
};
const galleryRequest = (items) => ({
  mode: 'gallery', video: null, audio: null, gallery: { items }, extras: { subtitles: [], embedSubtitles: false, thumbnail: false, metadata: false, trim: null },
  filename: { template: '{title}' }, privacy: { deleteAfterDownload: false },
});

function setup() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ferry-jobs-'));
  const registry = createRegistry(CATALOG);
  const policies = createPolicyService({ file: path.join(dir, 'overrides.json'), registry, catalogVersion: 't', watch: false });
  const probeCache = new ProbeCache(10, 60_000);
  const store = new MemoryJobStore();
  const ran = [];
  let open;
  const gate = new Promise((resolve) => (open = resolve));
  const pipeline = {
    // Same contract as jobs/pipeline.js: processing is announced before the result.
    async run(job, { onPhase }) {
      ran.push(job.id);
      await gate;
      onPhase('processing');
      return { files: [{ id: 'f0', kind: 'image', diskName: 'img-0001.jpg', name: 'Album - 01.jpg', sizeBytes: 1, mime: 'image/jpeg' }], notes: [], archiveName: 'Album.zip' };
    },
  };
  const config = { limits: { jobTtlMinutes: 60, jobMaxRetentionMinutes: 1440, maxConcurrentJobs: 1, maxQueueLength: 10, maxActiveJobsPerClient: 5, maxFileSizeBytes: 1e9, maxDurationSec: 3600 } };
  const service = createJobService({
    config, store, probeCache, registry, policies, pipeline,
    probeService: { detect: (u) => registry.detect(u), gate: () => {} },
    storage: { remove: async () => {} },
    logger: pino({ level: 'silent' }), metrics: createMetrics(), urlHash: (u) => u,
  });
  const cleanup = async () => {
    open();
    await service.shutdown();
    rmSync(dir, { recursive: true, force: true });
  };
  return { service, policies, probeCache, store, ran, open, cleanup };
}

test('gallery mode is refused for playlist entries (and anything that is not a gallery)', async () => {
  const { service, probeCache, ran, cleanup } = setup();
  probeCache.set('p_list', { id: 'p_list', clientKey: 'c', href: 'https://tube.example/list/1', platformId: 'tube', adapterId: 'yt-dlp', media: PLAYLIST, thumbnailUrl: null });
  await assert.rejects(service.create({ probeId: 'p_list', entryId: 'e1', request: galleryRequest([1]), clientKey: 'c' }), { code: 'FORMAT_UNAVAILABLE' });
  assert.deepEqual(ran, []);
  await cleanup();
});

test('a policy change reaches gallery jobs that are already waiting in the queue', async () => {
  const { service, policies, probeCache, store, ran, open, cleanup } = setup();
  probeCache.set('p_g', { id: 'p_g', clientKey: 'c', href: 'https://pics.example/a/1', platformId: 'pics', adapterId: 'gallery-dl', media: GALLERY, thumbnailUrl: null });
  const running = await service.create({ probeId: 'p_g', request: galleryRequest([1]), clientKey: 'c' });
  const waiting = await service.create({ probeId: 'p_g', request: galleryRequest([2]), clientKey: 'c' });
  await sleep(20);
  assert.equal(store.get(waiting.job.id).status, 'queued');
  await policies.setOverride('pics', { policy: 'blocked', reason: 'test' });
  open();
  for (let i = 0; i < 100 && store.get(waiting.job.id).status !== 'failed'; i += 1) await sleep(10);
  assert.equal(store.get(running.job.id).status, 'ready', `work already running when the policy changed finishes: ${JSON.stringify(store.get(running.job.id).error)}`);
  assert.equal(store.get(waiting.job.id).status, 'failed');
  assert.equal(store.get(waiting.job.id).error.code, 'PLATFORM_BLOCKED');
  assert.equal(store.get(waiting.job.id).error.retryable, false);
  assert.deepEqual(ran, [running.job.id], 'the blocked job never reached the engine');
  await cleanup();
});
