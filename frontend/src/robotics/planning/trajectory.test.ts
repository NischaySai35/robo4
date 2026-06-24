/**
 * Jerk-limited (S-curve) time parameterization: with jMax provided, the trajectory
 * must respect velocity, acceleration AND jerk caps, start/end at rest, reach the goal,
 * and (because acceleration ramps instead of stepping) take at least as long as the
 * trapezoidal profile. Trapezoidal behavior is preserved when jMax is omitted.
 *
 * Run: npx tsx --test src/robotics/planning/trajectory.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { timeParameterize, blendCorners, type Limits } from '@/robotics/planning/trajectory';

// Sample a trajectory densely and measure peak |v|, |a|, |j| via finite differences.
function peaks(traj: ReturnType<typeof timeParameterize>, dim: number) {
  const N = 2000, dt = traj.duration / N;
  let vMax = 0, aMax = 0, jMax = 0;
  const vAt = (t: number) => traj.velocity(t);
  for (let i = 0; i <= N; i++) {
    const t = i * dt;
    const v = vAt(t);
    for (let d = 0; d < dim; d++) vMax = Math.max(vMax, Math.abs(v[d]));
    if (i > 0 && i < N) {
      const vm = vAt(t - dt), vp = vAt(t + dt);
      for (let d = 0; d < dim; d++) {
        const a = (vp[d] - vm[d]) / (2 * dt);
        aMax = Math.max(aMax, Math.abs(a));
      }
      const am = vAt(t - 2 * dt), ap = vAt(t + 2 * dt);
      for (let d = 0; d < dim; d++) {
        // central 2nd difference of velocity ≈ jerk
        const j = (ap[d] - 2 * v[d] + am[d]) / (4 * dt * dt);
        jMax = Math.max(jMax, Math.abs(j));
      }
    }
  }
  return { vMax, aMax, jMax };
}

const path = [[0, 0], [1, 0.5], [2, 0.5], [3, 2]];
// A single straight segment: direction is constant, so per-joint v/a/j reflect the
// profile (a multi-corner path has direction jumps at waypoints regardless of profile).
const straight = [[0, 0], [3, 4]];
const vMax = [1.0, 1.0];
const aMax = [2.0, 2.0];
const jMax = [10.0, 10.0];

test('S-curve respects velocity, acceleration and jerk caps (straight path)', () => {
  const traj = timeParameterize(straight, { vMax, aMax, jMax });
  assert.ok(traj.duration > 0);
  const p = peaks(traj, 2);
  // small tolerance for finite-difference error
  assert.ok(p.vMax <= 1.0 * 1.02, `vMax ${p.vMax}`);
  assert.ok(p.aMax <= 2.0 * 1.05, `aMax ${p.aMax}`);
  assert.ok(p.jMax <= 10.0 * 1.25, `jMax ${p.jMax}`); // FD of jerk is noisy → looser bound
});

test('S-curve starts and ends at rest and reaches the goal', () => {
  const traj = timeParameterize(path, { vMax, aMax, jMax });
  traj.velocity(0).forEach((v) => assert.ok(Math.abs(v) < 1e-6, 'starts at rest'));
  traj.velocity(traj.duration).forEach((v) => assert.ok(Math.abs(v) < 1e-6, 'ends at rest'));
  traj.sample(0).forEach((v, i) => assert.ok(Math.abs(v - path[0][i]) < 1e-6));
  traj.sample(traj.duration).forEach((v, i) => assert.ok(Math.abs(v - path[path.length - 1][i]) < 1e-3));
});

test('S-curve is no faster than the trapezoidal profile (smoothness costs time)', () => {
  const trap = timeParameterize(path, { vMax, aMax });
  const scurve = timeParameterize(path, { vMax, aMax, jMax });
  assert.ok(scurve.duration >= trap.duration - 1e-9, `s-curve ${scurve.duration} vs trap ${trap.duration}`);
});

test('omitting jMax preserves the trapezoidal profile exactly', () => {
  const a: Limits = { vMax, aMax };
  const b: Limits = { vMax, aMax, jMax: [] }; // empty → no jerk limiting
  const ta = timeParameterize(path, a), tb = timeParameterize(path, b);
  assert.equal(ta.duration, tb.duration);
});

test('blendCorners preserves endpoints and stays within the blend radius of corners', () => {
  const sharp = [[0, 0], [1, 0], [1, 1]]; // a right-angle corner at (1,0)
  const blended = blendCorners(sharp, 0.3, 8);
  assert.deepEqual(blended[0], [0, 0], 'first endpoint preserved');
  assert.deepEqual(blended[blended.length - 1], [1, 1], 'last endpoint preserved');
  // the corner (1,0) must be cut: no blended point should sit exactly on it
  assert.ok(!blended.some((p) => p[0] === 1 && p[1] === 0), 'sharp corner removed');
  // every blended point stays near the original corner region (within ~radius)
  blended.forEach((p) => assert.ok(Math.hypot(p[0] - 1, p[1] - 0) <= 0.45 || p[0] <= 0.7 || p[1] >= 0.3, 'bounded deviation'));
});

test('corner blending drastically reduces the per-joint acceleration spike', () => {
  const sharp = [[0, 0], [1, 0], [1, 1]];
  const lim = { vMax: [1, 1], aMax: [3, 3], jMax: [20, 20] };
  const sharpPeak = peaks(timeParameterize(sharp, lim), 2).aMax;
  const smoothPeak = peaks(timeParameterize(blendCorners(sharp, 0.3, 12), lim), 2).aMax;
  // the sharp corner produces a near-infinite FD acceleration; blending bounds it
  assert.ok(smoothPeak < sharpPeak * 0.5, `blended ${smoothPeak.toFixed(1)} vs sharp ${sharpPeak.toFixed(1)}`);
});

test('blendCorners leaves a straight path unchanged', () => {
  const straightLine = [[0, 0], [1, 1], [2, 2]]; // collinear → nothing to round
  const out = blendCorners(straightLine, 0.3, 8);
  assert.equal(out.length, straightLine.length);
});

test('short move (no cruise / no amax plateau) still respects caps', () => {
  const shortPath = [[0, 0], [0.05, 0]]; // tiny distance
  const traj = timeParameterize(shortPath, { vMax, aMax, jMax });
  const p = peaks(traj, 2);
  assert.ok(traj.duration > 0);
  assert.ok(p.vMax <= 1.0 * 1.02 && p.aMax <= 2.0 * 1.1, `v ${p.vMax} a ${p.aMax}`);
});
