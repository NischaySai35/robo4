/**
 * fitModules.test.ts — Build: cube shape in, real modules out.
 *
 * The property that matters most here is that a module is not a cube. A shape of
 * N cubes must NOT come back as N modules — if it does, the fit has silently
 * fallen back to treating the diagram as the robot, which is the exact confusion
 * this whole layer exists to remove.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { type Cell, key, configFromCells, isConnected } from './lattice';
import { fitModules, rotationTo } from './fitModules';
import { analyseShape } from './skeleton';
import { buildShape } from './shapes';
import { MODULINK_CUBE_SIZE } from './occupancy';

const line = (n: number): Cell[] => Array.from({ length: n }, (_, i) => [i, 0, 0] as Cell);

// ── the skeleton the fit reads ──────────────────────────────────────

test('a straight corridor has no junctions and no corners — only two tips', () => {
  const s = analyseShape(line(13));
  assert.equal(s.junctions.size, 0);
  assert.equal(s.corners.size, 0);
  assert.equal(s.features.filter((f) => f.kind === 'tip').length, 2);
  assert.equal(s.runs.length, 1, 'one straight run');
  assert.equal(s.runs[0].cells.length, 13);
});

test('an L is one corner, and the corner knows which way it turns', () => {
  const cells: Cell[] = [
    [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0],
    [3, 0, 1], [3, 0, 2], [3, 0, 3],
  ];
  const s = analyseShape(cells);
  assert.equal(s.corners.size, 1);
  assert.ok(s.corners.has(key([3, 0, 0])), 'the corner is the cube where the shape turns');
  const corner = s.features.find((f) => f.kind === 'corner')!;
  const arms = corner.arms.map(key).sort();
  assert.deepEqual(arms, ['-1,0,0', '0,0,1'], 'arms point back down each leg');
});

test('a plus outranks a tee, which outranks a corner, which outranks a tip', () => {
  // rule 6: the busiest feature must sort first, whatever else is in the shape.
  const plus: Cell[] = [
    [0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
  ];
  const s = analyseShape(plus);
  assert.equal(s.features[0].kind, 'junction');
  assert.equal(s.features[0].degree, 4);
  const kinds = s.features.map((f) => f.kind);
  assert.equal(kinds.indexOf('junction'), 0, 'the junction is served first');

  const tee: Cell[] = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1]];
  assert.ok(
    analyseShape(plus).features[0].priority > analyseShape(tee).features[0].priority,
    'a 4-way crossing must outrank a 3-way tee',
  );
});

test('a straight-through cube is not a feature — nothing is asked of a module there', () => {
  const s = analyseShape(line(5));
  for (const f of s.features) {
    assert.ok(f.kind !== 'corner' && f.kind !== 'junction',
      'a corridor has no bends and no branches to align to');
  }
});

// ── rotations ─────────────────────────────────────────────────────────────────

test('every placement rotation carries +Z onto its axis and preserves handedness', () => {
  const axes: Cell[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const a of axes) {
    const r = rotationTo(a);
    assert.equal(key(r([0, 0, 1])), key(a), `rotation for ${key(a)} does not map +Z onto it`);

    // Proper rotation, not a reflection: a reflection would mirror the module's
    // chirality and quietly produce folds the real arm cannot make.
    const x = r([1, 0, 0]), y = r([0, 1, 0]), z = r([0, 0, 1]);
    const det = x[0] * (y[1] * z[2] - y[2] * z[1])
      - x[1] * (y[0] * z[2] - y[2] * z[0])
      + x[2] * (y[0] * z[1] - y[1] * z[0]);
    assert.equal(det, 1, `rotation for ${key(a)} has determinant ${det}, expected +1`);
  }
});

// ── the fit ───────────────────────────────────────────────────────────────────

test('a straight 13-cube run takes three modules, not thirteen', () => {
  const r = fitModules(line(13));
  assert.equal(r.uncovered.length, 0, 'a straight corridor must be fully covered');
  assert.equal(r.modules.length, 3, `expected 3 modules, got ${r.modules.length}`);
  for (const m of r.modules) {
    assert.equal(m.reach, 4, 'a straight module bridges four cubes');
  }
});

test('module count is far below cube count on every library shape', () => {
  for (const id of ['chair', 'car', 'snake', 'table', 'tower'] as const) {
    const cells = buildShape(id, 28);
    const r = fitModules(cells);
    assert.ok(r.modules.length > 0, `${id}: nothing was built`);
    assert.ok(
      r.modules.length < cells.length / 2,
      `${id}: ${r.modules.length} modules for ${cells.length} cubes — a module is not a cube`,
    );
  }
});

test('the fit covers nearly all of a shape, and admits whatever it misses', () => {
  // Full coverage is NOT guaranteed and must not be asserted. The walk is greedy,
  // so it can wall itself in: a pocket whose neighbours are already filled by
  // module bodies has nothing that can reach it. What IS required is that the
  // shortfall is reported rather than quietly written off — an earlier version
  // dropped unreachable cubes from the uncovered set to stop retrying them, which
  // made a partial fit read as complete.
  for (const id of ['chair', 'car', 'snake', 'table'] as const) {
    const cells = buildShape(id, 28);
    const r = fitModules(cells);

    assert.equal(r.covered.length + r.uncovered.length, cells.length,
      `${id}: covered + uncovered must account for every cube`);
    // The floor has come DOWN, deliberately, twice. Connectivity became a hard
    // requirement (a module that cannot weld on is not placed at all), and then
    // dome-on-dome clearance became one too (a placement whose connector domes
    // would interpenetrate another module's is rejected). Both removed
    // placements the old fit was making and should not have been: they covered
    // cubes with chains floating unattached, or with parts driven through each
    // other. Lower coverage that is physically real beats higher coverage that
    // is not — measured at ~0.66-0.71 across the library where it used to read
    // ~0.86. What must never regress is the ACCOUNTING below.
    assert.ok(r.covered.length / cells.length >= 0.6,
      `${id}: only ${r.covered.length}/${cells.length} cubes covered`);
    if (r.uncovered.length) {
      assert.match(r.log.join(' '), /uncovered/,
        `${id}: left ${r.uncovered.length} cubes uncovered without saying so`);
    }
  }
});

test('no two modules occupy the same cube, except at the weld itself', () => {
  // Modules come back in REVEAL order, which is a walk of the connection graph
  // and not the order they were placed in, so this cannot be checked as "the
  // later one anchors here". The invariant the fit actually enforces is
  // symmetric: any cube two bodies share must be the cube one of them ANCHORS
  // in — that cube is the weld, two connectors meeting at one point.
  for (const id of ['car', 'chair', 'snake'] as const) {
    const r = fitModules(buildShape(id, 32));
    const byId = new Map(r.modules.map((m) => [m.id, m]));
    const at = new Map<string, string[]>();
    for (const m of r.modules) {
      for (const c of m.cells) {
        const k = key(c);
        const list = at.get(k);
        if (list) list.push(m.id); else at.set(k, [m.id]);
      }
    }
    for (const [k, ids] of at) {
      if (ids.length < 2) continue;
      const anchored = ids.filter((i) => key(byId.get(i)!.anchorCell) === k);
      assert.ok(anchored.length > 0,
        `${id}: ${ids.join(' and ')} share cube ${k} and none of them anchors there`);
    }
  }
});

test('each module is welded to the previous one, and the first to nothing', () => {
  const r = fitModules(line(13));
  const ids = new Set(r.modules.map((m) => m.id));
  let roots = 0;
  for (const m of r.modules) {
    if (m.weldedTo === null) { roots++; continue; }
    assert.ok(ids.has(m.weldedTo), `${m.id} welds to unknown module ${m.weldedTo}`);
    // A weld means the connectors meet: this module anchors where the last ended.
    const prev = r.modules.find((x) => x.id === m.weldedTo)!;
    assert.equal(key(m.anchorCell), key(prev.endCell),
      `${m.id} does not start where ${prev.id} ended`);
  }
  assert.equal(roots, 1, 'a single corridor should be one chain with one root');
});

test('modules come out in build order, so they can be shown appearing one by one', () => {
  const r = fitModules(buildShape('chair', 24));
  r.modules.forEach((m, i) => assert.equal(m.order, i, 'build order must be dense and ascending'));
});

test('a module body is a dense run of cubes that includes its own anchor', () => {
  // NOT face-connectivity. These cells are a COLLISION FOOTPRINT — the cubes
  // the centreline passes through — not a structure. A chain crossing near a
  // cube corner legitimately registers two cells that touch only diagonally,
  // which face-adjacency calls "disconnected" even though the module is one
  // solid object. (Measured: chair@28 M3, a STRAIGHT pose spanning 5 cells,
  // is diagonally connected and face-disconnected.) The same correction was
  // already made for solved poses in chainSolve.test.ts.
  //
  // What must hold is that the sampling is dense — every cube within one
  // diagonal step of another, so none was skipped — and that the body covers
  // the cube it is anchored in.
  const r = fitModules(buildShape('snake', 20));
  for (const m of r.modules) {
    assert.ok(m.cells.length >= 1);
    for (const c of m.cells) {
      const near = m.cells.some((o) => o !== c
        && Math.abs(o[0] - c[0]) <= 1 && Math.abs(o[1] - c[1]) <= 1 && Math.abs(o[2] - c[2]) <= 1);
      assert.ok(m.cells.length === 1 || near,
        `${m.id}: cube ${key(c)} is isolated — the body sampling skipped cubes`);
    }
    assert.ok(m.cells.some((c) => key(c) === key(m.anchorCell)), `${m.id} body misses its anchor`);
  }
});

test('rule 1: one cube gets one module, straight, overhang and all', () => {
  assert.equal(fitModules([]).modules.length, 0, 'no diagram, no robot');

  const one = fitModules([[0, 0, 0]]);
  assert.equal(one.modules.length, 1, 'a single cube still says SOMETHING is here');
  assert.equal(one.uncovered.length, 0);
  assert.equal(one.modules[0].reach, 4, 'straight — it must not fold itself to fit the cube');

  const two = fitModules([[0, 0, 0], [1, 0, 0]]);
  assert.equal(two.modules.length, 1, 'two cubes is still one module');
  assert.equal(two.modules[0].reach, 4);
});

test('the fit reports what it could not do', () => {
  // A pair of isolated stubs: too short for any fold to bridge.
  const stubs: Cell[] = [[0, 0, 0], [1, 0, 0]];
  const r = fitModules(stubs);
  if (r.modules.length === 0) {
    assert.ok(r.uncovered.length > 0);
    assert.match(r.log.join(' '), /uncovered|no modules/);
  }
});

test('cube size is the module length quartered, so reach and cubes agree', () => {
  // The fit's whole arithmetic rests on this: four cubes of reach IS a straight
  // module, so a 13-cube corridor is three modules with one cube shared per weld.
  assert.ok(MODULINK_CUBE_SIZE > 0);
  const r = fitModules(line(13));
  const spanned = r.modules.reduce((n, m) => n + m.reach, 0);
  assert.equal(spanned, 12, 'three modules of reach 4 span 12 gaps across 13 cubes');
});
