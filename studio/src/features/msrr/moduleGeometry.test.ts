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
import { MODULINK_CUBE_SIZE, CUBES_PER_STRAIGHT_MODULE } from './../../robotics/msrr/occupancy';
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

test('a straight module is drawn exactly one module length of cubes long', () => {
  // The scale reconciliation between physical module units and cube units. If
  // this is off, every module is drawn the wrong size and nothing lines up.
  const N = CUBES_PER_STRAIGHT_MODULE;
  const build = fitModules(Array.from({ length: 3 * N + 1 }, (_, i) => [i, 0, 0] as Cell));
  const straight = build.modules.find((m) => m.reach === N);
  assert.ok(straight, 'a 13-cube corridor should contain a straight module');

  const g = moduleGeometry(straight);
  const first = g.rods[0].from;
  const last = g.rods[g.rods.length - 1].to;
  const span = Math.hypot(last[0] - first[0], last[1] - first[1], last[2] - first[2]);

  // The drawn run now starts at connector A itself (the end lock is segment 0)
  // and finishes at connector B, so it is the whole chain: exactly four cubes.
  const expected = MODULE_CHAIN_LENGTH / MODULINK_CUBE_SIZE;
  assert.ok(Math.abs(expected - CUBES_PER_STRAIGHT_MODULE) < 1e-9);
  assert.ok(Math.abs(span - expected) < 1e-6,
    `drawn rod run spans ${span} cubes, expected ${expected}`);
});

test('every module is drawn anchored where Build placed it — at its REAL position, not its cube', () => {
  const build = fitModules(buildShape('snake', 40));
  for (const m of build.modules) {
    const g = moduleGeometry(m);
    // The module is held by whichever end sits at its anchor: physical A for most
    // poses, physical B for the mirrored ones.
    const a = g.connectors.filter((c) => c.isEnd).sort((x, y) =>
      Math.hypot(x.at[0] - m.anchorPos[0], x.at[1] - m.anchorPos[1], x.at[2] - m.anchorPos[2])
      - Math.hypot(y.at[0] - m.anchorPos[0], y.at[1] - m.anchorPos[1], y.at[2] - m.anchorPos[2]))[0];
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

test('a module is drawn as a real 7-joint chain, not a box', () => {
  const build = fitModules(buildShape('snake', 40));
  const g = moduleGeometry(build.modules[0]);

  assert.equal(g.rods.length, 8, 'the end lock plus one segment per joint (T1 B1 B2 T2 B3 B4 T3)');
  assert.equal(g.joints.length, 7, 'one joint knuckle per joint');
  assert.equal(g.points.length, 9, 'connector A, seven joints, connector B');
  assert.equal(g.connectors.length, 6, 'six connectors: A, B and four side receivers');
  assert.equal(g.connectors.filter((c) => c.isEnd).length, 2, 'exactly two chain ends');

  // Segments must be contiguous: each one starts exactly where the last ended
  // (the joints touch). A break here means the chain is drawn in pieces.
  for (let i = 1; i < g.rods.length; i++) {
    const prev = g.rods[i - 1].to;
    const next = g.rods[i].from;
    const gap = Math.hypot(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]);
    assert.ok(gap < 1e-9, `segments ${i - 1} and ${i} are ${gap} cubes apart — the chain is broken`);
  }

  // Every segment has real length; a zero-length one would render as a degenerate sliver.
  for (const rod of g.rods) {
    const len = Math.hypot(rod.to[0] - rod.from[0], rod.to[1] - rod.from[1], rod.to[2] - rod.from[2]);
    assert.ok(len > 0.02, `a segment has length ${len}`);
  }

  // Each knuckle sits where its segment starts.
  g.joints.forEach((j, i) => {
    const at = g.rods[i + 1].from;
    assert.ok(Math.hypot(j.at[0] - at[0], j.at[1] - at[1], j.at[2] - at[2]) < 1e-9, `joint ${i} is off its segment`);
  });
});

test('exactly two segments are spines: the LONGEST ones, and no thicker', () => {
  const g = moduleGeometry(fitModules(buildShape('snake', 40)).modules[0]);
  const spines = g.rods.filter((r) => r.isSpine);
  assert.equal(spines.length, 2, 'a module has two spines (B1-B2 and B3-B4)');

  // Every segment is the same thickness. The sizes come from the spec and
  // nothing else - an invented dimension is what once let the connector pads
  // drift off-spec and float beside the body.
  for (const r of g.rods) {
    assert.ok(Math.abs(spines[0].radius - r.radius) < 1e-9,
      'all segments share one radius - a spine is longer, not thicker');
  }

  // And they are genuinely the longest, which is what makes them spines.
  const len = (r: { from: Vec3; to: Vec3 }) =>
    Math.hypot(r.to[0] - r.from[0], r.to[1] - r.from[1], r.to[2] - r.from[2]);
  for (const r of g.rods) {
    if (r.isSpine) continue;
    for (const sp of spines) assert.ok(len(sp) > len(r), 'a spine must be longer than every other segment');
  }
  assert.ok(Math.abs(len(spines[0]) - len(spines[1])) < 1e-3, 'both spines are the same part');
});

test('a tweened module keeps every rod rigid all the way through a move', () => {
  // The property the tween exists to preserve. Interpolating rod endpoints
  // directly would stretch and shrink the rods mid-move, which is the one thing
  // real hardware cannot do — so the chain is rebuilt from the anchor at true
  // lengths instead. If that ever regresses, playback shows a module made of
  // elastic.
  const build = fitModules(buildShape('snake', 40));
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

test('a tweened chain stays contiguous: the joints neither open nor overlap', () => {
  // The segments meet at the joints with no gap (the old module had a gap between
  // rods and this test pinned that spacing; the try8 module has none). A tween
  // that let a joint open would show a module in two pieces mid-move.
  const build = fitModules(buildShape('snake', 40));
  const a = moduleGeometry(build.modules[0]);
  const b = moduleGeometry(build.modules[2]);

  for (const t of [0.2, 0.5, 0.8]) {
    const mid = tweenGeometry(a, b, t);
    for (let i = 1; i < mid.rods.length; i++) {
      const prev = mid.rods[i - 1].to;
      const next = mid.rods[i].from;
      const gap = Math.hypot(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]);
      assert.ok(gap < 1e-9, `t=${t}: segments ${i - 1} and ${i} are ${gap} apart`);
    }
    mid.joints.forEach((j, i) => {
      const at = mid.rods[i + 1].from;
      assert.ok(Math.hypot(j.at[0] - at[0], j.at[1] - at[1], j.at[2] - at[2]) < 1e-9, `t=${t}: joint ${i} off its segment`);
    });
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
  const build = fitModules(buildShape('snake', 40));
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
  const build = fitModules(buildShape('snake', 40));
  const m = build.modules[0];
  const a = moduleGeometry(m);

  // b: the same module, positioned so its chain STARTS exactly where a's ends.
  // points[0] is connector A itself, i.e. the anchor, so the lead-in below is
  // zero for this module (it was one SEGMENT_GAP for the old one).
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

// ── the real meshes ride the same kinematics ─────────────────────────────────

import { moduleBodies } from './moduleGeometry';
import { STUDIO_TO_MODEL_QUAT, studioToModel, restBodies } from '@/robotics/msrr/restLayout';
import { connectorsOf } from '@/robotics/msrr/fitModules';
import { emptyManual, addRoot, setAngle, manualToFitted } from '@/robotics/msrr/manualBuild';
import { UNITS_PER_M, ROD_ORDER } from '@/robotics/msrr/modulink';

const near = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const randomModule = (seed: number) => {
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  let b = addRoot(emptyManual(), [0, 0, 0], [0, 0, 1]);
  for (let j = 0; j < 7; j++) {
    const lim = ROD_ORDER[j] === 'twist' ? Math.PI : Math.PI / 2;
    b = setAngle(b, 'H0', j, (rnd() * 2 - 1) * lim);
  }
  return manualToFitted(b)[0];
};

test('the Studio -> model rotation sends the basis vectors where the model expects them', () => {
  for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.3, -0.2, 0.7]] as Vec3[]) {
    const byQuat = rotate(STUDIO_TO_MODEL_QUAT, v as unknown as Cell);
    const direct = studioToModel(v);
    assert.ok(near(byQuat, direct) < 1e-9, `${v}: quaternion gives ${byQuat}, mapping gives ${direct}`);
  }
});

test('the module has ten bodies, each carried by a joint of the chain', () => {
  const rest = restBodies();
  assert.equal(rest.length, 10);
  assert.deepEqual(rest.map((b) => b.name).sort(), [
    'EndA_LockModule', 'EndB_LockModule', 'L1_LockRotor_A', 'L2_LockRotor_B', 'Spine1_B1B2',
    'Spine2_B3B4', 'T1_Housing_B1Fork', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'T3_Housing_B4Fork',
  ]);
  for (const b of rest) assert.ok(b.stl.length > 100, `${b.name} has no mesh data`);
});

test('a spine body sits exactly between its two receivers, at any pose', () => {
  // The Spine mesh origin is the midpoint of the receivers (the document puts the
  // two receivers at +-31 mm either side of it). If the body were carried by the
  // wrong joint, or the frame mapping were off, this would drift as soon as a
  // bend or a twist upstream moved.
  for (let seed = 1; seed <= 8; seed++) {
    const m = randomModule(seed * 977);
    const conns = connectorsOf(m);
    const bodies = new Map(moduleBodies(m).map((b) => [b.name, b]));
    for (const [name, a, b] of [['Spine1_B1B2', 'S1A', 'S1B'], ['Spine2_B3B4', 'S2A', 'S2B']] as const) {
      const pa = conns.find((c) => c.end === a)!.pos, pb = conns.find((c) => c.end === b)!.pos;
      const mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
      const d = near(bodies.get(name)!.position, mid);
      assert.ok(d < 0.03, `seed ${seed}: ${name} is ${d.toFixed(3)} cubes from its receivers' midpoint`);
    }
  }
});

test('the end lock bodies sit 39 mm behind their connectors, at any pose', () => {
  const expected = (0.039386 * UNITS_PER_M) / MODULINK_CUBE_SIZE;
  for (let seed = 1; seed <= 8; seed++) {
    const m = randomModule(seed * 313);
    const conns = connectorsOf(m);
    const bodies = new Map(moduleBodies(m).map((b) => [b.name, b]));
    for (const [name, end] of [['EndA_LockModule', 'A'], ['EndB_LockModule', 'B']] as const) {
      const d = near(bodies.get(name)!.position, conns.find((c) => c.end === end)!.pos);
      assert.ok(Math.abs(d - expected) < 0.03, `seed ${seed}: ${name} is ${d.toFixed(3)} cubes from ${end}, expected ${expected.toFixed(3)}`);
    }
  }
});

test('every body stays rigid: its distance to its carrier\'s connectors never changes', () => {
  const ref = randomModule(1);
  const refBodies = new Map(moduleBodies(ref).map((b) => [b.name, b]));
  const refConns = connectorsOf(ref);
  // body -> a connector on the same rigid part
  const pairs: [string, string][] = [
    ['Spine1_B1B2', 'S1A'], ['Spine1_B1B2', 'S1B'], ['Spine2_B3B4', 'S2A'], ['Spine2_B3B4', 'S2B'],
    ['EndA_LockModule', 'A'], ['EndB_LockModule', 'B'],
  ];
  for (let seed = 2; seed <= 7; seed++) {
    const m = randomModule(seed * 7919);
    const bodies = new Map(moduleBodies(m).map((b) => [b.name, b]));
    const conns = connectorsOf(m);
    for (const [bn, end] of pairs) {
      const want = near(refBodies.get(bn)!.position, refConns.find((c) => c.end === end)!.pos);
      const got = near(bodies.get(bn)!.position, conns.find((c) => c.end === end)!.pos);
      assert.ok(Math.abs(want - got) < 0.02, `seed ${seed}: ${bn} moved ${(got - want).toFixed(3)} relative to ${end}`);
    }
  }
});
