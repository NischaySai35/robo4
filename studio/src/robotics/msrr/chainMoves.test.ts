/**
 * chainMoves.test.ts — the mod2 move set.
 *
 * The load-bearing test here is the first one: reachTable is built by a
 * hand-inlined, allocation-free FK plus two symmetry shortcuts, none of which is
 * obviously correct by reading. Every entry it produces is re-derived with the
 * plain reference kinematics from modulink.ts and required to agree. If the fast
 * path or either symmetry argument is wrong, that test fails — and every plan
 * built on this table would otherwise have contained moves the arm cannot make.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  type ConnectorEnd,
  ZERO_ANGLES, endPose, forwardOf, IDENTITY, MODULE_CHAIN_LENGTH, FLIP_X_180,
} from './modulink';
import { MODULINK_CUBE_SIZE } from './occupancy';
import {
  type OpenConnector, type MoveContext,
  reachTable, reachTargets, reachSummary, posesReaching, legalChainMoves,
  describeChainMove, invalidateReachTable,
  TWIST_STEPS, MAX_SNAP_ERROR, MIN_AXIS_ALIGNMENT,
} from './chainMoves';
import { key, manhattan, type Cell } from './lattice';

// ── the fast path must equal the reference path ──────────────────────────────

test('every A-anchored entry re-derives from the reference kinematics', () => {
  const table = reachTable().filter((p) => p.anchorEnd === 'A');
  assert.ok(table.length > 0, 'the A-anchored table must not be empty');

  for (const p of table) {
    // Reference FK: the plain, readable implementation in modulink.ts.
    const e = endPose(p.angles, IDENTITY);
    const raw = [
      e.position[0] / MODULINK_CUBE_SIZE,
      e.position[1] / MODULINK_CUBE_SIZE,
      e.position[2] / MODULINK_CUBE_SIZE,
    ];
    const err = Math.hypot(
      raw[0] - p.endOffset[0], raw[1] - p.endOffset[1], raw[2] - p.endOffset[2],
    );
    assert.ok(
      Math.abs(err - p.snapError) < 1e-9,
      `${p.id}: stored snap ${p.snapError} but reference FK gives ${err}`,
    );
    assert.ok(err <= MAX_SNAP_ERROR, `${p.id}: snap error ${err} exceeds the tolerance`);

    // And the stored facing must be the reference forward direction's axis.
    const f = forwardOf(e);
    const dot = f[0] * p.endDir[0] + f[1] * p.endDir[1] + f[2] * p.endDir[2];
    const len = Math.hypot(f[0], f[1], f[2]) || 1;
    assert.ok(
      dot / len >= MIN_AXIS_ALIGNMENT,
      `${p.id}: stored facing ${p.endDir} does not match reference forward ${f}`,
    );
  }
});

test('every B-anchored (mirrored) entry re-derives from an independently inverted reference pose', () => {
  // Deliberately re-implemented from scratch here rather than reusing chainMoves'
  // own invertPose/connectorPoses call sequence — the point is to catch a mistake
  // in that sequence, not to restate it.
  const table = reachTable().filter((p) => p.anchorEnd === 'B');
  assert.ok(table.length > 0, 'the mirrored table must not be empty, or the mobility fix did nothing');

  for (const p of table) {
    const tab = endPose(p.angles, IDENTITY); // B's pose in A's frame
    // Manual rigid inverse: q' = conjugate(q), p' = rotate(q', -pos).
    const q = tab.quaternion;
    const qInv: [number, number, number, number] = [-q[0], -q[1], -q[2], q[3]];
    const rotate = (qq: [number, number, number, number], v: [number, number, number]) => {
      const [x, y, z, w] = qq;
      const tx = 2 * (y * v[2] - z * v[1]);
      const ty = 2 * (z * v[0] - x * v[2]);
      const tz = 2 * (x * v[1] - y * v[0]);
      return [
        v[0] + w * tx + (y * tz - z * ty),
        v[1] + w * ty + (z * tx - x * tz),
        v[2] + w * tz + (x * ty - y * tx),
      ] as [number, number, number];
    };
    const posInv = rotate(qInv, [-tab.position[0], -tab.position[1], -tab.position[2]]);

    // A's position expressed in B's frame, independently computed.
    const raw = [posInv[0] / MODULINK_CUBE_SIZE, posInv[1] / MODULINK_CUBE_SIZE, posInv[2] / MODULINK_CUBE_SIZE];
    const err = Math.hypot(raw[0] - p.endOffset[0], raw[1] - p.endOffset[1], raw[2] - p.endOffset[2]);
    assert.ok(err <= MAX_SNAP_ERROR + 1e-6,
      `${p.id}: independently-derived snap error ${err} exceeds tolerance`);

    // A's own outward normal (fixed, angle-independent) rotated into B's frame.
    const fwd = forwardOf(FLIP_X_180);
    const aNormalLocal: [number, number, number] = [-fwd[0], -fwd[1], -fwd[2]];
    const rotatedNormal = rotate(qInv, aNormalLocal);
    const dot = rotatedNormal[0] * p.endDir[0] + rotatedNormal[1] * p.endDir[1] + rotatedNormal[2] * p.endDir[2];
    const len = Math.hypot(...rotatedNormal) || 1;
    assert.ok(dot / len >= MIN_AXIS_ALIGNMENT - 1e-6,
      `${p.id}: independently-derived facing does not match stored endDir`);
  }
});

test('the last twist cannot move the free end — which is why it is dropped', () => {
  // t5 rotates rod 5 about its own axis and rod 5 is a twist rod, so the
  // translation after it runs along the same axis. Dropping t5 from the
  // enumeration is a 4x saving that costs nothing; this is that claim.
  const base = endPose(ZERO_ANGLES, IDENTITY);
  for (const t5 of TWIST_STEPS) {
    const e = endPose([0, 0, 0, 0, 0, t5], IDENTITY);
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(e.position[i] - base.position[i]) < 1e-9,
        `t5=${t5} moved the endpoint, so it cannot be dropped from the enumeration`);
    }
    const f = forwardOf(e), fb = forwardOf(base);
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(f[i] - fb[i]) < 1e-9, `t5=${t5} changed the end facing`);
    }
  }
});

test('the first twist is exactly a quarter turn about world Z', () => {
  // reachTable derives all four t0 settings from the t0 = 0 solve by axis swaps,
  // relying on Rx(pi)*Rz(a) == Rz(-a)*Rx(pi). If that is wrong the whole table is.
  const bends: [number, number, number] = [0.4, -0.7, 0.9];
  const base = endPose([0, bends[0], bends[1], 0, bends[2], 0], IDENTITY);
  const turns: ((v: [number, number, number]) => [number, number, number])[] = [
    (v) => v,
    (v) => [v[1], -v[0], v[2]],
    (v) => [-v[0], -v[1], v[2]],
    (v) => [-v[1], v[0], v[2]],
  ];
  for (let ti = 1; ti < TWIST_STEPS.length; ti++) {
    const actual = endPose([TWIST_STEPS[ti], bends[0], bends[1], 0, bends[2], 0], IDENTITY);
    const predicted = turns[ti](base.position as [number, number, number]);
    for (let i = 0; i < 3; i++) {
      assert.ok(
        Math.abs(actual.position[i] - predicted[i]) < 1e-9,
        `t0 step ${ti}: predicted ${predicted} but FK gives ${actual.position}`,
      );
    }
  }
});

// ── table shape ───────────────────────────────────────────────────────────────

test('the table covers short folds as well as long reaches', () => {
  const s = reachSummary();
  assert.ok(s.reachRange[0] <= 2, `shortest reach is ${s.reachRange[0]}, expected a tight fold to exist`);
  assert.ok(s.reachRange[1] >= 4, `longest reach is ${s.reachRange[1]}, expected a straight module to reach 4+`);
  assert.ok(s.targetCount > 20, `only ${s.targetCount} landing spots — the move set is too sparse to plan with`);
  assert.ok(s.worstSnap <= MAX_SNAP_ERROR);
});

test('a straight module reaches four cubes dead ahead', () => {
  const straightish = posesReaching([0, 0, -4], [0, 0, -1]);
  assert.ok(straightish.length > 0, 'the straight-ahead landing must be in the table');
  // And that matches the module's own physical length.
  assert.ok(Math.abs(MODULE_CHAIN_LENGTH / MODULINK_CUBE_SIZE - 4) < 1e-9);
});

test('every landing is a real lattice spot with an axis-aligned facing', () => {
  for (const p of reachTable()) {
    for (const v of p.endOffset) assert.ok(Number.isInteger(v), `${p.id} endOffset is not integral`);
    const mag = Math.abs(p.endDir[0]) + Math.abs(p.endDir[1]) + Math.abs(p.endDir[2]);
    assert.equal(mag, 1, `${p.id} endDir ${p.endDir} is not a unit axis`);
    assert.equal(p.reach, manhattan([0, 0, 0], p.endOffset));
    assert.notEqual(key(p.endOffset), key([0, 0, 0]), 'a pose that reaches nowhere is not a move');
  }
});

test('a pose body always includes its own anchor cube', () => {
  for (const p of reachTable()) {
    assert.ok(p.cells.some((c) => key(c) === key([0, 0, 0])),
      `${p.id} body does not include the anchor cube`);
    assert.ok(p.cells.length >= 1);
  }
});

test('reachTargets collapses equivalent poses without losing any', () => {
  const table = reachTable();
  const targets = reachTargets();
  assert.ok(targets.length <= table.length);
  const totalPoses = targets.reduce((n, t) => n + t.poseIds.length, 0);
  assert.equal(totalPoses, table.length, 'every pose must appear under exactly one landing spot');
  // Spot keys must be unique.
  const seen = new Set(targets.map((t) => `${key(t.offset)}|${key(t.dir)}`));
  assert.equal(seen.size, targets.length);
});

test('the cached table is stable across calls and rebuilds identically', () => {
  const a = reachTable();
  const b = reachTable();
  assert.equal(a, b, 'repeated calls must hit the cache, not rebuild');
  invalidateReachTable();
  const c = reachTable();
  assert.equal(c.length, a.length, 'a rebuild must produce the same table');
});

// ── move legality ─────────────────────────────────────────────────────────────

const openAt = (
  moduleId: string, end: ConnectorEnd, cell: Cell, dir: Cell, usedSides: ConnectorEnd[] = [],
): OpenConnector => ({ moduleId, end, cell, dir, usedSides });

/** A context with one grabbable connector placed exactly where a pose can reach. */
function contextReaching(end: ConnectorEnd, usedSides: ConnectorEnd[] = []): {
  ctx: MoveContext; target: OpenConnector;
} {
  const spot = reachTargets()[0];
  // The target must FACE BACK at us for the weld to seat.
  const target = openAt('other', end, spot.offset, [-spot.dir[0], -spot.dir[1], -spot.dir[2]], usedSides);
  return { ctx: { occupied: new Set<string>(), open: [target] }, target };
}

test('a free end can grab another module end, and another module side', () => {
  for (const end of ['A', 'UP'] as ConnectorEnd[]) {
    const { ctx } = contextReaching(end);
    const moves = legalChainMoves('me', 'A', 'B', [0, 0, 0], ctx);
    assert.ok(moves.length > 0, `a free end should be able to grab a ${end} connector`);
    assert.equal(moves[0].targetEnd, end);
  }
});

test('a free SIDE can never grab another side', () => {
  const { ctx } = contextReaching('UP');
  // moveEnd is itself a side connector here, so this is a side-to-side attempt.
  const moves = legalChainMoves('me', 'A', 'DOWN', [0, 0, 0], ctx);
  assert.equal(moves.length, 0, 'side-to-side welds must never be generated');
});

test('a module cannot weld to itself', () => {
  const spot = reachTargets()[0];
  const target = openAt('me', 'UP', spot.offset, [-spot.dir[0], -spot.dir[1], -spot.dir[2]]);
  const moves = legalChainMoves('me', 'A', 'B', [0, 0, 0], { occupied: new Set(), open: [target] });
  assert.equal(moves.length, 0);
});

test('a side already flanked by an adjacent weld cannot be grabbed', () => {
  // UP is free, but RIGHT is welded — and adjacent side domes interpenetrate.
  const { ctx } = contextReaching('UP', ['RIGHT']);
  assert.equal(legalChainMoves('me', 'A', 'B', [0, 0, 0], ctx).length, 0);

  // DOWN welded is fine: it is the opposite face, so UP is still free.
  const ok = contextReaching('UP', ['DOWN']);
  assert.ok(legalChainMoves('me', 'A', 'B', [0, 0, 0], ok.ctx).length > 0);
});

test('a body route blocked by an existing module is rejected', () => {
  const { ctx, target } = contextReaching('A');
  const free = legalChainMoves('me', 'A', 'B', [0, 0, 0], ctx);
  assert.ok(free.length > 0, 'sanity: the move is available when nothing blocks it');

  // Occupy every cube the move would pass through, except the two it is allowed
  // to share (its own anchor and the connector it is grabbing).
  const blocked = new Set<string>();
  for (const c of free[0].cells) {
    if (key(c) === key([0, 0, 0]) || key(c) === key(target.cell)) continue;
    blocked.add(key(c));
  }
  if (blocked.size === 0) return; // nothing to block on this particular route
  const moves = legalChainMoves('me', 'A', 'B', [0, 0, 0], { occupied: blocked, open: ctx.open });
  assert.equal(moves.length, 0, 'a move whose body passes through an occupied cube must be rejected');
});

test('a move reads back as a hand-over-hand step', () => {
  const { ctx } = contextReaching('UP');
  const m = legalChainMoves('me', 'A', 'B', [0, 0, 0], ctx)[0];
  const text = describeChainMove(m, 0);
  assert.match(text, /hold A/);
  assert.match(text, /swing B onto other\.UP/);
  assert.match(text, /then release B/);
});
