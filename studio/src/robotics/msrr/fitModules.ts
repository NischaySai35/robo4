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
import {
  type Cell, key, unkey, DIRS_6, add, eq,
} from './lattice';
import { type LatticePose, reachTable, MIN_AXIS_ALIGNMENT } from './chainMoves';
import {
  type ConnectorEnd, type Vec3, SIDE_ENDS, weldTypeIsLegal, oppositeSideEnd,
  baseQuatFor, connectorPoses, REQUIRED_DOME_CLEARANCE,
} from './modulink';
import { MODULINK_CUBE_SIZE } from './occupancy';

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
  /**
   * Connector A's REAL position in cube units, which is not always the centre
   * of `anchorCell`.
   *
   * A module welded end-to-end starts exactly on a lattice point, so for those
   * this equals anchorCell. A module welded onto a SIDE connector does not: a
   * side connector rides SIDE_CONNECTOR_RADIAL_OFFSET (0.6 physical, ~0.633
   * cube units) off the spine axis, which is nowhere near a cube centre. The
   * lattice cannot represent that, and pretending it can is what made
   * end-to-side welds render as two domes ~0.98 cube units apart instead of
   * one sphere — a gap wider than two dome radii.
   *
   * So the lattice keeps doing lattice work (which cubes a body occupies,
   * coverage, collision) on `anchorCell`, and anything GEOMETRIC — where the
   * domes actually are, whether a weld is real, what gets drawn — uses this.
   */
  anchorPos: Vec3;
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
  /**
   * Cube it sits in. LATTICE bookkeeping only — all four side connectors of a
   * module report the SAME cell (the spine's midpoint cube) even though they
   * are physically ~0.63 cube units apart in four different directions. Never
   * use this to decide whether two connectors touch; use `pos`.
   */
  cell: Cell;
  /** outward normal */
  dir: Cell;
  /**
   * Where the dome actually is, in cube units — the truth a weld is defined
   * against ("same point in space, outward normals opposed"). For A and B this
   * coincides with the centre of `cell`; for the four side connectors it does
   * not, and that difference is exactly the bug this field exists to fix.
   */
  pos: Vec3;
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
/** Physical module units -> cube units. */
const CUBES_PER_UNIT = 1 / MODULINK_CUBE_SIZE;

/**
 * Where a placed module's connector B REALLY is, in cube units.
 *
 * The next module in a chain welds its A onto exactly this point, so the chain
 * must be built from it rather than from B's lattice cell. A solved pose lands
 * within MAX_SNAP_ERROR (0.3 cube units) of its lattice target, which is fine
 * once and ruinous compounded: anchoring each module at the rounded cell threw
 * that error away and then re-introduced it at every link, so welds part-way
 * down a chain ended up nearly a whole cube open. Threading the real position
 * through keeps every weld exact no matter how long the chain.
 */
function realEndPos(m: FittedModule): Vec3 {
  const poses = connectorPoses(m.pose.angles, {
    position: [0, 0, 0],
    quaternion: baseQuatFor(m.anchorDir),
  });
  const b = poses.find((c) => c.end === 'B');
  if (!b) return [m.endCell[0], m.endCell[1], m.endCell[2]];
  return [
    m.anchorPos[0] + b.position[0] * CUBES_PER_UNIT,
    m.anchorPos[1] + b.position[1] * CUBES_PER_UNIT,
    m.anchorPos[2] + b.position[2] * CUBES_PER_UNIT,
  ];
}

/**
 * Real positions of all six connectors, in cube units, by running the module's
 * own forward kinematics from where it is actually anchored.
 *
 * This is the same computation the renderer does, which is the point: what the
 * planner welds and what you see on screen must be the same geometry. Keyed by
 * connector end so callers cannot mispair them by index.
 */
function realConnectorPositions(m: FittedModule): Map<ConnectorEnd, Vec3> {
  const poses = connectorPoses(m.pose.angles, {
    position: [0, 0, 0],
    quaternion: baseQuatFor(m.anchorDir),
  });
  const out = new Map<ConnectorEnd, Vec3>();
  for (const c of poses) {
    out.set(c.end, [
      m.anchorPos[0] + c.position[0] * CUBES_PER_UNIT,
      m.anchorPos[1] + c.position[1] * CUBES_PER_UNIT,
      m.anchorPos[2] + c.position[2] * CUBES_PER_UNIT,
    ]);
  }
  return out;
}

export function connectorsOf(m: FittedModule): PlacedConnector[] {
  const real = realConnectorPositions(m);
  const at = (end: ConnectorEnd, fallback: Cell): Vec3 =>
    real.get(end) ?? [fallback[0], fallback[1], fallback[2]];

  const out: PlacedConnector[] = [
    { moduleId: m.id, end: 'A', cell: m.anchorCell, dir: m.anchorDir, pos: at('A', m.anchorCell) },
    { moduleId: m.id, end: 'B', cell: m.endCell, dir: m.endDir, pos: at('B', m.endCell) },
  ];
  const rot = rotationTo(m.anchorDir);
  const midCell = add(m.anchorCell, rot(m.pose.midOffset));
  m.pose.sideDirs.forEach((d, i) => {
    const end = SIDE_ENDS[i] ?? 'UP';
    out.push({ moduleId: m.id, end, cell: midCell, dir: rot(d), pos: at(end, midCell) });
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
  /**
   * Separate pieces after chain welding, by REAL LOCKS ONLY — 1 means every
   * module is electrically/mechanically joined to every other. Can be more
   * than 1 even in a normal, successful build: a wide shape (a wall, a table
   * top) legitimately needs more parallel chains than the 4 attachment
   * directions one module offers can weld together, and those extra chains
   * are placed touching (see `touchingChains`), not locked. Use `spatiallyOnePiece`
   * for "is this actually one physical object", not this.
   */
  components: number;
  /** true when every module's body is at least face-adjacent to another's —
   *  the honest "is this one physical object" check, independent of locks */
  spatiallyOnePiece: boolean;
  /** how many chains were placed touching the structure without a formal weld */
  touchingChains: number;
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
  /**
   * Every placed dome's real centre, bucketed by rounded cube, so a candidate
   * placement can be checked for dome-on-dome interpenetration without
   * scanning the whole robot. Body-cube occupancy does NOT cover this: two
   * modules can occupy entirely different cubes and still drive their
   * connector domes through each other, which is what produced spheres with
   * chunks chewed out of them.
   */
  domes: Map<string, { pos: Vec3; normal: Vec3; moduleId: string }[]>;
  /**
   * Cubes of the shape with 3+ occupied neighbours — the branch points.
   *
   * A module's four side connectors all ride the midpoint of its big spine
   * rod. So if a module is placed with that midpoint ON a junction, the
   * junction's extra arms have real connectors to weld onto; if the module
   * merely passes its END through the junction, they have nothing and get
   * left uncovered. Knowing where the junctions are is what lets the fit
   * prefer the first arrangement.
   */
  junctions: Set<string>;
  /**
   * Which of EACH module's own side connectors are already claimed by
   * something welded onto it. A module supports at most two, and they must be
   * opposite — enforced here, at the moment a NEW module's A end welds onto an
   * existing connector, because nothing previously did: `weldChains` (the
   * post-hoc pass joining otherwise-separate chains) already had this rule,
   * but the LIVE build path (growFromConnector / the junction pre-pass) did
   * not, and could weld three or more branches onto one module's midpoint —
   * exactly the "3/4 sphere with a bite out of it" kind of impossibility, just
   * for weld COUNT rather than weld GEOMETRY.
   */
  usedSides: Map<string, ConnectorEnd[]>;
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
/**
 * Dome centres a candidate pose would put in the world, in cube units.
 *
 * Runs the same forward kinematics the fitter and the renderer use, so a
 * clearance decision is made against the geometry that will actually be drawn
 * and built rather than a lattice approximation of it.
 */
interface DomeAt { pos: Vec3; normal: Vec3 }

function candidateDomes(pose: LatticePose, anchorDir: Cell, anchorPos: Vec3): DomeAt[] {
  const poses = connectorPoses(pose.angles, {
    position: [0, 0, 0],
    quaternion: baseQuatFor(anchorDir),
  });
  return poses.map((c) => ({
    pos: [
      anchorPos[0] + c.position[0] * CUBES_PER_UNIT,
      anchorPos[1] + c.position[1] * CUBES_PER_UNIT,
      anchorPos[2] + c.position[2] * CUBES_PER_UNIT,
    ] as Vec3,
    normal: [c.normal[0], c.normal[1], c.normal[2]] as Vec3,
  }));
}

/**
 * Where a given connector of a hypothetical pose would really sit, in cube
 * units, if a module were anchored at `anchorPos` facing `anchorDir`.
 *
 * Exported because the walk planner needs exactly this: it must know whether a
 * candidate move's travelling dome ACTUALLY lands on the dome it is trying to
 * grab, which is a question about real geometry, not about lattice offsets.
 */
export function realConnectorPosOf(
  pose: LatticePose, anchorDir: Cell, anchorPos: Vec3, end: ConnectorEnd,
): Vec3 | null {
  const poses = connectorPoses(pose.angles, {
    position: [0, 0, 0],
    quaternion: baseQuatFor(anchorDir),
  });
  const c = poses.find((x) => x.end === end);
  if (!c) return null;
  return [
    anchorPos[0] + c.position[0] * CUBES_PER_UNIT,
    anchorPos[1] + c.position[1] * CUBES_PER_UNIT,
    anchorPos[2] + c.position[2] * CUBES_PER_UNIT,
  ];
}

const domeBucket = (v: Vec3) =>
  key([Math.round(v[0]), Math.round(v[1]), Math.round(v[2])] as Cell);

/** Record a placed module's domes so later placements can avoid them. */
function registerDomes(m: FittedModule, st: FitState): void {
  const real = candidateDomes(m.pose, m.anchorDir, m.anchorPos);
  for (const d of real) {
    const k = domeBucket(d.pos);
    const list = st.domes.get(k);
    const entry = { pos: d.pos, normal: d.normal, moduleId: m.id };
    if (list) list.push(entry); else st.domes.set(k, [entry]);
  }
}

/**
 * Two domes must be either the SAME point (a weld) or at least a dome-diameter
 * apart. Anything between is interpenetration: the parts pass through each
 * other, which on screen is a sphere with a bite taken out of it and in metal
 * is a part that does not fit.
 *
 * Legality of a coincident pair is PURE GEOMETRY — opposed normals, whoever put
 * them there — not "did the caller declare this specific pairing on purpose".
 * An earlier version required the coincident partner to match a `weldingTo` id
 * the caller passed in, which was over-specified: it made an INCIDENTAL,
 * perfectly valid lock (two independently-placed modules whose domes happen to
 * land on each other, facing correctly) indistinguishable from a genuine
 * collision, purely because nobody had asked for that specific pairing. Side-
 * by-side placement (Nischay's own rule: touching is fine, colliding is not,
 * and a coincidence that lines up should read as one sphere whether or not it
 * was the intended target) needs exactly that case to be legal.
 */
const DOME_DIAMETER_CUBES = REQUIRED_DOME_CLEARANCE * CUBES_PER_UNIT;
/** Coincident-enough to be the intended weld rather than a clash. */
const WELD_SAME_POINT = 0.35;

/**
 * How closely two coincident domes must oppose each other to be a real lock.
 * Two hemispheres only close into ONE sphere when their flat faces meet, which
 * needs their outward normals antiparallel. Coincident domes pointing any other
 * way are not a weld at all — they are two solid parts occupying the same
 * space, which is what left spheres looking like a bite had been taken out.
 *
 * REUSES the table's own established axis-alignment tolerance
 * (chainMoves.MIN_AXIS_ALIGNMENT, ~26°) rather than a stricter invented value.
 * An earlier version used -0.999 (~2.6°) and broke ROUTINE chain continuation
 * through any bend: the reach table's own bent poses are only sampled to within
 * MIN_AXIS_ALIGNMENT of their recorded (rounded) endDir, so a module continuing
 * straight out of a "gentle" corner measured ~20° of real facing error against
 * its predecessor's TRUE end normal — correct behaviour, since growChain always
 * anchors the next segment off the SNAPPED direction, not the continuous one.
 * -0.999 rejected that as a bad weld and stalled an otherwise ordinary L-shaped
 * corridor at 3 modules, 13 of 41 cubes covered. This tolerance still rejects
 * anything grossly misaligned (the original "3/4 sphere" bug had domes 90-180°
 * off, nowhere near this threshold) while accepting the table's own known slop.
 */
const WELD_NORMAL_DOT = -MIN_AXIS_ALIGNMENT;

function domesClear(cand: DomeAt[], st: FitState): boolean {
  for (const v of cand) {
    const b: Cell = [Math.round(v.pos[0]), Math.round(v.pos[1]), Math.round(v.pos[2])];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const list = st.domes.get(key([b[0] + dx, b[1] + dy, b[2] + dz] as Cell));
      if (!list) continue;
      for (const other of list) {
        const d = Math.hypot(
          v.pos[0] - other.pos[0], v.pos[1] - other.pos[1], v.pos[2] - other.pos[2],
        );
        if (d < WELD_SAME_POINT) {
          // Coincident: legal exactly when the two domes genuinely face into
          // each other, regardless of which modules they belong to.
          const dot = v.normal[0] * other.normal[0]
            + v.normal[1] * other.normal[1]
            + v.normal[2] * other.normal[2];
          if (dot > WELD_NORMAL_DOT) return false;
          continue;
        }
        if (d < DOME_DIAMETER_CUBES) return false; // overlapping, not welded
      }
    }
  }
  return true;
}

/**
 * Try to place ONE STRAIGHT module whose own MIDPOINT — where its two side
 * connectors physically are — lands exactly on `junction`, spanning symmetric-
 * ally across it along some axis.
 *
 * WHY THIS EXISTS (Nischay's own design instinct, made explicit): a module
 * offers up to FOUR directions from one place — its own two chain ends, plus
 * two OPPOSITE side connectors — but only if that place is the MIDPOINT of a
 * straight run through it. The general path-cover walk cannot discover this on
 * its own: it grows greedily from a tip, and by the time a branch arm is
 * considered the junction cube has usually already been consumed as an
 * ordinary body cube of whichever run reached it first, with no guarantee that
 * run's own pose happened to centre there. The result was a junction covered,
 * but by accident, with nothing useful for the other arms to weld onto —
 * arms left stranded and the whole area coming out as a tangled knot rather
 * than a recognisable shape (measured on "cross": a clean 7-cube spine plus
 * four arms fit as ONE cube of the junction covered and the rest scattered
 * into disconnected pieces).
 *
 * So this runs FIRST, before the general walk, for every real junction (3+
 * neighbours), trying every axis in both directions and every fully symmetric
 * straight pose (endOffset exactly 2x midOffset) until one fits entirely
 * inside the shape without colliding. Committing it up front reserves the
 * junction's side connectors for the branches that actually need them —
 * the general walk then discovers those connectors the normal way, through
 * `st.conn`, exactly as it would for any other pre-existing weld.
 */
function tryCenterOnJunction(junction: Cell, st: FitState, table: LatticePose[]): boolean {
  for (const travel of DIRS_6) {
    const rot = rotationTo(negCell(travel));
    for (const pose of table) {
      if (pose.bendPoseId !== 'straight') continue;
      // Only a fully symmetric straight pose can centre on a single cube —
      // asymmetric ones (short reach with an off-centre mid) would not
      // actually straddle the junction evenly.
      const sym = pose.endOffset.every((v, i) => v === 2 * pose.midOffset[i]);
      if (!sym) continue;

      const mid = rot(pose.midOffset);
      const anchorCell: Cell = [junction[0] - mid[0], junction[1] - mid[1], junction[2] - mid[2]];
      const endCell: Cell = add(anchorCell, rot(pose.endOffset));
      const cells = pose.cells.map((c) => add(anchorCell, rot(c)));

      if (!cells.every((c) => st.shape.has(key(c)))) continue; // must stay on the diagram
      if (cells.some((c) => st.bodyOcc.has(key(c)))) continue; // must not collide

      const anchorPos: Vec3 = [anchorCell[0], anchorCell[1], anchorCell[2]];
      if (!domesClear(candidateDomes(pose, negCell(travel), anchorPos), st)) continue;

      place({ pose, cells, endCell, endDir: rot(pose.endDir), gain: cells.length }, anchorCell, travel, null, st);
      return true;
    }
  }
  return false;
}

/**
 * An uncovered cube that already touches the built structure (shares a face
 * with a cube some module's body occupies) — the best available starting
 * point for a chain that CANNOT weld onto anything, when the shape genuinely
 * has no connector within reach for it.
 *
 * WHY THIS EXISTS. A module offers only 4 real attachment directions (2 chain
 * ends + 2 opposite side connectors) — nowhere near enough to weld a fully
 * interlocked tree across a WIDE shape (a wall, a table top, a tower's cross-
 * section), which needs many chains standing in parallel. Requiring every
 * module to weld onto something left most of a wide shape uncovered — not
 * because it cannot physically be built, but because "weld" is a stricter
 * requirement than the shape actually needs there. Nischay's own rule: side-
 * by-side modules may touch, must not collide, and lock incidentally if a
 * connector happens to line up (domesClear already allows that, unconditionally
 * on geometry) — a formal weld is not required just to stand next to the rest.
 *
 * Preferring the MOST-touching cube (most occupied face-neighbours) packs new
 * chains flush against the existing structure rather than merely adjacent at
 * a single corner, which is what actually reads as "one wall", not a scatter.
 */
/**
 * Neighbor offsets used to decide whether an uncovered cube is close enough
 * to the already-built structure to grow a new chain from it. This is NOT
 * the 6 face directions used for shape connectivity (DIRS_6) — a module's
 * real body is a swept collision footprint from continuous FK, and a bent
 * ("gentle") pose regularly threads a run diagonally across a flat cube
 * grid (e.g. a wide wall) without ever touching a neighbor face-on. Using
 * face-only adjacency here made whole rows of a wall/tower invisible to
 * the touching-tier even though they sit right next to built cubes on a
 * diagonal, which silently gave up on them instead of growing into them.
 * Full 26-neighbor adjacency matches how "near" is already judged
 * elsewhere for module bodies in this file (domesClear's bucket search).
 */
const NEIGHBORS_26: Vec3[] = (() => {
  const out: Vec3[] = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++)
        if (dx !== 0 || dy !== 0 || dz !== 0) out.push([dx, dy, dz]);
  return out;
})();

/**
 * Flood-fill `cells` under 26-neighbor adjacency and report whether they all
 * land in one component. Used for the "is this actually one physical
 * object" check — see the comment at its call site for why this uses 26-way
 * adjacency instead of the lattice's face-only `isConnected`.
 */
function cellsAreOnePiece(cells: Cell[]): boolean {
  if (cells.length === 0) return true;
  const set = new Set(cells.map((c) => key(c)));
  const seen = new Set<string>();
  const stack = [cells[0]];
  seen.add(key(cells[0]));
  while (stack.length) {
    const c = stack.pop()!;
    for (const d of NEIGHBORS_26) {
      const nk = key(add(c, d as Cell));
      if (set.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(unkey(nk)); }
    }
  }
  return seen.size === set.size;
}

function findTouchingSeed(st: FitState, skip: Set<string>): Cell | null {
  let best: Cell | null = null;
  let bestTouch = 0;
  for (const k of st.uncovered) {
    if (skip.has(k)) continue;
    const c = unkey(k);
    let touch = 0;
    for (const d of NEIGHBORS_26) if (st.bodyOcc.has(key(add(c, d as Cell)))) touch++;
    if (touch > bestTouch) { bestTouch = touch; best = c; }
  }
  return best;
}

/**
 * Would welding a new module onto `conn` still leave its host within the
 * two-opposite-sides budget? A/B ends have no budget — the chain's own two
 * ends are unlimited by this rule, only the four SIDE faces are.
 */
function sideAvailable(conn: PlacedConnector, st: FitState): boolean {
  if (conn.end === 'A' || conn.end === 'B') return true;
  const used = st.usedSides.get(conn.moduleId) ?? [];
  if (used.length >= 2) return false;
  return used.every((u) => u === conn.end || oppositeSideEnd(u) === conn.end);
}

/** Record that `conn` is now claimed by a real weld, for sideAvailable's count. */
function claimSide(conn: PlacedConnector, st: FitState): void {
  if (conn.end === 'A' || conn.end === 'B') return;
  const used = st.usedSides.get(conn.moduleId) ?? [];
  st.usedSides.set(conn.moduleId, [...used, conn.end]);
}

/**
 * How many straight-line RUNS does this pose's body take through
 * cube-space? 1 means a literal straight line; 2 means one clean corner
 * (an L); higher means a real staircase — direction changing almost every
 * step, which is what "elbow" and "gentle" poses turned out to be just as
 * often as "straight" ones.
 *
 * `bendPoseId` is only the nearest NAMED angle bucket (see
 * `nearestNamedPose` in chainMoves.ts) — it is a label for how the pose was
 * classified when sampled, not a promise about the shape its cells actually
 * trace out. A pose called "straight" routinely zigzags, and a pose called
 * "elbow" routinely turns out to be a 4-direction staircase, not the clean
 * two-segment corner the name suggests. Counting direction changes directly
 * on the cube-space geometry sidesteps the label entirely, so it needs no
 * shape-specific case — a wall gets straight rows, a corner gets one clean
 * turn, and a shape that genuinely has nowhere to go straight still gets
 * whatever the least-zigzag option available is.
 */
function segmentCount(cells: readonly Cell[]): number {
  if (cells.length < 2) return 1;
  let segments = 1;
  let dir = [cells[1][0] - cells[0][0], cells[1][1] - cells[0][1], cells[1][2] - cells[0][2]];
  for (let i = 2; i < cells.length; i++) {
    const d = [cells[i][0] - cells[i - 1][0], cells[i][1] - cells[i - 1][1], cells[i][2] - cells[i - 1][2]];
    if (d[0] !== dir[0] || d[1] !== dir[1] || d[2] !== dir[2]) { segments++; dir = d; }
  }
  return segments;
}

interface Candidate {
  pose: LatticePose;
  cells: Cell[];
  endCell: Cell;
  endDir: Cell;
  gain: number;
  segments: number;
  spineOnJunction: boolean;
}

/**
 * A zigzag pose routinely covers MORE distinct cubes per module than a
 * straighter one does, in a wide flat area — it advances along two axes of
 * the grid at once instead of one, so raw coverage alone will pick it almost
 * every time a wall or a tower's cross-section is being filled. That is
 * coverage-efficient and also exactly what produced the tangled,
 * unrecognizable builds Nischay rejected: nothing in a pure "maximize cubes
 * this module covers" score can ever prefer clean rows and corners over
 * efficient diagonals, because the diagonal genuinely does more per module.
 *
 * So this is not a score weight (a small bonus is provably too small to
 * ever move a ~2-cube gain gap, and a large one would override real coverage
 * differences everywhere, wrecking shapes that legitimately need a fold).
 * It is a deliberate trade accepted up front: give up a SMALL amount of
 * coverage per module, if it buys fewer direction changes.
 */
const STRAIGHT_GAIN_SLACK = 2;

function bestPlacement(
  anchorCell: Cell,
  travel: Cell,
  st: FitState,
  table: LatticePose[],
  anchorPos?: Vec3,
): Placement | null {
  const rot = rotationTo(negCell(travel)); // A faces back down the way we came
  const candidates: Candidate[] = [];

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

    // HARD: connector domes may not interpenetrate. Checked only after the
    // cheap cube tests above, because it costs a forward-kinematics run.
    const anchorAt: Vec3 = anchorPos ?? [anchorCell[0], anchorCell[1], anchorCell[2]];
    if (!domesClear(candidateDomes(pose, negCell(travel), anchorAt), st)) continue;

    const midCell = add(anchorCell, rot(pose.midOffset));
    candidates.push({
      pose, cells, endCell, endDir: rot(pose.endDir), gain,
      segments: segmentCount(pose.cells),
      spineOnJunction: st.junctions.has(key(midCell)),
    });
  }
  if (!candidates.length) return null;

  // Among candidates within STRAIGHT_GAIN_SLACK of the best coverage on
  // offer, keep only the ones with the FEWEST direction changes — see
  // STRAIGHT_GAIN_SLACK and segmentCount. This is the general form: it picks
  // a literal straight line when one is available, a single clean corner
  // when only a turn is available, and only falls through to a genuine
  // staircase when nothing straighter reaches anywhere near the same
  // coverage — which is exactly the trade Nischay described (clean rows,
  // clean turns, side-by-side rather than diagonal knots), decided from the
  // shape's own geometry rather than a rule written for any one shape.
  const maxGain = Math.max(...candidates.map((c) => c.gain));
  const nearBest = candidates.filter((c) => c.gain >= maxGain - STRAIGHT_GAIN_SLACK);
  const minSegments = Math.min(...nearBest.map((c) => c.segments));
  const pool = nearBest.filter((c) => c.segments === minSegments);

  // SCORING within the pool: coverage first, but a placement that lands the
  // module's SPINE on a junction is worth a lot more than one that merely
  // crosses it.
  //
  // The four side connectors all sit at the big rod's midpoint. Put that
  // midpoint on a branch point and the junction's other arms have somewhere
  // to weld — two opposite sides plus the chain's own two ends is four
  // directions from one module, which is exactly what a 4-way crossing
  // needs. Run the module's END through the junction instead and those arms
  // have no connector within reach, so they are dropped and the middle of a
  // cross comes out as a knot of stubs. Greedy coverage alone cannot see
  // that, because both placements cover the same cubes THIS step; the
  // difference only shows up in what can attach NEXT.
  //
  // MEASURED HONESTLY: at 90 this is a pure TIE-BREAK — it never outvotes a
  // cube of coverage (100). It is kept because it is the right preference
  // for the hardware and costs nothing, NOT because it has been shown to
  // help yet. The reason it cannot help much here is structural: this is a
  // greedy walk, so by the time a branch is considered the junction cube has
  // usually already been consumed by whichever run reached it first. Making
  // junction placement actually pay off needs the fit to choose junction
  // poses BEFORE walking the runs — a non-greedy fitter, which this is not.
  let best: Placement | null = null;
  let bestScore = -Infinity;
  for (const c of pool) {
    const score = c.gain * 100 + (c.spineOnJunction ? 90 : 0) + c.pose.reach;
    if (!best || score > bestScore) {
      bestScore = score;
      best = { pose: c.pose, cells: c.cells, endCell: c.endCell, endDir: c.endDir, gain: c.gain };
    }
  }
  return best;
}

/**
 * Commit a placement and return the module.
 *
 * `anchorPos` defaults to the centre of `anchorCell` — correct for every
 * end-to-end weld, where connector A really does land on a lattice point. A
 * caller welding onto a SIDE connector must pass the connector's real
 * off-lattice position instead, or the new module is drawn (and reasoned
 * about) up to ~0.98 cube units away from the dome it is supposedly locked to.
 */
function place(
  p: Placement, anchorCell: Cell, travel: Cell, prev: string | null, st: FitState,
  anchorPos?: Vec3,
): FittedModule {
  const m: FittedModule = {
    id: `M${st.nextId++}`,
    anchorCell,
    anchorPos: anchorPos ?? [anchorCell[0], anchorCell[1], anchorCell[2]],
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
  registerDomes(m, st);
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
  // The new module's A goes exactly where the connector it is welding to IS —
  // same point in space, normals opposed. `conn.cell` is only the lattice cube
  // that connector is filed under, which for a side connector is up to ~0.98
  // cube units from the dome itself; anchoring there put the two domes nowhere
  // near each other and no sphere formed. The lattice cell still drives body
  // occupancy and coverage, but the module is POSED at conn.pos.
  const anchorCell = conn.cell;
  const travel = conn.dir;
  if (!weldTypeIsLegal('A', conn.end)) return null;
  if (!sideAvailable(conn, st)) return null; // host's 2-opposite-sides budget is spent

  const p = bestPlacement(anchorCell, travel, st, table, conn.pos);
  if (!p) return null;

  claimSide(conn, st);
  let prevMod = place(p, anchorCell, travel, conn.moduleId, st, conn.pos);
  let prev = prevMod.id;
  let anchor = p.endCell;
  let anchorPos = realEndPos(prevMod);
  let dir = p.endDir;
  let count = 1;
  let guard = 0;
  while (guard++ < 500) {
    const next = bestPlacement(anchor, dir, st, table, anchorPos);
    if (!next) break;
    prevMod = place(next, anchor, dir, prev, st, anchorPos);
    prev = prevMod.id;
    anchor = next.endCell;
    anchorPos = realEndPos(prevMod);
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
    const p = bestPlacement(seed, d, st, table, [seed[0], seed[1], seed[2]]);
    if (!p) continue;
    const anchorDir = negCell(d);
    const joins = canWeldInto(seed, anchorDir, 'A', st)
      || canWeldInto(p.endCell, p.endDir, 'B', st);
    const score = p.gain * 10 + (joins ? 1000 : 0);
    if (!opening || score > opening.score) opening = { p, travel: d, score };
  }
  if (!opening) return 0;

  let prevMod = place(opening.p, seed, opening.travel, null, st);
  let prev = prevMod.id;
  let anchor = opening.p.endCell;
  let anchorPos = realEndPos(prevMod);
  let travel = opening.p.endDir;
  let count = 1;

  let guard = 0;
  while (guard++ < 500) {
    const p = bestPlacement(anchor, travel, st, table, anchorPos);
    if (!p) break;
    prevMod = place(p, anchor, travel, prev, st, anchorPos);
    prev = prevMod.id;
    anchor = p.endCell;
    anchorPos = realEndPos(prevMod);
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

  // Indexed by ROUNDED REAL POSITION, not by lattice cell. A module's four side
  // connectors all report the same cell but sit ~0.63 cube units apart in four
  // directions, so a cell index both invented welds between domes that are
  // nowhere near each other and missed real ones.
  const atCell = new Map<string, PlacedConnector[]>();
  const posKey = (v: Vec3) =>
    key([Math.round(v[0]), Math.round(v[1]), Math.round(v[2])] as Cell);
  for (const c of all) {
    const k = posKey(c.pos);
    const list = atCell.get(k);
    if (list) list.push(c); else atCell.set(k, [c]);
  }
  /** Candidates near a point, including buckets a rounding boundary split. */
  const candidatesNear = (v: Vec3): PlacedConnector[] => {
    const out: PlacedConnector[] = [];
    const b: Cell = [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const g = atCell.get(key([b[0] + dx, b[1] + dy, b[2] + dz] as Cell));
      if (g) out.push(...g);
    }
    return out;
  };
  /** Two domes are welded when they are at the same point, within tolerance. */
  const coincident = (a: Vec3, b: Vec3) =>
    Math.abs(a[0] - b[0]) < 0.35 && Math.abs(a[1] - b[1]) < 0.35 && Math.abs(a[2] - b[2]) < 0.35;

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
    for (const to of candidatesNear(from.pos)) {
      if (to.moduleId === from.moduleId) continue;
      if (find(from.moduleId) === find(to.moduleId)) continue; // already one piece
      if (!weldTypeIsLegal(from.end, to.end)) continue;
      if (!coincident(from.pos, to.pos)) continue; // same point in space, or no weld
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
export interface FitOptions {
  /**
   * Refuse to place any module that would not be welded to the rest of the
   * robot. ON by default, and it is a HARD constraint, not a preference.
   *
   * A robot is one machine. A "fit" that covers more cubes by leaving islands
   * floating in mid-air has not built the shape — it has built several
   * unrelated robots that happen to sit near each other, which is not a thing
   * the hardware can be, and every downstream stage (mobility, the walk
   * planner, the weld graph) is meaningless across a gap no connector spans.
   *
   * The cost is real and is paid in COVERAGE: where nothing already built can
   * reach a region, those cubes are simply left uncovered and reported, rather
   * than covered by a detached chain. That trade is the right way round —
   * uncovered cubes are visibly, honestly incomplete, whereas floating chains
   * look like a finished robot and are not.
   *
   * Set false only to study what the greedy fit COULD cover if connectivity
   * were ignored; nothing in the app ships that way.
   */
  requireConnected?: boolean;
}

export function fitModules(cells: Cell[], options: FitOptions = {}): FitResult {
  const requireConnected = options.requireConnected ?? true;
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
    domes: new Map<string, { pos: Vec3; normal: Vec3; moduleId: string }[]>(),
    usedSides: new Map<string, ConnectorEnd[]>(),
    junctions: (() => {
      const occ = new Set(cells.map(key));
      const out = new Set<string>();
      for (const c of cells) {
        let n = 0;
        for (const d of DIRS_6) if (occ.has(key(add(c, d)))) n++;
        if (n >= 3) out.add(key(c));
      }
      return out;
    })(),
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

  // PRE-PASS: centre a straight spine on the WORST (highest-degree) real
  // junction, as the very first thing placed — see tryCenterOnJunction for why
  // this has to happen up front, not as a scoring tie-break inside the walk
  // (that was tried and measured not to help: see the spineOnJunction comment
  // in bestPlacement).
  //
  // ONLY THE FIRST ONE. An earlier version centred a spine on EVERY junction
  // independently, which is where the shape actually resembling itself came
  // from — but each centred spine is its own unattached ROOT (weldedTo: null)
  // with no guarantee any two of them ever come within weld range of each
  // other. On "chair"@21, two junctions each got their own island, and
  // nothing downstream can weld two pre-existing roots together (the
  // connector-anchored loop below only EXTENDS an existing structure; the
  // post-hoc weldChains pass tries, but is not guaranteed to find a match).
  // One pre-placed root avoids the problem structurally: every OTHER junction
  // is then reached by the normal walk growing off THIS root's own free
  // connectors, which is what stays connected by construction.
  const junctionsByDegree = [...st.junctions]
    .map((k) => unkey(k))
    .sort((a, b) => neighboursOf(b, st.shape).length - neighboursOf(a, st.shape).length);
  if (junctionsByDegree.length) {
    st.chain = chains;
    if (tryCenterOnJunction(junctionsByDegree[0], st, table)) chains++;
  }

  // The first chain has nothing to attach to, so it starts at a tip of the
  // shape — UNLESS the junction pre-pass above already placed one. Skipping
  // this when it did is what makes the pre-pass actually connected: without
  // this guard, this loop plants a second, unrelated root chain regardless
  // (weldedTo: null) instead of asking the connector-anchored loop below to
  // extend the spine that already exists.
  if (st.modules.length === 0) {
    for (const seed of seeds) {
      if (!st.uncovered.has(key(seed))) continue;
      st.chain = chains;
      if (growChain(seed, st, table) > 0) { chains++; break; }
    }
  }

  // Everything after that grows OFF an existing free connector wherever it can,
  // so each new chain is welded on from its first module instead of floating
  // free. When nothing can weld, try starting flush against the structure
  // instead (touching, not locked) before finally giving up on those cubes.
  let detached = 0;
  const touchingChains: number[] = [];
  let guard = 0;
  const stuck = new Set<string>();
  const touchStuck = new Set<string>();

  while (st.uncovered.size && guard++ < 500) {
    // Best connector-anchored start: the one that covers the most.
    let best: { conn: PlacedConnector; gain: number } | null = null;
    for (const list of st.conn.values()) {
      for (const c of list) {
        if (!weldTypeIsLegal('A', c.end)) continue;
        if (!sideAvailable(c, st)) continue;
        const p = bestPlacement(c.cell, c.dir, st, table, c.pos);
        if (p && (!best || p.gain > best.gain)) best = { conn: c, gain: p.gain };
      }
    }
    if (best) {
      st.chain = chains;
      if (growFromConnector(best.conn, st, table)) { chains++; continue; }
    }

    // Nothing can WELD onto the remaining cubes — but a shape wide enough to
    // need more than one chain (a wall, a table, a wide tower cross-section)
    // routinely runs out of the 4 attachment directions one module offers
    // long before it runs out of cubes. Rather than call the shape unbuildable
    // there, start a new chain flush against whatever is already built —
    // touching, not welded, and still checked for real collision by the same
    // bodyOcc/domesClear rules as everything else. This is the middle ground
    // between "must be locked" and "may float anywhere": Nischay's own rule
    // for side-by-side placement.
    // A single "best" touching cube can still fail to grow a chain — its only
    // legal poses might collide with the structure it is flush against, or
    // fail domesClear, or simply not be reachable by any pose in the table.
    // Give up on THAT cube and keep trying the next-best touching cube rather
    // than abandoning the whole region: a wide shape can have many candidate
    // start points along the same edge of the already-built structure.
    const touchSeed = requireConnected ? findTouchingSeed(st, touchStuck) : null;
    if (touchSeed) {
      st.chain = chains;
      if (growChain(touchSeed, st, table) > 0) { touchingChains.push(chains); chains++; continue; }
      touchStuck.add(key(touchSeed));
      continue;
    }

    // Nothing already built can be reached AT ALL — not welded, not even
    // touching. With connectivity required, this is where the fit STOPS: the
    // only way to cover those cubes would be a chain standing off on its own,
    // unrelated in space to the rest, and that is not part of this robot.
    // Leaving the cubes uncovered says that plainly.
    if (requireConnected) break;

    // Unconstrained mode only (see FitOptions.requireConnected): start a fresh
    // detached chain and report it.
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
      + 'fewer when folded, so very short stubs have nothing that fits them'
      + (requireConnected
        ? ', and anything a free connector could not reach was left out rather than '
          + 'covered by a chain floating unattached'
        : ''),
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
  if (touchingChains.length) {
    st.log.push(
      `${touchingChains.length} chain(s) placed touching the structure without a formal `
      + 'lock — the shape needs more parallel attachment points than one module\'s 4 '
      + 'directions (2 chain ends + 2 opposite sides) can weld together. Packed flush and '
      + 'collision-checked, not electrically joined there; any connectors that happened to '
      + 'line up locked anyway.',
    );
  }

  // The honest "is this actually one physical object" check — body-cube
  // adjacency across ALL modules, independent of which pairs are formally
  // welded. A wide shape legitimately has weld-components > 1 (see
  // `touchingChains`) while still being one physically contiguous mass; a
  // GENUINE bug produces pieces that are not even touching, which this catches.
  //
  // This is deliberately NOT `isConnected(configFromCells(...))` — that
  // lattice-level helper is face-only (DIRS_6) by design, because it also
  // backs the WALK planner's bridge/cut-vertex safety check, which must stay
  // strict about what counts as one structural path. A module's real body is
  // a continuous swept shape from FK, not a cube: two modules can be flush
  // against each other (Nischay's side-by-side rule) while their nearest body
  // cells are only diagonal neighbors, not face neighbors — the same 26-way
  // adjacency findTouchingSeed already uses to decide "close enough to grow
  // into". Checking spatial one-piece-ness with the stricter face-only rule
  // instead flagged those legitimate diagonal touches as a fabricated "BUG".
  const allCells = st.modules.flatMap((m) => m.cells);
  const spatiallyOnePiece = allCells.length > 0 && cellsAreOnePiece(allCells);

  if (requireConnected && !spatiallyOnePiece) {
    st.log.push(
      `BUG: connectivity was required but the fit still produced physically separate `
      + 'pieces — please report this shape.',
    );
  } else if (requireConnected && st.modules.length > 0) {
    st.log.push(
      joined.components === 1
        ? `all ${st.modules.length} module(s) are welded into one connected robot`
        : `all ${st.modules.length} module(s) form one physically contiguous robot `
          + `(${joined.components} separately-locked group(s) within it — see above)`,
    );
  }

  return {
    modules: st.modules,
    covered,
    uncovered,
    runs: chains,
    chainWelds: joined.welds,
    components: joined.components,
    spatiallyOnePiece,
    touchingChains: touchingChains.length,
    log: st.log,
  };
}
