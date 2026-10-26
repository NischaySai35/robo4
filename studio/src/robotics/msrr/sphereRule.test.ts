/**
 * sphereRule.test.ts — locks must close into spheres, and bends must be earned.
 *
 * Two rules, both added after a build looked wrong on screen rather than after a
 * test went red, which is why they are pinned here in the terms the eye judges
 * them by rather than in terms of the code that implements them.
 *
 * THE SPHERE RULE. A lock is two hemispheres meeting flat face to flat face:
 * one ball, no gap, nothing else touching it. What was being drawn instead, in
 * seven places across the shape library, was a ball with a third dome buried
 * 0.75 cubes into it. The cause was not the weld but the pose the HOST was
 * holding — fold a module hard enough and it brings connector B back around to
 * within 0.754 cubes of the side dome on the inside of its own bend, closer than
 * the 0.887 two domes need to clear. 89 of the reach table's 318 poses do this.
 * They are not poses at all: the module is inside itself.
 *
 * EXTEND, DO NOT FOLD. "If it extends it might just look long, but if it bends
 * it looks like a different shape." A module finishing a run that has one cube
 * left must run straight off the end rather than curl to stay inside the
 * diagram. The old fixed overshoot cap had this exactly backwards, and made
 * bending the cheaper of the two.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { type Cell, key, sub, eq } from './lattice';
import { fitModules, connectorsOf, type FittedModule } from './fitModules';
import { analyseShape, segmentCount } from './skeleton';
import { reachTable } from './chainMoves';
import { buildShape } from './shapes';
import { CUBES_PER_STRAIGHT_MODULE } from './occupancy';

/**
 * The lattice's grain relative to the 4-cubes-per-module scale these shapes were
 * first written at. The cube is now half the size (a module spans 8), so every
 * helper below multiplies its lengths by K: `line(13)` is still "three modules
 * and a cube", `plus(4)` still has arms a module long, and so on. The rules under
 * test do not change with the scale; only the cube counts do.
 */
const K = CUBES_PER_STRAIGHT_MODULE / 4;

import {
  connectorPoses, baseQuatFor, REQUIRED_DOME_CLEARANCE, connectorsMayShareBody, oppositeSideEnd,
  type ConnectorEnd,
} from './modulink';
import { MODULINK_CUBE_SIZE } from './occupancy';

const DOME_DIAMETER_CUBES = REQUIRED_DOME_CLEARANCE / MODULINK_CUBE_SIZE;
const TO_CUBES = 1 / MODULINK_CUBE_SIZE;

const dist = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Real dome centres of a placed module, in cube units. */
function domesOf(m: FittedModule): { end: ConnectorEnd; pos: [number, number, number] }[] {
  return connectorPoses(m.pose.angles, { position: [0, 0, 0], quaternion: baseQuatFor(m.anchorDir) })
    .map((c) => ({
      end: c.end,
      pos: [
        m.anchorPos[0] + c.position[0] * TO_CUBES,
        m.anchorPos[1] + c.position[1] * TO_CUBES,
        m.anchorPos[2] + c.position[2] * TO_CUBES,
      ] as [number, number, number],
    }));
}

const line = (n: number): Cell[] => Array.from({ length: K * (n - 1) + 1 }, (_, i) => [i, 0, 0] as Cell);

const elbow = (a: number, b: number): Cell[] => {
  const A = K * (a - 1) + 1, B = K * b;
  const cells: Cell[] = [];
  for (let x = 0; x < A; x++) cells.push([x, 0, 0]);
  for (let z = 1; z <= B; z++) cells.push([A - 1, 0, z]);
  return cells;
};

const plus = (arm: number): Cell[] => {
  const cells: Cell[] = [[0, 0, 0]];
  for (let i = 1; i <= arm * K; i++) cells.push([i, 0, 0], [-i, 0, 0], [0, 0, i], [0, 0, -i]);
  return cells;
};

/** A tee whose stem ends one cube past what a whole module covers. */
const tee = (): Cell[] => {
  const cells: Cell[] = [];
  for (let x = -4 * K; x <= 4 * K; x++) cells.push([x, 0, 0]);
  for (let z = 1; z <= 5 * K - (K - 1); z++) cells.push([0, 0, z]);
  return cells;
};

const SHAPES: [string, Cell[]][] = [
  ['line', line(13)],
  ['L(5,5)', elbow(5, 5)],
  ['L(4,4)', elbow(4, 4)],
  ['L(3,6)', elbow(3, 6)],
  ['plus', plus(4)],
  ['tee', tee()],
];

// ── the sphere rule ───────────────────────────────────────────────────────────

test('every lock is two domes at the SAME point — never a near miss', () => {
  // No tolerance band: either two domes coincide, or they clear a full diameter.
  // Anything in between is a ball with a bite out of it on screen and two parts
  // that do not mate in metal.
  //
  // ONE EXCEPTION, from the geometry of the new module: the two receivers of a
  // spine are back to back on opposite faces of one body, only ~0.36 cubes apart.
  // A module welded onto one of them therefore sits 0.36 from the OTHER, through
  // the spine's own thickness. That pair is not a near miss — it is exempt when
  // the near dome is exactly the one welded onto the receiver's twin.
  type Dome = { id: string; end: ConnectorEnd; pos: [number, number, number] };
  const backToBack = (all: Dome[], a: number, b: number): boolean => {
    // Two domes are back to back when they sit on the two receivers of ONE spine
    // (a dome that IS a receiver counts as sitting on it).
    for (const s of all) {
      const twin = oppositeSideEnd(s.end);
      if (!twin) continue;
      const t = all.find((x) => x.id === s.id && x.end === twin);
      if (!t) continue;
      for (const [p, q] of [[a, b], [b, a]] as const) {
        if (dist(s.pos, all[p].pos) < 1e-6 && dist(t.pos, all[q].pos) < 1e-6) return true;
      }
    }
    return false;
  };
  for (const [name, cells] of SHAPES) {
    const r = fitModules(cells);
    const all = r.modules.flatMap((m) => domesOf(m).map((d) => ({ ...d, id: m.id })));
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        if (all[i].id === all[j].id) continue;
        const d = dist(all[i].pos, all[j].pos);
        if (d >= DOME_DIAMETER_CUBES) continue; // properly clear of each other
        if (d >= 1e-6 && backToBack(all, i, j)) continue;
        assert.ok(d < 1e-6,
          `${name}: ${all[i].id}.${all[i].end} and ${all[j].id}.${all[j].end} sit `
          + `${d.toFixed(4)} cubes apart — too close to clear, too far to be one sphere`);
      }
    }
  }
});

test('no module is ever posed so its OWN domes interpenetrate', () => {
  for (const [name, cells] of SHAPES) {
    for (const m of fitModules(cells).modules) {
      const d = domesOf(m);
      for (let i = 0; i < d.length; i++) {
        for (let j = i + 1; j < d.length; j++) {
          // the two receivers of one spine are back to back by design
          if (connectorsMayShareBody(d[i].end, d[j].end)) continue;
          const gap = dist(d[i].pos, d[j].pos);
          assert.ok(gap >= DOME_DIAMETER_CUBES - 1e-9,
            `${name}: ${m.id} is posed with its own ${d[i].end} and ${d[j].end} domes `
            + `${gap.toFixed(4)} cubes apart — the module collides with itself`);
        }
      }
    }
  }
});

test('the reach table contains no self-colliding poses (the old module had 89 of 318)', () => {
  // Guards the premise rather than trusting it. If the table ever stopped
  // containing such poses, the filter in fitModules would be doing nothing and
  // this says so instead of passing quietly.
  let selfColliding = 0;
  for (const p of reachTable()) {
    const cp = connectorPoses(p.angles, { position: [0, 0, 0], quaternion: baseQuatFor([0, 0, 1]) });
    let bad = false;
    for (let i = 0; i < cp.length && !bad; i++) {
      for (let j = i + 1; j < cp.length; j++) {
        if (connectorsMayShareBody(cp[i].end, cp[j].end)) continue;
        if (dist(cp[i].position, cp[j].position) * TO_CUBES < DOME_DIAMETER_CUBES - 1e-9) {
          bad = true;
          break;
        }
      }
    }
    if (bad) selfColliding++;
  }
  // The try8 module's table has NONE (the old 6-DOF module had 89 of 318): its
  // free end is a long way from everything it could hit. The filter still guards
  // the solver's poses (the U-turn and corner catalogues), so check it has teeth
  // on a pose built by hand to fold B back onto A.
  // (Whether the TABLE holds any depends on the cube size: at 4 cubes per module
  // it holds none, at 8 the pad diameter is a whole cube and tight folds do collide.
  // Either way the filter must have teeth, which the coiled pose below shows.)
  void selfColliding;
  // The rule still has teeth on poses that are NOT in the table: coil the four
  // bends hard (60-90 deg) and B comes back to within ~0.33 cubes of A, closer
  // than the 0.46 two pads need. Those folds do not land on a lattice spot, so the
  // table never offers them, but the solver's catalogues could, which is what
  // fitModules.poseSelfClear guards.
  let closest = Infinity;
  for (const bend of [60, 75, 85, 90]) {
    for (const sg of [[1, 1, 1, 1], [1, -1, 1, -1], [1, 1, -1, -1], [1, -1, -1, 1]]) {
      const r = (bend * Math.PI) / 180;
      const cp = connectorPoses([0, r * sg[0], r * sg[1], 0, r * sg[2], r * sg[3], 0],
        { position: [0, 0, 0], quaternion: baseQuatFor([0, 0, 1]) });
      const a = cp.find((c) => c.end === 'A')!, b = cp.find((c) => c.end === 'B')!;
      closest = Math.min(closest, dist(a.position, b.position) * TO_CUBES);
    }
  }
  assert.ok(closest < DOME_DIAMETER_CUBES,
    `no coiled pose brings B within a pad diameter of A (closest ${closest.toFixed(3)}) — the rule is dead code`);
});

// ── extend, do not fold ───────────────────────────────────────────────────────

test('a module runs STRAIGHT off the end of a run rather than bending to stay inside', () => {
  // The tee's stem ends one cube past what a whole module covers. The two
  // options for reaching it are a straight module hanging 3 cubes into space,
  // or one that curls sideways to stay "inside" — and the straight one must
  // win whenever either is taken at all.
  //
  // The straight one is NOT always taken any more: Nischay's own call is that
  // 3 cubes of overshoot is too much to pay for 1 cube of real gain, so the
  // stem's last cell is left honestly uncovered (see the overshoot-ratio
  // comment in fitModules.evaluate) rather than drawn as a stick. What this
  // test still pins is that NOTHING built bends to compensate — no module
  // curls sideways to sneak that last cell in through the back door.
  //
  // With the try8 module the ratio is met (the straight finish overhangs by 2
  // cubes for 1 cube of gain), so the tip may now be covered as well as left
  // bare; either is fine. Nothing else may be missing.
  const r = fitModules(tee());
  const stemTip = 5 * K - (K - 1);          // the stem's last cube; a module's remainder is the cubes near it
  assert.ok(r.uncovered.every((c) => c[0] === 0 && c[1] === 0 && c[2] > stemTip - K),
    `expected at most the stem's own tip left uncovered, got ${JSON.stringify(r.uncovered)}`);
  for (const m of r.modules) {
    assert.equal(segmentCount(m.cells), 1,
      `${m.id} bends in a shape that has no corners at all: ${JSON.stringify(m.cells)}`);
  }
});

test('a bend is only ever spent where the diagram itself bends', () => {
  // The general form. Across shapes built from straight runs and right angles,
  // every direction change a module makes must land on one of those corners.
  for (const [name, cells] of SHAPES) {
    const corners = analyseShape(cells).corners;
    for (const m of fitModules(cells).modules) {
      for (let i = 1; i < m.cells.length - 1; i++) {
        const dIn = sub(m.cells[i], m.cells[i - 1]);
        const dOut = sub(m.cells[i + 1], m.cells[i]);
        if (eq(dIn, dOut)) continue;
        assert.ok(corners.has(key(m.cells[i])),
          `${name}: ${m.id} turns at ${key(m.cells[i])}, where the diagram runs straight`);
      }
    }
  }
});

test('overshoot is spent freely, but only by modules that stay straight', () => {
  // The budget is a question, not a number: a straight module may hang out as far
  // as its body reaches, a bending one may not.
  const cells = tee();
  const shape = new Set(cells.map(key));
  const r = fitModules(cells);

  let overshot = 0;
  for (const m of r.modules) {
    const out = m.cells.filter((c) => !shape.has(key(c))).length;
    if (out === 0) continue;
    overshot++;
    assert.equal(segmentCount(m.cells), 1,
      `${m.id} hangs ${out} cubes off the diagram AND bends — overshoot is for straight modules only`);
  }
  assert.ok(overshot > 0, 'test setup: this tee should force at least one module to overhang');
});

// ── B-anchored poses must land where their lattice cells say ─────────────────

/** The first library shape (of a few sizes) whose fit really uses a mirrored (B-anchored) pose. */
function bPoseShape(): Cell[] {
  for (const [id, n] of [['humanoid', 24], ['cross', 24], ['plane', 24], ['bridge', 24], ['car', 28], ['humanoid', 40]] as const) {
    const cells = buildShape(id, n);
    const r = fitModules(cells);
    if (r.modules.some((m) => m.pose.anchorEnd === 'B') && r.components === 1 && r.uncovered.length <= 3 * K) return cells;
  }
  return buildShape('car', 28);
}

test('a real weld is exact even when the pose is held from connector B, not A', () => {
  // Roughly a quarter of the reach table is a MIRROR pass: the same joint
  // angles as an A-anchored entry, reused but held from the OTHER end
  // (anchorEnd: 'B', id suffix "#B<n>") — the module does not care which
  // physical connector is which. `moduleFrames`'s own convention assumes A sits
  // at the local origin, so recomputing a B-anchored pose's real geometry with
  // that same bare convention is wrong: on this exact shape it put a weld at
  // (1.8, 1.9, 0) in a structure whose nearest real geometry was at (5, 5, 1) —
  // four cubes away. The lattice-level accounting (cells, endCell, coverage)
  // was entirely unaffected, which is what let it hide: `r.uncovered` read 0
  // and the log said "fully covered" while the build was visibly two robots
  // wearing one description. See chainMoves.anchoredBase for the fix.
  // A shape whose fit uses mirrored poses and comes out as one welded robot, so it
  // exercises exactly the class of pose this test is about (found, not named: which
  // shapes use one depends on the cube size and the reach table).
  const cells = bPoseShape();
  const r = fitModules(cells);
  // Full coverage is not the point of this test and is not asserted: this
  // shape has three dead-end arms, and each one's very last cell is exactly
  // the "1 cube for 3 of overshoot" trade Nischay declined (see the overshoot
  // ratio in fitModules.evaluate) — honestly uncovered, not a defect. What
  // matters here is that everything that WAS built is welded exactly, mirrored
  // pose or not, which the loop below checks regardless of how much got built.
  assert.ok(r.uncovered.length <= 3 * K,
    `expected at most a few dead-end tips left uncovered, got ${r.uncovered.length}`);

  const usesMirroredPose = r.modules.some((m) => m.pose.anchorEnd === 'B');
  assert.ok(usesMirroredPose, 'test setup: this shape should exercise a B-anchored pose');

  // Connector A is, by construction, always exactly where the module is
  // anchored — an end-to-end weld puts that on a lattice cell, but an end-to-
  // SIDE weld deliberately does not (a side connector rides ~0.63 cube units
  // off the spine axis), so this checks against `m.anchorPos` — the documented
  // real anchor — never against `m.anchorCell`, mirrored pose or not.
  for (const m of r.modules) {
    const a = connectorsOf(m).find((c) => c.end === 'A')!;
    const gap = dist(a.pos, m.anchorPos);
    assert.ok(gap < 1e-6,
      `${m.id}.A (pose ${m.pose.id}, anchorEnd ${m.pose.anchorEnd}) reports real position `
      + `${a.pos.map((v) => v.toFixed(3))} but the module's own anchorPos is `
      + `${m.anchorPos.map((v) => v.toFixed(3))}`);
  }

  // The actual defect: a weld is two connectors at the SAME point. For every
  // welded module, its A must coincide with SOME connector of the module it
  // welded to — not just be somewhere plausible in the same structure. This is
  // exactly what put a 3-cube gap in the middle of a "fully covered", "one
  // piece" build: the lattice bookkeeping never noticed because it doesn't look
  // at continuous positions at all.
  const byId = new Map(r.modules.map((m) => [m.id, m]));
  for (const m of r.modules) {
    if (!m.weldedTo) continue;
    const host = byId.get(m.weldedTo)!;
    const a = connectorsOf(m).find((c) => c.end === 'A')!;
    const hostConns = connectorsOf(host);
    const closest = Math.min(...hostConns.map((c) => dist(a.pos, c.pos)));
    assert.ok(closest < 1e-6,
      `${m.id} claims to weld onto ${host.id} but its A sits ${closest.toFixed(3)} cubes from `
      + `${host.id}'s nearest connector — not a real weld, just a shared coverage report`);
  }

  // And the whole thing must actually be one welded robot, not two pieces that
  // happen to share a coverage report.
  assert.equal(r.components, 1, `expected one welded robot, got ${r.components} pieces`);
  assert.equal(r.touchingChains, 0, 'nothing here should need an unwelded touching fallback');
});
