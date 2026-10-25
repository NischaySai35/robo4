import test from 'node:test';
import assert from 'node:assert/strict';
import { batteryPct, warnLevel, BATT_EMPTY_V } from './battery';

test('0% is 10.5 V and 100% is 12.6 V', () => {
  assert.equal(batteryPct(BATT_EMPTY_V), 0);
  assert.equal(batteryPct(10.2), 0);
  assert.equal(batteryPct(12.6), 100);
  assert.ok(Math.abs(batteryPct(11.55) - 50) < 1e-9);
});

test('warning level steps down every 0.1 V, starting at 10.6', () => {
  assert.equal(warnLevel(10.59), 10.6);
  assert.equal(warnLevel(10.6), 10.6);
  assert.equal(warnLevel(10.57), 10.6);
  assert.equal(warnLevel(10.5), 10.5);
  assert.equal(warnLevel(10.49), 10.5);
  assert.equal(warnLevel(10.31), 10.4);
});
