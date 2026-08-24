/**
 * Autonomous exploration cores: ray-traced mapping (free vs unknown), frontier detection,
 * next-goal selection, and map save/load round-trip.
 *
 * Run: npx tsx --test src/robotics/nav/exploration.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGrid, ensureKnown, isKnown, integrateScanTraced, worldToCell } from '@/robotics/nav/occupancyGrid';
import { frontierCells, frontierGoals, nextExplorationGoal } from '@/robotics/nav/frontier';
import { serializeMapJSON, deserializeMap } from '@/robotics/nav/mapIO';

test('ray-traced scan marks traversed cells free-known and the hit occupied', () => {
  const g = emptyGrid({ minX: -2, maxX: 2, minZ: -2, maxZ: 2 }, 0.2);
  // one beam from origin (0,0) hitting a wall at (1.0, 0)
  integrateScanTraced(g, 0, 0, [[1.0, 0, 0]], [1.0], 8, 0.0);
  const [oc, or] = worldToCell(g, 0, 0);
  const [hc, hr] = worldToCell(g, 1.0, 0);
  assert.ok(isKnown(g, oc, or), 'origin observed as free');
  assert.equal(g.data[hr * g.cols + hc], 1, 'hit cell occupied');
  assert.ok(isKnown(g, hc, hr), 'hit cell known');
  // a cell well off the beam stays unknown
  const [uc, ur] = worldToCell(g, -1.5, 1.5);
  assert.ok(!isKnown(g, uc, ur), 'off-beam cell remains unknown');
});

test('a partially observed map has frontiers; a fully known map has none', () => {
  const g = emptyGrid({ minX: 0, maxX: 2, minZ: 0, maxZ: 2 }, 0.5); // 4x4
  ensureKnown(g);
  // mark a 2x2 block of known-free in a corner → its edges border unknown
  for (const [c, r] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    g.known![r * g.cols + c] = 1;
  }
  assert.ok(frontierCells(g).length > 0, 'boundary cells are frontiers');

  // now mark everything known → no unknown neighbors → no frontiers
  g.known!.fill(1);
  assert.equal(frontierCells(g).length, 0, 'fully explored → no frontiers');
});

test('nextExplorationGoal returns a goal while unknown remains, null when done', () => {
  const g = emptyGrid({ minX: 0, maxX: 3, minZ: 0, maxZ: 3 }, 0.5); // 6x6
  ensureKnown(g);
  for (const [c, r] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) g.known![r * g.cols + c] = 1;
  const goal = nextExplorationGoal(g, 0, 0, () => true, 1);
  assert.ok(goal, 'a frontier goal exists');
  assert.ok(frontierGoals(g, 1).length > 0);

  g.known!.fill(1);
  assert.equal(nextExplorationGoal(g, 0, 0, () => true, 1), null, 'no goal when fully explored');
});

test('unreachable frontiers are skipped', () => {
  const g = emptyGrid({ minX: 0, maxX: 3, minZ: 0, maxZ: 3 }, 0.5);
  ensureKnown(g);
  for (const [c, r] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) g.known![r * g.cols + c] = 1;
  assert.equal(nextExplorationGoal(g, 0, 0, () => false, 1), null, 'nothing reachable → null');
});

test('map save → load round-trips occupancy and known layers', () => {
  const g = emptyGrid({ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }, 0.5);
  integrateScanTraced(g, 0, 0, [[0.9, 0, 0]], [0.9], 8, 0.0);
  const json = serializeMapJSON(g);
  const back = deserializeMap(json);
  assert.equal(back.cols, g.cols);
  assert.equal(back.rows, g.rows);
  assert.deepEqual(Array.from(back.data), Array.from(g.data), 'occupancy preserved');
  assert.deepEqual(Array.from(back.known!), Array.from(g.known!), 'known layer preserved');
});

test('deserializeMap rejects a bad document', () => {
  assert.throws(() => deserializeMap('{"format":"nope"}'));
});
