/**
 * Nav upgrades: A* line-of-sight smoothing (Nav2-style) and ICP scan matching (SLAM core).
 *
 * Run: npx tsx --test src/robotics/nav/navUpgrades.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGrid, buildGrid, isFree, worldToCell } from '@/robotics/nav/occupancyGrid';
import { planPath, lineOfSight } from '@/robotics/nav/astar';
import { icpMatch, applyPose2D } from '@/robotics/nav/scanMatch';

test('A* smooths an obstacle-free path to a near-straight line (no zig-zag)', () => {
  const g = emptyGrid({ minX: -5, maxX: 5, minZ: -5, maxZ: 5 }, 0.2);
  const p = planPath(g, -4, -4, 4, 4)!; // pure diagonal across open space
  assert.ok(p, 'path found');
  // string-pulling collapses the diagonal to ~2 points (start + goal), not dozens
  assert.ok(p.length <= 3, `near-straight path, got ${p.length} pts`);
});

test('smoothed path stays collision-free around a wall', () => {
  // a vertical wall with a gap forces a detour
  const wall = [{ minX: -0.2, maxX: 0.2, minZ: -3, maxZ: 1.0 }];
  const g = buildGrid(wall, { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }, 0.2, 0.2);
  const p = planPath(g, -3, 0, 3, 0)!;
  assert.ok(p && p.length >= 2, 'path found around the wall');
  // every consecutive segment must have clear line-of-sight (collision-free)
  for (let i = 1; i < p.length; i++) {
    const [c0, r0] = worldToCell(g, p[i - 1][0], p[i - 1][1]);
    const [c1, r1] = worldToCell(g, p[i][0], p[i][1]);
    assert.ok(lineOfSight(g, c0, r0, c1, r1), `segment ${i} crosses an obstacle`);
  }
});

test('lineOfSight reports blocked vs clear correctly', () => {
  const wall = [{ minX: -0.2, maxX: 0.2, minZ: -2, maxZ: 2 }];
  const g = buildGrid(wall, { minX: -3, maxX: 3, minZ: -3, maxZ: 3 }, 0.2, 0.0);
  const [c0, r0] = worldToCell(g, -2, 0);
  const [c1, r1] = worldToCell(g, 2, 0);
  assert.ok(!lineOfSight(g, c0, r0, c1, r1), 'across the wall = blocked');
  const [c2, r2] = worldToCell(g, -2, 2.8);
  const [c3, r3] = worldToCell(g, 2, 2.8);
  assert.ok(lineOfSight(g, c2, r2, c3, r3), 'above the wall = clear');
  void isFree; // referenced via lineOfSight
});

// An asymmetric "L" cloud so rotation is observable.
const cloud: [number, number][] = [
  [0, 0], [0.2, 0], [0.4, 0], [0.6, 0], [0, 0.2], [0, 0.4], [0, 0.6], [0.4, 0.2],
];

test('ICP recovers a known rigid transform (the basis of SLAM odometry)', () => {
  // small inter-scan motion (smaller than point spacing) — the regime ICP operates in
  const known = { x: 0.05, z: -0.03, theta: 0.04 };
  const source = cloud.map((p) => applyPose2D(known, p)); // move the cloud by `known`
  const res = icpMatch(cloud, source, { x: 0, z: 0, theta: 0 });
  // aligning source back onto the original should be near-perfect
  assert.ok(res.rmse < 1e-3, `tight fit, rmse=${res.rmse}`);
  // the recovered transform maps a source point back onto its target
  const mapped = applyPose2D(res.pose, source[0]);
  assert.ok(Math.hypot(mapped[0] - cloud[0][0], mapped[1] - cloud[0][1]) < 1e-2, 'maps source→target');
});

test('ICP still converges for a larger motion when seeded with an odometry guess', () => {
  const known = { x: 0.25, z: -0.15, theta: 0.12 };
  const source = cloud.map((p) => applyPose2D(known, p));
  // odometry gives a rough guess of the inverse motion → ICP refines it
  const guess = { x: -0.22, z: 0.13, theta: -0.10 };
  const res = icpMatch(cloud, source, guess);
  assert.ok(res.rmse < 1e-2, `seeded fit, rmse=${res.rmse}`);
});

test('ICP returns identity-ish for already-aligned scans', () => {
  const res = icpMatch(cloud, cloud.map((p) => [...p] as [number, number]));
  assert.ok(res.rmse < 1e-6, `already aligned, rmse=${res.rmse}`);
});
