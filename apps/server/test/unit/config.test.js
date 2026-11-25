import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../../src/config.js';

test('the permission tick box is off unless ASK_PERMISSION turns it on', () => {
  assert.equal(loadConfig({ NODE_ENV: 'test' }).askPermission, false);
  assert.equal(loadConfig({ NODE_ENV: 'test', ASK_PERMISSION: 'true' }).askPermission, true);
  assert.equal(loadConfig({ NODE_ENV: 'test', ASK_PERMISSION: 'false' }).askPermission, false);
});
