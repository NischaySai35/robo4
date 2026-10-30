import test from 'node:test';
import assert from 'node:assert/strict';
import { convexHullPoints } from './convexHull';

// A unit cube point cloud: 8 corners + interior points (which the hull must discard).
const cubeCloud = () => {
  const pts: number[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pts.push(x, y, z);
  pts.push(0, 0, 0, 0.5, -0.3, 0.2, -0.1, 0.4, -0.6); // interior — should not appear in the hull
  return pts;
};

test('convexHullPoints returns the 8 cube corners and discards interior points', () => {
  const hp = convexHullPoints(cubeCloud())!;
  assert.equal(hp.length, 8 * 3, 'eight hull vertices');
  for (let i = 0; i < hp.length; i++) assert.ok(Math.abs(Math.abs(hp[i]) - 1) < 1e-9, 'all coords ±1');
});

test('degenerate (coplanar) point cloud has no hull', () => {
  assert.equal(convexHullPoints([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]), null);
});
