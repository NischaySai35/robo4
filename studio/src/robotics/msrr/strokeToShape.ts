/**
 * strokeToShape.ts — line/stroke input. Draw a path, get a structure.
 *
 * Two voxelisers, because two different things are wanted from a drawn line:
 *
 *  supercover — every cell the line passes through, even corner-clipping ones.
 *  The result is guaranteed face-connected, which is what a robot needs: a
 *  standard Bresenham line can step diagonally, and two cells touching only at an
 *  edge are NOT connected for a face-mating connector. That distinction is the
 *  reason this file does not just call a stock line-drawing routine.
 *
 *  thickened — supercover plus a radius, for strokes meant as solid limbs rather
 *  than single-module chains.
 *
 * Roadmap note: unbranched chains never self-collide, at any length, through any
 * number of corners. A single stroke is exactly that, which makes drawn input the
 * safest structure source in the app. Multi-stroke input reintroduces junctions,
 * so junctionCount() is reported back to the UI rather than hidden.
 */
import { type Cell, key, unkey, DIRS_6, add, groundCenter, configFromCells, occupiedNeighbors, cellsOf } from './lattice';

export type Point3 = [number, number, number];

/**
 * Cells a segment passes through, including partial corner cells.
 *
 * Walks the segment in small parametric steps and, whenever the rounded cell
 * changes by more than one axis at once, inserts the intermediate cells so the
 * chain never steps diagonally. Simple and robust; the alternative (a true 3D
 * supercover DDA) buys speed we do not need at stroke lengths.
 */
export function segmentCells(a: Point3, b: Point3): Cell[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const steps = Math.max(1, Math.ceil(len * 8));
  const out: Cell[] = [];
  const push = (c: Cell) => { if (!out.length || key(out[out.length - 1]) !== key(c)) out.push(c); };

  let prev: Cell | null = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cur: Cell = [
      Math.round(a[0] + dx * t),
      Math.round(a[1] + dy * t),
      Math.round(a[2] + dz * t),
    ];
    if (prev && key(prev) !== key(cur)) {
      // Bridge a diagonal step one axis at a time so the run stays face-connected.
      const walk: Cell = [...prev] as Cell;
      for (let axis = 0; axis < 3; axis++) {
        while (walk[axis] !== cur[axis]) {
          walk[axis] += Math.sign(cur[axis] - walk[axis]);
          push([walk[0], walk[1], walk[2]]);
        }
      }
    } else {
      push(cur);
    }
    prev = cur;
  }
  return out;
}

/** A whole polyline. Consecutive points are joined; the stroke stays connected. */
export function strokeCells(points: Point3[]): Cell[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [[Math.round(points[0][0]), Math.round(points[0][1]), Math.round(points[0][2])]];
  const out: Cell[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < points.length - 1; i++) {
    for (const c of segmentCells(points[i], points[i + 1])) {
      const k = key(c);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

/** Grow a cell set by `radius` lattice steps (6-neighbour dilation). */
export function thicken(cells: Cell[], radius: number): Cell[] {
  let cur = new Set(cells.map(key));
  for (let r = 0; r < Math.max(0, Math.round(radius)); r++) {
    const next = new Set(cur);
    for (const k of cur) {
      const c = unkey(k);
      for (const d of DIRS_6) next.add(key(add(c, d)));
    }
    cur = next;
  }
  return [...cur].map(unkey);
}

/** How many cells have 3+ connections — the branch junctions. */
export function junctionCount(cells: Cell[]): number {
  const cfg = configFromCells(cells);
  let n = 0;
  for (const c of cellsOf(cfg)) if (occupiedNeighbors(cfg, c).length >= 3) n++;
  return n;
}

export interface StrokeBuildOptions {
  /** dilation radius in cells; 0 keeps a single-module-wide chain */
  thickness: number;
  /** drop the whole structure so its lowest cell sits on y = 0 */
  ground: boolean;
}

export interface StrokeBuildResult {
  cells: Cell[];
  junctions: number;
  note: string;
}

/**
 * Turn one or more drawn strokes into a structure. Multiple strokes are unioned;
 * they may or may not touch, and the caller is told which (a disconnected result
 * is legal as *input* — the user may be mid-drawing — but the planner will refuse
 * to work from it, so saying so early is kinder than failing later).
 */
export function buildFromStrokes(
  strokes: Point3[][],
  options: Partial<StrokeBuildOptions> = {},
): StrokeBuildResult {
  const opts: StrokeBuildOptions = { thickness: 0, ground: true, ...options };
  const seen = new Set<string>();
  let cells: Cell[] = [];
  for (const s of strokes) {
    for (const c of strokeCells(s)) {
      const k = key(c);
      if (seen.has(k)) continue;
      seen.add(k);
      cells.push(c);
    }
  }
  if (opts.thickness > 0) cells = thicken(cells, opts.thickness);
  if (opts.ground && cells.length) {
    const minY = Math.min(...cells.map((c) => c[1]));
    cells = cells.map((c) => [c[0], c[1] - minY, c[2]] as Cell);
  }

  const junctions = junctionCount(cells);
  const pieces = componentCount(cells);
  const note = pieces > 1
    ? `${cells.length} modules in ${pieces} separate pieces — join them before planning`
    : junctions === 0
      ? `${cells.length} modules, unbranched chain (cannot self-collide)`
      : `${cells.length} modules, ${junctions} branch junction(s)`;

  return { cells: opts.ground ? cells : cells, junctions, note };
}

function componentCount(cells: Cell[]): number {
  const occ = new Set(cells.map(key));
  const seen = new Set<string>();
  let n = 0;
  for (const c of cells) {
    if (seen.has(key(c))) continue;
    n++;
    const stack = [c];
    seen.add(key(c));
    while (stack.length) {
      const cur = stack.pop() as Cell;
      for (const d of DIRS_6) {
        const nk = key(add(cur, d));
        if (occ.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(unkey(nk)); }
      }
    }
  }
  return n;
}

/** Ground-centre helper so stroke output lines up with library shapes. */
export const centerStroke = (cells: Cell[]) => groundCenter(cells);
