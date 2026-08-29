/**
 * msrr.test.ts — the invariants that make the MSRR page trustworthy.
 *
 * These are not coverage tests. Each one guards a property that, if it broke,
 * would let the app emit a plan that looks fine on screen and destroys hardware:
 * a module that flies, a robot that splits in two, a move that passes through
 * another module, a target no set of modules could ever form.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  type Cell, configFromCells, cellsOf, isConnected, isConnectedWithout,
  articulationCells, key, fitToCount, bestAlignment, diff, shapeKey, groundCenter,
} from './lattice';
import { legalMoves, movesForModule, applyMove, verifyPlan, type MoveModel } from './moves';
import { planReconfiguration } from './planner';
import { checkStability } from './stability';
import { SHAPES, buildShape } from './shapes';
import { parseText, textToShape } from './textToShape';
import { validateCells } from './aiShape';
import { buildFromStrokes, segmentCells } from './strokeToShape';
import { poseAt, orientationAfter, IDENTITY_QUAT } from './executor';

const MODELS: MoveModel[] = ['sliding', 'pivoting'];

// ── lattice ───────────────────────────────────────────────────────────────────

test('connectivity uses faces, not corners', () => {
  // Two cells touching only at a corner are NOT connected: real connectors mate
  // face to face, and treating a diagonal as a connection would let the planner
  // emit structures that fall apart.
  const diagonal = configFromCells([[0, 0, 0], [1, 1, 0]]);
  assert.equal(isConnected(diagonal), false);
  const faceTouching = configFromCells([[0, 0, 0], [1, 0, 0]]);
  assert.equal(isConnected(faceTouching), true);
});

test('articulation cells are exactly the ones whose removal splits the robot', () => {
  // A straight 3-chain: the middle module is the only one holding it together.
  const cfg = configFromCells([[0, 0, 0], [1, 0, 0], [2, 0, 0]]);
  const locked = articulationCells(cfg);
  assert.equal(locked.has(key([1, 0, 0])), true);
  assert.equal(locked.has(key([0, 0, 0])), false);
  assert.equal(locked.has(key([2, 0, 0])), false);

  // And it agrees with the brute-force definition on a branched structure.
  const branched = configFromCells([
    [0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0], [1, 0, 1],
  ]);
  const marked = articulationCells(branched);
  for (const c of cellsOf(branched)) {
    assert.equal(
      marked.has(key(c)), !isConnectedWithout(branched, c),
      `articulation disagreement at ${key(c)}`,
    );
  }
});

test('fitToCount hits the exact count and keeps one connected piece', () => {
  for (const n of [1, 5, 12, 30, 47]) {
    const cells = fitToCount(buildShape('chair', 20), n);
    assert.equal(cells.length, n, `expected ${n} cells`);
    assert.equal(isConnected(configFromCells(cells)), true, `disconnected at n=${n}`);
  }
});

test('bestAlignment finds the translation with maximum overlap', () => {
  const start: Cell[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0]];
  const goal: Cell[] = [[5, 0, 0], [6, 0, 0], [7, 0, 0]];
  const t = bestAlignment(start, goal);
  const moved = goal.map((c) => [c[0] + t[0], c[1] + t[1], c[2] + t[2]] as Cell);
  assert.equal(shapeKey(moved), shapeKey(start));
  assert.equal(diff(configFromCells(start), moved).missing.length, 0);
});

// ── moves ─────────────────────────────────────────────────────────────────────

test('no legal move ever disconnects the robot or lands a module in mid-air', () => {
  const structures: Cell[][] = [
    buildShape('chair', 16),
    buildShape('table', 18),
    buildShape('snake', 14),
    buildShape('tower', 12),
    buildShape('blob', 20),
  ];
  for (const model of MODELS) {
    for (const cells of structures) {
      const cfg = configFromCells(cells);
      for (const m of legalMoves(cfg, model)) {
        const next = applyMove(cfg, m);
        assert.equal(next.occ.size, cfg.occ.size, 'a move must not create or destroy modules');
        assert.equal(isConnected(next), true, `${model} move ${m.kind} disconnected the robot`);
      }
    }
  }
});

test('no legal move passes through an occupied cell', () => {
  for (const model of MODELS) {
    const cfg = configFromCells(buildShape('blob', 24));
    for (const m of legalMoves(cfg, model)) {
      for (const s of m.swept) {
        assert.equal(cfg.occ.has(key(s)), false, `${model} ${m.kind} sweeps through an occupied cell`);
      }
      // The destination must be the last swept cell — otherwise the animation and
      // the legality check are describing different motions.
      assert.equal(key(m.swept[m.swept.length - 1]), key(m.to));
    }
  }
});

test('a pivot move actually lands where its rotation puts it', () => {
  // The single most dangerous class of bug here: a move whose stated destination
  // and whose animated arc disagree. Recompute the endpoint from the pivot
  // geometry alone and require it to match `to`.
  const cfg = configFromCells(buildShape('blob', 24));
  let checked = 0;
  for (const m of legalMoves(cfg, 'pivoting')) {
    assert.ok(m.pivot, 'every pivoting-model move must carry pivot geometry');
    const pose = poseAt(m, 1, 1, IDENTITY_QUAT);
    for (let i = 0; i < 3; i++) {
      assert.ok(
        Math.abs(pose.position[i] - m.to[i]) < 1e-6,
        `${m.kind} ends at ${pose.position} but claims ${m.to}`,
      );
    }
    checked++;
  }
  assert.ok(checked > 0, 'expected at least one pivoting move to check');
});

test('a move is continuous: it starts at `from` and never jumps', () => {
  const cfg = configFromCells(buildShape('chair', 16));
  for (const model of MODELS) {
    for (const m of movesForModule(cfg, cellsOf(cfg)[0], model)) {
      const start = poseAt(m, 0, 1);
      for (let i = 0; i < 3; i++) assert.ok(Math.abs(start.position[i] - m.from[i]) < 1e-6);
      // Sample the arc and require every step to be a small one — a teleport would
      // show up here as a jump of a whole cell between adjacent samples.
      let prev = start.position;
      for (let t = 0.05; t <= 1.0001; t += 0.05) {
        const p = poseAt(m, t, 1).position;
        const step = Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
        assert.ok(step < 0.5, `discontinuous motion in ${m.kind}: step of ${step}`);
        prev = p;
      }
    }
  }
});

test('orientation composes across repeated pivots', () => {
  const cfg = configFromCells([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]]);
  const moves = legalMoves(cfg, 'pivoting');
  assert.ok(moves.length > 0);
  let q = IDENTITY_QUAT;
  const first = q;
  q = orientationAfter(moves[0], q);
  assert.notDeepEqual(q, first, 'a pivot must change the module orientation');
  // A quaternion stays unit-length under composition, or the mirror will skew geometry.
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  assert.ok(Math.abs(len - 1) < 1e-9, `orientation quaternion drifted to length ${len}`);
});

// ── planner ───────────────────────────────────────────────────────────────────

test('planner returns a plan whose every step re-verifies as legal', () => {
  for (const model of MODELS) {
    const start = configFromCells(buildShape('wall', 14));
    const target = buildShape('snake', 14);
    const res = planReconfiguration(start, target, { model, strategy: 'decompose' });
    const check = verifyPlan(start, res.moves, model);
    assert.equal(check.ok, true, `${model}: ${check.reason}`);
  }
});

test('a complete plan actually reaches the target shape', () => {
  const start = configFromCells(buildShape('wall', 12));
  const target = buildShape('tower', 12);
  const res = planReconfiguration(start, target, { model: 'sliding', strategy: 'decompose' });
  if (res.complete) {
    let cur = start;
    for (const m of res.moves) cur = applyMove(cur, m);
    assert.equal(diff(cur, res.goalCells).missing.length, 0, 'claimed complete but target cells are unfilled');
  } else {
    // An incomplete plan is an acceptable outcome — but it must report itself as
    // incomplete rather than quietly returning a wrong answer.
    assert.ok(res.remaining > 0, 'incomplete plan must report remaining cells');
  }
});

test('planner refuses a target with the wrong module count instead of guessing', () => {
  const start = configFromCells(buildShape('wall', 10));
  const res = planReconfiguration(start, buildShape('tower', 25), {});
  assert.equal(res.complete, false);
  assert.equal(res.moves.length, 0);
  assert.match(res.log.join(' '), /module count mismatch/);
});

test('an already-correct structure plans zero moves', () => {
  const cells = buildShape('table', 15);
  const res = planReconfiguration(configFromCells(cells), cells, {});
  assert.equal(res.complete, true);
  assert.equal(res.moves.length, 0);
});

test('A* finds a plan no longer than the fast strategy on a small case', () => {
  const start = configFromCells([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]]);
  const target: Cell[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0]];
  const fast = planReconfiguration(start, target, { model: 'sliding', strategy: 'decompose' });
  const opt = planReconfiguration(start, target, { model: 'sliding', strategy: 'astar', maxExpansions: 40000 });
  if (opt.complete && fast.complete) {
    assert.ok(opt.moves.length <= fast.moves.length,
      `A* returned ${opt.moves.length} moves, worse than decompose's ${fast.moves.length}`);
  }
});

test('the stability gate is actually enforced when switched on', () => {
  const start = configFromCells(buildShape('wall', 12));
  const res = planReconfiguration(start, buildShape('snake', 12), {
    model: 'sliding', strategy: 'decompose', requireStability: true,
  });
  let cur = start;
  for (const m of res.moves) {
    cur = applyMove(cur, m);
    assert.equal(checkStability(cur).ok, true, 'stability gate let an unstable state through');
  }
});

// ── stability ─────────────────────────────────────────────────────────────────

test('stability catches floating modules and tipping structures', () => {
  const floating = configFromCells([[0, 0, 0], [0, 1, 0], [5, 4, 0]]);
  assert.equal(checkStability(floating).grounded, false);

  // A long arm cantilevered off a single ground cell: the footprint is one cell
  // wide at x=0, but the centre of mass sits out at x~1.7.
  const tipping = configFromCells([[0, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [3, 1, 0], [4, 1, 0]]);
  const r = checkStability(tipping);
  assert.equal(r.grounded, true);
  assert.equal(r.balanced, false);

  const solid = configFromCells(buildShape('box', 27));
  assert.equal(checkStability(solid).ok, true);
});

// ── shapes ────────────────────────────────────────────────────────────────────

test('every library shape is connected, grounded, and hits its exact budget', () => {
  for (const def of SHAPES) {
    for (const n of [8, 20, 40]) {
      const cells = buildShape(def.id, n);
      assert.equal(cells.length, n, `${def.id} at n=${n} produced ${cells.length}`);
      assert.equal(isConnected(configFromCells(cells)), true, `${def.id} is disconnected at n=${n}`);
      assert.ok(cells.some((c) => c[1] === 0), `${def.id} does not touch the ground at n=${n}`);
    }
  }
});

// ── text ──────────────────────────────────────────────────────────────────────

test('text parsing picks the shape, the count, and the size hint', () => {
  assert.equal(parseText('become a car').shape, 'car');
  assert.equal(parseText('turn into a chair').shape, 'chair');
  assert.equal(parseText('build a tall tower with 30 modules').count, 30);
  assert.ok(parseText('a big table').scale > 1);
  assert.ok(parseText('a tiny table').scale < 1);
  assert.equal(parseText('xyzzy nonsense').shape, null);
});

test('textToShape honours the module budget it is given', () => {
  const r = textToShape('make a car', 22);
  assert.equal(r.cells.length, 22);
  assert.equal(isConnected(configFromCells(r.cells)), true);
});

// ── AI output validation ──────────────────────────────────────────────────────

test('AI cell validation repairs bad model output instead of trusting it', () => {
  // Floats, duplicates, junk entries, and a floating island — all things models
  // actually emit. The result must still be a legal structure of the right size.
  const messy = [
    [0, 0, 0], [1, 0, 0], [1, 0, 0], [2.4, 0, 0],
    ['x', 1, 2], [0, 0], null,
    [40, 40, 40],
  ];
  const v = validateCells(messy, 6);
  assert.equal(v.cells.length, 6);
  assert.equal(isConnected(configFromCells(v.cells)), true);
  assert.equal(v.repaired, true);
  assert.ok(v.cells.some((c) => c[1] === 0), 'validated shape must rest on the ground');
});

test('AI validation rejects an unusable reply rather than inventing one', () => {
  assert.equal(validateCells('not an array', 5).cells.length, 0);
  assert.equal(validateCells([], 5).cells.length, 0);
});

// ── strokes ───────────────────────────────────────────────────────────────────

test('a voxelised stroke is face-connected, never diagonal', () => {
  // A diagonal line is the case a naive Bresenham gets wrong: it would step
  // corner to corner, producing cells that do not actually mate.
  const cells = segmentCells([0, 0, 0], [5, 5, 0]);
  assert.equal(isConnected(configFromCells(cells)), true);
  for (let i = 1; i < cells.length; i++) {
    const d = Math.abs(cells[i][0] - cells[i - 1][0])
            + Math.abs(cells[i][1] - cells[i - 1][1])
            + Math.abs(cells[i][2] - cells[i - 1][2]);
    assert.equal(d, 1, `stroke step ${i} moved ${d} cells at once`);
  }
});

test('an unbranched stroke has no junctions at all', () => {
  const r = buildFromStrokes([[[0, 0, 0], [6, 0, 0], [6, 4, 0], [0, 4, 0]]], { thickness: 0 });
  assert.equal(r.junctions, 0, 'a single open stroke must not branch');
  assert.equal(isConnected(configFromCells(r.cells)), true);
});

test('thickening keeps the structure connected', () => {
  const r = buildFromStrokes([[[0, 0, 0], [6, 3, 0]]], { thickness: 1 });
  assert.equal(isConnected(configFromCells(r.cells)), true);
  assert.ok(r.cells.length > 7, 'thickening should add modules');
});

test('groundCenter puts a shape on the floor', () => {
  const cells = groundCenter([[3, 5, 2], [3, 6, 2], [4, 5, 2]]);
  assert.equal(Math.min(...cells.map((c) => c[1])), 0);
});
