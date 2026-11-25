import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeSpan } from '../src/lib/format.js';

test('a limit reads in whole hours when it divides evenly, otherwise in minutes', () => {
  assert.deepEqual(timeSpan(10_800), { unit: 'hours', count: 3 });
  assert.deepEqual(timeSpan(3_600), { unit: 'hours', count: 1 });
  assert.deepEqual(timeSpan(1_800), { unit: 'minutes', count: 30 });
  assert.deepEqual(timeSpan(5_400), { unit: 'minutes', count: 90 });
  assert.deepEqual(timeSpan(60), { unit: 'minutes', count: 1 });
});

test('an unknown limit gives no time span, never a guess', () => {
  for (const value of [undefined, null, 0, -5, Number.NaN, Infinity]) assert.equal(timeSpan(value), null);
});
