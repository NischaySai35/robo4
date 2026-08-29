/**
 * fitModules.ts — Build: put real modules into a cube shape.
 *
 * THE SEPARATION THIS FILE FINALLY MAKES
 * The cubes are a SHAPE DIAGRAM. They are not modules and they carry no
 * kinematics — they are a way of saying "the robot should look like this",
 * exactly as a drawn line or a text prompt is. Nothing about a cube says which
 * module is where, which connector welds to which, or how anything bends.
 *
 * This file is the step that turns that diagram into an actual robot: decompose
 * the shape into runs, then walk modules along them, each one anchored to the
 * last, choosing a fold that carries its free end as far along the run as it can
 * reach. Modules come out in build order, so they can be shown appearing one at
 * a time the way they would actually be assembled.
 *
 * A module is NOT one cube. Straight it bridges four; folded, fewer (see
 * chainMoves.ts). So a 20-cube shape is nothing like 20 modules, and how many it
 * takes is an OUTPUT of this fit, never an input.
 *
 * THE PIPELINE, following the shape of the MODULINK cube builder:
 *
 *   1. DECOMPOSE  shape -> maximal simple runs, cut at every junction and leaf.
 *                 A straight corridor of ten cubes is ONE run, not nine edges.
 *   2. ORDER      sort runs so each is built after something it touches, and is
 *                 oriented to start at the cube it hangs off — so it always has a
 *                 real connector to weld onto rather than being placed blind.
 *   3. FIT        walk modules along each run using the precomputed reach table.
 *
 *   4. WELD       join the resulting chains to each other, free end onto another
 *                 module's connector, so the output is one robot rather than
 *                 several. Whatever cannot be joined is reported, not hidden.
 */
import { type Cell, key, unkey, DIRS_6, add, eq } from './lattice';
import { type LatticePose, reachTable } from './chainMoves';
import { type ConnectorEnd, SIDE_ENDS, weldTypeIsLegal, oppositeSideEnd } from './modulink';

// ── lattice rotations ─────────────────────────────────────────────────────────

/**
 * The reach table is computed with connector A at the origin facing +Z and the
 * chain running toward -Z. To place a module travelling in some other direction,
 * its entries are rotated by whichever of these maps +Z onto the needed facing.
 *
 * Only six are needed, not the full twenty-four: the remaining freedom is roll
 * about the chain axis, and the table already contains that as its first-twist
 * variants. All six are proper rotations (determinant +1) — a reflection here
 * would silently mirror the module's chirality.
 */
const ROTATIONS: Record<string, (c: Cell) => Cell> = {
  '0,0,1': (c) => [c[0], c[1], c[2]],
  '0,0,-1': (c) => [c[0], -c[1], -c[2]],
  '1,0,0': (c) => [c[2], c[1], -c[0]],
  '-1,0,0': (c) => [-c[2], c[1], c[0]],
  '0,1,0': (c) => [c[0], c[2], -c[1]],
  '0,-1,0': (c) => [c[0], -c[2], c[1]],
};

/** Rotation carrying +Z onto `dir`. */
export const rotationTo = (dir: Cell) => ROTATIONS[key(dir)] ?? ROTATIONS['0,0,1'];

/**
 * The inverse of rotationTo(dir): carries a WORLD vector back into the module's
 * local frame (anchor at origin, chain nominally along -Z). Each ROTATIONS entry
 * is a proper rotation (orthogonal, determinant +1), so its inverse is its
 * transpose — built here by applying the forward rotation to the standard basis
 * and reading the result as the transpose's rows, rather than hand-deriving six
 * more formulas that could individually drift out of sync with ROTATIONS.
 */
export function inverseRotationTo(dir: Cell): (c: Cell) => Cell {
  const rot = rotationTo(dir);
  const ex = rot([1, 0, 0]);
  const ey = rot([0, 1, 0]);
  const ez = rot([0, 0, 1]);
  return (v: Cell): Cell => [
    ex[0] * v[0] + ex[1] * v[1] + ex[2] * v[2],
    ey[0] * v[0] + ey[1] * v[1] + ey[2] * v[2],
    ez[0] * v[0] + ez[1] * v[1] + ez[2] * v[2],
  ];
}

const negCell = (c: Cell): Cell => [-c[0], -c[1], -c[2]];
const subCell = (a: Cell, b: Cell): Cell => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

// ── 1. decompose ──────────────────────────────────────────────────────────────

/** Occupied face-neighbours of a cube within the shape. */
function neighboursOf(cell: Cell, occ: Set<string>): Cell[] {
  const out: Cell[] = [];
  for (const d of DIRS_6) {
    const n = add(cell, d);
    if (occ.has(key(n))) out.push(n);
  }
  return out;
}

/**
 * Cover a cube shape with as few long runs as possible.
 *
 * WHY NOT CUT AT JUNCTIONS
 * The obvious decomposition — walk through degree-2 cubes, break at every leaf
 * and junction — is right for a thin skeleton and useless for anything solid. In
 * a slab almost every cube has three or more neighbours, so every single edge
 * becomes its own two-cube run, and no module can be fitted to a two-cube run:
 * bridging exactly one cube in a straight line needs the chain to coil right up
 * and come back, which the geometry does not allow. A 24-cube chair decomposed
 * that way produced 25 runs and zero modules.
 *
 * So runs are found by greedy path cover instead. Start at the most isolated
 * remaining cube — a tip — and walk, always stepping to the neighbour with the
 * fewest onward options left. That is Warnsdorff's rule, and it is what stops
 * the walk from cutting itself off in a corner while unvisited cubes remain.
 * Long corridors still come out as single runs, and solid regions come out as
 * snakes through the volume rather than confetti.
 *
 * Each cube belongs to exactly one run, so runs do not share cubes and the
 * chains fitted to them are separate. Welding those chains to each other is a
 * side-connector problem this file does not solve yet; fitModules reports how
 * many separate chains came out rather than implying one connected robot.
 */
export function cubePaths(cells: Cell[]): Cell[][] {
  const remaining = new Set(cells.map(key));
  const paths: Cell[][] = [];

  const openNeighbours = (c: Cell): Cell[] => {
    const out: Cell[] = [];
    for (const d of DIRS_6) {
      const n = add(c, d);
      if (remaining.has(key(n))) out.push(n);
    }
    return out;
  };

  while (remaining.size) {
    // Seed at a tip: the remaining cube with the fewest remaining neighbours.
    let start: Cell = unkey(remaining.values().next().value as string);
    let bestDeg = Infinity;
    for (const k of remaining) {
      const c = unkey(k);
      const d = openNeighbours(c).length;
      if (d < bestDeg) { bestDeg = d; start = c; }
      if (d === 0 || d === 1) break; // cannot do better than an endpoint
    }

    const path: Cell[] = [];
    let cur = start;
    for (;;) {
      path.push(cur);
      remaining.delete(key(cur));
      const nbrs = openNeighbours(cur);
      if (!nbrs.length) break;
      // Warnsdorff: prefer the most constrained neighbour, so the walk does not
      // strand cubes it can no longer get back to.
      let next = nbrs[0];
      let fewest = Infinity;
      for (const n of nbrs) {
        const d = openNeighbours(n).length;
        if (d < fewest) { fewest = d; next = n; }
      }
      cur = next;
    }
    paths.push(path);
  }
  return paths;
}

// ── 2. order ──────────────────────────────────────────────────────────────────

export interface PlannedPath {
  path: Cell[];
  /** the cube this run hangs off, if it is not the first of its component */
  anchorCube: Cell | null;
}

/**
 * Order runs so each is built after one it touches, and oriented to START at the
 * shared cube. Each component is seeded with its longest run — the most
 * trunk-like — and the rest grow off it breadth-first.
 */
export function orderPaths(paths: Cell[][]): PlannedPath[] {
  const remaining = paths.map((p, i) => ({ p, i }));
  const out: PlannedPath[] = [];
  const placed = new Set<string>();

  while (remaining.length) {
    // Seed: the longest run touching anything already placed, else the longest overall.
    let seedIdx = 0;
    let seedScore = -1;
    for (let i = 0; i < remaining.length; i++) {
      const touches = remaining[i].p.some((c) => placed.has(key(c)));
      const score = (touches ? 1e6 : 0) + remaining[i].p.length;
      if (score > seedScore) { seedScore = score; seedIdx = i; }
    }
    const { p } = remaining.splice(seedIdx, 1)[0];

    // Orient so index 0 is the cube it hangs off, when it hangs off anything.
    let path = p;
    let anchorCube: Cell | null = null;
    if (placed.size) {
      if (placed.has(key(p[p.length - 1])) && !placed.has(key(p[0]))) {
        path = [...p].reverse();
      }
      if (placed.has(key(path[0]))) anchorCube = path[0];
    }

    out.push({ path, anchorCube });
    for (const c of path) placed.add(key(c));
  }
  return out;
}

// ── 3. fit ────────────────────────────────────────────────────────────────────

export interface FittedModule {
  id: string;
  /** cube connector A sits in */
  anchorCell: Cell;
  /** outward normal of connector A */
  anchorDir: Cell;
  /** cube connector B lands in */
  endCell: Cell;
  /** outward normal of connector B */
  endDir: Cell;
  /** cubes this module's body passes through */
  cells: Cell[];
  /** cubes of reach it spans, A to B */
  reach: number;
  pose: LatticePose;
  /** the module it welded onto when it was placed, if any */
  weldedTo: string | null;
  /** index in build order */
  order: number;
  /** which chain this module belongs to */
  chain: number;
}

/** A connector on a placed module, in world lattice coordinates. */
export interface PlacedConnector {
  moduleId: string;
  end: ConnectorEnd;
  /** cube it sits in */
  cell: Cell;
  /** outward normal */
  dir: Cell;
}

/** A weld joining two chains that the end-to-end fit left separate. */
export interface ChainWeldLink {
  fromModule: string;
  fromEnd: ConnectorEnd;
  toModule: string;
  toEnd: ConnectorEnd;
  cell: Cell;
}

/**
 * All six connectors of a placed module, in world cubes.
 *
 * A and B are exact — they sit at cube centres by construction. The four side
 * connectors are the lattice's approximation: physically they stand 0.6 units
 * off the rod axis, about two thirds of a cube, so "the big rod's midpoint cube,
 * facing outward" is where they are treated as being. That looseness is real and
 * is why a side weld found here should be verified in continuous space before it
 * is trusted in metal.
 */
export function connectorsOf(m: FittedModule): PlacedConnector[] {
  const out: PlacedConnector[] = [
    { moduleId: m.id, end: 'A', cell: m.anchorCell, dir: m.anchorDir },
    { moduleId: m.id, end: 'B', cell: m.endCell, dir: m.endDir },
  ];
  const rot = rotationTo(m.anchorDir);
  const midCell = add(m.anchorCell, rot(m.pose.midOffset));
  m.pose.sideDirs.forEach((d, i) => {
    out.push({ moduleId: m.id, end: SIDE_ENDS[i] ?? 'UP', cell: midCell, dir: rot(d) });
  });
  return out;
}

export interface FitResult {
  modules: FittedModule[];
  /** cubes of the shape at least one module body covers */
  covered: Cell[];
  /** cubes no module could reach — the fit is incomplete wherever this is non-empty */
  uncovered: Cell[];
  /** how many separate chains the end-to-end fit produced */
  runs: number;
  /** welds joining those chains to each other */
  chainWelds: ChainWeldLink[];
  /** separate pieces AFTER chain welding — 1 means one connected robot */
  components: number;
  log: string[];
}

interface FitState {
  /** cubes of the shape diagram — a reference for where connectors should go */
  shape: Set<string>;
  /** shape cubes no module body covers yet */
  uncovered: Set<string>;
  /** cubes already filled by a placed module's body — a hard collision set */
  bodyOcc: Set<string>;
  modules: FittedModule[];
  log: string[];
  nextId: number;
  /** index of the chain currently being grown */
  chain: number;
  /** every connector of every placed module, indexed by the cube it sits in */
  conn: Map<string, PlacedConnector[]>;
}

interface Placement {
  pose: LatticePose;
  cells: Cell[];
  endCell: Cell;
  endDir: Cell;
  /** shape cubes this module would newly cover */
  gain: number;
}

/**
 * The best module to place, anchored at `anchorCell` and travelling in `travel`.
 *
 * Scored on NEW SHAPE CUBES COVERED first, reach second. Covering the diagram is
 * the actual goal; reach is only a tie-break, because two folds that cover the
 * same amount are equally good structurally and the longer one uses no extra
 * parts. Returns null when nothing covers anything new, which is what ends a chain.
 */
function bestPlacement(
  anchorCell: Cell,
  travel: Cell,
  st: FitState,
  table: LatticePose[],
): Placement | null {
  const rot = rotationTo(negCell(travel)); // A faces back down the way we came
  let best: Placement | null = null;

  for (const pose of table) {
    const endCell = add(anchorCell, rot(pose.endOffset));
    // The free end has to land ON the diagram — that is what the cubes are for.
    if (!st.shape.has(key(endCell))) continue;

    const cells = pose.cells.map((c) => add(anchorCell, rot(c)));

    // HARD: the body may not pass through another module. It MAY share the
    // anchor cube, which is exactly where it welds onto its predecessor.
    let collides = false;
    let gain = 0;
    for (const c of cells) {
      const k = key(c);
      if (!eq(c, anchorCell) && st.bodyOcc.has(k)) { collides = true; break; }
      if (st.uncovered.has(k)) gain++;
    }
    if (collides || gain === 0) continue;

    if (!best || gain > best.gain || (gain === best.gain && pose.reach > best.pose.reach)) {
      best = { pose, cells, endCell, endDir: rot(pose.endDir), gain };
    }
  }
  return best;
}

/** Commit a placement and return the module. */
function place(p: Placement, anchorCell: Cell, travel: Cell, prev: string | null, st: FitState): FittedModule {
  const m: FittedModule = {
    id: `M${st.nextId++}`,
    anchorCell,
    anchorDir: negCell(travel),
    endCell: p.endCell,
    endDir: p.endDir,
    cells: p.cells,
    reach: p.pose.reach,
    pose: p.pose,
    weldedTo: prev,
    order: st.modules.length,
    chain: st.chain,
  };
  st.modules.push(m);
  for (const c of p.cells) {
    st.bodyOcc.add(key(c));
    st.uncovered.delete(key(c));
  }
  for (const c of connectorsOf(m)) {
    const k = key(c.cell);
    const list = st.conn.get(k);
    if (list) list.push(c); else st.conn.set(k, [c]);
  }
  return m;
}

/**
 * Could a free end at `cell` facing `dir` weld onto something already built?
 * A weld needs a partner in the cube we face, pointing back at us, of a type
 * this connector design can actually make.
 */
function canWeldInto(cell: Cell, dir: Cell, end: ConnectorEnd, st: FitState): boolean {
  for (const other of st.conn.get(key(cell)) ?? []) {
    if (!weldTypeIsLegal(end, other.end)) continue;
    if (eq(other.dir, negCell(dir))) return true;
  }
  return false;
}

/**
 * Start a chain by welding its first module onto an existing free connector.
 *
 * This is what keeps the build ONE robot. Growing a fresh chain from an
 * arbitrary uncovered cube produces a piece floating unattached; anchoring it on
 * a connector that is already there means it is joined from its very first
 * module, by construction rather than by luck.
 */
function growFromConnector(
  conn: PlacedConnector,
  st: FitState,
  table: LatticePose[],
): { count: number; weldedTo: string } | null {
  // The new module's A sits in the same cube facing back — that is what a weld is.
  const anchorCell = conn.cell;
  const travel = conn.dir;
  if (!weldTypeIsLegal('A', conn.end)) return null;

  const p = bestPlacement(anchorCell, travel, st, table);
  if (!p) return null;

  let prev = place(p, anchorCell, travel, conn.moduleId, st).id;
  let anchor = p.endCell;
  let dir = p.endDir;
  let count = 1;
  let guard = 0;
  while (guard++ < 500) {
    const next = bestPlacement(anchor, dir, st, table);
    if (!next) break;
    prev = place(next, anchor, dir, prev, st).id;
    anchor = next.endCell;
    dir = next.endDir;
    count++;
  }
  return { count, weldedTo: conn.moduleId };
}

/**
 * Grow one chain from `seed`, module after module, each welded to the last.
 *
 * The next module's travel direction is NOT a free choice: a weld opposes
 * outward normals, so the previous module's end facing dictates where the next
 * one points. That is enforced rather than assumed, and it is why a chain can
 * legitimately run out of moves while shape cubes remain — the geometry, not a
 * bug. Whatever is left seeds another chain.
 */
function growChain(seed: Cell, st: FitState, table: LatticePose[]): number {
  // Opening move: try every direction. Coverage still decides, but a start that
  // can WELD ONTO WHAT IS ALREADY BUILT is worth a lot — an unattached chain is
  // a separate robot, and the whole point of the build is one connected thing.
  let opening: { p: Placement; travel: Cell; score: number } | null = null;
  for (const d of DIRS_6) {
    const p = bestPlacement(seed, d, st, table);
    if (!p) continue;
    const anchorDir = negCell(d);
    const joins = canWeldInto(seed, anchorDir, 'A', st)
      || canWeldInto(p.endCell, p.endDir, 'B', st);
    const score = p.gain * 10 + (joins ? 1000 : 0);
    if (!opening || score > opening.score) opening = { p, travel: d, score };
  }
  if (!opening) return 0;

  let prev = place(opening.p, seed, opening.travel, null, st).id;
  let anchor = opening.p.endCell;
  let travel = opening.p.endDir;
  let count = 1;

  let guard = 0;
  while (guard++ < 500) {
    const p = bestPlacement(anchor, travel, st, table);
    if (!p) break;
    prev = place(p, anchor, travel, prev, st).id;
    anchor = p.endCell;
    travel = p.endDir;
    count++;
  }
  return count;
}

/**
 * Weld separate chains into one robot.
 *
 * The end-to-end fit produces chains that are each internally welded but
 * mutually unattached. This joins them the way the gait says a module joins
 * anything: a FREE END reaches onto another module's connector. End-to-end and
 * end-to-side are both allowed; side-to-side never is, so a weld always has at
 * least one free end in it.
 *
 * Greedy and union-find guided: only welds that actually merge two different
 * chains are taken, so no effort is spent adding redundant links inside a chain
 * that is already connected. Whatever cannot be joined is reported.
 */
export function weldChains(modules: FittedModule[]): {
  welds: ChainWeldLink[]; components: number; log: string[];
} {
  const log: string[] = [];
  if (modules.length < 2) return { welds: [], components: modules.length ? 1 : 0, log };

  // Union-find over modules, seeded with the end-to-end welds the fit already made.
  const parent = new Map<string, string>();
  const find = (a: string): string => {
    let r = a;
    while (parent.get(r) !== r) r = parent.get(r) as string;
    while (parent.get(a) !== r) { const n = parent.get(a) as string; parent.set(a, r); a = n; }
    return r;
  };
  const union = (a: string, b: string) => { parent.set(find(a), find(b)); };
  for (const m of modules) parent.set(m.id, m.id);
  for (const m of modules) if (m.weldedTo) union(m.id, m.weldedTo);

  // Every connector, indexed by the cube it sits in.
  const byId = new Map(modules.map((m) => [m.id, m]));
  const all: PlacedConnector[] = [];
  for (const m of modules) all.push(...connectorsOf(m));

  const atCell = new Map<string, PlacedConnector[]>();
  for (const c of all) {
    const k = key(c.cell);
    const list = atCell.get(k);
    if (list) list.push(c); else atCell.set(k, [c]);
  }

  // Sides already carrying a weld, for the two-opposite-faces rule.
  const usedSides = new Map<string, ConnectorEnd[]>();
  const sidesOf = (id: string) => usedSides.get(id) ?? [];
  const noteSide = (id: string, end: ConnectorEnd) => {
    if (end === 'A' || end === 'B') return;
    usedSides.set(id, [...sidesOf(id), end]);
  };
  const sideBlocked = (id: string, end: ConnectorEnd) => {
    if (end === 'A' || end === 'B') return false;
    const used = sidesOf(id);
    if (used.length >= 2) return true;
    return used.some((u) => u !== end && oppositeSideEnd(u) !== end);
  };

  const welds: ChainWeldLink[] = [];

  // A weld forces two connectors to the SAME POINT with opposed outward normals —
  // they are not in neighbouring cubes, they are in the same one facing opposite
  // ways. That is also how the chain's own end-to-end welds sit: the next
  // module's A occupies the cube the previous module's B ended in.
  for (const from of all) {
    if (from.end !== 'A' && from.end !== 'B') continue; // only a free END travels
    const meetCell = from.cell;
    for (const to of atCell.get(key(meetCell)) ?? []) {
      if (to.moduleId === from.moduleId) continue;
      if (find(from.moduleId) === find(to.moduleId)) continue; // already one piece
      if (!weldTypeIsLegal(from.end, to.end)) continue;
      if (!eq(to.dir, negCell(from.dir))) continue; // must face back at us
      if (sideBlocked(to.moduleId, to.end) || sideBlocked(from.moduleId, from.end)) continue;

      welds.push({
        fromModule: from.moduleId, fromEnd: from.end,
        toModule: to.moduleId, toEnd: to.end,
        cell: meetCell,
      });
      noteSide(to.moduleId, to.end);
      noteSide(from.moduleId, from.end);
      union(from.moduleId, to.moduleId);
      break;
    }
  }

  const roots = new Set(modules.map((m) => find(m.id)));
  if (welds.length) log.push(`joined chains with ${welds.length} connector weld(s)`);
  if (roots.size > 1) {
    log.push(
      `${roots.size} pieces remain unattached — no free end of one lands on a connector of `
      + 'another. They are separate robots until the shape brings them within reach.',
    );
  }
  void byId;
  return { welds, components: roots.size, log };
}

/**
 * Build: fit real modules into a cube shape.
 *
 * Returns them in build order, along with whatever could not be covered. An
 * incomplete fit is reported as incomplete — a shape whose corridors are too
 * tight or too short for any fold is a real answer about that shape, and
 * quietly dropping the leftovers would hide it.
 */
export function fitModules(cells: Cell[]): FitResult {
  const table = reachTable();
  const st: FitState = {
    shape: new Set(cells.map(key)),
    uncovered: new Set(cells.map(key)),
    bodyOcc: new Set<string>(),
    modules: [],
    log: [],
    nextId: 0,
    chain: 0,
    conn: new Map<string, PlacedConnector[]>(),
  };

  // Seeds come from the run decomposition: its endpoints are the tips of the
  // shape, which are where a chain naturally starts. The fit itself does not
  // follow the runs — it walks wherever coverage takes it.
  const runs = cubePaths(cells);
  const seeds: Cell[] = [];
  for (const { path } of orderPaths(runs)) {
    if (path.length) seeds.push(path[0], path[path.length - 1]);
  }

  let chains = 0;

  // The first chain has nothing to attach to, so it starts at a tip of the shape.
  for (const seed of seeds) {
    if (!st.uncovered.has(key(seed))) continue;
    st.chain = chains;
    if (growChain(seed, st, table) > 0) { chains++; break; }
  }

  // Everything after that grows OFF an existing free connector wherever it can,
  // so each new chain is welded on from its first module instead of floating
  // free. Only when no connector can reach the remaining cubes does a detached
  // chain get started, and that is reported.
  let detached = 0;
  let guard = 0;
  const stuck = new Set<string>();

  while (st.uncovered.size && guard++ < 500) {
    // Best connector-anchored start: the one that covers the most.
    let best: { conn: PlacedConnector; gain: number } | null = null;
    for (const list of st.conn.values()) {
      for (const c of list) {
        if (!weldTypeIsLegal('A', c.end)) continue;
        const p = bestPlacement(c.cell, c.dir, st, table);
        if (p && (!best || p.gain > best.gain)) best = { conn: c, gain: p.gain };
      }
    }
    if (best) {
      st.chain = chains;
      if (growFromConnector(best.conn, st, table)) { chains++; continue; }
    }

    // Nothing reachable from the built structure — fall back to a fresh tip.
    let seed: Cell | null = null;
    for (const k of st.uncovered) {
      if (!stuck.has(k)) { seed = unkey(k); break; }
    }
    if (!seed) break;
    st.chain = chains;
    if (growChain(seed, st, table) > 0) { chains++; detached++; }
    else stuck.add(key(seed));
  }

  const covered = cells.filter((c) => !st.uncovered.has(key(c)));
  const uncovered = cells.filter((c) => st.uncovered.has(key(c)));

  st.log.push(
    st.modules.length
      ? `built ${st.modules.length} module(s) in ${chains} chain(s), covering `
        + `${covered.length} of ${cells.length} cubes`
      : 'no modules could be fitted into this shape',
  );
  if (uncovered.length) {
    st.log.push(
      `${uncovered.length} cube(s) uncovered — a module bridges 4 cubes straight and `
      + 'fewer when folded, so very short stubs have nothing that fits them',
    );
  }
  // Catch any remaining pair whose connectors happen to meet.
  const joined = weldChains(st.modules);
  st.log.push(...joined.log);
  if (joined.components === 1 && chains > 1) {
    st.log.push(`${chains} chains joined into one connected robot`);
  }
  if (detached) {
    st.log.push(
      `${detached} chain(s) had to be started away from the structure — nothing already `
      + 'built could reach those cubes',
    );
  }

  return {
    modules: st.modules,
    covered,
    uncovered,
    runs: chains,
    chainWelds: joined.welds,
    components: joined.components,
    log: st.log,
  };
}
