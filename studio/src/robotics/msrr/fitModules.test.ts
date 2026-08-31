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
import { cubePaths, orderPaths, fitModules, rotationTo } from './fitModules';
import { buildShape } from './shapes';
import { MODULINK_CUBE_SIZE } from './occupancy';

const line = (n: number): Cell[] => Array.from({ length: n }, (_, i) => [i, 0, 0] as Cell);

// ── decomposition ─────────────────────────────────────────────────────────────

test('a straight corridor is one run, not a pile of edges', () => {
  const runs = cubePaths(line(13));
  assert.equal(runs.length, 1, `expected one run, got ${runs.length}`);
  assert.equal(runs[0].length, 13);
});

test('the run cover is a partition — every cube once, none invented', () => {
  for (const cells of [line(13), buildShape('chair', 24), buildShape('car', 32)]) {
    const runs = cubePaths(cells);
    const seen = new Set<string>();
    for (const r of runs) {
      for (const c of r) {
        assert.ok(!seen.has(key(c)), `cube ${key(c)} appears in two runs`);
        seen.add(key(c));
      }
    }
    assert.equal(seen.size, cells.length, 'every shape cube must belong to exactly one run');
    for (const c of cells) assert.ok(seen.has(key(c)), `cube ${key(c)} was dropped`);
  }
});

test('runs are contiguous — consecutive cubes are face neighbours', () => {
  for (const r of cubePaths(buildShape('car', 32))) {
    for (let i = 1; i < r.length; i++) {
      const d = Math.abs(r[i][0] - r[i - 1][0])
        + Math.abs(r[i][1] - r[i - 1][1])
        + Math.abs(r[i][2] - r[i - 1][2]);
      assert.equal(d, 1, `run jumps ${d} cubes between steps — not a walk`);
    }
  }
});

test('a solid shape does not shatter into two-cube fragments', () => {
  // The regression this replaced: cutting at junctions gave 25 runs for 24 cubes
  // and zero fittable modules.
  const cells = buildShape('chair', 24);
  const runs = cubePaths(cells);
  assert.ok(runs.length < cells.length / 3,
    `${runs.length} runs for ${cells.length} cubes — the cover shattered`);
});

test('orderPaths keeps every run and orients it to hang off what is built', () => {
  const runs = cubePaths(buildShape('chair', 24));
  const ordered = orderPaths(runs);
  assert.equal(ordered.length, runs.length);
  const total = ordered.reduce((n, o) => n + o.path.length, 0);
  assert.equal(total, runs.reduce((n, r) => n + r.length, 0));
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

test('no two modules occupy the same cube', () => {
  const r = fitModules(buildShape('car', 32));
  const owner = new Map<string, string>();
  for (const m of r.modules) {
    for (const c of m.cells) {
      const k = key(c);
      const prev = owner.get(k);
      // Sharing is legal only at the weld: the cube the module anchors in.
      if (prev && prev !== m.weldedTo) {
        assert.equal(k, key(m.anchorCell), `${m.id} overlaps ${prev} at ${k}, away from its weld`);
      }
      owner.set(k, m.id);
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

test('an empty or single-cube shape builds nothing rather than throwing', () => {
  assert.equal(fitModules([]).modules.length, 0);
  const one = fitModules([[0, 0, 0]]);
  assert.equal(one.modules.length, 0, 'one cube is too short for any module');
  assert.equal(one.uncovered.length, 1);
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
