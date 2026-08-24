/**
 * Studio consumer of RT Core controller feedback. The schema asserted here matches the
 * one emitted by rtcore's `traj-io::status_to_json` (see that crate's test — shared contract).
 *
 * Run: npx tsx --test src/robotics/runtime/rtStatus.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRtControllerStatus, summarizeStatus } from '@/robotics/runtime/rtStatus';

// The SAME example asserted on the Rust side (traj-io tests) — the shared contract.
const SAMPLE = JSON.stringify({
  format: 'rtcore.controller_status', version: 1, name: 'arm_traj',
  elapsed: 0.5, duration: 1.0, fraction: 0.5, finished: false, error: [0.01, -0.02],
});

test('parses the RT Core status schema', () => {
  const s = parseRtControllerStatus(SAMPLE);
  assert.equal(s.name, 'arm_traj');
  assert.equal(s.fraction, 0.5);
  assert.equal(s.finished, false);
  assert.deepEqual(s.error, [0.01, -0.02]);
});

test('rejects a wrong/missing format', () => {
  assert.throws(() => parseRtControllerStatus('{"format":"other"}'));
  assert.throws(() => parseRtControllerStatus({}));
});

test('clamps fraction and coerces malformed numbers', () => {
  const s = parseRtControllerStatus({ format: 'rtcore.controller_status', fraction: 2.5, error: ['x', 1] });
  assert.equal(s.fraction, 1, 'fraction clamped to [0,1]');
  assert.deepEqual(s.error, [0, 1], 'non-numeric error coerced to 0');
});

test('summarize derives percent, worst error, and run state', () => {
  const running = summarizeStatus(parseRtControllerStatus(SAMPLE));
  assert.equal(running.percent, 50);
  assert.ok(Math.abs(running.maxAbsError - 0.02) < 1e-9);
  assert.equal(running.state, 'running');

  const done = summarizeStatus(parseRtControllerStatus({ format: 'rtcore.controller_status', fraction: 1, finished: true, error: [] }));
  assert.equal(done.state, 'done');
  assert.equal(done.percent, 100);

  const idle = summarizeStatus(parseRtControllerStatus({ format: 'rtcore.controller_status', fraction: 0, finished: false }));
  assert.equal(idle.state, 'idle');
});
