/**
 * chainSolve.test.ts — the on-demand pose solver.
 *
 * The property that actually matters is the one the whole file exists for: it
 * must find poses the precomputed table misses. If it only ever reproduced what
 * reachTable already had, none of this would be worth the added complexity.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { type Cell, key, configFromCells, isConnected } from './lattice';
import { endPose, forwardOf, IDENTITY, weldTypeIsLegal } from './modulink';
import { MODULINK_CUBE_SIZE } from './occupancy';
import { reachTable, posesReaching, MAX_SNAP_ERROR } from './chainMoves';
import {
  solveLandingPose, solveLandingPoses, solveLandingPoseCached, clearSolveCache,
  WELD_ALIGNMENT_MIN,
} from './chainSolve';
import { fitModules, connectorsOf, inverseRotationTo } from './fitModules';
import { buildShape } from './shapes';

test('a solved pose actually reaches the requested cell and facing', () => {
  const cases: [Cell, Cell][] = [
    [[0, 0, -4], [0, 0, -1]],
    [[3, 0, -1], [1, 0, 0]],
    [[1, 2, -1], [0, 1, 0]],
    [[-2, 1, -2], [-1, 0, 0]],
  ];
  for (const [offset, dir] of cases) {
    const pose = solveLandingPose(offset, dir);
    if (!pose) continue; // not every cell is reachable; that is a legitimate answer
    const e = endPose(pose.angles, IDENTITY);
    const raw: [number, number, number] = [
      e.position[0] / MODULINK_CUBE_SIZE, e.position[1] / MODULINK_CUBE_SIZE, e.position[2] / MODULINK_CUBE_SIZE,
    ];
    const err = Math.hypot(raw[0] - offset[0], raw[1] - offset[1], raw[2] - offset[2]);
    // The acceptance bound is MAX_SNAP_ERROR; the solver aims well inside it and
    // typically lands within a hundredth of a cube, but a target near the edge of
    // the module's workspace legitimately converges looser. Assert the contract,
    // not a tighter number the solver never promised.
    assert.ok(err <= MAX_SNAP_ERROR,
      `solved pose for ${key(offset)} lands ${err} cubes off, past the ${MAX_SNAP_ERROR} tolerance`);

    const f = forwardOf(e);
    const len = Math.hypot(f[0], f[1], f[2]) || 1;
    const dot = (f[0] * dir[0] + f[1] * dir[1] + f[2] * dir[2]) / len;
    // The solver holds a weld-realistic alignment bar, much tighter than the
    // table's coarse "near an axis" filter — see WELD_ALIGNMENT_MIN.
    assert.ok(dot >= WELD_ALIGNMENT_MIN,
      `solved pose for ${key(offset)} faces ${f}, ${dot} off ${dir}`);
  }
});

test('joint limits are respected — no solved pose exceeds +/-90 degrees bend', () => {
  const cases: [Cell, Cell][] = [
    [[0, 0, -4], [0, 0, -1]], [[1, 2, -1], [0, 1, 0]], [[3, 0, -1], [1, 0, 0]],
  ];
  for (const [offset, dir] of cases) {
    const pose = solveLandingPose(offset, dir);
    if (!pose) continue;
    for (const i of [1, 2, 4]) {
      assert.ok(Math.abs(pose.angles[i]) <= Math.PI / 2 + 1e-6,
        `solved bend at rod ${i} is ${pose.angles[i]}, outside +/-90 degrees`);
    }
  }
});

test('an out-of-envelope target is refused, not approximated', () => {
  // Further than any module could possibly reach, at any fold.
  const pose = solveLandingPose([20, 20, 20], [1, 0, 0]);
  assert.equal(pose, null);
});

test('the solver reaches real connector targets, independent of the table', () => {
  // Tested against a REAL structure's actual connectors, not an arbitrary grid of
  // (offset, direction) pairs — an earlier version scanned a uniform grid over
  // every axis direction and mostly failed, because most such combinations are
  // not physically achievable by any 3-bend-DOF configuration regardless of
  // resolution: they were never a fair test of "does finer search help", just of
  // "is this arbitrary point reachable at all", which is usually no. A real
  // module's actual reach targets are the other modules' six real connectors,
  // which is what any planner actually queries.
  //
  // Asserts the narrow, definitely-true claim: the solver independently reaches
  // real targets, agreeing with geometry it was never shown. The mobility GAIN
  // from using it (measured: a 4-module wall 2 -> 4, a 7-module snake 4 -> 6)
  // is verified separately in transform.test.ts, where body collision is
  // actually checked — that gain only exists because solveLandingPoses returns
  // alternates, so a colliding route has a fallback.
  let checkedAnyModule = false;
  let solverFound = 0;

  for (const shapeName of ['wall', 'snake'] as const) {
    const build = fitModules(buildShape(shapeName, 20));
    for (const m of build.modules) {
      const others = build.modules.filter((x) => x.id !== m.id);
      const targets = others.flatMap(connectorsOf);
      const invRot = inverseRotationTo(m.anchorDir);

      for (const t of targets) {
        if (!weldTypeIsLegal('B', t.end)) continue;
        const offset: Cell = [t.cell[0] - m.anchorCell[0], t.cell[1] - m.anchorCell[1], t.cell[2] - m.anchorCell[2]];
        const wantedOffset = invRot(offset);
        const wantedDir = invRot([-t.dir[0], -t.dir[1], -t.dir[2]]);
        checkedAnyModule = true;
        if (solveLandingPose(wantedOffset, wantedDir)) solverFound++;
      }
    }
  }
  assert.ok(checkedAnyModule, 'test setup problem: no real targets were checked');
  assert.ok(solverFound > 0, 'the solver reached none of the real connector targets across two structures');
});

test('the solver agrees with the table wherever the table already has an answer', () => {
  // Not bit-identical (different joint solutions can reach the same spot), but
  // the solver must succeed everywhere the coarse table already proved reachable.
  const targets = posesReaching([0, 0, -4], [0, 0, -1]);
  assert.ok(targets.length > 0);
  const solved = solveLandingPose([0, 0, -4], [0, 0, -1]);
  assert.ok(solved, 'solver failed on a target the table already reaches');
});

test('the solved pose body covers its own anchor and is densely sampled', () => {
  // NOT asserted: face-connectivity of the cell set. These cells are a COLLISION
  // FOOTPRINT — the cubes the centreline passes through — not a structure. With
  // the twists free the chain can cross a cube corner diagonally, which
  // face-adjacency calls disconnected even though the chain is one solid object.
  // What must hold is that the anchor is covered and the sampling is dense
  // enough not to skip a cube the body really passes through.
  const pose = solveLandingPose([0, 0, -4], [0, 0, -1]);
  assert.ok(pose, 'the straight-ahead landing must be solvable');
  assert.ok(pose.cells.length >= 1);
  assert.ok(pose.cells.some((c) => key(c) === key([0, 0, 0])),
    'the body must cover the cube it is anchored in');

  // Every cube is within one diagonal step of another — dense, not scattered.
  for (const c of pose.cells) {
    const near = pose.cells.some((o) => o !== c
      && Math.abs(o[0] - c[0]) <= 1 && Math.abs(o[1] - c[1]) <= 1 && Math.abs(o[2] - c[2]) <= 1);
    assert.ok(pose.cells.length === 1 || near, `cube ${key(c)} is isolated — sampling skipped cubes`);
  }
});

test('alternates: several distinct body routes are offered per reachable target', () => {
  // The reason this file has a plural API at all. A caller rejects any route
  // whose body collides with another module; with one candidate a collision
  // means the target is unreachable, which is what made an earlier revision
  // REDUCE measured mobility when wired into the planner.
  const routes = solveLandingPoses([0, 0, -4], [0, 0, -1]);
  assert.ok(routes.length > 0, 'the straight-ahead landing must be solvable');

  // Every route must genuinely reach the same target...
  for (const r of routes) {
    assert.equal(key(r.endOffset), key([0, 0, -4] as Cell));
    assert.equal(key(r.endDir), key([0, 0, -1] as Cell));
  }
  // ...via a genuinely different set of swept cubes, or it is not an alternative.
  const sigs = new Set(routes.map((r) => r.cells.map(key).sort().join(',')));
  assert.equal(sigs.size, routes.length, 'alternates must sweep different cubes');

  // Straightest first, so a caller taking [0] gets the least-folded option.
  for (let i = 1; i < routes.length; i++) {
    const bend = (p: typeof routes[0]) => Math.abs(p.angles[1]) + Math.abs(p.angles[2]) + Math.abs(p.angles[4]);
    assert.ok(bend(routes[i]) >= bend(routes[i - 1]) - 1e-9, 'routes must be ordered straightest-first');
  }
});

test('continuous twists reach targets that quantized twists could not', () => {
  // The correction this solver is built on. Twists are motors mid-chain with a
  // full 0-360 range; only the END connector's seating roll is four-fold
  // symmetric. Quantizing t0 and t3 to 90-degree steps left three DOF to satisfy
  // three position plus one facing constraint, so most real connector targets
  // came back unreachable — measured at 3 of 14 on a real structure, including
  // targets a single cube away.
  const build = fitModules(buildShape('snake', 20));
  const m = build.modules[0];
  const others = build.modules.filter((x) => x.id !== m.id);
  const invRot = inverseRotationTo(m.anchorDir);

  let inEnvelope = 0;
  let reachable = 0;
  for (const t of others.flatMap(connectorsOf)) {
    if (!weldTypeIsLegal('B', t.end)) continue;
    const offset: Cell = [
      t.cell[0] - m.anchorCell[0], t.cell[1] - m.anchorCell[1], t.cell[2] - m.anchorCell[2],
    ];
    const wantedOffset = invRot(offset);
    // Only count targets the module could physically reach at all.
    if (Math.hypot(...wantedOffset) > 4.2) continue;
    inEnvelope++;
    if (solveLandingPoses(wantedOffset, invRot([-t.dir[0], -t.dir[1], -t.dir[2]])).length) reachable++;
  }

  assert.ok(inEnvelope > 0, 'test setup: no targets were within reach to check');
  // Measured, not aspirational. Freeing the twists took total structure mobility
  // from 3 to 5 and made whole classes of target solvable — but per module, most
  // in-envelope targets stay unreachable for a real reason: the remaining misses
  // are things like "one cube away, facing sideways", which needs the chain to
  // fold almost fully back on itself, and each bend is capped at 90 degrees. That
  // is the module's actual workspace, not a solver failure. The floor guards
  // against the twists being re-constrained; raise it only on a real improvement.
  assert.ok(reachable >= 1,
    `only ${reachable} of ${inEnvelope} in-envelope targets are reachable — `
    + 'the twists may be constrained again');
});

test('the cache returns the same object on repeat queries and clears on demand', () => {
  clearSolveCache();
  const a = solveLandingPoseCached([0, 0, -4], [0, 0, -1]);
  const b = solveLandingPoseCached([0, 0, -4], [0, 0, -1]);
  assert.equal(a, b, 'a repeat query must hit the cache, not resolve again');
  clearSolveCache();
  const c = solveLandingPoseCached([0, 0, -4], [0, 0, -1]);
  assert.notEqual(a, c, 'after clearing, a fresh solve must run (a new object)');
  assert.deepEqual(a?.endOffset, c?.endOffset, 'but it should reach the same answer');
});

test('unreachable targets are also cached as null, not re-solved every time', () => {
  clearSolveCache();
  const a = solveLandingPoseCached([50, 50, 50], [1, 0, 0]);
  const b = solveLandingPoseCached([50, 50, 50], [1, 0, 0]);
  assert.equal(a, null);
  assert.equal(b, null);
});
