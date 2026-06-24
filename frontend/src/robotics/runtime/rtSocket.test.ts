/**
 * RT Core socket message handling (the part that's testable without a real WebSocket).
 *
 * Run: npx tsx --test src/robotics/runtime/rtSocket.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRtMessage } from '@/robotics/runtime/rtSocket';
import { useRtStatusStore } from '@/state/rtStatusStore';

const SAMPLE = JSON.stringify({
  format: 'rtcore.controller_status', version: 1, name: 'arm_traj',
  elapsed: 0.5, duration: 1.0, fraction: 0.5, finished: false, error: [0.01, -0.02],
});

test('a valid telemetry string updates the status store', () => {
  useRtStatusStore.getState().clear();
  handleRtMessage(SAMPLE);
  const s = useRtStatusStore.getState().status;
  assert.ok(s, 'status set');
  assert.equal(s!.name, 'arm_traj');
  assert.equal(s!.fraction, 0.5);
});

test('non-string or malformed payloads are ignored (UI never breaks)', () => {
  useRtStatusStore.getState().clear();
  handleRtMessage(new ArrayBuffer(8)); // binary frame
  handleRtMessage('{ not json');
  handleRtMessage('{"format":"other"}');
  assert.equal(useRtStatusStore.getState().status, null, 'store untouched');
});
