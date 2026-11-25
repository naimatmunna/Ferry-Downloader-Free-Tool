/**
 * The platform list tells the web app whether Ferry can save a site's
 * pictures, so a failed link can say "pictures coming soon" only where true.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRegistry } from '@ferry/shared/platforms/registry';
import { createPolicyService } from '../../src/policy/policies.js';

const base = { kind: 'social', auth: 'none', officialApi: null, restrictions: '', reliability: 'verified', lastChecked: '2026-11-25', routes: [], category: 4, policy: 'attestation' };
const CATALOG = [
  { ...base, id: 'videos', name: 'Videos', hosts: ['videos.example'], content: ['video', 'image'], engine: 'yt-dlp' },
  { ...base, id: 'posts', name: 'Posts', hosts: ['posts.example'], content: ['video', 'image'], engine: 'yt-dlp', ytdlpPictures: true },
  { ...base, id: 'albums', name: 'Albums', hosts: ['albums.example'], content: ['image'], engine: 'gallery-dl' },
  { ...base, id: 'direct', name: 'Direct', kind: 'direct', hosts: [], content: ['video'], engine: 'direct' },
  { ...base, id: 'generic', name: 'Other website', kind: 'generic', hosts: [], content: ['video'], engine: 'yt-dlp' },
];

test('each listed platform says whether Ferry can save its pictures', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ferry-pictures-'));
  try {
    const policies = createPolicyService({ file: path.join(dir, 'o.json'), registry: createRegistry(CATALOG), catalogVersion: 't', watch: false, engineAvailable: () => true });
    const pictures = Object.fromEntries(policies.list().map((p) => [p.id, p.pictures]));
    assert.deepEqual(pictures, { videos: false, posts: true, albums: true, direct: false, generic: false });  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
