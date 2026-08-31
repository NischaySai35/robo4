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

test('a straight corridor is clean — no junctions, nothing overloaded', () => {
  const q = shapeQuality(line(10));
  assert.equal(q.overloaded, 0);
  assert.equal(q.buried, 0);
  assert.equal(q.junctions, 0);
  assert.equal(q.maxDegree, 2, 'every interior cube of a line has exactly two neighbours');
  assert.equal(q.buildable, true);
  assert.equal(q.issues.length, 0);
});

test('a simple T is a legal 3-way junction, not an overload', () => {
  // A module can spare one side weld for a third arm; three is the documented
  // limit, so this must NOT be reported as a problem.
  const t: Cell[] = [
    [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0],
    [2, 1, 0], [2, 2, 0],
  ];
  const q = shapeQuality(t);
  assert.equal(q.junctions, 1);
  assert.equal(q.overloaded, 0);
  assert.equal(q.buildable, true);
});

test('a 4-way hub is flagged, because a module cannot weld that many directions', () => {
  // Adjacent side faces interpenetrate, so only two OPPOSITE side welds exist.
  // A cube with four arms needs more than the hardware has.
  const plus: Cell[] = [
    [0, 0, 0],
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0],
  ];
  const q = shapeQuality(plus);
  assert.equal(q.maxDegree, 4);
  assert.equal(q.overloaded, 1);
  assert.equal(q.buildable, false);
  assert.match(q.issues.map((i) => i.kind).join(','), /overloaded-junction/);
  assert.match(q.summary, /not fully buildable/);
});

test('a cube walled in on all six sides is reported as buried, not merely overloaded', () => {
  // Same cube would satisfy "4+ neighbours" too; the distinction matters because
  // the fix is different — hollow the shape out, rather than split a hub.
  const centre: Cell = [0, 0, 0];
  const shell: Cell[] = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  const q = shapeQuality([centre, ...shell]);
  assert.equal(q.buried, 1, 'the enclosed cube must be counted as buried');
  assert.equal(q.overloaded, 0, 'a buried cube is reported once, as buried — not double-counted');
  assert.equal(q.buildable, false);
  assert.match(q.issues.map((i) => i.kind).join(','), /buried-cube/);
});

test('crowded junctions are a warning, not a veto', () => {
  // Two 3-way junctions side by side: the fit will coil, but it can still be
  // built, so this must not claim the shape is impossible.
  const s: Cell[] = [
    [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0],
    [1, 1, 0], [2, 1, 0],
  ];
  const q = shapeQuality(s);
  assert.equal(q.overloaded, 0);
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
  // unbuildable should tend to fit as SEVERAL disconnected chains, while a
  // clean shape should come out as one connected robot.
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
