/**
 * shapeQuality.ts — is this cube shape one the hardware can actually build?
 *
 * WHY THIS EXISTS
 * Build kept producing several disconnected chains with arms floating unattached,
 * and the fitter's own log ("3 pieces remain unattached", "2 chains had to be
 * started away from the structure") read like a fitter bug. It is not. The fault
 * is upstream: the SHAPE being handed to it is not buildable, and nothing was
 * checking that before spending a fit on it.
 *
 * The rules below are the hardware's, not heuristics:
 *
 *   - A module has 6 connectors: 2 chain ends (A/B) plus 4 side faces on the
 *     spine. At most TWO side welds are possible and they must be OPPOSITE
 *     (UP+DOWN or LEFT+RIGHT) — adjacent side faces physically interpenetrate.
 *     So a lattice cube with 4+ occupied face-neighbours demands more distinct
 *     weld directions than a module physically has. Those arms cannot attach;
 *     the fitter leaves them floating, correctly.
 *   - A cube surrounded on all 6 sides is interior: invisible, unreachable, and
 *     pure wasted modules. The spec's "build hollow" rule.
 *   - Junctions packed adjacent to each other leave no straight run for an arm
 *     to leave along, so modules coil instead of lying straight.
 *
 * This module only MEASURES. It never edits the shape — a silent auto-repair
 * would hide exactly the information the user needs to pick a better shape.
 */
import { type Cell, key } from './lattice';

const DIRS: Cell[] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

export interface ShapeIssue {
  kind: 'overloaded-junction' | 'buried-cube' | 'adjacent-junctions';
  cells: Cell[];
  /** plain-English, written for someone deciding what to click next */
  detail: string;
}

export interface ShapeQuality {
  cubes: number;
  /** cubes with exactly 3 occupied neighbours — legal, but each costs a side weld */
  junctions: number;
  /** cubes with 4+ occupied neighbours — more weld directions than a module has */
  overloaded: number;
  /** cubes fully enclosed on all 6 sides */
  buried: number;
  /** worst face-neighbour count anywhere in the shape */
  maxDegree: number;
  issues: ShapeIssue[];
  /** true when nothing here will stop the fitter making one connected robot */
  buildable: boolean;
  summary: string;
}

export function shapeQuality(cells: Cell[]): ShapeQuality {
  const set = new Set(cells.map(key));
  const degree = new Map<string, number>();
  const cellOf = new Map<string, Cell>();

  for (const c of cells) {
    cellOf.set(key(c), c);
    let n = 0;
    for (const d of DIRS) {
      if (set.has(key([c[0] + d[0], c[1] + d[1], c[2] + d[2]] as Cell))) n++;
    }
    degree.set(key(c), n);
  }

  const overloadedCells: Cell[] = [];
  const buriedCells: Cell[] = [];
  let junctions = 0;
  let maxDegree = 0;

  for (const [k, n] of degree) {
    maxDegree = Math.max(maxDegree, n);
    if (n === 3) junctions++;
    // 6 is reported as buried rather than overloaded: same cube, but "it is
    // walled in" is the actionable description, not "it has too many arms".
    if (n === 6) buriedCells.push(cellOf.get(k)!);
    else if (n >= 4) overloadedCells.push(cellOf.get(k)!);
  }

  // Junctions sitting right next to each other: an arm leaving one immediately
  // hits the next, so there is no straight run for a module to lie along.
  const adjacentJunctions: Cell[] = [];
  for (const [k, n] of degree) {
    if (n < 3) continue;
    const c = cellOf.get(k)!;
    for (const d of DIRS) {
      const nk = key([c[0] + d[0], c[1] + d[1], c[2] + d[2]] as Cell);
      if ((degree.get(nk) ?? 0) >= 3) { adjacentJunctions.push(c); break; }
    }
  }

  const issues: ShapeIssue[] = [];
  if (overloadedCells.length) {
    issues.push({
      kind: 'overloaded-junction',
      cells: overloadedCells,
      detail: `${overloadedCells.length} cube(s) have 4 or more neighbours. A module has only two `
        + 'usable side welds and they must be on opposite faces, so arms past that cannot attach — '
        + 'they are left floating. Split the hub into two 3-way junctions a couple of cubes apart.',
    });
  }
  if (buriedCells.length) {
    issues.push({
      kind: 'buried-cube',
      cells: buriedCells,
      detail: `${buriedCells.length} cube(s) are walled in on all six sides. They are invisible and `
        + 'spend modules on nothing. Hollow the shape out — outlines and frames, not solid volumes.',
    });
  }
  if (adjacentJunctions.length) {
    issues.push({
      kind: 'adjacent-junctions',
      cells: adjacentJunctions,
      detail: `${adjacentJunctions.length} junction(s) touch another junction. An arm needs a couple `
        + 'of straight cubes to leave along; back to back, the modules coil instead of lying straight.',
    });
  }

  // Only the first two genuinely prevent a connected build. Adjacent junctions
  // make a worse-looking fit, not an impossible one, so they do not veto.
  const buildable = overloadedCells.length === 0 && buriedCells.length === 0;

  return {
    cubes: cells.length,
    junctions,
    overloaded: overloadedCells.length,
    buried: buriedCells.length,
    maxDegree,
    issues,
    buildable,
    summary: buildable
      ? (adjacentJunctions.length
          ? `buildable, but ${adjacentJunctions.length} junction(s) are crowded — expect some coiling`
          : 'buildable: every cube is within what one module can weld')
      : `not fully buildable: ${overloadedCells.length} overloaded junction(s), `
        + `${buriedCells.length} buried cube(s)`,
  };
}
