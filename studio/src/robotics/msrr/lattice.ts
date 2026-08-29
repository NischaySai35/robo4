/**
 * lattice.ts — the discrete configuration model for MSRR experiments.
 *
 * WHY A LATTICE AT ALL
 * Modular self-reconfigurable robot (MSRR) research models a robot as a set of
 * identical modules occupying cells of a regular lattice, connected face-to-face.
 * That abstraction is what makes reconfiguration *planning* tractable: the state
 * space becomes discrete and finite, connectivity becomes a graph property, and
 * collision becomes "is that cell occupied". The two standard motion abstractions
 * on top of it are the sliding-cube and pivoting-cube models (see moves.ts).
 *
 * This module owns the state only — occupancy, identity, connectivity, bounds.
 * Legal motion lives in moves.ts, search in planner.ts, geometry in executor.ts.
 *
 * Identity matters here: a Config is not just a set of cells, it's a mapping from
 * cell -> moduleId. Two configs with the same silhouette but different modules in
 * different places are different states to execute (different hardware commands),
 * even though they are the same *shape*. Shape comparison uses shapeKey().
 */

export type Cell = [number, number, number];
export type CellKey = string;

/** Cell -> "x,y,z". Integer cells only; the lattice is Z^3. */
export const key = (c: Cell): CellKey => `${c[0]},${c[1]},${c[2]}`;
export const unkey = (k: CellKey): Cell => {
  const p = k.split(',');
  return [+p[0], +p[1], +p[2]];
};

/** The six face directions. Face adjacency is the ONLY connection relation:
 *  edge/corner touching is not a connection (real connectors mate face-to-face). */
export const DIRS_6: readonly Cell[] = Object.freeze([
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
] as unknown as Cell[]);

export const add = (a: Cell, b: Cell): Cell => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Cell, b: Cell): Cell => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const neg = (a: Cell): Cell => [-a[0], -a[1], -a[2]];
export const eq = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
export const cross = (a: Cell, b: Cell): Cell => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const dot = (a: Cell, b: Cell) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const manhattan = (a: Cell, b: Cell) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

/** The four unit directions perpendicular to `d` (d must be one of DIRS_6). */
export function perpDirs(d: Cell): Cell[] {
  return DIRS_6.filter((e) => dot(e, d) === 0) as Cell[];
}

// ── Config ────────────────────────────────────────────────────────────────────

/**
 * A configuration: which module sits in which cell. Map preserves insertion
 * order, which we lean on for stable module numbering in the UI.
 */
export interface Config {
  /** cellKey -> moduleId */
  occ: Map<CellKey, string>;
}

export const emptyConfig = (): Config => ({ occ: new Map() });
export const cloneConfig = (c: Config): Config => ({ occ: new Map(c.occ) });
export const size = (c: Config) => c.occ.size;
export const isOccupied = (c: Config, cell: Cell) => c.occ.has(key(cell));
export const cellsOf = (c: Config): Cell[] => [...c.occ.keys()].map(unkey);
export const moduleAt = (c: Config, cell: Cell) => c.occ.get(key(cell)) ?? null;

/** Where is module `id`? O(n) — fine at experiment scale, and keeps state single-sourced. */
export function cellOfModule(c: Config, id: string): Cell | null {
  for (const [k, m] of c.occ) if (m === id) return unkey(k);
  return null;
}

/** Build a config from bare cells, minting module ids m0..m(n-1) in the given order. */
export function configFromCells(cells: Cell[], prefix = 'm'): Config {
  const occ = new Map<CellKey, string>();
  let i = 0;
  for (const c of cells) {
    const k = key(c);
    if (occ.has(k)) continue; // dedupe silently; callers pass generated shapes
    occ.set(k, `${prefix}${i++}`);
  }
  return { occ };
}

/** Move module out of `from` into `to`. Returns a copy; `from` must be occupied. */
export function withMoved(c: Config, from: Cell, to: Cell): Config {
  const next = cloneConfig(c);
  const id = next.occ.get(key(from));
  if (id === undefined) return next;
  next.occ.delete(key(from));
  next.occ.set(key(to), id);
  return next;
}

// ── connectivity ──────────────────────────────────────────────────────────────

/** Occupied face-neighbours of `cell`. */
export function occupiedNeighbors(c: Config, cell: Cell): Cell[] {
  const out: Cell[] = [];
  for (const d of DIRS_6) {
    const n = add(cell, d);
    if (c.occ.has(key(n))) out.push(n);
  }
  return out;
}

/**
 * Is the whole structure one connected piece? This is THE invariant of
 * reconfiguration planning: a module may never detach in a way that splits the
 * robot, because the two halves would then have no way to command or reach each
 * other. Every move generator filters on this.
 */
export function isConnected(c: Config): boolean {
  if (c.occ.size <= 1) return true;
  const start = c.occ.keys().next().value as CellKey;
  return reachableCount(c.occ, start) === c.occ.size;
}

function reachableCount(occ: Map<CellKey, string>, start: CellKey): number {
  const seen = new Set<CellKey>([start]);
  const stack: CellKey[] = [start];
  while (stack.length) {
    const cur = unkey(stack.pop() as CellKey);
    for (const d of DIRS_6) {
      const nk = key(add(cur, d));
      if (occ.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(nk); }
    }
  }
  return seen.size;
}

/** Would the rest stay connected if the module at `cell` lifted off? */
export function isConnectedWithout(c: Config, cell: Cell): boolean {
  const k = key(cell);
  if (!c.occ.has(k)) return isConnected(c);
  if (c.occ.size <= 2) return true;
  const occ = new Map(c.occ);
  occ.delete(k);
  const start = occ.keys().next().value as CellKey;
  return reachableCount(occ, start) === occ.size;
}

/**
 * Cells whose removal would disconnect the structure (graph articulation points).
 * These are exactly the modules that are NOT free to move on this step — useful
 * both as a planner filter and as a viewport overlay ("locked" modules).
 */
export function articulationCells(c: Config): Set<CellKey> {
  const out = new Set<CellKey>();
  if (c.occ.size <= 2) return out;

  // Iterative Tarjan (recursion would blow the stack on large lattices).
  const disc = new Map<CellKey, number>();
  const low = new Map<CellKey, number>();
  const parent = new Map<CellKey, CellKey | null>();
  let timer = 0;

  const root = c.occ.keys().next().value as CellKey;
  const stack: { k: CellKey; ni: number }[] = [];
  disc.set(root, timer); low.set(root, timer); timer++;
  parent.set(root, null);
  stack.push({ k: root, ni: 0 });

  while (stack.length) {
    const top = stack[stack.length - 1];
    if (top.ni < DIRS_6.length) {
      const nb = key(add(unkey(top.k), DIRS_6[top.ni]));
      top.ni++;
      if (!c.occ.has(nb)) continue;
      if (!disc.has(nb)) {
        parent.set(nb, top.k);
        disc.set(nb, timer); low.set(nb, timer); timer++;
        stack.push({ k: nb, ni: 0 });
      } else if (nb !== parent.get(top.k)) {
        low.set(top.k, Math.min(low.get(top.k) as number, disc.get(nb) as number));
      }
    } else {
      stack.pop();
      const p = parent.get(top.k) ?? null;
      if (p !== null) {
        low.set(p, Math.min(low.get(p) as number, low.get(top.k) as number));
        const pIsRoot = parent.get(p) === null;
        if (!pIsRoot && (low.get(top.k) as number) >= (disc.get(p) as number)) out.add(p);
      }
    }
  }
  // The root is an articulation point iff it has more than one DFS child.
  let rootChildren = 0;
  for (const [k, p] of parent) if (p === root && k !== root) rootChildren++;
  if (rootChildren > 1) out.add(root);
  return out;
}

// ── shape / bounds ────────────────────────────────────────────────────────────

export interface Bounds { min: Cell; max: Cell; size: Cell; }

export function bounds(cells: Cell[]): Bounds {
  if (!cells.length) return { min: [0, 0, 0], max: [0, 0, 0], size: [0, 0, 0] };
  const min: Cell = [Infinity, Infinity, Infinity];
  const max: Cell = [-Infinity, -Infinity, -Infinity];
  for (const c of cells) {
    for (let i = 0; i < 3; i++) {
      if (c[i] < min[i]) min[i] = c[i];
      if (c[i] > max[i]) max[i] = c[i];
    }
  }
  return { min, max, size: [max[0] - min[0] + 1, max[1] - min[1] + 1, max[2] - min[2] + 1] };
}

export const translateCells = (cells: Cell[], t: Cell): Cell[] => cells.map((c) => add(c, t));

/** Shift a shape so its bounding box starts at the origin (and rests on y=0). */
export function normalize(cells: Cell[]): Cell[] {
  const b = bounds(cells);
  return translateCells(cells, [-b.min[0], -b.min[1], -b.min[2]]);
}

/** Centre a shape on the X/Z origin, keeping it standing on y=0. */
export function groundCenter(cells: Cell[]): Cell[] {
  const n = normalize(cells);
  const b = bounds(n);
  return translateCells(n, [-Math.floor(b.size[0] / 2), 0, -Math.floor(b.size[2] / 2)]);
}

/** Translation-invariant signature — two configs with the same key are the same shape. */
export function shapeKey(cells: Cell[]): string {
  return normalize(cells).map(key).sort().join('|');
}

/** Cells adjacent to the structure but empty — candidate growth sites. */
export function frontier(cells: Cell[]): Cell[] {
  const occ = new Set(cells.map(key));
  const out = new Set<CellKey>();
  for (const c of cells) {
    for (const d of DIRS_6) {
      const k = key(add(c, d));
      if (!occ.has(k)) out.add(k);
    }
  }
  return [...out].map(unkey);
}

/**
 * Grow or shrink a shape to exactly `n` cells while keeping it connected.
 *
 * Reconfiguration needs equal module counts on both ends — you cannot turn 20
 * modules into a 34-cell car. Rather than refusing, we resize the *target* to
 * the module budget: shrink by peeling non-articulation cells furthest from the
 * centroid (keeps the recognisable core), grow by filling frontier cells nearest
 * the centroid (keeps it compact rather than sprouting a whisker).
 */
export function fitToCount(cells: Cell[], n: number): Cell[] {
  let cur = [...cells];
  if (n <= 0) return [];
  if (!cur.length) {
    // Degenerate input: emit a compact column so downstream code always has a shape.
    for (let i = 0; i < n; i++) cur.push([0, i, 0]);
    return cur;
  }

  const centroid = (): [number, number, number] => {
    let x = 0, y = 0, z = 0;
    for (const c of cur) { x += c[0]; y += c[1]; z += c[2]; }
    return [x / cur.length, y / cur.length, z / cur.length];
  };
  const distSq = (c: Cell, p: [number, number, number]) =>
    (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2;

  while (cur.length > n) {
    const locked = articulationCells(configFromCells(cur));
    const cen = centroid();
    const removable = cur
      .filter((c) => !locked.has(key(c)))
      .sort((a, b) => distSq(b, cen) - distSq(a, cen));
    // Every cell being an articulation point means a pure chain — peel an endpoint.
    const victim = removable[0] ?? cur.reduce((a, b) => (distSq(b, cen) > distSq(a, cen) ? b : a));
    cur = cur.filter((c) => !eq(c, victim));
  }

  while (cur.length < n) {
    const cen = centroid();
    const f = frontier(cur).sort((a, b) => distSq(a, cen) - distSq(b, cen));
    if (!f.length) break;
    cur.push(f[0]);
  }
  return cur;
}

/**
 * Best translation of `goal` onto `start`, by overlap count.
 *
 * This is the cheap half of "maximum-commonality decomposition": modules already
 * sitting in a cell the target also wants never have to move at all, so aligning
 * the target to maximise that overlap is the single biggest win available before
 * any search runs. We scan translations over the union bounding box (padded),
 * which is small at experiment scale and exact within that window.
 */
export function bestAlignment(startCells: Cell[], goalCells: Cell[]): Cell {
  if (!startCells.length || !goalCells.length) return [0, 0, 0];
  const sOcc = new Set(startCells.map(key));
  const sb = bounds(startCells);
  const gb = bounds(goalCells);
  const pad = 1;
  let best: Cell = [0, 0, 0];
  let bestScore = -1;
  // Scan every translation where the two bounding boxes could touch at all.
  //
  // The range has to run from "goal's far edge just meets start's near edge" to
  // "goal's near edge just meets start's far edge". An earlier version used
  // (sb.min - gb.min) .. (sb.max - gb.max), which is the range where the goal
  // sits ENTIRELY INSIDE the start's box — so whenever the goal was larger on
  // any axis those bounds crossed, the loop ran zero times, and it returned a
  // zero shift having compared nothing. Silent, and it made shapes that overlap
  // perfectly well report no overlap at all.
  for (let x = sb.min[0] - gb.max[0] - pad; x <= sb.max[0] - gb.min[0] + pad; x++) {
    for (let y = sb.min[1] - gb.max[1] - pad; y <= sb.max[1] - gb.min[1] + pad; y++) {
      for (let z = sb.min[2] - gb.max[2] - pad; z <= sb.max[2] - gb.min[2] + pad; z++) {
        let score = 0;
        for (const c of goalCells) if (sOcc.has(key([c[0] + x, c[1] + y, c[2] + z]))) score++;
        if (score > bestScore) { bestScore = score; best = [x, y, z]; }
      }
    }
  }
  return best;
}

/** How the current config differs from a target cell set (assumed already aligned). */
export interface ConfigDiff {
  /** cells the config already has and the target wants — these modules stay put */
  common: Cell[];
  /** cells the config occupies that the target does not want — sources */
  surplus: Cell[];
  /** cells the target wants that are empty — sinks */
  missing: Cell[];
}

export function diff(c: Config, goalCells: Cell[]): ConfigDiff {
  const gOcc = new Set(goalCells.map(key));
  const common: Cell[] = [];
  const surplus: Cell[] = [];
  for (const k of c.occ.keys()) (gOcc.has(k) ? common : surplus).push(unkey(k));
  const missing = goalCells.filter((g) => !c.occ.has(key(g)));
  return { common, surplus, missing };
}
