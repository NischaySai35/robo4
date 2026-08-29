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

test('every module is drawn anchored where Build placed it', () => {
  const build = fitModules(buildShape('snake', 20));
  for (const m of build.modules) {
    const g = moduleGeometry(m);
    // Connector A is the anchor: it must sit on the module's own anchor cube.
    const a = g.connectors.find((c) => c.isEnd);
    assert.ok(a, `${m.id} has no end connector`);
    const d = Math.hypot(
      a.at[0] - m.anchorCell[0], a.at[1] - m.anchorCell[1], a.at[2] - m.anchorCell[2],
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

test('exactly one rod is the big rod, and it is the thickest', () => {
  const g = moduleGeometry(fitModules(buildShape('snake', 20)).modules[0]);
  const big = g.rods.filter((r) => r.isBigRod);
  assert.equal(big.length, 1, 'the spine is a single rod');
  for (const r of g.rods) {
    if (!r.isBigRod) assert.ok(big[0].radius > r.radius, 'the big rod should read as the spine');
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

test('a module that moves twice in one plan tweens pinned to the connector it just grabbed, not floating between two unrelated anchors', () => {
  // The bug this guards: a's chain (the module's state after its FIRST move)
  // is anchored at that move's own anchor cell. b's chain (its state after a
  // SECOND move) is anchored where it just grabbed — a's FAR end, not a's
  // anchor. If tweenGeometry blindly pairs a.points[0] with b.points[0], it
  // interpolates between two physically different points and the "anchor"
  // visibly drifts through empty space — reported as the module "reversing in
  // thin air, not locked to anything".
  //
  // Built directly with oneStepMoves rather than fished out of a real search:
  // whether a real plan happens to reuse a module twice is a property of the
  // search's heuristics and budget, not of this bug, and hunting for one made
  // this test slow and occasionally unable to find a repeat at all. Chaining
  // two real legal moves for the same module reproduces the exact state
  // MsrrCanvas feeds tweenGeometry, deterministically.
  // "car" @ 20 cubes, module 0: a real build where module 0 happens to be a
  // genuine chain-end (a leaf in the weld graph, so free to detach) that also
  // has a real two-hop opportunity. Picked by scanning real shapes rather
  // than assumed — a plain straight line's end module, and several library
  // shapes' module 0 including "snake", either have no room for a second hop
  // or turn out to be a branch point bridging two otherwise-unconnected
  // sub-chains (correctly immovable — see staysConnectedWithout), which would
  // make an assumed setup invalid rather than testing the thing this test is
  // actually about.
  const cur = fitModules(buildShape('car', 20));
  const m0 = cur.modules[0];
  const others = cur.modules.filter((x) => x.id !== m0.id);

  const move1 = oneStepMoves(m0, others)[0];
  assert.ok(move1, 'test setup: car@20 module 0 should have at least one legal move');
  const m1 = { ...m0, anchorCell: move1.toCell, anchorDir: move1.toDir, cells: move1.cells, pose: move1.pose };

  const move2 = oneStepMoves(m1, others)[0];
  assert.ok(move2, 'test setup: after one move, the module should have a second legal move available');

  // Drawing convention (structureAfter): a module at rest after a move is
  // drawn from that move's OWN fromCell/pose, not its toCell — the pose was
  // solved relative to fromCell, and FK from there naturally reaches toCell.
  const a = moduleGeometry({ ...m0, anchorCell: move1.fromCell, anchorDir: move1.fromDir, cells: move1.cells, pose: move1.pose });
  const b = moduleGeometry({ ...m0, anchorCell: move2.fromCell, anchorDir: move2.fromDir, cells: move2.cells, pose: move2.pose });

  // The physically shared point: move1's far end (where it just grabbed) is
  // move2's anchor (where it holds while its OTHER end swings this time). Not
  // bit-exact — a.points[last] is a continuous FK result, b.points[0] is the
  // integer lattice cell it was solved to land on, and MAX_SNAP_ERROR is the
  // model's own tolerance between those two — but they must be that close.
  const sharedDist = Math.hypot(
    a.points[a.points.length - 1][0] - b.points[0][0],
    a.points[a.points.length - 1][1] - b.points[0][1],
    a.points[a.points.length - 1][2] - b.points[0][2],
  );
  assert.ok(sharedDist < MAX_SNAP_ERROR,
    `test setup: consecutive moves of one module should share a connector (off by ${sharedDist})`);

  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const mid = tweenGeometry(a, b, t, { sharedIsFarEndOfA: true });
    // Whichever of mid's two chain tips corresponds to the shared, just-grabbed
    // connector must stay WITHIN THE SAME NEIGHBOURHOOD it started in (bounded
    // by the setup's own solve tolerance, sharedDist) for the whole tween, and
    // land there EXACTLY at t=1 — that connector is welded and does not swing
    // away mid-step. What must never happen is that tip ending up somewhere
    // else entirely, cube-units away, which is what the unflagged bug does.
    const tip0 = mid.points[0];
    const tipN = mid.points[mid.points.length - 1];
    const d0 = Math.hypot(tip0[0] - b.points[0][0], tip0[1] - b.points[0][1], tip0[2] - b.points[0][2]);
    const dN = Math.hypot(tipN[0] - b.points[0][0], tipN[1] - b.points[0][1], tipN[2] - b.points[0][2]);
    const tol = t === 1 ? 1e-6 : sharedDist + 1e-6;
    assert.ok(Math.min(d0, dN) < tol,
      `t=${t}: neither tip of the tweened chain sits near the shared connector — it drifted`);
  }

  // Sanity on the bug itself: WITHOUT the flag, the same tween must fail this
  // check somewhere in the sweep — otherwise this test is not exercising the
  // regression it claims to.
  let anyDrifted = false;
  for (const t of [0.25, 0.5, 0.75]) {
    const mid = tweenGeometry(a, b, t);
    const tip0 = mid.points[0];
    const d0 = Math.hypot(tip0[0] - b.points[0][0], tip0[1] - b.points[0][1], tip0[2] - b.points[0][2]);
    if (d0 > 1e-6) anyDrifted = true;
  }
  assert.ok(anyDrifted, 'test setup: the default (unflagged) tween should exhibit the drift this test guards against');
});

test('buildGeometry keeps assembly order so modules can appear one at a time', () => {
  const build = fitModules(buildShape('chair', 24));
  const geo = buildGeometry(build.modules);
  assert.equal(geo.length, build.modules.length);
  geo.forEach((g, i) => assert.equal(g.moduleId, build.modules[i].id));
});
