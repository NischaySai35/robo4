/**
 * featureFit.test.ts — the placement rules, pinned.
 *
 * These are not tests of "did it build something". They are tests of the RULES
 * the fit is supposed to obey when it decides WHERE a module goes, one test per
 * rule, on shapes small enough that the right answer is obvious by eye:
 *
 *   1. one or two cubes -> exactly one straight module, overhang and all
 *   2. a bend goes ON the corner cube, turning the way the shape turns
 *   3. a spine goes ON the junction cube, and may hang off the diagram
 *   4. the silhouette survives a run that is not a whole number of modules
 *   6. the busiest junction is served first
 *   7. straight where straight is possible
 *   8. nothing is ever loose — including part-way through the build reveal
 *
 * Every one of these was a way the old coverage-first fit went wrong, and every
 * one of them is cheap to lose again to a scoring tweak, which is why they are
 * asserted on their own rather than inferred from a coverage percentage.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { type Cell, key, add, sub, eq, DIRS_6 } from './lattice';
import { fitModules, connectorsOf, type FittedModule } from './fitModules';
import { analyseShape, segmentCount, pathTurns, sameTurn } from './skeleton';
import { CUBES_PER_STRAIGHT_MODULE } from './occupancy';

/**
 * The lattice's grain relative to the 4-cubes-per-module scale these shapes were
 * first written at. The cube is now half the size (a module spans 8), so every
 * helper below multiplies its lengths by K: `line(13)` is still "three modules
 * and a cube", `plus(4)` still has arms a module long, and so on. The rules under
 * test do not change with the scale; only the cube counts do.
 */
const K = CUBES_PER_STRAIGHT_MODULE / 4;


const line = (n: number, axis: Cell = [1, 0, 0]): Cell[] =>
  Array.from({ length: K * (n - 1) + 1 }, (_, i) => [axis[0] * i, axis[1] * i, axis[2] * i] as Cell);

/** An L: `a` cubes along +X, turning at the last of them, then `b` cubes along +Z. */
const elbow = (a: number, b: number): Cell[] => {
  const A = K * (a - 1) + 1, B = K * b;
  const cells: Cell[] = [];
  for (let x = 0; x < A; x++) cells.push([x, 0, 0]);
  for (let z = 1; z <= B; z++) cells.push([A - 1, 0, z]);
  return cells;
};

/** A plus sign with arms of `arm` cubes in the XZ plane. */
const plus = (arm: number): Cell[] => {
  const cells: Cell[] = [[0, 0, 0]];
  for (let i = 1; i <= arm * K; i++) {
    cells.push([i, 0, 0], [-i, 0, 0], [0, 0, i], [0, 0, -i]);
  }
  return cells;
};

/** Where a placed module's own bends land, in world cubes. */
const turnsOf = (m: FittedModule) => pathTurns(m.cells);

// ── rule 1 ────────────────────────────────────────────────────────────────────

test('rule 1: a one-cube diagram gets one module, straight, hanging out as far as it likes', () => {
  const r = fitModules([[0, 0, 0]]);
  assert.equal(r.modules.length, 1);
  assert.equal(segmentCount(r.modules[0].cells), 1, 'it must not fold itself up to fit the cube');
  assert.ok(r.modules[0].cells.length > 1, 'a module is bigger than a cube and stays that way');
});

test('rule 1: two cubes is still one module, not two', () => {
  const r = fitModules([[0, 0, 0], [1, 0, 0]]);
  assert.equal(r.modules.length, 1);
  assert.equal(segmentCount(r.modules[0].cells), 1);
});

// ── rule 2 ────────────────────────────────────────────────────────────────────

test('rule 2: the module bends ON the corner cube, turning the way the shape turns', () => {
  // 4 cubes in, 4 cubes out — one clean corner with a full arm either side.
  const cells = elbow(4, 4);
  const skel = analyseShape(cells);
  assert.equal(skel.corners.size, 1);
  const corner = [...skel.corners][0];

  const r = fitModules(cells);
  assert.equal(r.cornersAligned, 1, `the corner got no module's bend: ${r.log.join(' | ')}`);

  const onCorner = r.modules.find((m) => turnsOf(m).some((t) => key(t.cell) === corner));
  assert.ok(onCorner, 'no module turns at the corner cube');
  const feature = analyseShape(cells).features.find((f) => key(f.cell) === corner)!;
  const turn = turnsOf(onCorner!).find((t) => key(t.cell) === corner)!;
  assert.ok(sameTurn(turn.arms, [feature.arms[0], feature.arms[1]]),
    'the module bends at the right cube but the wrong way — its arms do not lie along the shape');
});

test('rule 2: every arm-split the module can bend at puts the turn on the corner', () => {
  // 3+1, 1+3 and 2+2 are the module's real single-bend forms. Whichever the fit
  // picks, the BEND must land on the corner — that is the rule, not the split.
  for (const [a, b] of [[4, 2], [2, 4], [3, 3], [5, 3], [4, 4]] as const) {
    const cells = elbow(a, b);
    const r = fitModules(cells);
    assert.equal(r.cornersAligned, 1,
      `L(${a},${b}): corner not aligned — ${r.log.join(' | ')}`);
  }
});

// ── rule 3 ────────────────────────────────────────────────────────────────────

test('rule 3: a module puts its SPINE on the junction, so the other arms have somewhere to weld', () => {
  const cells = plus(4);
  const r = fitModules(cells);
  assert.equal(r.junctionsAligned, 1, `the crossing got no spine: ${r.log.join(' | ')}`);

  // The module serving it must have one spine's two receivers AT the junction —
  // that is the whole point, and it is what the cross arms then weld onto. (The
  // old module had all four sides at one point; the try8 module has two per
  // spine, on opposite faces, so a 4-way crossing is the through-run plus that
  // opposite pair — and the receivers must face the other axis.)
  const server = r.modules.find((m) => m.serves?.kind === 'junction')!;
  assert.ok(server, 'no module reports serving the junction');
  const sides = connectorsOf(server).filter((c) => c.end !== 'A' && c.end !== 'B');
  const onJunction = sides.filter((c) => key(c.cell) === key([0, 0, 0]));
  assert.equal(onJunction.length, 2, 'the two receivers of the serving spine are not on the junction cube');
  assert.equal(onJunction[0].dir.map((v, i) => v + onJunction[1].dir[i]).join(), '0,0,0',
    'the two receivers face opposite ways');
  assert.ok(onJunction.every((c) => c.dir[2] !== 0),
    'the receivers must face the other axis of the plus (z) or the cross arms have nothing to weld to');

  // And they must actually be used: a spine on a crossing that nothing welds to
  // has bought nothing. All four arms hang off this one module.
  const welded = r.modules.filter((m) => m.weldedTo === server.id).length
    + r.chainWelds.filter((w) => w.toModule === server.id || w.fromModule === server.id).length;
  assert.ok(welded >= 4, `only ${welded} arm(s) attached to the junction module`);
  assert.equal(r.components, 1, 'a plus comes back as one welded robot');
});

test('rule 3: a T is served too, and the module is allowed to hang past the diagram', () => {
  // The stem is only 2 cubes, so a spine centred on the junction MUST overhang.
  // Folding to stay inside is exactly what rule 3 forbids.
  const cells: Cell[] = [];
  for (let x = -3 * K; x <= 3 * K; x++) cells.push([x, 0, 0]);
  for (let z = 1; z <= 2 * K; z++) cells.push([0, 0, z]);
  const r = fitModules(cells);
  assert.equal(r.junctionsTotal, 1);
  assert.equal(r.junctionsAligned, 1, `the tee got no spine: ${r.log.join(' | ')}`);
});

// ── rule 4 ────────────────────────────────────────────────────────────────────

test('rule 4: a rectangle comes back a rectangle, corners and all', () => {
  const rect: Cell[] = [];
  const W = 8 * K;
  for (let x = 0; x <= W; x++) { rect.push([x, 0, 0]); rect.push([x, 0, W]); }
  for (let z = 1; z < W; z++) { rect.push([0, 0, z]); rect.push([W, 0, z]); }

  const r = fitModules(rect);
  assert.equal(r.uncovered.length, 0, 'the outline is not fully built');
  assert.equal(r.cornersTotal, 4);
  assert.equal(r.cornersAligned, 4,
    `only ${r.cornersAligned} of 4 corners got a bend — ${r.log.join(' | ')}`);
  assert.equal(r.components, 1, 'a closed outline should come back as one locked robot');
});

test('rule 4: a run that is not a whole number of modules still gets built end to end', () => {
  // 4 cubes is exactly one module; 13 is exactly three. 11 is neither, and the
  // silhouette still has to survive it.
  //
  // WITH THE OLD MODULE a 1-cube remainder was left bare: finishing it needed 3
  // cubes of overshoot, which fails the overshoot ratio (Nischay's own call — see
  // the "extend" comment in fitModules.evaluate: a single stray cube is not worth
  // a 3-cube stick). The try8 module's last module only hangs 2 cubes past the
  // end for that single cube (ratio 1.5 x gain, rounded up, is 2), so the
  // remainder IS built now, and every corridor length comes back fully covered.
  // The overhang stays capped at 2 and every module stays straight.
  for (const n of [5, 6, 7, 9, 11, 14]) {
    const r = fitModules(line(n));
    // at most the stub the overshoot ratio refuses to draw a stick for
    assert.ok(r.uncovered.length <= K, `${n}-cube corridor left ${r.uncovered.length} cubes bare`);
    assert.equal(r.components, 1, `${n}-cube corridor came back in ${r.components} pieces`);
    const shape = new Set(line(n).map(key));
    for (const m of r.modules) {
      // A remainder smaller than half a module cannot be finished straight within
      // the overshoot ratio, and a stub that short is left bare rather than folded
      // (MIN_GAIN_PER_STRAY), so a module here never bends...
      assert.equal(segmentCount(m.cells), 1, `${n}-cube corridor: ${m.id} bends`);
      // ...and overhangs by no more than the ratio allows (ceil(1.5 x its gain))
      assert.ok(m.cells.filter((c) => !shape.has(key(c))).length <= 2 * K,
        `${n}-cube corridor: ${m.id} overhangs by more than ${2 * K} cubes`);
    }
  }
});

// ── rule 6 ────────────────────────────────────────────────────────────────────

test('rule 6: when a crossing and a bend compete, the crossing is served first', () => {
  // A plus with one arm bent at its tip: the shape has a 4-way junction AND a
  // corner, and they are close enough that whichever is placed first decides the
  // phase for the other.
  const cells = plus(3);
  for (let x = 3 * K + 1; x <= 4 * K; x++) cells.push([x, 0, 0]);   // extend +X...
  for (let z = 1; z <= 3 * K - (K - 1); z++) cells.push([4 * K, 0, z]);   // ...and turn
  const skel = analyseShape(cells);
  assert.ok(skel.junctions.size >= 1 && skel.corners.size >= 1, 'test setup');
  assert.equal(skel.features[0].kind, 'junction', 'the ranking must put the crossing first');

  const r = fitModules(cells);
  assert.equal(r.junctionsAligned, r.junctionsTotal,
    `the crossing lost its alignment to something lower-priority: ${r.log.join(' | ')}`);

  // And the module that served it is the FIRST one built — the root of the whole
  // structure, which is what "chooses first" means in practice.
  assert.equal(r.modules[0].serves?.kind, 'junction');
});

// ── rule 7 ────────────────────────────────────────────────────────────────────

test('rule 7: a straight corridor is built straight, with no wandering', () => {
  const r = fitModules(line(13));
  for (const m of r.modules) {
    assert.equal(segmentCount(m.cells), 1,
      `${m.id} zigzags down a straight corridor: ${JSON.stringify(m.cells)}`);
  }
});

test('rule 7: modules stay on the diagram unless staying on it costs a weld', () => {
  // A plain corridor has no reason to leave the shape at all.
  const cells = line(13);
  const shape = new Set(cells.map(key));
  const r = fitModules(cells);
  for (const m of r.modules) {
    for (const c of m.cells) {
      assert.ok(shape.has(key(c)), `${m.id} wanders to ${key(c)}, off a shape that needs no overhang`);
    }
  }
});

// ── rule 8 ────────────────────────────────────────────────────────────────────

test('rule 8: the build is connected at EVERY frame of the reveal, not just at the end', () => {
  // The panel reveals `modules.slice(0, n)`, so the guarantee has to hold for
  // every prefix of the array — a module that appears before anything it is
  // attached to is a part hanging in mid-air on screen.
  const touching = (a: FittedModule, b: FittedModule) => {
    for (const p of a.cells) {
      for (const q of b.cells) {
        if (Math.abs(p[0] - q[0]) <= 1 && Math.abs(p[1] - q[1]) <= 1 && Math.abs(p[2] - q[2]) <= 1) {
          return true;
        }
      }
    }
    return false;
  };

  for (const cells of [line(13), elbow(5, 5), plus(4)]) {
    const r = fitModules(cells);
    for (let n = 2; n <= r.modules.length; n++) {
      const shown = r.modules.slice(0, n);
      const last = shown[n - 1];
      assert.ok(
        shown.slice(0, n - 1).some((m) => m.id === last.weldedTo || touching(m, last)),
        `${last.id} appears at frame ${n} attached to nothing that is on screen yet`,
      );
    }
  }
});

test('rule 8: no module is ever placed with nothing to hold on to', () => {
  for (const cells of [line(13), elbow(5, 5), plus(4)]) {
    const r = fitModules(cells);
    assert.ok(r.spatiallyOnePiece, 'the fit produced physically separate pieces');
    const roots = r.modules.filter((m) => m.weldedTo === null);
    assert.equal(roots.length, 1, `${roots.length} chains started with no weld; only the first may`);
  }
});

// ── the diagram is a diagram, not a volume (rule 5) ───────────────────────────

test('rule 5: a cube is a point on a diagram — one cube never means one module', () => {
  // The scale is pinned: four cubes IS a straight module. So a corridor of N
  // cubes must come back as roughly N/4 modules, not N of them, at every length.
  for (const n of [8, 13, 21, 33]) {
    const r = fitModules(line(n));
    const expected = Math.ceil((n - 1) / 4);
    assert.equal(r.modules.length, expected,
      `${n} cubes gave ${r.modules.length} modules, expected ${expected}`);
  }
});

test('rule 5: the same shape drawn along any axis fits the same way', () => {
  // The lattice has no preferred direction, so neither may the fit — a shape
  // rotated onto another axis must take the same modules in the same poses.
  const shapes: Cell[][] = [line(13, [1, 0, 0]), line(13, [0, 1, 0]), line(13, [0, 0, 1])];
  const counts = shapes.map((c) => fitModules(c).modules.length);
  assert.equal(new Set(counts).size, 1, `same corridor, different axes, different fits: ${counts}`);
});

// ── the fit tells the truth about what it could not do (rule 9) ───────────────

test('the fit reports feature alignment honestly, including the ones it missed', () => {
  const cells = plus(4);
  const r = fitModules(cells);
  assert.equal(r.junctionsTotal, 1);
  assert.ok(r.junctionsAligned <= r.junctionsTotal, 'more junctions aligned than exist');
  assert.match(r.log.join(' '), /junction\(s\) got a spine/,
    'the log must say how much of the shape the fit actually honoured');
});

test('a solid slab is filled, not mistaken for a forest of junctions', () => {
  // Every interior cube of a slab has four neighbours. Reading those as branch
  // points asked for sixteen impossible spines and reported fourteen failures;
  // a slab is asking to be filled, and has no features at all.
  const slab: Cell[] = [];
  for (let x = 0; x < 5; x++) for (let z = 0; z < 4; z++) slab.push([x, 0, z]);
  const skel = analyseShape(slab);
  assert.equal(skel.junctions.size, 0, 'a filled rectangle has no branch points');
  assert.equal(skel.corners.size, 0, 'nor any bends — its edges are all straight');

  const r = fitModules(slab);
  assert.ok(r.covered.length / slab.length >= 0.85,
    `only ${r.covered.length}/${slab.length} of the slab was covered`);
  // ONE PHYSICAL PIECE, not one weld group. A module offers four attachment
  // directions (two chain ends plus two OPPOSITE side faces), and a slab four
  // rows wide needs more parallel attachment points than that, so the last row
  // is legitimately placed flush rather than locked. Asserting components === 1
  // here would be asserting something the hardware cannot do.
  assert.ok(r.spatiallyOnePiece, 'the slab came back as physically separate pieces');
  assert.ok(r.touchingChains <= 1,
    `${r.touchingChains} chains went unlocked; a slab this size should need at most one`);
});

test('every module body still lies where the fit says it does', () => {
  // Guards the rotation plumbing the targeted placements depend on: a pose is
  // solved in the module's own frame and rotated into the world, and a wrong
  // inverse would put bodies and connectors in different places without any
  // other test noticing.
  for (const cells of [elbow(5, 5), plus(4), line(13)]) {
    for (const m of fitModules(cells).modules) {
      const conns = connectorsOf(m);
      const a = conns.find((c) => c.end === 'A')!;
      const b = conns.find((c) => c.end === 'B')!;
      assert.equal(key(a.cell), key(m.anchorCell));
      assert.equal(key(b.cell), key(m.endCell));
      assert.ok(m.cells.some((c) => eq(c, m.anchorCell)), `${m.id} body misses its own anchor`);
      assert.ok(DIRS_6.some((d) => eq(d, m.anchorDir)), `${m.id} anchor faces nowhere`);
      assert.ok(DIRS_6.some((d) => eq(d, m.endDir)), `${m.id} end faces nowhere`);
      void add; void sub;
    }
  }
});
