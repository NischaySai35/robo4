/**
 * Track 3 (nav + perception) tests. Run: npx tsx --test src/robotics/track3.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '@/robotics/nav/occupancyGrid';
import { inflateCostmap, costAt, LETHAL } from '@/robotics/nav/costmap';
import { planDWB, DEFAULT_DWB } from '@/robotics/nav/dwb';
import { ParticleFilter } from '@/robotics/nav/amcl';

function gridWithObstacle() {
  // one obstacle footprint near the middle of a 6x6 m world
  return buildGrid(
    [{ minX: -0.25, maxX: 0.25, minZ: -0.25, maxZ: 0.25 }],
    { minX: -3, maxX: 3, minZ: -3, maxZ: 3 }, 0.1, 0,
  );
}

test('inflation: lethal at obstacle, decays with distance, zero far away', () => {
  const cm = inflateCostmap(gridWithObstacle(), 0.6, 3.0);
  assert.equal(costAt(cm, 0, 0), LETHAL, 'obstacle cell is lethal');
  const near = costAt(cm, 0.35, 0);   // just outside obstacle, within inflation
  const far = costAt(cm, 2.5, 2.5);   // beyond inflation radius
  assert.ok(near > 0 && near < LETHAL, `near=${near}`);
  assert.equal(far, 0, 'far cell is free');
});

test('DWB moves toward the goal and never selects a lethal rollout', () => {
  const cm = inflateCostmap(gridWithObstacle(), 0.5, 3.0);
  const pose = { x: -2, y: 0, theta: 0 };
  const res = planDWB(pose, { v: 0, w: 0 }, { x: 2, y: 0.5 }, cm, DEFAULT_DWB);
  assert.ok(res, 'expected a command');
  assert.ok(res!.v >= 0, 'non-negative forward velocity');
  // the chosen rollout endpoint should be closer to the goal than the start
  const end = res!.rollout[res!.rollout.length - 1];
  const dStart = Math.hypot(2 - pose.x, 0.5 - pose.y);
  const dEnd = Math.hypot(2 - end.x, 0.5 - end.y);
  assert.ok(dEnd < dStart, `dEnd=${dEnd.toFixed(2)} dStart=${dStart.toFixed(2)}`);
  // none of the rollout cells are lethal
  for (const p of res!.rollout) assert.ok(costAt(cm, p.x, p.y) < LETHAL);
});

test('AMCL particle filter converges to the true pose', () => {
  const truth = { x: 1.2, y: -0.7, theta: 0.4 };
  const pf = new ParticleFilter(500);
  pf.init({ x: 0, y: 0, theta: 0 }, { xy: 2, theta: 1 });
  // measurement likelihood peaks at the true pose (e.g. scan-match score)
  const likelihood = (p: { x: number; y: number; theta: number }) => {
    const d2 = (p.x - truth.x) ** 2 + (p.y - truth.y) ** 2 + (p.theta - truth.theta) ** 2;
    return Math.exp(-d2 / 0.3);
  };
  for (let i = 0; i < 30; i++) { pf.predict({ dx: 0, dy: 0, dtheta: 0 }, { xy: 0.05, theta: 0.05 }); pf.update(likelihood); }
  const est = pf.estimate();
  assert.ok(Math.hypot(est.x - truth.x, est.y - truth.y) < 0.4, `pos est (${est.x.toFixed(2)},${est.y.toFixed(2)})`);
  assert.ok(Math.abs(est.theta - truth.theta) < 0.4, `theta est ${est.theta.toFixed(2)}`);
});
