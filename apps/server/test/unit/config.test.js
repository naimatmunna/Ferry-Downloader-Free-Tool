import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../../src/config.js';

test('the permission tick box is off unless ASK_PERMISSION turns it on', () => {
  assert.equal(loadConfig({ NODE_ENV: 'test' }).askPermission, false);
  assert.equal(loadConfig({ NODE_ENV: 'test', ASK_PERMISSION: 'true' }).askPermission, true);
  assert.equal(loadConfig({ NODE_ENV: 'test', ASK_PERMISSION: 'false' }).askPermission, false);
});

test('the example settings files load as written (only the secret filled in)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  for (const file of ['.env.example', 'deploy/vercel.env.example']) {
    const env = {};
    for (const line of readFileSync(root + file, 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m) env[m[1]] = m[2];
    }
    // Operators must set the secret themselves; everything else is used as the file says.
    const config = loadConfig({ ...env, SIGNING_SECRET: 's'.repeat(48) });
    assert.ok(config.limits.maxFileSizeBytes > 0, file);
  }
});
