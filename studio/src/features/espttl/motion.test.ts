import test from 'node:test';
import assert from 'node:assert/strict';
import { planFrame, peakDegPerS, profile } from './motion';

const from = { 1: 180, 2: 180 };

test('speed is the peak joint velocity: 18 deg/s per step, 180 at 10', () => {
  assert.equal(peakDegPerS(4), 72);
  assert.equal(peakDegPerS(10), 180);
});

test('minimum-jerk path starts and ends at rest and is symmetric', () => {
  assert.equal(profile(0, true), 0);
  assert.equal(profile(1, true), 1);
  assert.ok(Math.abs(profile(0.5, true) - 0.5) < 1e-12);
  assert.ok(profile(0.01, true) < 0.0001);           // barely moves at the start
});

test('auto at speed 4 is not a lunge: a 90 deg move takes over 1.5 s', () => {
  const p = planFrame({ 1: 180 }, { 1: 270 }, 4, 0, true);
  assert.ok(p.ms > 1500, String(p.ms));
});

test('requested time is honoured when the speed cap allows it', () => {
  const p = planFrame(from, { 1: 200, 2: 160 }, 8, 2500, true);
  assert.equal(p.ms, 2500);
  assert.equal(p.stretched, false);
});

test('a move too fast for the cap stretches instead of being clipped', () => {
  // 120 deg at speed 1 (~30 deg/s) cannot happen in 500 ms.
  const p = planFrame(from, { 1: 300 }, 1, 500, false);
  assert.equal(p.stretched, true);
  assert.ok(p.ms > 500);
  assert.equal(p.ms, p.minMs);
  assert.equal(p.limitingId, 1);
});

test('auto time (0) takes the shortest feasible time and scales with distance', () => {
  const short = planFrame(from, { 1: 190 }, 5, 0, true);
  const long  = planFrame(from, { 1: 280 }, 5, 0, true);
  assert.ok(long.ms > short.ms);
  assert.equal(short.stretched, false);
});

test('a faster speed setting never makes an auto frame slower', () => {
  const slow = planFrame(from, { 1: 280 }, 3, 0, true);
  const fast = planFrame(from, { 1: 280 }, 9, 0, true);
  assert.ok(fast.ms <= slow.ms);
});

test('joints already at target do not set the time', () => {
  const p = planFrame(from, { 1: 180, 2: 180 }, 5, 0, true);
  assert.equal(p.limitingId, null);
});
