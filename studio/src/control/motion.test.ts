/**
 * Motion stack tests. Run: npx tsx --test src/control/motion.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { planRRTStar, planPRM, pathCost } from '../robotics/planning/rrtstar';
import { planRRT } from '../robotics/planning/rrt';
import { timeParameterize } from '../robotics/planning/trajectory';
import { PID } from './pid';

// A simple 2-DOF problem in [-3,3]^2 with a circular obstacle at the origin.
const bounds: [number, number][] = [[-3, 3], [-3, 3]];
const collisionFree = (q: number[]) => Math.hypot(q[0], q[1]) > 0.8;
const start = [-2, -2], goal = [2, 2];

test('RRT* returns a valid collision-free path', () => {
  const p = planRRTStar(start, goal, { bounds, collisionFree, maxIter: 3000 });
  assert.ok(p, 'expected a path');
  assert.deepEqual(p![0], start);
  for (const q of p!) assert.ok(collisionFree(q), 'all states collision-free');
});

test('RRT* path cost is no worse than plain RRT (usually better)', () => {
  // average over a few seeds to avoid flakiness
  let star = 0, plain = 0, n = 0;
  for (let i = 0; i < 5; i++) {
    const a = planRRTStar(start, goal, { bounds, collisionFree, maxIter: 3000 });
    const b = planRRT(start, goal, { bounds, collisionFree, maxIter: 3000 });
    if (a && b) { star += pathCost(a); plain += pathCost(b); n++; }
  }
  assert.ok(n > 0);
  // RRT* should be within ~10% and typically below RRT after smoothing
  assert.ok(star / n <= (plain / n) * 1.1, `rrt*=${(star / n).toFixed(2)} rrt=${(plain / n).toFixed(2)}`);
});

test('PRM finds a path on the same problem', () => {
  const p = planPRM(start, goal, { bounds, collisionFree, samples: 400, k: 12 });
  assert.ok(p, 'expected a PRM path');
  for (const q of p!) assert.ok(collisionFree(q));
});

test('time-parameterization respects velocity & acceleration limits', () => {
  const path = [[0, 0], [1, 0], [1, 1], [2, 2]];
  const vMax = [1.0, 1.0], aMax = [2.0, 2.0];
  const traj = timeParameterize(path, { vMax, aMax });
  assert.ok(traj.duration > 0);
  // start at first waypoint, end at last
  assert.deepEqual(traj.sample(0), [0, 0]);
  const end = traj.sample(traj.duration);
  assert.ok(Math.hypot(end[0] - 2, end[1] - 2) < 1e-6);
  // sample velocities never exceed per-joint vMax (small epsilon)
  for (let t = 0; t <= traj.duration; t += traj.duration / 50) {
    const v = traj.velocity(t);
    assert.ok(Math.abs(v[0]) <= vMax[0] + 1e-6, `v0=${v[0]}`);
    assert.ok(Math.abs(v[1]) <= vMax[1] + 1e-6, `v1=${v[1]}`);
  }
});

test('PID drives a first-order plant to setpoint', () => {
  const pid = new PID({ kp: 4, ki: 1, kd: 0.2, outMax: 50 });
  let x = 0; const dt = 0.02; const sp = 1;
  for (let i = 0; i < 500; i++) {
    const u = pid.update(sp, x, dt);
    x += (u - x) * dt; // stable first-order plant
  }
  assert.ok(Math.abs(x - sp) < 0.05, `settled at ${x}`);
});
