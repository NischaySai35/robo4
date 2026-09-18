/**
 * shapeQuality.test.ts — the buildability check must agree with what the fitter
 * actually does, or it is just another opinion.
 *
 * The load-bearing test is the last one: a shape this module calls unbuildable
 * should be one the fitter really does struggle to make into a single connected
 * robot. If those two ever disagree, one of them is lying about the hardware.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { type Cell } from './lattice';
import { shapeQuality } from './shapeQuality';
import { buildShape } from './shapes';
import { fitModules } from './fitModules';

const line = (n: number): Cell[] => Array.from({ length: n }, (_, i) => [i, 0, 0] as Cell);

test('a straight corridor is clean — no junctions, nothing buried', () => {
  const q = shapeQuality(line(10));
  assert.equal(q.buried, 0);
  assert.equal(q.junctions, 0);
  assert.equal(q.maxDegree, 2, 'every interior cube of a line has exactly two neighbours');
  assert.equal(q.buildable, true);
  assert.equal(q.issues.length, 0);
});

test('a simple T is a legal 3-way junction', () => {
  const t: Cell[] = [
    [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0],
    [2, 1, 0], [2, 2, 0],
  ];
  const q = shapeQuality(t);
  assert.equal(q.junctions, 1);
  assert.equal(q.buildable, true);
});

test('a 4-way (or higher) hub is fine — a module has up to six weld directions', () => {
  // All four side connectors may carry a weld at once (2026-09-05): two chain
  // ends plus four sides is six directions from one cube, matching every
  // possible face-neighbour count a cube can have. Nothing short of "walled in
  // on all six sides" is too many arms for one hub any more.
  const plus: Cell[] = [
    [0, 0, 0],
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0],
  ];
  const q = shapeQuality(plus);
  assert.equal(q.maxDegree, 4);
  assert.equal(q.buildable, true);
  assert.equal(q.issues.length, 0);
});

test('a cube walled in on all six sides is reported as buried', () => {
  // The only shape defect that still genuinely prevents a build: nothing can
  // weld to a face that does not exist.
  const centre: Cell = [0, 0, 0];
  const shell: Cell[] = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  const q = shapeQuality([centre, ...shell]);
  assert.equal(q.buried, 1, 'the enclosed cube must be counted as buried');
  assert.equal(q.buildable, false);
  assert.match(q.issues.map((i) => i.kind).join(','), /buried-cube/);
  assert.match(q.summary, /not fully buildable/);
});

test('crowded junctions are a warning, not a veto', () => {
  // Two 3-way junctions side by side: the fit will coil, but it can still be
  // built, so this must not claim the shape is impossible.
  const s: Cell[] = [
    [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0],
    [1, 1, 0], [2, 1, 0],
  ];
  const q = shapeQuality(s);
  assert.equal(q.buildable, true, 'crowding degrades the fit; it does not prevent it');
  assert.match(q.issues.map((i) => i.kind).join(','), /adjacent-junctions/);
  assert.match(q.summary, /crowded/);
});

test('an empty shape does not throw', () => {
  const q = shapeQuality([]);
  assert.equal(q.cubes, 0);
  assert.equal(q.buildable, true);
});

test('shapes this module calls unbuildable are the ones the fitter really breaks on', () => {
  // The claim worth checking: this is not a second opinion invented alongside
  // the fitter, it predicts the fitter's own failure mode. A shape flagged
  // unbuildable (now: has a buried cube) should tend to fit incompletely or as
  // several disconnected pieces, while a clean shape should come out whole.
  let cleanOnePiece = 0, cleanTotal = 0;
  let flaggedFragmented = 0, flaggedTotal = 0;

  for (const id of ['bridge', 'arm', 'ring', 'cross', 'box', 'ball'] as const) {
    const cells = buildShape(id, 21);
    const q = shapeQuality(cells);
    const fit = fitModules(cells);
    if (q.buildable) {
      cleanTotal++;
      if (fit.components === 1) cleanOnePiece++;
    } else {
      flaggedTotal++;
      if (fit.components > 1 || fit.uncovered.length > 0) flaggedFragmented++;
    }
  }

  assert.ok(cleanTotal > 0 && flaggedTotal > 0,
    'test setup: need both clean and flagged shapes to compare');
  // Clean shapes should essentially always build as one piece.
  assert.equal(cleanOnePiece, cleanTotal,
    `${cleanTotal - cleanOnePiece} shape(s) passed the check but still fitted as several pieces — `
    + 'the check is missing a real constraint');
  // Flagged ones should genuinely misbehave, or the flag is scaremongering.
  assert.ok(flaggedFragmented > 0,
    'every flagged shape fitted perfectly — the buildability rules may be too strict');
});
