import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receiversIndexAt, frameIndexAt, type PhysRun } from './physicsView';

const rx = (locked: string | null) => [{ id: 'S8', x: -0.2, z: 0.2, locked }];
const run = (receivers_at?: PhysRun['receivers_at']): PhysRun =>
  ({ bodies: [], frame0: [], frames: [], events: [], fps: 25, randomized: true, seed: 1, finite: true, receivers: rx(null), receivers_at });

test('a run without a timeline uses its single receiver list', () => {
  assert.equal(receiversIndexAt(run(), 12), -1);
});

test('the receivers in effect are the last entry that has started', () => {
  const r = run([{ t: 0, receivers: rx('W2.A') }, { t: 54.56, receivers: rx(null) }]);
  assert.equal(receiversIndexAt(r, 0), 0);
  assert.equal(receiversIndexAt(r, 54.5), 0);
  assert.equal(receiversIndexAt(r, 54.56), 1);
  assert.equal(receiversIndexAt(r, 70), 1);
});

test('frames are found by their own time, also when the buffer starts mid-session (split view real copy, trimmed live buffer)', () => {
  const r = run(); r.frames = [20.0, 20.04, 20.08, 20.12].map((t) => ({ t, p: [] }));
  assert.equal(frameIndexAt(r, 0), 0);
  assert.equal(frameIndexAt(r, 20.05), 1);
  assert.equal(frameIndexAt(r, 20.07), 2);
  assert.equal(frameIndexAt(r, 99), 3);
  assert.equal(frameIndexAt(run(), 1), -1);
});
