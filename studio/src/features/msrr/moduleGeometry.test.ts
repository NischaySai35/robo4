/**
 * moduleGeometry.test.ts — the drawn module must be the planned module.
 *
 * The load-bearing test is the first one. Placement is expressed twice: as
 * integer-cell rotations in fitModules (what the planner reasons with) and as
 * quaternions here (what gets drawn). Nothing forces those two to agree, and if
 * they drift the viewport shows a robot in a configuration the planner never
 * produced — which is exactly the class of bug where the picture lies about the
 * plan.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { type Cell, key } from './../../robotics/msrr/lattice';
import type { Vec3 } from './../../robotics/msrr/modulink';
import { rotationTo, fitModules } from './../../robotics/msrr/fitModules';
import { MODULE_CHAIN_LENGTH } from './../../robotics/msrr/modulink';
import { MODULINK_CUBE_SIZE } from './../../robotics/msrr/occupancy';
import { buildShape } from './../../robotics/msrr/shapes';
import { oneStepMoves } from './../../robotics/msrr/transform';
import { MAX_SNAP_ERROR } from './../../robotics/msrr/chainMoves';
import { baseQuatFor, moduleGeometry, buildGeometry, tweenGeometry } from './moduleGeometry';

const AXES: Cell[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

/** Rotate a vector by a quaternion — the same operation three.js applies when drawing. */
function rotate(q: readonly number[], v: Cell): [number, number, number] {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

test('render quaternions agree with the planner lattice rotations, on every axis', () => {
  for (const axis of AXES) {
    const q = baseQuatFor(axis);
    const rot = rotationTo(axis);

    // Both must carry the module's local +Z onto the same world direction...
    const drawnZ = rotate(q, [0, 0, 1]).map(Math.round) as Cell;
    assert.equal(key(drawnZ), key(axis), `quaternion for ${key(axis)} does not send +Z there`);
    assert.equal(key(rot([0, 0, 1])), key(axis), `matrix for ${key(axis)} does not send +Z there`);

    // ...and agree on every other basis vector too, or the module is drawn
    // rolled about its own axis relative to where the planner put it.
    for (const basis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Cell[]) {
      const byQuat = rotate(q, basis).map((v) => Math.round(v)) as Cell;
      const byMatrix = rot(basis);
      assert.equal(key(byQuat), key(byMatrix),
        `for ${key(axis)}: quaternion sends ${key(basis)} to ${key(byQuat)}, matrix to ${key(byMatrix)}`);
    }
  }
});

test('a straight module is drawn exactly four cubes long', () => {
  // The scale reconciliation between physical module units and cube units. If
  // this is off, every module is drawn the wrong size and nothing lines up.
  const build = fitModules(Array.from({ length: 13 }, (_, i) => [i, 0, 0] as Cell));
  const straight = build.modules.find((m) => m.reach === 4);
  assert.ok(straight, 'a 13-cube corridor should contain a straight module');

  const g = moduleGeometry(straight);
  const first = g.rods[0].from;
  const last = g.rods[g.rods.length - 1].to;
  const span = Math.hypot(last[0] - first[0], last[1] - first[1], last[2] - first[2]);

  // Rod run is the chain minus the connector gaps at each end, so compare
  // against the model's own numbers rather than a hard-coded 4.
  const expected = (MODULE_CHAIN_LENGTH / MODULINK_CUBE_SIZE) - (2 * 0.02 / MODULINK_CUBE_SIZE);
  assert.ok(Math.abs(span - expected) < 0.05,
    `drawn rod run spans ${span} cubes, expected about ${expected}`);
});

test('every module is drawn anchored where Build placed it — at its REAL position, not its cube', () => {
  const build = fitModules(buildShape('snake', 20));
  for (const m of build.modules) {
    const g = moduleGeometry(m);
    const a = g.connectors.find((c) => c.isEnd);
    assert.ok(a, `${m.id} has no end connector`);

    // Compared against anchorPos, NOT anchorCell. Those are the same thing for
    // an end-to-end weld, and deliberately are not for a side weld: a side
    // connector rides ~0.63 cube units off the spine axis, so a module welded
    // to one is genuinely anchored between lattice points. This test used to
    // assert the cube and so quietly demanded the wrong thing — it would have
    // passed only while side welds were being drawn detached from the dome
    // they are locked to.
    const d = Math.hypot(
      a.at[0] - m.anchorPos[0], a.at[1] - m.anchorPos[1], a.at[2] - m.anchorPos[2],
    );
    assert.ok(d < 0.01, `${m.id} draws its anchor ${d} cubes from where Build put it`);
  }
});

test('a module is drawn as a real six-rod chain, not a box', () => {
  const build = fitModules(buildShape('snake', 20));
  const g = moduleGeometry(build.modules[0]);

  assert.equal(g.rods.length, 6, 'a MODULINK module has exactly six rods');
  assert.equal(g.joints.length, 6, 'one joint knuckle per rod');
  assert.equal(g.connectors.length, 6, 'six lock faces: A, B and four sides');
  assert.equal(g.connectors.filter((c) => c.isEnd).length, 2, 'exactly two chain ends');

  // Rods must be contiguous: each one starts where the last ended, plus the
  // inter-segment gap. A break here means the chain is drawn in pieces.
  for (let i = 1; i < g.rods.length; i++) {
    const prev = g.rods[i - 1].to;
    const next = g.rods[i].from;
    const gap = Math.hypot(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]);
    assert.ok(gap < 0.1, `rods ${i - 1} and ${i} are ${gap} cubes apart — the chain is broken`);
  }

  // Every rod has real length; a zero-length rod would render as a degenerate sliver.
  for (const rod of g.rods) {
    const len = Math.hypot(rod.to[0] - rod.from[0], rod.to[1] - rod.from[1], rod.to[2] - rod.from[2]);
    assert.ok(len > 0.05, `a rod has length ${len}`);
  }
});

test('exactly one rod is the big rod: LONGER than the others, and no thicker', () => {
  const g = moduleGeometry(fitModules(buildShape('snake', 20)).modules[0]);
  const big = g.rods.filter((r) => r.isBigRod);
  assert.equal(big.length, 1, 'the spine is a single rod');

  // Every rod is the same thickness. The spec gives ONE rod radius (0.2) and
  // distinguishes the spine by BIG_ROD_LENGTH_SCALE alone. An earlier revision
  // drew the spine fatter as a readability tweak and this test enshrined it;
  // that invented dimension is also what let the dome radii drift off-spec and
  // start floating beside the rod, so the drawn sizes now come from the spec
  // and nothing else.
  for (const r of g.rods) {
    assert.ok(Math.abs(big[0].radius - r.radius) < 1e-9,
      'all rods share one spec radius — the spine is longer, not thicker');
  }

  // And it is genuinely longer, which is what makes it the spine.
  const bigLen = Math.hypot(...([0, 1, 2].map((i) => big[0].to[i] - big[0].from[i]) as [number, number, number]));
  for (const r of g.rods) {
    if (r.isBigRod) continue;
    const len = Math.hypot(...([0, 1, 2].map((i) => r.to[i] - r.from[i]) as [number, number, number]));
    assert.ok(bigLen > len, 'the big rod must be the longest');
  }
});

test('a tweened module keeps every rod rigid all the way through a move', () => {
  // The property the tween exists to preserve. Interpolating rod endpoints
  // directly would stretch and shrink the rods mid-move, which is the one thing
  // real hardware cannot do — so the chain is rebuilt from the anchor at true
  // lengths instead. If that ever regresses, playback shows a module made of
  // elastic.
  const build = fitModules(buildShape('snake', 20));
  const a = moduleGeometry(build.modules[0]);
  const b = moduleGeometry(build.modules[1]);

  for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const mid = tweenGeometry(a, b, t);
    assert.equal(mid.rods.length, a.rods.length, `t=${t}: rod count changed`);

    mid.rods.forEach((rod, i) => {
      const len = Math.hypot(
        rod.to[0] - rod.from[0], rod.to[1] - rod.from[1], rod.to[2] - rod.from[2],
      );
      // Rods may differ in length BETWEEN the two configurations only if the
      // module's own geometry differs; within a tween each stays at its own
      // interpolated length, so compare against that rather than a constant.
      const want = a.rodLengths[i] + (b.rodLengths[i] - a.rodLengths[i]) * (t * t * (3 - 2 * t));
      assert.ok(Math.abs(len - want) < 1e-6,
        `t=${t}: rod ${i} is ${len} long, expected ${want} — the tween stretched it`);
    });
  }
});

test('a tweened chain holds its inter-rod gaps, neither closing nor opening them', () => {
  // The rods are NOT one continuous line — they are separated by SEGMENT_GAP,
  // and that spacing is as rigid as the rods themselves. An earlier version of
  // the polyline skipped the gaps entirely, which made the rebuilt chain come
  // out shorter than the real module.
  const build = fitModules(buildShape('snake', 20));
  const a = moduleGeometry(build.modules[0]);
  const b = moduleGeometry(build.modules[2]);

  const trueGap = Math.hypot(
    a.rods[1].from[0] - a.rods[0].to[0],
    a.rods[1].from[1] - a.rods[0].to[1],
    a.rods[1].from[2] - a.rods[0].to[2],
  );
  assert.ok(trueGap > 0, 'the model has real gaps between rods; the test premise depends on it');

  for (const t of [0.2, 0.5, 0.8]) {
    const mid = tweenGeometry(a, b, t);
    for (let i = 1; i < mid.rods.length; i++) {
      const prev = mid.rods[i - 1].to;
      const next = mid.rods[i].from;
      const gap = Math.hypot(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]);
      assert.ok(Math.abs(gap - trueGap) < 1e-6,
        `t=${t}: gap between rods ${i - 1} and ${i} is ${gap}, should stay ${trueGap}`);
    }
  }
});

test('the tween starts and ends on the real configurations, not near them', () => {
  // Both endpoints are planner-verified poses. The path between them is a visual
  // approximation, but the ends must be exact or playback would drift away from
  // what the planner actually certified.
  const build = fitModules(buildShape('chair', 24));
  const a = moduleGeometry(build.modules[0]);
  const b = moduleGeometry(build.modules[1]);

  const atStart = tweenGeometry(a, b, 0);
  a.points.forEach((p, i) => {
    for (let k = 0; k < 3; k++) {
      assert.ok(Math.abs(atStart.points[i][k] - p[k]) < 1e-9, 't=0 must be exactly the start pose');
    }
  });

  const atEnd = tweenGeometry(a, b, 1);
  const endTip = atEnd.points[atEnd.points.length - 1];
  const wantTip = b.points[b.points.length - 1];
  const drift = Math.hypot(
    endTip[0] - wantTip[0], endTip[1] - wantTip[1], endTip[2] - wantTip[2],
  );
  assert.ok(drift < 1e-6, `t=1 tip is ${drift} from the real arrival pose`);
});

test('the anchor is the fixed point of a move — it holds on the whole way', () => {
  // The gait's safety property, visible: the module keeps one end welded while
  // the other travels. If the anchor drifted during a tween the animation would
  // be showing a module that let go of everything.
  const build = fitModules(buildShape('snake', 20));
  const a = moduleGeometry(build.modules[0]);
  const b = moduleGeometry(build.modules[1]);

  for (const t of [0, 0.3, 0.6, 1]) {
    const mid = tweenGeometry(a, b, t);
    // points[0] is the anchor; the tween walks the chain out from it, so it can
    // only move as far as the interpolation of the two anchors allows.
    const e = t * t * (3 - 2 * t);
    for (let k = 0; k < 3; k++) {
      const want = a.points[0][k] + (b.points[0][k] - a.points[0][k]) * e;
      assert.ok(Math.abs(mid.points[0][k] - want) < 1e-9, `t=${t}: anchor drifted off its path`);
    }
  }
});

test('tweening a module onto its own far end keeps the shared connector pinned', () => {
  // The bug this guards: when a module moves a SECOND time, the configuration
  // it is moving into is anchored at the connector it grabbed last time —
  // which is the FAR end of where it is now, not the same anchor. If
  // tweenGeometry blindly pairs a.points[0] with b.points[0] it interpolates
  // between two physically different points and the "anchor" drifts through
  // empty space — reported as the module reversing in thin air, locked to
  // nothing.
  //
  // Constructed directly rather than mined out of a real plan. This is a
  // RENDERING unit test, and sourcing its inputs from the planner made it
  // hostage to planner constraints that have since tightened to the point
  // where no library shape offers two consecutive moves at all — the test
  // would then fail for a reason that has nothing to do with what it checks.
  // Anchoring b at a's real B position reproduces exactly the geometry the
  // canvas feeds tweenGeometry, deterministically and forever.
  const build = fitModules(buildShape('snake', 20));
  const m = build.modules[0];
  const a = moduleGeometry(m);

  // b: the same module, positioned so its chain STARTS exactly where a's ends.
  // points[0] is the first rod's start, which sits a SEGMENT_GAP along from the
  // anchor rather than on it, so the anchor is offset by that same amount
  // rather than placed on the far end directly.
  const farEnd = a.points[a.points.length - 1];
  const leadIn: Vec3 = [
    a.points[0][0] - m.anchorPos[0],
    a.points[0][1] - m.anchorPos[1],
    a.points[0][2] - m.anchorPos[2],
  ];
  const bAnchor: Vec3 = [
    farEnd[0] - leadIn[0], farEnd[1] - leadIn[1], farEnd[2] - leadIn[2],
  ];
  const b = moduleGeometry({
    ...m,
    anchorPos: bAnchor,
    anchorCell: [Math.round(bAnchor[0]), Math.round(bAnchor[1]), Math.round(bAnchor[2])] as Cell,
  });

  const shared = b.points[0];
  const sharedDist = Math.hypot(
    a.points[a.points.length - 1][0] - shared[0],
    a.points[a.points.length - 1][1] - shared[1],
    a.points[a.points.length - 1][2] - shared[2],
  );
  assert.ok(sharedDist < 1e-9, "test setup: b must be anchored exactly at a's far end");

  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const mid = tweenGeometry(a, b, t, { sharedIsFarEndOfA: true });
    // Whichever tip is the shared, welded connector must stay put for the
    // whole tween — a weld does not travel mid-step.
    const tip0 = mid.points[0];
    const tipN = mid.points[mid.points.length - 1];
    const d0 = Math.hypot(tip0[0] - shared[0], tip0[1] - shared[1], tip0[2] - shared[2]);
    const dN = Math.hypot(tipN[0] - shared[0], tipN[1] - shared[1], tipN[2] - shared[2]);
    assert.ok(Math.min(d0, dN) < 1e-6,
      `t=${t}: neither tip sits on the shared connector — it drifted`);
  }

  // And the flag genuinely matters: without it the same tween must misbehave,
  // or this test is passing for a reason unrelated to the bug.
  let drifted = false;
  for (const t of [0.25, 0.5, 0.75]) {
    const mid = tweenGeometry(a, b, t);
    const d0 = Math.hypot(
      mid.points[0][0] - shared[0], mid.points[0][1] - shared[1], mid.points[0][2] - shared[2],
    );
    if (d0 > 1e-6) drifted = true;
  }
  assert.ok(drifted, 'test setup: the unflagged tween should exhibit the drift this guards against');
});

test('buildGeometry keeps assembly order so modules can appear one at a time', () => {
  const build = fitModules(buildShape('chair', 24));
  const geo = buildGeometry(build.modules);
  assert.equal(geo.length, build.modules.length);
  geo.forEach((g, i) => assert.equal(g.moduleId, build.modules[i].id));
});
