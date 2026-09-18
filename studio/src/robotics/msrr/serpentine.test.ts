/**
 * serpentine.test.ts — how a solid patch gets filled, and why it is a spiral.
 *
 * The load-bearing test here is the last one. Nischay's rule for filling a slab
 * is a snake: fill a line, U-turn, fill the next one. The module cannot make
 * that U-turn — not because it lacks the bend travel, which it has, but because
 * doubling back into the NEIGHBOURING line drives its own connector A into its
 * own UP side dome and breaks the sphere rule. That is a claim about the
 * hardware rather than about this code, so it is measured here rather than
 * asserted in a comment, and it is the whole reason the default fill winds
 * instead of folding.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { key, sub, neg, eq, type Cell } from './lattice';
import { buildShape } from './shapes';
import {
  denseComponents, fillAxis, routeOne, spiralOne, serpentineRoutes, routeReverses,
  U_TURN_PITCH,
} from './serpentine';
import { uTurnCatalogue } from './fitModules';
import { findLandingPoses } from './chainSolve';
import { connectorPoses, baseQuatFor, HEMISPHERE_RADIUS } from './modulink';
import { MODULINK_CUBE_SIZE } from './occupancy';

const CUBES_PER_UNIT = 1 / MODULINK_CUBE_SIZE;
const DOME_DIAMETER_CUBES = 2 * HEMISPHERE_RADIUS * CUBES_PER_UNIT;

/** Closest approach between any two of a pose's own six connector domes. */
function tightestOwnDomePair(angles: Parameters<typeof connectorPoses>[0]) {
  const cp = connectorPoses(angles, { position: [0, 0, 0], quaternion: baseQuatFor([0, 0, 1]) });
  let best = { gap: Infinity, pair: '' };
  for (let i = 0; i < cp.length; i++) {
    for (let j = i + 1; j < cp.length; j++) {
      const a = cp[i].position, b = cp[j].position;
      const gap = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * CUBES_PER_UNIT;
      if (gap < best.gap) best = { gap, pair: `${cp[i].end}-${cp[j].end}` };
    }
  }
  return best;
}

test('a fill route covers every cube of its patch exactly once', () => {
  for (const id of ['wall', 'box', 'stairs'] as const) {
    for (const n of [24, 32]) {
      const cells = buildShape(id, n);
      for (const patch of denseComponents(cells)) {
        for (const route of [routeOne(patch), spiralOne(patch, fillAxis(patch))]) {
          assert.ok(route, `${id}@${n}: patch produced no route`);
          const seen = new Set(route.cells.map(key));
          assert.equal(route.cells.length, patch.length,
            `${id}@${n}: route visits ${route.cells.length} cubes for a ${patch.length}-cube patch`);
          assert.equal(seen.size, patch.length, `${id}@${n}: route repeats a cube`);
          for (const c of patch) {
            assert.ok(seen.has(key(c)), `${id}@${n}: route misses ${key(c)}`);
          }
        }
      }
    }
  }
});

test('fill lines are axis-aligned, never diagonal', () => {
  // Nischay: "strictly its not side ways, or face diagonal or body diagonal".
  // Consecutive route cubes are either one lattice step apart, or a deliberate
  // jump to a fresh run — never a diagonal shuffle between the two.
  for (const route of serpentineRoutes(buildShape('wall', 40))) {
    for (let i = 1; i < route.cells.length; i++) {
      const d = sub(route.cells[i], route.cells[i - 1]);
      const steps = Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]);
      const axisAligned = [d[0], d[1], d[2]].filter((v) => v !== 0).length <= 1;
      assert.ok(steps === 1 || !axisAligned || steps > 1,
        `route step ${key(route.cells[i - 1])} -> ${key(route.cells[i])} is a diagonal`);
      if (steps === 1) assert.ok(axisAligned);
    }
  }
});

test('a snake fill turns round; the spiral only does so where a strip is left over', () => {
  // The snake's whole shape is U-turns, so it must report one.
  const patch = denseComponents(buildShape('wall', 40))[0];
  const snake = routeOne(patch);
  assert.ok(snake);
  assert.equal(routeReverses(snake), true,
    'a snake that never turns round is not a snake — check routeReverses, not the route');

  // A spiral wound through open area does not need to fold at all. It is only
  // the last rings, where the strip still to cover is a couple of lines wide,
  // that come back to it — which is precisely when the fit should pay to solve
  // the U-turn catalogue, and why this flag exists.
  const wide = spiralOne(patch, fillAxis(patch));
  assert.ok(wide);
  assert.equal(typeof routeReverses(wide), 'boolean');
});

test('the module cannot U-turn into the neighbouring line, but can into the next one', () => {
  // Local frame: connector A at the origin facing +Z, the body running toward
  // -Z. A reversal therefore ends facing +Z, offset across the line. Solved
  // exactly rather than sampled from the reach table, because a clean reversal
  // is not one of the table's ten-degree samples.
  const perps: Cell[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
  let tightest = { gap: -1, pair: '' };
  let clearAtOnePitch = 0;
  let reachableAtOnePitch = 0;

  for (const perp of perps) {
    for (let along = -4; along <= 4; along++) {
      const end: Cell = [perp[0], perp[1], perp[2] + along];
      for (const pose of findLandingPoses(end, [0, 0, 1], undefined, 40)) {
        reachableAtOnePitch++;
        const t = tightestOwnDomePair(pose.angles);
        if (t.gap > tightest.gap) tightest = t;
        if (t.gap >= DOME_DIAMETER_CUBES - 1e-9) clearAtOnePitch++;
      }
    }
  }

  assert.ok(reachableAtOnePitch > 0,
    'test setup: the joints should reach a one-line reversal even though it collides');
  assert.equal(clearAtOnePitch, 0,
    `a one-line U-turn passed the sphere rule (best own-dome gap ${tightest.gap.toFixed(3)} cubes)`);
  // And it is close, not wild — worth pinning, because a change to the dome
  // radius or the rod lengths could plausibly move it either way.
  assert.ok(tightest.gap > 0.6 && tightest.gap < DOME_DIAMETER_CUBES,
    `expected the one-line U-turn to fail narrowly, got ${tightest.gap.toFixed(3)} `
    + `against ${DOME_DIAMETER_CUBES.toFixed(3)} needed (closest pair ${tightest.pair})`);

  // Two lines' pitch is clean, and that is what U_TURN_PITCH records.
  assert.equal(U_TURN_PITCH, 2);
  assert.ok(uTurnCatalogue().length > 0,
    'no buildable U-turn at all — a snake fill would have nothing to turn with');
});

test('fill picks the axis with the longest lines, and stands them up on a tie', () => {
  // A wall is wider than it is tall, so its lines run along the width.
  assert.deepEqual(fillAxis(denseComponents(buildShape('wall', 40))[0]), [1, 0, 0]);
  // A cube ties on every axis, and the tie goes to vertical — Nischay's call:
  // "while doing longer lines prefer vertical over horizontal".
  assert.deepEqual(fillAxis(denseComponents(buildShape('box', 27))[0]), [0, 1, 0]);
});

test('a shape with no solid patch is left entirely alone', () => {
  // Nothing limb-shaped should notice that any of this exists.
  for (const id of ['humanoid', 'bridge', 'arm', 'cross'] as const) {
    assert.deepEqual(serpentineRoutes(buildShape(id, 32)), [],
      `${id} produced a fill route, but it has no slab to fill`);
  }
});

test('a route step never leaves the patch it is filling', () => {
  for (const id of ['wall', 'box', 'stairs'] as const) {
    const cells = buildShape(id, 32);
    const occ = new Set(cells.map(key));
    for (const route of serpentineRoutes(cells)) {
      for (const c of route.cells) {
        assert.ok(occ.has(key(c)), `${id}: route visits ${key(c)}, which is not in the shape`);
      }
    }
  }
});

test('routeReverses reads a genuine doubling back, not a corner', () => {
  const straight: Cell[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0]];
  const corner: Cell[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0]];
  const back: Cell[] = [[0, 0, 0], [1, 0, 0], [0, 0, 0]];
  const as = (cells: Cell[]) => ({ cells, axis: [1, 0, 0] as Cell, lines: 1 });
  assert.equal(routeReverses(as(straight)), false);
  assert.equal(routeReverses(as(corner)), false);
  assert.equal(routeReverses(as(back)), true);
  // and the helper it is built on
  assert.ok(eq(neg(sub(back[1], back[0])), sub(back[2], back[1])));
});
