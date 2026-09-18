/**
 * skeleton.ts — read a cube shape as a SKELETON OF FEATURES, not a bag of cubes.
 *
 * WHY THIS FILE EXISTS
 * The old fit treated every cube as equally important and chased coverage: put
 * modules wherever they cover the most cubes, whatever pose that takes. That is
 * why builds came out as tangles. A cube is not a volume to be filled — it is a
 * POINT ON A DIAGRAM (rule 5): it says "the robot goes through here", it does
 * not say how wide the robot is, and making the cubes bigger must never mean two
 * modules per cube.
 *
 * What actually decides where a module belongs is what the shape DOES at a cube:
 *
 *   JUNCTION  three or more arms meet. A module's four side connectors all ride
 *             the midpoint of its big spine rod, so a junction wants a module's
 *             SPINE centred on it — then the other arms have somewhere to weld.
 *   CORNER    exactly two arms, not in line. The shape turns here, so a module
 *             wants one of its BEND joints exactly here — bending anywhere else
 *             puts the turn in the wrong place and rounds the corner off.
 *   TIP       one arm. Where a limb ends, and where a chain can start.
 *   RUN       the straight stretches in between. Nothing special is asked of a
 *             module there beyond lying straight along it.
 *
 * Junctions outrank corners outrank tips (rule 6): a 4-way crossing constrains a
 * module far more than a bend does, so it gets to choose first and the bend lives
 * with whatever phase is left over. That ordering is the whole reason a build can
 * come out looking like the drawing — if the low-constraint features are placed
 * first they eat the alignment the high-constraint ones needed.
 *
 * This file only MEASURES. It knows nothing about modules, poses or welding — it
 * hands the fitter a ranked list of what the shape asks for, and the fitter
 * decides what it can actually deliver.
 */
import { type Cell, type CellKey, key, unkey, add, neg, eq, sub, DIRS_6 } from './lattice';

export type FeatureKind = 'junction' | 'corner' | 'tip' | 'run';

export interface ShapeFeature {
  kind: FeatureKind;
  /** the cube the feature lives at */
  cell: Cell;
  /** unit directions of the occupied neighbours — the arms leaving this cube */
  arms: Cell[];
  /** number of occupied face-neighbours */
  degree: number;
  /**
   * Axes with BOTH directions occupied — a straight line passing through, listed
   * once per axis rather than once per direction.
   *
   * This is what a junction actually offers a module: a spine can only be centred
   * on the junction with the shape continuing out the far side, otherwise half
   * the module hangs in empty air. That is allowed, but paid for — see the
   * fitter's overshoot budget.
   */
  throughAxes: Cell[];
  /** how far the shape continues along each arm before it turns or ends */
  armLengths: number[];
  /** higher is served first — rule 6 */
  priority: number;
  /**
   * True for a feature that comes from a solid patch's FILL ROUTE
   * (serpentine.ts) rather than from the diagram's outline.
   *
   * The difference is worth marking because the two are not equally important.
   * An outline corner is the shape: bend somewhere else and the robot no longer
   * looks like the drawing. A fill U-turn is only the tidiest way found to
   * cover an area whose every route is inside the drawing either way — worth
   * steering toward, not worth outranking real coverage for.
   */
  fill?: boolean;
}

/** A maximal straight stretch of cubes. */
export interface ShapeRun {
  cells: Cell[];
  dir: Cell;
  from: Cell;
  to: Cell;
}

export interface ShapeSkeleton {
  degree: Map<CellKey, number>;
  features: ShapeFeature[];
  runs: ShapeRun[];
  junctions: Set<CellKey>;
  corners: Set<CellKey>;
  /**
   * One or two cubes: too little shape to say anything about (rule 1). The fitter
   * answers this with exactly one module, unfolded, however far it overhangs — a
   * diagram this small is a statement that SOMETHING is here, not a statement
   * about its size, and folding a module up to hide inside it would be answering
   * a question nobody asked.
   */
  degenerate: boolean;
}

/** Occupied face-neighbour directions of a cube. */
export function armsOf(cell: Cell, occ: Set<CellKey>): Cell[] {
  const out: Cell[] = [];
  for (const d of DIRS_6) if (occ.has(key(add(cell, d)))) out.push(d);
  return out;
}

/** Are these two directions the same axis, opposite ways? */
const isOpposite = (a: Cell, b: Cell) => eq(a, neg(b));

/**
 * Is this cube part of a solid patch rather than a branch in a skeleton?
 *
 * THIS IS THE DIFFERENCE BETWEEN A PLUS SIGN AND A SLAB. Counting neighbours
 * alone cannot tell them apart: the centre of a + has four arms and so does
 * every interior cube of a filled rectangle. But a + has nothing in its
 * diagonals, while a slab cube always closes a 2x2 square with two of its
 * neighbours — and that square is exactly what says "this is fill, not a
 * branch".
 *
 * It matters because the fit treats a junction as a demand: put a module's spine
 * on it, reserve its cube until something can. A 20-cube slab has sixteen cubes
 * with four neighbours each, and calling all sixteen junctions asks for sixteen
 * spines that cannot all exist, holds sixteen cubes hostage while the fit tries,
 * and reports fourteen failures at the end. None of that is true of the shape:
 * a slab is not asking for branches, it is asking to be filled. So a cube that
 * closes a 2x2 square is not a feature at all, and the fill just lays straight
 * modules across it (rule 7) — which is what a slab actually wants.
 */
export function inSolidPatch(cell: Cell, arms: Cell[], occ: Set<CellKey>): boolean {
  for (const u of arms) {
    for (const v of arms) {
      if (u[0] * v[0] + u[1] * v[1] + u[2] * v[2] !== 0) continue; // need perpendicular
      if (occ.has(key(add(add(cell, u), v)))) return true;
    }
  }
  return false;
}

/**
 * How far the shape runs from `cell` along `dir` before it stops.
 *
 * Capped, because nothing in the fit cares whether a corridor is 9 cubes or 90;
 * it only needs to know which arm is the longer one and whether an arm is long
 * enough for a module to lie along.
 */
export const ARM_SCAN_CAP = 8;

export function armLength(cell: Cell, dir: Cell, occ: Set<CellKey>): number {
  let n = 0;
  let c = cell;
  while (n < ARM_SCAN_CAP) {
    c = add(c, dir);
    if (!occ.has(key(c))) break;
    n++;
  }
  return n;
}

/**
 * Priority bands, rule 6. Each band is far enough above the next that no amount
 * of within-band detail can promote a corner over a junction — the ordering is a
 * hierarchy, not a score to be traded off.
 */
export const BAND_JUNCTION = 3_000_000;
export const BAND_CORNER = 2_000_000;
export const BAND_TIP = 1_000_000;
/**
 * Fill features (serpentine.ts) sit between the outline's corners and its tips:
 * below a corner the diagram actually draws, above a loose end.
 */
export const BAND_FILL = 1_500_000;

/**
 * Read a shape into ranked features.
 *
 * Order within the junction band is by degree first (a 4-way crossing before a
 * 3-way T), then by how many straight axes pass through it (a spine can only
 * centre on a through-axis, so a junction offering one is both more useful and
 * more demanding), then by total arm length, and finally by lattice key so that
 * two identical shapes always fit identically — a fit that changed between runs
 * would make every visual comparison meaningless.
 */
export function analyseShape(cells: Cell[]): ShapeSkeleton {
  const occ = new Set(cells.map(key));
  const degree = new Map<CellKey, number>();
  const junctions = new Set<CellKey>();
  const corners = new Set<CellKey>();
  const features: ShapeFeature[] = [];

  for (const c of cells) degree.set(key(c), armsOf(c, occ).length);

  for (const c of cells) {
    const arms = armsOf(c, occ);
    const armLengths = arms.map((a) => armLength(c, a, occ));
    const throughAxes: Cell[] = [];
    for (const a of arms) {
      // one entry per AXIS, not per direction, so +X and -X count once
      if (a[0] + a[1] + a[2] > 0 && arms.some((b) => isOpposite(a, b))) throughAxes.push(a);
    }
    const armTotal = armLengths.reduce((s, n) => s + n, 0);
    const k = key(c);

    if (arms.length >= 3 && !inSolidPatch(c, arms, occ)) {
      junctions.add(k);
      features.push({
        kind: 'junction',
        cell: c,
        arms,
        degree: arms.length,
        throughAxes,
        armLengths,
        priority: BAND_JUNCTION + arms.length * 10_000 + throughAxes.length * 1_000 + armTotal,
      });
    } else if (arms.length === 2 && !isOpposite(arms[0], arms[1])
               && !inSolidPatch(c, arms, occ)) {
      // A bend. Straight-through degree-2 cubes are not features at all — they
      // are the middle of a run, and a module lying along them asks nothing.
      corners.add(k);
      features.push({
        kind: 'corner',
        cell: c,
        arms,
        degree: 2,
        throughAxes,
        armLengths,
        priority: BAND_CORNER + armTotal,
      });
    } else if (arms.length <= 1) {
      features.push({
        kind: 'tip',
        cell: c,
        arms,
        degree: arms.length,
        throughAxes,
        armLengths,
        priority: BAND_TIP + armTotal,
      });
    }
  }

  features.sort((a, b) => (b.priority - a.priority) || (key(a.cell) < key(b.cell) ? -1 : 1));

  return {
    degree,
    features,
    runs: straightRuns(cells, occ),
    junctions,
    corners,
    degenerate: cells.length <= 2,
  };
}

/**
 * Cover the shape with maximal STRAIGHT stretches.
 *
 * Straight, because that is the only kind of stretch a module can lie along
 * without spending a bend (rule 7), so it is the unit the fill actually works in.
 * A cube where two runs cross belongs to BOTH, which is correct — a crossing
 * genuinely is part of both corridors, and forcing it to pick one is what made
 * the old snake decomposition shred junctions into two-cube stubs.
 */
export function straightRuns(cells: Cell[], occ = new Set(cells.map(key))): ShapeRun[] {
  const runs: ShapeRun[] = [];
  const AXES: Cell[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (const axis of AXES) {
    for (const c of cells) {
      if (occ.has(key(sub(c, axis)))) continue; // not the start of a run on this axis
      const line: Cell[] = [];
      let cur = c;
      while (occ.has(key(cur))) {
        line.push(cur);
        cur = add(cur, axis);
      }
      if (line.length >= 2) {
        runs.push({ cells: line, dir: axis, from: line[0], to: line[line.length - 1] });
      }
    }
  }
  return runs.sort((a, b) => b.cells.length - a.cells.length);
}

/**
 * How many straight-line stretches does this cube path take?
 *
 * 1 is a literal straight line, 2 is one clean corner, more is a staircase.
 * Counted on the geometry rather than trusting a pose's `bendPoseId`, which is
 * only the nearest named angle bucket — poses labelled "straight" routinely
 * zigzag through cube space and poses labelled "elbow" routinely turn out to be
 * four-step staircases.
 */
export function segmentCount(cells: readonly Cell[]): number {
  if (cells.length < 2) return 1;
  let segments = 1;
  let dir = sub(cells[1] as Cell, cells[0] as Cell);
  for (let i = 2; i < cells.length; i++) {
    const d = sub(cells[i] as Cell, cells[i - 1] as Cell);
    if (!eq(d, dir)) { segments++; dir = d; }
  }
  return segments;
}

/**
 * Every cube where a path turns, with the two arm directions leaving it.
 *
 * This answers what rule 2 is really asking: does this module's bend land exactly
 * on the shape's corner, turning the same way the shape turns? Arms are given as
 * OUTWARD directions from the turning cube, the same form `ShapeFeature.arms`
 * uses, so the two compare directly.
 */
export function pathTurns(cells: readonly Cell[]): { cell: Cell; arms: [Cell, Cell] }[] {
  const out: { cell: Cell; arms: [Cell, Cell] }[] = [];
  for (let i = 1; i < cells.length - 1; i++) {
    const dIn = sub(cells[i] as Cell, cells[i - 1] as Cell);
    const dOut = sub(cells[i + 1] as Cell, cells[i] as Cell);
    if (eq(dIn, dOut)) continue;
    // Only genuine axis-aligned turns count. A swept body regularly steps
    // DIAGONALLY between cubes (the centreline crosses a cube edge), and the
    // "turn" either side of such a step is an artefact of cube sampling, not a
    // joint bending — matching a shape's corner against one would put the real
    // bend somewhere else entirely.
    if (!isUnitStep(dIn) || !isUnitStep(dOut)) continue;
    out.push({ cell: cells[i] as Cell, arms: [neg(dIn), dOut] });
  }
  return out;
}

/** One step along one axis — the only kind of move a lattice arm is made of. */
const isUnitStep = (d: Cell) => Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]) === 1;

/** Do two unordered direction pairs describe the same turn? */
export function sameTurn(a: readonly [Cell, Cell], b: readonly [Cell, Cell]): boolean {
  return (eq(a[0], b[0]) && eq(a[1], b[1])) || (eq(a[0], b[1]) && eq(a[1], b[0]));
}

/** Cells of `cells` that are not part of `shape` — a placement's overshoot. */
export function outsideCount(cells: readonly Cell[], shape: Set<CellKey>): number {
  let n = 0;
  for (const c of cells) if (!shape.has(key(c))) n++;
  return n;
}

export { unkey };
