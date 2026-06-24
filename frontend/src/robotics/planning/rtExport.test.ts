/**
 * Studio → RT Core trajectory export. The emitted schema must match what rtcore's
 * `traj-io` crate parses (see rtcore/crates/traj-io tests for the matching contract).
 *
 * Run: npx tsx --test src/robotics/planning/rtExport.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { timeParameterize, blendCorners } from '@/robotics/planning/trajectory';
import { exportRtTrajectory, exportRtTrajectoryJSON } from '@/robotics/planning/rtExport';

const path = [[0, 0], [1, 0], [1, 1]];
const lim = { vMax: [1, 1], aMax: [2, 2], jMax: [10, 10] };

test('export carries the contract header and matches DOF/joints', () => {
  const traj = timeParameterize(blendCorners(path, 0.2), lim);
  const out = exportRtTrajectory(traj, ['J1', 'J2'], 0.05);
  assert.equal(out.format, 'rtcore.trajectory');
  assert.equal(out.version, 1);
  assert.equal(out.dof, 2);
  assert.deepEqual(out.joints, ['J1', 'J2']);
  assert.ok(out.points.every((p) => p.positions.length === 2));
});

test('first point is the start, last point is the exact endpoint', () => {
  const traj = timeParameterize(path, lim);
  const out = exportRtTrajectory(traj, ['J1', 'J2'], 0.05);
  assert.equal(out.points[0].t, 0);
  out.points[0].positions.forEach((v, i) => assert.ok(Math.abs(v - path[0][i]) < 1e-6));
  const last = out.points[out.points.length - 1];
  assert.ok(Math.abs(last.t - out.duration) < 1e-6, 'last point at duration');
  last.positions.forEach((v, i) => assert.ok(Math.abs(v - path[path.length - 1][i]) < 1e-3));
});

test('points are time-ordered and strictly within [0, duration]', () => {
  const traj = timeParameterize(path, lim);
  const out = exportRtTrajectory(traj, ['J1', 'J2'], 0.05);
  for (let i = 1; i < out.points.length; i++) {
    assert.ok(out.points[i].t >= out.points[i - 1].t, 'monotonic time');
  }
  assert.ok(out.points.every((p) => p.t >= 0 && p.t <= out.duration + 1e-9));
});

test('JSON form parses back to the same object', () => {
  const traj = timeParameterize(path, lim);
  const json = exportRtTrajectoryJSON(traj, ['J1', 'J2'], 0.05);
  const parsed = JSON.parse(json);
  assert.equal(parsed.format, 'rtcore.trajectory');
  assert.equal(parsed.points.length, exportRtTrajectory(traj, ['J1', 'J2'], 0.05).points.length);
});

test('degenerate (zero-duration) trajectory exports a single point', () => {
  const traj = timeParameterize([[0.5, -0.5]], lim);
  const out = exportRtTrajectory(traj, ['J1', 'J2']);
  assert.equal(out.points.length, 1);
  assert.equal(out.points[0].t, 0);
});
