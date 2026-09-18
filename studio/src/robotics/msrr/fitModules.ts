/**
 * fitModules.ts — Build: put real modules into a cube shape.
 *
 * THE SEPARATION THIS FILE MAKES
 * The cubes are a SHAPE DIAGRAM. They are not modules and they carry no
 * kinematics — they are a way of saying "the robot should look like this",
 * exactly as a drawn line or a text prompt is. Nothing about a cube says which
 * module is where, which connector welds to which, or how anything bends.
 *
 * A module is NOT one cube. Straight it bridges four; folded, fewer. So a
 * 20-cube shape is nothing like 20 modules, and how many it takes is an OUTPUT
 * of this fit, never an input.
 *
 * ── THE ALGORITHM: FEATURE-FIRST, NOT COVERAGE-FIRST ────────────────────────
 *
 * The previous fitter walked the shape greedily, choosing at every step whatever
 * fold covered the most new cubes. That is why builds came out as tangles: a
 * zigzag genuinely covers more cubes per module than a straight line does, so a
 * coverage score can never prefer clean rows and corners — the knot wins on
 * merit every time. Junction alignment could only ever be a tie-break inside
 * that walk, and by the time a branch was considered the junction cube had
 * usually already been eaten by whichever run reached it first.
 *
 * This fitter inverts the decision. The shape is first read as a SKELETON OF
 * FEATURES (see skeleton.ts) — junctions, corners, tips, straight runs — ranked
 * by how much they constrain a module. Then modules are placed to SERVE those
 * features in rank order, and coverage is only what decides between placements
 * that serve the same thing. The rules, in the order they win:
 *
 *  1. ONE CUBE, ONE MODULE. A one- or two-cube diagram is a statement that
 *     something is here, not a statement about size. It gets exactly one
 *     straight module, however far that overhangs. Folding a module up to hide
 *     inside two cubes answers a question nobody asked.
 *
 *  2. A BEND GOES ON A CORNER. Where the shape turns, a module's own bend joint
 *     lands on that exact cube, turning the same way. The module has exactly
 *     three clean single-bend corner forms — 3+1, 1+3 and 2+2 cubes of arm
 *     (CORNER_ARMS) — which is what its joints at ~0.6, ~1.2 and ~2.9 cubes
 *     from connector A physically permit.
 *
 *  3. A SPINE GOES ON A JUNCTION. All four side connectors ride the midpoint of
 *     the big rod, so a T or a + wants that midpoint ON the branch cube: two
 *     chain ends plus all four side connectors is up to six directions out of
 *     one place, matching every possible arm count a cube can have. Whatever of
 *     the module hangs past the shape is left hanging (OVERSHOOT_CAP) rather
 *     than folded away.
 *
 *  4. THE SILHOUETTE MATTERS MORE THAN THE EXACT FIT. A run is rarely a whole
 *     number of modules. When it is not, the surplus is spent on overshoot at
 *     the end rather than on folding the shape smaller.
 *
 *  5. A CUBE IS A POINT, NOT A WIDTH. Cube size is pinned to a quarter of the
 *     module's straight length, so the diagram's scale IS the module's scale;
 *     nothing here ever packs two modules into one cube.
 *
 *  6. THE BUSIEST JUNCTION CHOOSES FIRST. Features are served in priority
 *     order, and a pending high-priority feature RESERVES its cubes so a
 *     passing chain cannot eat the alignment it needs.
 *
 *  7. STRAIGHT IF POSSIBLE, out of shape only if necessary — the two lowest
 *     priorities, in that order.
 *
 *  8. NOTHING IS EVER LOOSE. Every module after the first welds onto a
 *     connector that already exists, so the robot is one piece from its first
 *     module onward; and the modules are finally re-ordered along the
 *     connection graph, so the build ANIMATION is connected at every frame too,
 *     not just at the end.
 *
 * ── THE PIPELINE ────────────────────────────────────────────────────────────
 *
 *   1. ANALYSE   shape -> ranked features (skeleton.ts).
 *   2. ROOT      place one module on the top-ranked feature, aligned to it.
 *   3. GROW      repeatedly: of every pose reachable from every free connector,
 *                commit the one that best serves the highest pending feature.
 *   4. WELD      catch any remaining pair whose connectors happen to meet.
 *   5. ORDER     sort along the connection graph so the reveal stays connected.
 */
import {
  type Cell, type CellKey, key, unkey, DIRS_6, add, sub, neg, eq, manhattan,
} from './lattice';
import { type LatticePose, reachTable, MIN_AXIS_ALIGNMENT, bookkeepingConnectors } from './chainMoves';
import { findLandingPoses } from './chainSolve';
import {
  type ShapeFeature, type ShapeSkeleton,
  analyseShape, segmentCount, pathTurns, sameTurn, armsOf, inSolidPatch, armLength,
} from './skeleton';
import { withRouteFeatures, serpentineRoutes, routeReverses, U_TURN_PITCH } from './serpentine';
import {
  type ConnectorEnd, type Vec3, type Quat, SIDE_ENDS, weldTypeIsLegal,
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

const negCell = neg;
const subCell = sub;
const scale = (c: Cell, n: number): Cell => [c[0] * n, c[1] * n, c[2] * n];

// ── placed modules ────────────────────────────────────────────────────────────

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
  /**
   * The shape feature this module was placed to serve, if any — a junction it
   * centred its spine on, or a corner it put a bend on. Recorded because it is
   * the ONLY evidence of why a module is where it is: without it a fit that
   * aligned nothing looks identical to one that aligned everything, and the
   * build log has nothing honest to report.
   */
  serves: { kind: 'junction' | 'corner'; cell: Cell } | null;
  /**
   * Orientation outright, for a module that is not aligned to the lattice.
   *
   * A FITTED module never needs this: it always points along one of the six
   * lattice directions, which `anchorDir` says in one cube. A module placed BY
   * HAND (manualBuild.ts) can face anywhere — bend a joint thirty degrees and
   * everything downstream of it is off-axis — so it carries its own rotation
   * and moduleGeometry.ts uses that instead of deriving one. Absent everywhere
   * the fitter builds, which is why it is optional rather than required.
   */
  baseQuat?: Quat;
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
  const poses = bookkeepingConnectors(m.pose, baseQuatFor(m.anchorDir));
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
  const poses = bookkeepingConnectors(m.pose, baseQuatFor(m.anchorDir));
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
  /** how many separate chains the fit produced */
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
  /** junctions that got a module's spine centred on them, out of how many exist */
  junctionsAligned: number;
  junctionsTotal: number;
  /** corners that got a module's own bend joint on them, out of how many exist */
  cornersAligned: number;
  cornersTotal: number;
  log: string[];
}

// ── the fit's working state ───────────────────────────────────────────────────

interface FitState {
  /** cubes of the shape diagram — a reference for where connectors should go */
  shape: Set<CellKey>;
  /** shape cubes no module body covers yet */
  uncovered: Set<CellKey>;
  /** cubes already filled by a placed module's body — a hard collision set */
  bodyOcc: Set<CellKey>;
  modules: FittedModule[];
  log: string[];
  nextId: number;
  /** index of the chain currently being grown */
  chain: number;
  /** every connector of every placed module, indexed by the cube it sits in */
  conn: Map<CellKey, PlacedConnector[]>;
  /**
   * Connectors nothing is welded to yet — the only places a new module may
   * anchor. Maintained incrementally rather than rebuilt, because it is scanned
   * once per pose per step and rebuilding it was the whole cost of the loop.
   */
  free: PlacedConnector[];
  /**
   * Every placed dome's real centre, bucketed by rounded cube, so a candidate
   * placement can be checked for dome-on-dome interpenetration without
   * scanning the whole robot. Body-cube occupancy does NOT cover this: two
   * modules can occupy entirely different cubes and still drive their
   * connector domes through each other, which is what produced spheres with
   * chunks chewed out of them.
   */
  domes: Map<CellKey, { pos: Vec3; normal: Vec3; moduleId: string }[]>;
  /**
   * Which of EACH module's own side connectors are already claimed by
   * something welded onto it. A module physically has four; all four may be
   * used at once (modulink.sideWeldsAreLegal).
   */
  usedSides: Map<string, ConnectorEnd[]>;

  // ── the plan ────────────────────────────────────────────────────────────
  skeleton: ShapeSkeleton;
  /** features still wanting a module, highest priority first */
  pending: ShapeFeature[];
  /** pending junctions by cube, for the "is my spine on one?" test */
  pendingJunctions: Map<CellKey, ShapeFeature>;
  /** pending corners by cube, for the "is my bend on one?" test */
  pendingCorners: Map<CellKey, ShapeFeature>;
  /**
   * EVERY corner the diagram has, by cube, with its two arms — pending or long
   * since served. Distinct from `pendingCorners` on purpose: serving a corner
   * asks "does this module claim it", while judging a bend asks "does the shape
   * bend here at all". A corner another module already took is still a place the
   * shape genuinely turns, so a later module bending there is not inventing
   * anything and must not be charged for it.
   */
  shapeCorners: Map<CellKey, Cell[]>;
  /**
   * For a cube inside a solid patch, its position in that patch's FILL ROUTE
   * (serpentine.ts); empty for any shape without a patch to fill.
   *
   * A slab is the one place the diagram does not say which way a module should
   * lie — every cube has neighbours on all sides, so coverage alone scores a
   * module staircasing diagonally across the rows exactly as well as one lying
   * along them, and the staircase is what the fit used to produce. The route
   * settles it, and this index is how a placement is asked "are you following
   * it": cubes that are consecutive HERE are consecutive along the fill.
   */
  routeIndex: Map<CellKey, number>;
  /** the first cube of each fill route — where that fill should begin */
  routeStarts: Cell[];
  /** does any fill route double back? only then is a U-turn pose worth solving */
  routeReverses: boolean;
  /**
   * If every fill route lies in one flat plane, which axis is across it and
   * where that plane sits — otherwise null.
   *
   * A wall is one cube thick, so EVERY cube of a module that leaves its plane
   * has left the diagram, and leaves it through the FACE, which is the single
   * most obvious way for a build to stop looking like the thing that was
   * drawn: spikes sticking out of a flat panel. The overshoot budget cannot
   * see this, because to the budget a cube off the diagram is a cube off the
   * diagram whether it is past the end of a course (harmless, the course
   * simply runs on a little) or straight out through the wall (ruinous).
   */
  fillSlab: { axis: 0 | 1 | 2; value: number } | null;
  /** routeIndex, inverted: fill position -> cube. Gaps separate patches. */
  routeAt: Map<number, CellKey>;
  /**
   * The fill position the next module should take up from: the lowest route
   * index not yet covered, or Infinity once every route is covered.
   *
   * This is what makes the fill SEQUENTIAL instead of opportunistic. Without
   * it the greedy step is free to answer "where can I cover the most cubes
   * anywhere on this structure", and in a slab the answer is always some pose
   * cutting diagonally across the courses, because a folded pose packs more
   * cubes into its body than a straight one does. With it, the question
   * becomes "who carries the fill on from here", which is the question
   * Nischay's rule actually asks.
   */
  fillFrontier: number;


  /**
   * Cubes held for a pending feature, mapped to that feature's priority.
   *
   * This is what makes rule 6 real rather than aspirational. A junction can
   * only get a spine centred on it while its cube is still free; a chain
   * passing through on its way somewhere else destroys that forever, and in
   * the old greedy fit it usually did. A reservation blocks any placement that
   * is not serving something at least as important.
   */
  reserved: Map<CellKey, number>;
  /**
   * Anchor points a pending feature will need, as `cellKey|dirKey`: a module
   * whose free end lands HERE facing THIS WAY leaves the next module able to
   * serve that feature exactly.
   *
   * Without this the fit arrives at a corner out of phase — one cube short or
   * long — and no pose can put a bend on it any more. This is the cheapest
   * possible form of looking one move ahead, and it is what turns "a corner
   * somewhere near there" into "the corner".
   */
  wantedAnchors: Map<string, number>;
  /** features whose cube got covered without being aligned to — reported, not hidden */
  missed: ShapeFeature[];
  missedKeys: Set<CellKey>;
  /** cubes of features a module was actually posed onto */
  servedCells: Set<CellKey>;
  aligned: { junction: number; corner: number };
  /**
   * Set once the fit stalls: reservations stop being honoured from then on.
   *
   * Holding a cube for a feature is only worth it while that feature is still
   * reachable. Once no placement anywhere is legal, whatever the reservations
   * were protecting is either already lost or was never within reach, and
   * keeping them would trade real coverage for an alignment that is not coming.
   */
  reservationsReleased: boolean;
}

// ── geometry: domes and clearance ─────────────────────────────────────────────

interface DomeAt { pos: Vec3; normal: Vec3 }

/**
 * Dome centres a candidate pose would put in the world, in cube units.
 *
 * Runs the same forward kinematics the fitter and the renderer use, so a
 * clearance decision is made against the geometry that will actually be drawn
 * and built rather than a lattice approximation of it.
 */
function candidateDomes(pose: LatticePose, anchorDir: Cell, anchorPos: Vec3): DomeAt[] {
  const poses = bookkeepingConnectors(pose, baseQuatFor(anchorDir));
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
  const poses = bookkeepingConnectors(pose, baseQuatFor(anchorDir));
  const c = poses.find((x) => x.end === end);
  if (!c) return null;
  return [
    anchorPos[0] + c.position[0] * CUBES_PER_UNIT,
    anchorPos[1] + c.position[1] * CUBES_PER_UNIT,
    anchorPos[2] + c.position[2] * CUBES_PER_UNIT,
  ];
}

/**
 * Does this pose keep its OWN six domes clear of each other?
 *
 * THIS IS THE SPHERE RULE, and it turned out to be the whole story behind welds
 * that did not close into a clean ball.
 *
 * A lock is two hemispheres meeting flat face to flat face — one sphere, no gap,
 * nothing else touching it. What was actually being drawn, in seven places
 * across the shape library, was a sphere with a third dome buried 0.75 cubes
 * into it. The cause was not the weld: it was the pose the HOST was holding.
 * Fold a module hard enough and it brings its own connector B back around to
 * within 0.754 cubes of the side dome on the inside of the bend — closer than
 * the 0.887 two domes need to clear. 89 of the reach table's 318 poses do this.
 * The module is self-colliding before anything welds to it at all, so no weld
 * onto it could ever look right.
 *
 * An earlier version of this file made those welds legal by EXEMPTING the host's
 * own domes from the clearance test, on the reasoning that the host's internal
 * geometry was already its own business. That was wrong twice over: it is not
 * the host's business, because a pose that drives two of its own hemispheres
 * through each other is not a pose the hardware can hold; and it is exactly what
 * produced the broken spheres on screen.
 *
 * So the check moved to where it belongs — the pose itself, before it is ever
 * placed. Rejecting these leaves 91 of 138 reach-4 poses and all 99 reach-5
 * poses, which is plenty, and it lets `domesClear` go back to being strict.
 *
 * Memoised by pose id: the answer depends only on joint angles, and the fitter
 * asks about the same few hundred poses thousands of times.
 */
const selfClearCache = new Map<string, boolean>();

function poseSelfClear(pose: LatticePose): boolean {
  const hit = selfClearCache.get(pose.id);
  if (hit !== undefined) return hit;
  // No bookkeepingConnectors() needed here, unlike every other caller in this
  // file: this only compares PAIRWISE DISTANCES between a pose's own six domes,
  // and a rigid transform (rotation + translation) preserves every pairwise
  // distance regardless of which one is used, and regardless of which physical
  // end the labels 'A'/'B' land on. [0,0,1] is therefore as good as any other
  // choice for this particular question.
  const cp = connectorPoses(pose.angles, { position: [0, 0, 0], quaternion: baseQuatFor([0, 0, 1]) });
  let ok = true;
  for (let i = 0; ok && i < cp.length; i++) {
    for (let j = i + 1; j < cp.length; j++) {
      const a = cp[i].position, b = cp[j].position;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * CUBES_PER_UNIT;
      if (d < DOME_DIAMETER_CUBES - 1e-9) { ok = false; break; }
    }
  }
  selfClearCache.set(pose.id, ok);
  return ok;
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
 * An INCIDENTAL lock (two independently-placed modules whose domes happen to
 * land on each other, facing correctly) is a real lock and must stay legal:
 * side-by-side placement depends on exactly that case.
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
 * A module continuing straight out of a bend measures ~20° of real facing error
 * against its predecessor's TRUE end normal — correct behaviour, since the fit
 * always anchors the next segment off the SNAPPED direction, not the continuous
 * one. A tighter tolerance rejected that as a bad weld and stalled ordinary
 * L-shaped corridors; this one still rejects anything grossly misaligned (the
 * original "3/4 sphere" bug had domes 90-180° off, nowhere near this).
 */
const WELD_NORMAL_DOT = -MIN_AXIS_ALIGNMENT;

function domesClear(cand: DomeAt[], st: FitState): boolean {
  for (const v of cand) {
    const near: { pos: Vec3; normal: Vec3; moduleId: string }[] = [];
    const b: Cell = [Math.round(v.pos[0]), Math.round(v.pos[1]), Math.round(v.pos[2])];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const list = st.domes.get(key([b[0] + dx, b[1] + dy, b[2] + dz] as Cell));
      if (list) near.push(...list);
    }

    // First: is this dome landing ON another one? Coincident and opposed is a
    // weld; coincident any other way is two solid parts in the same place.
    for (const other of near) {
      const d = Math.hypot(
        v.pos[0] - other.pos[0], v.pos[1] - other.pos[1], v.pos[2] - other.pos[2],
      );
      if (d >= WELD_SAME_POINT) continue;
      const dot = v.normal[0] * other.normal[0]
        + v.normal[1] * other.normal[1]
        + v.normal[2] * other.normal[2];
      if (dot > WELD_NORMAL_DOT) return false;
    }

    // Then: clearance against everything else.
    for (const other of near) {
      const d = Math.hypot(
        v.pos[0] - other.pos[0], v.pos[1] - other.pos[1], v.pos[2] - other.pos[2],
      );
      if (d < WELD_SAME_POINT) continue; // already judged as a weld above
      // Strict: nothing else may come within a diameter of this dome. No
      // exemption for the module being welded onto — see poseSelfClear for why
      // that exemption was a bug and not a convenience.
      if (d < DOME_DIAMETER_CUBES) return false;
    }
  }
  return true;
}

// ── the corner catalogue ──────────────────────────────────────────────────────

/**
 * The module's three clean single-bend corner forms, as (arm into the corner,
 * arm out of it) in cubes.
 *
 * These are not a preference, they are the hardware. The bend joints sit about
 * 0.6, 1.2 and 2.9 cubes along from connector A, and connector B is 4 cubes
 * along, so the only ways to put ONE bend on a lattice corner and leave both
 * arms lying straight are 3+1, 1+3 and 2+2. Every other split either needs two
 * bends (a staircase, not a corner) or is outside the module's envelope
 * entirely — verified by solving for all of 1..3 x 1..3 and keeping what came
 * back with a real turn on the right cube.
 *
 * ORDER MATTERS, and it is not the obvious one. 1+3 comes first because it is
 * the only split whose straightest route also keeps the module's own domes
 * clear (0.896 cubes, just outside the 0.887 they need). 3+1 is listed last
 * because its straightest route self-collides and is rejected outright — the
 * same corner is reachable as 1+3 by approaching from the other arm, so nothing
 * is lost. The catalogue filters on that rather than trusting this order.
 */
const CORNER_ARMS: readonly (readonly [number, number])[] = [[1, 3], [2, 2], [3, 1]];

/** The four directions a corner can turn toward, in the module's own frame. */
const LOCAL_PERPS: readonly Cell[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];

/**
 * Poses that bend at a corner, in the module's LOCAL frame: connector A at the
 * origin, the first arm running along -Z, the turn on cube [0,0,-k], the second
 * arm running m cubes along `perp`.
 *
 * Built once per process and cached. It costs a few hundred milliseconds of
 * inverse kinematics the first time, because these poses are genuinely not in
 * the precomputed reach table — the table samples joint space on a grid and
 * simply does not contain "bend exactly here", which is the whole reason the
 * old fitter could never honour rule 2. Working in the local frame is what
 * makes it affordable: every corner in every shape, at every orientation, is
 * one of these twelve entries rotated.
 */
let cornerCache: Map<string, LatticePose[]> | null = null;

const cornerKey = (k: number, m: number, perp: Cell) => `${k}|${m}|${key(perp)}`;

function cornerCatalogue(): Map<string, LatticePose[]> {
  if (cornerCache) return cornerCache;
  const out = new Map<string, LatticePose[]>();
  for (const [k, m] of CORNER_ARMS) {
    for (const perp of LOCAL_PERPS) {
      const cornerCell: Cell = [0, 0, -k];
      const target = add(cornerCell, scale(perp, m));
      // arms leaving the turn: back up the first arm (+Z local), and out along perp
      const want: [Cell, Cell] = [[0, 0, 1], perp];
      const good = findLandingPoses(target, perp)
        // The fold has to put a real turn on the corner cube, turning the way
        // the shape turns...
        .filter((p) => pathTurns(p.cells)
          .some((t) => eq(t.cell, cornerCell) && sameTurn(t.arms, want)))
        // ...and it has to be a fold the module can physically hold. The 3+1
        // split's straightest route brings connector B to within 0.754 cubes of
        // its own UP side dome — two of its own hemispheres inside each other.
        // It looked like the cleanest corner in the catalogue and it was the
        // single biggest source of locks that would not close into a sphere.
        .filter(poseSelfClear)
        // ...and it has to be an actual CORNER: one clean turn, two straight
        // arms. Routes that reach the same cube via four more direction changes
        // are staircases wearing a corner's name, and the stray-bend charge
        // would reject them at placement time anyway. Dropping them here is what
        // lets `usableCornerSplits` below tell the truth about which arm splits
        // the module can really serve a corner with.
        .filter((p) => segmentCount(p.cells) <= 2)
        .sort((a, b) => segmentCount(a.cells) - segmentCount(b.cells));
      if (good.length) out.set(cornerKey(k, m, perp), good);
    }
  }
  cornerCache = out;
  return out;
}

/**
 * The U-TURN catalogue: poses that carry the chain out along a line, across to
 * a neighbouring one, and back the way it came.
 *
 * WHY THIS HAS TO BE SOLVED RATHER THAN LOOKED UP, which is the same reason
 * the corner catalogue is solved: the reach table samples joint space on a ten
 * degree grid, and a clean reversal is simply not one of the samples. Every
 * proposal the fit could make came from that table, so for a slab it had no
 * U-turn to offer AT ALL — and a fill that cannot turn round at the end of a
 * course does the only other thing available and cuts diagonally back across
 * the courses it already laid. That is what a wall was doing.
 *
 * WHAT THE SPHERE RULE SAYS ABOUT THE PITCH. Asked for a reversal into the
 * IMMEDIATELY neighbouring line, the solver does find routes — the three bend
 * joints have the travel to double back, ninety degrees each — and every one
 * of them is rejected here, because doubling back that tightly brings the
 * module's own connector A to 0.715 cubes of its own UP side dome where two
 * domes need 0.887. Short by about a sixth of a cube, in every fold plane, at
 * every offset along the line. At two lines' pitch the same reversal is clean
 * and there are dozens. That is not a preference this file expresses, it is
 * the hardware answering, and it is why U_TURN_PITCH is what it is.
 */
let uTurnCache: LatticePose[] | null = null;

export function uTurnCatalogue(): LatticePose[] {
  if (uTurnCache) return uTurnCache;
  const out = new Map<string, LatticePose>();
  // Local frame: A at the origin facing +Z, the body running toward -Z. A
  // reversal therefore ends facing +Z, offset U_TURN_PITCH across the line.
  for (const perp of LOCAL_PERPS) {
    for (let along = -3; along <= 3; along++) {
      const end: Cell = [
        perp[0] * U_TURN_PITCH, perp[1] * U_TURN_PITCH, perp[2] * U_TURN_PITCH + along,
      ];
      for (const pose of findLandingPoses(end, [0, 0, 1], undefined, 8)) {
        // Out, across, back: three straight runs. More than that is a
        // scribble that happens to end up facing backwards, and the
        // stray-bend charge would refuse it at placement time anyway.
        if (segmentCount(pose.cells) > 3) continue;
        if (!poseSelfClear(pose)) continue;
        out.set(pose.id, pose);
      }
    }
  }
  uTurnCache = [...out.values()];
  return uTurnCache;
}

/** Reset the corner catalogue. Tests only; the geometry never changes at runtime. */
export function invalidateCornerCatalogue() { cornerCache = null; splitCache = null; uTurnCache = null; }

/**
 * The arm splits that survive — the (in, out) cube counts a module can really
 * put a bend on a corner with, as opposed to the ones the geometry suggests.
 *
 * This exists because the two are NOT the same, and the difference is what made
 * corners silently stop aligning. Solving 1..3 x 1..3 says 3+1, 1+3 and 2+2 all
 * reach; checking the poses says 3+1's only clean route is a five-segment
 * staircase, so a chain that arrives three cubes short of a corner has no way to
 * turn on it. Advertising 3+1 as an anchor point therefore steered chains into
 * exactly the position from which the corner could not be served.
 *
 * So the fit asks the catalogue rather than the arithmetic — both when placing a
 * corner module and when publishing the anchors it wants chains to arrive at.
 */
let splitCache: (readonly [number, number])[] | null = null;

export function usableCornerSplits(): (readonly [number, number])[] {
  if (splitCache) return splitCache;
  const cat = cornerCatalogue();
  splitCache = CORNER_ARMS.filter(([k, m]) =>
    LOCAL_PERPS.some((perp) => (cat.get(cornerKey(k, m, perp)) ?? []).length > 0));
  return splitCache;
}

// ── scoring ───────────────────────────────────────────────────────────────────

/**
 * How far a module may hang off the diagram into empty air — and the answer
 * depends entirely on whether it is BENDING to stay inside.
 *
 * THE PRIORITY THIS FIXES, in Nischay's words: "if it extends it might just look
 * long, but if it bends it looks like a different shape."
 *
 * That is the whole rule, and the old fixed cap of 2 had it exactly backwards.
 * A tee whose stem ran to the shape's edge could not be finished with a straight
 * module, because a straight one would have hung 3 cubes past the tip — over the
 * cap. So the fit took the only thing under the cap: a module that BENT sideways
 * out of the stem and then ran on outside the diagram anyway. It bought nothing
 * (it was off the shape either way) and it cost the silhouette a corner the
 * diagram never had. The cap was making bending cheaper than extending.
 *
 * So the budget is no longer a number, it is a question. A module that stays
 * STRAIGHT — or bends only where the shape itself bends — may hang out as far as
 * its own body reaches; overshooting is a length, and length reads as length. A
 * module that wants to bend somewhere the shape does not bend is inventing
 * geometry, and gets the tight budget instead.
 */
/**
 * How far a placement laying part of a solid patch's FILL may hang off the
 * diagram. See the cap in evaluate for why it is separate and why it is small.
 */
const FILL_OVERSHOOT_CAP = 4;

/**
 * How many body cubes a placement laying a FLAT fill may put outside that
 * flat's own plane — how far it may reach round the BACK of a wall.
 *
 * Not zero, and that is the interesting part. A chain cannot reverse into the
 * neighbouring course while staying flat — the sphere rule forbids it, see
 * U_TURN_PITCH — so going round behind is the only way a wall's fill gets from
 * one course to the next. Left uncapped the fit takes that permission and
 * runs: on a 24-cube wall it put TWELVE body cubes outside the diagram, most
 * of them out of plane, and the render turns from a panel into a hairbrush
 * while the coverage figure still reads 23 of 24 and admits nothing.
 *
 * The whole curve, measured on that wall (cubes covered / cubes outside):
 *
 *     allowance   0      1      2      3       4
 *     wall 6x4    18/0   18/0   20/2   22/8    23/12
 *     wall 8x5    30/2   30/2   30/2   36/17   34/15
 *
 * Two is where it stops looking like a wall's fault and starts looking like a
 * wall. Three buys real coverage and spends the look to get it, which is the
 * trade Nischay should make rather than this file.
 */
const OFF_PLANE_CAP = 2;

const OVERSHOOT_CAP = 2;

/**
 * The ceiling for a module that is not inventing any bends. Six is past the
 * longest body the module has, so in practice this is "as far as it likes" —
 * written as a number only so the candidate loop can still bail early.
 */
const STRAIGHT_OVERSHOOT_CAP = 6;

/**
 * The overshoot allowed when the only alternative is an unwelded chain: none at
 * all. At that point the choice is not "how far off the diagram" but "one robot
 * or two", and rule 8 is not negotiable while rule 7 is the first thing to give
 * up.
 *
 * In practice this is the module's whole body, so it is "as far as it reaches" —
 * a placement must still cover at least one uncovered cube to be considered at
 * all, and the per-cube penalty still picks the smallest overshoot on offer.
 */
const RELAXED_OVERSHOOT = STRAIGHT_OVERSHOOT_CAP;

/**
 * The rule hierarchy, as numbers.
 *
 * These are BANDS, not weights to be traded off, and the gaps are deliberate:
 * the most cubes a module can cover is about 7, so coverage tops out around
 * 7000 and can never outvote a corner at 20000, which can never outvote a
 * junction at 100000. Straightness (W_STRAY_BEND) is a tie-break, not a band —
 * whether a stray bend is allowed at all is decided beforehand by
 * MIN_GAIN_PER_STRAY, so by the time this matters both options are already
 * legitimate and this only has to make the straight one win. Overshoot tops
 * out at -120, less than one segment, so being out of shape is the last thing
 * given up — exactly the order rules 6, 4, 7 lay down.
 */
const W_JUNCTION = 100_000; // x (degree - 2): a 4-way crossing outranks a T
const W_CORNER = 20_000;
/**
 * A FILL turn (serpentine.ts) aligned, as opposed to an outline corner.
 *
 * Worth about one cube of route, and no more: a tie-break, not a bounty.
 * Landing a bend exactly on a U-turn of the fill route is tidy, but it is not
 * what the diagram was drawing — miss it and the slab still reads as the same
 * slab, which is emphatically not true of a corner on the outline. Every
 * larger value tried here was farmed rather than followed: a module cutting
 * diagonally across the rows passes through a U-turn cube sooner or later, and
 * once that pays like an outline corner the staircase outbids the straight
 * course lying along the row, which is the exact mess this was meant to fix.
 */
const W_FILL_CORNER = 600;
const W_PHASE = 8_000;      // ends where a pending feature needs a module to start
/**
 * A corner split that leaves the REST of its outgoing arm reachable by a
 * clean, pure-reach-4 hop chain — see armParityBonus. Only a preference
 * AMONG a corner's own already-clean splits (all of which already earn
 * W_CORNER), so it does not need to rival W_JUNCTION or W_CORNER itself,
 * only to outweigh the gain difference between picking a 1, 2 or 3 cube
 * split at the corner it is choosing for.
 */
const W_RUN_PARITY = 6_000;
const W_COVER = 1_000;      // per shape cube newly covered
/**
 * Per cube of a solid patch's FILL ROUTE this placement follows in order —
 * see serpentine.ts and FitState.routeIndex.
 *
 * Rated just under W_COVER on purpose. Covering the diagram is still what a
 * module is FOR, so a placement may never buy route-tidiness by covering less;
 * but between two placements that cover the same amount — and inside a slab
 * there are always many — the one lying along the fill's own line wins over the
 * one cutting diagonally across it. That is the entire difference between a
 * wall that reads as courses of bricks and the staircase pile it used to be.
 */
const W_ROUTE = 600;        // per cube covered in fill-route order
/**
 * Per cube by which a placement carries the fill FORWARD from where it stands
 * — see FitState.fillFrontier and frontierAdvance.
 *
 * The largest per-cube weight in the table, and it has to be: this is the one
 * term that makes filling an area a SEQUENCE rather than a scramble. A slab
 * offers a folded pose that swallows six or seven cubes almost anywhere you
 * point it, so as long as raw coverage is the biggest number on offer, the fit
 * will keep taking those and leaving the courses behind it in ribbons. Paying
 * for ORDER instead means the only way to score well is to be the module that
 * takes the fill on from the last one — which is Nischay's rule exactly: fill
 * this line, U-turn, fill the next.
 *
 * It cannot run away with the fit, because a placement that advances nothing
 * scores nothing here, and every other rule (collision, overshoot, the sphere
 * rule, connectivity) is a hard gate this never reaches.
 */
const W_FILL_ADVANCE = 3_000;
/** Per cube of route taken from ahead of the frontier — see fillReachedPast. */
const W_FILL_SKIP = -2_500;
const W_LOCK = 400;         // its free end lands on an existing connector: an extra lock
const W_LOCK_UNHOSTED = 30_000; // the same, for a chain start that would otherwise not be joined at all
/**
 * A bend the SHAPE DOES NOT HAVE, priced as a TIE-BREAK against a straight
 * alternative of similar gain — not a kill switch. Whether a stray bend is
 * allowed AT ALL is decided beforehand by MIN_GAIN_PER_STRAY below; once it
 * has passed that bar, this only has to make sure a clean, straight route
 * still wins whenever one is actually on offer.
 *
 * A bend that DOES land on one of the diagram's own corners costs nothing at
 * all: that is not a stray bend, it is rule 2 being obeyed.
 */
const W_STRAY_BEND = -1_500;
/**
 * How many real cubes of gain one stray bend must be worth before it is even
 * considered — the hard gate, checked before scoring, that decides whether a
 * detour happens at all.
 *
 * THE CASE THIS ORIGINALLY SPLIT no longer forces a detour at all: a hub can
 * now use all four of its side connectors at once (modulink.sideWeldsAreLegal,
 * 2026-09-05), so together with its own two ends that is up to six directions
 * from one place — matching every possible arm count a single cube can have.
 * No junction is ever short a connector any more.
 *
 * The gate stays for the cases that are NOT about a hub's budget: a stray bend
 * reaching around another module's body, or hunting down one or two leftover
 * cubes a straight module could not reach any other way. Same "not worth it"
 * judgment the overshoot ratio makes for a straight finish, applied here to a
 * bent one: a lone stub (gain 1) never clears it, a genuine run (gain 2+) does.
 */
const MIN_GAIN_PER_STRAY = 1;
const W_OUTSIDE = -60;      // per body cube off the diagram — the cheapest thing to give up
const W_SNAP = -10;         // per tenth of a cube of lattice snap error
/**
 * Per cube of shape still ahead, in the direction this placement travels.
 *
 * ORIGINALLY this existed to decide which of two arms competing for one hub's
 * single spare side connector should get it — a real competition back when a
 * hub could use only one opposite pair of sides. It cannot lose that
 * competition any more (a hub now has up to six directions available, more
 * than any cube can have arms), but the same signal is still the right
 * tie-break whenever two candidates cover the same number of cubes THIS step
 * and differ only in how much real shape waits further down each path — head
 * toward the long corridor, not the short stub.
 *
 * Deliberately small: smaller than one cube of real coverage (W_COVER), so it
 * only ever breaks a tie or a near-tie and can never make a lower-gain
 * placement beat a higher-gain one.
 */
const W_ARM_AHEAD = 50;

interface Proposal {
  pose: LatticePose;
  anchorCell: Cell;
  anchorPos: Vec3;
  travel: Cell;
  cells: Cell[];
  endCell: Cell;
  endDir: Cell;
  host: PlacedConnector | null;
  gain: number;
  outside: number;
  /** direction changes this pose makes that the shape does not — see evaluate */
  stray: number;
  serves: ShapeFeature | null;
  score: number;
}

/**
 * Judge one concrete placement: a pose, anchored at a cube, travelling a way.
 *
 * Returns null when the placement is impossible (collides, interpenetrates,
 * overshoots its budget, trespasses on a reservation it does not outrank, or
 * simply achieves nothing). Otherwise it comes back scored by the hierarchy
 * above, and the caller only has to take the maximum.
 */
function evaluate(
  pose: LatticePose,
  anchorCell: Cell,
  travel: Cell,
  anchorPos: Vec3,
  host: PlacedConnector | null,
  st: FitState,
  overshootCap = OVERSHOOT_CAP,
): Proposal | null {
  const anchorDir = negCell(travel);
  const rot = rotationTo(anchorDir);
  const cells = pose.cells.map((c) => add(anchorCell, rot(c)));

  // HARD: the body may not pass through another module. It MAY share the anchor
  // cube, but ONLY when it is welding onto something there — that shared cube is
  // the weld itself, two connectors meeting at one point. A module starting with
  // no host has no such excuse: sharing a cube with a body it is not joined to is
  // just two arms in the same place.
  let gain = 0;
  let outside = 0;
  let onFill = false;
  for (const c of cells) {
    const k = key(c);
    if (st.bodyOcc.has(k) && !(host !== null && eq(c, anchorCell))) return null;
    if (st.uncovered.has(k)) gain++;
    if (st.routeIndex.has(k)) onFill = true;
    // The overshoot budget is NOT applied yet — it depends on whether this pose
    // bends anywhere the shape does not, which is not known until the turns are
    // counted below. Only the absolute ceiling bails early here.
    if (!st.shape.has(k) && ++outside > STRAIGHT_OVERSHOOT_CAP) return null;
  }

  // HARD: the module may not collide with ITSELF. See poseSelfClear — a fold
  // that drives two of its own hemispheres through each other is not a fold the
  // hardware can hold, and every broken-looking lock traced back to one.
  if (!poseSelfClear(pose)) return null;

  // What does this placement SERVE? A junction is served by putting the big
  // rod's midpoint — where all four side connectors are — on it. A corner is
  // served by putting one of the module's own bends on it, turning the same
  // way the shape turns.
  const midCell = add(anchorCell, rot(pose.midOffset));
  let serves: ShapeFeature | null = st.pendingJunctions.get(key(midCell)) ?? null;
  if (serves && !cells.some((c) => eq(c, midCell))) serves = null; // spine must reach it
  if (!serves) {
    for (const t of pathTurns(cells)) {
      const corner = st.pendingCorners.get(key(t.cell));
      if (corner && sameTurn(t.arms, [corner.arms[0], corner.arms[1]])) { serves = corner; break; }
    }
  }
  const servedPriority = serves?.priority ?? -1;

  // HARD: reservations. A cube held for a pending feature is off-limits to
  // anything that is not serving something at least as important — this is the
  // mechanism behind rule 6, and without it the busiest junction routinely
  // loses its alignment to a chain that was merely passing through.
  for (const c of cells) {
    const held = st.reserved.get(key(c));
    if (held !== undefined && held > servedPriority) return null;
  }

  // A module that covers nothing new and aligns nothing is not worth placing.
  if (gain === 0 && !serves) return null;

  // ── BENDS THE SHAPE ASKED FOR, AND BENDS IT DID NOT ────────────────────────
  // A direction change that lands on one of the diagram's own corners, turning
  // the way the diagram turns, is rule 2 being obeyed and is free. Every other
  // direction change is this module inventing a corner, which is the one thing
  // that makes a build read as a different shape than the one drawn. Counted
  // against ALL of the shape's corners, not just the pending ones: a corner
  // another module already served is still a place the shape genuinely bends,
  // so a bend there is still honest.
  const { invented, stray } = countBends(cells, st);

  // A stray bend must be JUSTIFIED by real coverage, the same idea as the
  // overshoot ratio just below, and for the same reason: a hub with three or
  // more arms on different axes can only weld two of them straight onto
  // itself — physically, not by choice — so a third arm's ONLY route in is a
  // detour through a neighbour's side connector, and that neighbour's own
  // body is essentially never aimed at the stranded arm, so the detour bends.
  // Forbidding stray bends outright (an earlier version of this rule did,
  // unconditionally) forbade THAT arm from ever being covered at all — the
  // whole shape lost real, substantial coverage rather than pay a bend it
  // structurally could not avoid. A stray bend spent reaching one stray cube
  // with nothing beyond it is still refused; a stray bend that is the first
  // hop of a longer detour is not the same thing and should not be priced as
  // if it were.
  //
  // THE FIRST-HOP PROBLEM. Judged on THIS module's own gain alone, the first
  // hop of a worthwhile detour looks exactly like a worthless one: it often
  // only reaches one or two cells of the stranded arm itself, with the rest
  // waiting for a SECOND module to pick up from where this one lands. Refusing
  // it on its own low gain never lets the second module get a turn at all —
  // the whole arm was lost, not just the awkward first cube of it. So gain is
  // credited with whatever shape still waits past this candidate's own free
  // end, in whichever direction has the most of it — the honest measure of
  // "is there something real down this path" that a single module's own reach
  // cannot see on its own.
  if (stray > 0) {
    const endCellForCredit = add(anchorCell, rot(pose.endOffset));
    let aheadCredit = 0;
    for (const d of DIRS_6) {
      aheadCredit = Math.max(aheadCredit, armLength(endCellForCredit, d, st.uncovered));
    }
    // Strictly greater, not greater-or-equal: a bend that merely BREAKS EVEN
    // against its own cost (one stray bend buying exactly one cube, nothing
    // waiting past it) is exactly the pointless-wander case this gate exists
    // to catch, and it sits precisely on the equality boundary.
    if (gain + aheadCredit <= stray * MIN_GAIN_PER_STRAY) return null;
  }

  // NOW the overshoot budget. A module that makes no bend of its own may hang
  // out further than one that invents a bend, because length reads as length
  // and a bend where the diagram has none reads as a different shape — but
  // "further" is not "unlimited", and this is where that stops being true.
  //
  // Gated on `invented`, not `stray`: a module threading a slab is free of the
  // CHARGE, but it still has no business also spraying itself into empty space.
  // A bending module gets whatever the caller allowed — the tight default
  // normally, the generous one only in the rule-8 rescue pass, where the
  // alternative is a chain not attached to the robot at all.
  //
  // A STRAIGHT placement serving nothing (rules 2/3 don't apply) is further
  // held to a RATIO: overshoot may not exceed 1.5x its own gain, rounded up.
  // Reported honestly as this file's earlier version put it — hardware fact,
  // not a preference — there is no straight pose shorter than reach 4 that
  // still faces forward, so finishing off a 1-2 cube remainder without a bend
  // costs 2-3 cubes of overshoot no matter what. Nischay's own call: past
  // ~1.5x its own gain, that trade stops being worth it — better to leave a
  // short remainder honestly uncovered than draw a stick for a sliver of
  // coverage. Two placements are EXEMPT from the ratio, both for the same
  // reason: gain being small is not a sign anything is wasted, it is the
  // entire premise of the placement, so judging it against gain would reject
  // the exact thing it exists to do.
  //   - A junction spine or a corner bend (`serves` truthy): rule 3 sanctions
  //     overhang independent of gain — a spine centred on a junction with no
  //     through-axis can legitimately need heavy overshoot for a gain as low
  //     as 1 (just the junction cube itself).
  //   - Rule 1's one-or-two-cube diagram (`st.skeleton.degenerate`): the
  //     ENTIRE module is overhang by design there — the diagram is too small
  //     to have a "remainder" at all, so there is no ratio to take.
  // A FILL turn earns no overhang. The exemption below is rule 3's — a spine
  // centred on a junction, or a bend on the outline, legitimately hangs off
  // the diagram. A U-turn in the middle of a slab has no such claim: every
  // cube it needs is interior, so overhang there is purely a module poking
  // out through the face of the wall.
  const cap = invented !== 0 ? overshootCap
    : ((serves && !serves.fill) || st.skeleton.degenerate) ? STRAIGHT_OVERSHOOT_CAP
      : Math.min(STRAIGHT_OVERSHOOT_CAP, Math.ceil(gain * 1.5));
  // A FILL placement stays in the slab. Rule 3's overhang allowance is for a
  // spine centred on a junction or a bend on the outline — a course of a wall
  // has shape on every side of it and no reason at all to leave. This needs to
  // be a cap rather than a price because the fill's own reward is per cube of
  // route advanced (W_FILL_ADVANCE) and W_OUTSIDE is per cube off the diagram:
  // at those rates a module will happily bulge three cubes out through the FACE
  // of a wall to reach one more course, which is exactly what it was doing —
  // seventeen body cubes outside a twenty-four cube wall, most of them out of
  // its plane entirely, while the coverage figure still read 24 of 24.
  const capped = onFill ? Math.min(cap, FILL_OVERSHOOT_CAP) : cap;
  if (outside > capped) return null;

  // HARD: a placement laying part of a FLAT fill stays in its plane. Running
  // on past the end of a course is a stick poking out sideways and rule 4
  // forgives it; bulging out through the face of a wall is not the same thing
  // at all and no budget should be able to buy it. Measured on a 24-cube wall
  // before this existed: seventeen body cubes off the diagram, most of them
  // out of plane, while coverage still read 24 of 24 — the figure said the
  // wall was perfect and the render showed a hairbrush.
  if (onFill && st.fillSlab) {
    const { axis, value } = st.fillSlab;
    let offPlane = 0;
    for (const c of cells) if (c[axis] !== value && ++offPlane > OFF_PLANE_CAP) return null;
  }

  // HARD: connector domes may not interpenetrate. Checked last, because it
  // costs a forward-kinematics run and everything above is set lookups.
  if (!domesClear(candidateDomes(pose, anchorDir, anchorPos), st)) return null;

  const endCell = add(anchorCell, rot(pose.endOffset));
  const endDir = rot(pose.endDir);
  const phase = st.wantedAnchors.has(`${key(endCell)}|${key(endDir)}`) ? 1 : 0;
  // Rule 8 says a module locked in several places is fine, and it is worth
  // seeking: a placement whose free end also lands on an existing connector
  // closes a LOOP in the weld graph, and a loop is what lets a module later let
  // go and walk without splitting the robot. A pure chain has no such slack —
  // every module in it is load-bearing — so without this the shape comes out
  // right and then cannot reconfigure at all.
  const extraLock = (closesALock(endCell, endDir, 'B', st) ? 1 : 0)
    + (host === null && closesALock(anchorCell, anchorDir, 'A', st) ? 1 : 0);

  let score = 0;
  if (serves?.kind === 'junction') score += W_JUNCTION * (serves.degree - 2);
  else if (serves?.kind === 'corner') score += serves.fill ? W_FILL_CORNER : W_CORNER;
  score += phase * W_PHASE;
  score += gain * W_COVER;
  score += routeRun(cells, st) * W_ROUTE;
  const advance = frontierAdvance(cells, st);
  score += advance * W_FILL_ADVANCE;
  score += fillReachedPast(cells, st, advance) * W_FILL_SKIP;
  // A module being placed with NO host is the one case where locking is not a
  // bonus but the whole point: unlocked, it is a second robot standing next to
  // the first (rule 8). So the same signal is worth two orders of magnitude more
  // there than it is as a redundancy bonus mid-chain.
  score += extraLock * (host === null && st.modules.length ? W_LOCK_UNHOSTED : W_LOCK);
  score += stray * W_STRAY_BEND;
  score += outside * W_OUTSIDE;
  score += Math.round(pose.snapError * 10) * W_SNAP;
  score += pose.reach;
  score += armLength(anchorCell, travel, st.shape) * W_ARM_AHEAD;

  return {
    pose, anchorCell, anchorPos, travel, cells, endCell, endDir, host,
    gain, outside, stray, serves, score,
  };
}

/**
 * Would a free end at `cell` facing `dir` land on a connector that is already
 * there, pointing back at it? A second lock on top of the one the module was
 * placed with — legal for the hardware, and the only source of redundancy in an
 * otherwise tree-shaped robot.
 */
function closesALock(cell: Cell, dir: Cell, end: ConnectorEnd, st: FitState): boolean {
  for (const other of st.conn.get(key(cell)) ?? []) {
    if (!weldTypeIsLegal(end, other.end)) continue;
    if (eq(other.dir, negCell(dir))) return true;
  }
  return false;
}

/**
 * How much this body turns, and how much of that the diagram did not ask for.
 *
 * WHY NOT pathTurns. `pathTurns` reports only AXIS-ALIGNED turns, because a
 * corner service has to compare real arm directions against the shape's. That
 * makes it the wrong instrument for judging straightness, and the difference was
 * hiding the exact bug Nischay reported: a module finishing a tee's stem came
 * out as (0,0,4) (0,0,5) (-1,0,6) (-1,0,7) — visibly bent, and outside the
 * diagram anyway — while pathTurns scored it as perfectly straight, because the
 * step from (0,0,5) to (-1,0,6) is DIAGONAL and diagonal steps are not turns it
 * reports. The bend was free, so the fit took it over running straight on.
 *
 * So straightness is counted here on every direction change the body makes,
 * diagonal ones included, and a change is forgiven only when it lands on a cube
 * where the diagram genuinely turns the same way (rule 2) or inside a solid
 * patch, where there is no outline for it to distort.
 */
function countBends(cells: Cell[], st: FitState): { invented: number; stray: number } {
  let invented = 0;
  let stray = 0;
  for (let i = 1; i < cells.length - 1; i++) {
    const dIn = subCell(cells[i], cells[i - 1]);
    const dOut = subCell(cells[i + 1], cells[i]);
    if (eq(dIn, dOut)) continue;

    // Rule 2: a turn on one of the diagram's own corners, turning the way the
    // diagram turns, is the whole point and costs nothing.
    const at = st.shapeCorners.get(key(cells[i]));
    if (at && at.length >= 2
        && sameTurn([negCell(dIn), dOut], [at[0], at[1]])) continue;

    invented++;
    // A bend inside a solid patch is charged as INVENTED but not as STRAY.
    // Invented, because the fill route says where a slab's bends belong now
    // (its U-turns, which the rule-2 test above lets through free) and this
    // is not one of them. Not stray, because the stray charge is a hard gate
    // — it can refuse a placement outright — and refusing every fold inside a
    // slab leaves the fill nothing it can physically build with: the module
    // cannot U-turn into the neighbouring line at all (see U_TURN_PITCH), so
    // the fit needs the freedom to get round some other way. The route's own
    // scoring is what pulls modules onto the lines; this stays a preference.
    if (st.routeIndex.has(key(cells[i]))) continue;
    stray++;
  }
  return { invented, stray };
}

/**
 * Cubes of the fill route this body takes from AHEAD of the frontier, leaving
 * a hole behind them.
 *
 * The fill's reward is for carrying the route on from where it stands
 * (frontierAdvance); this is the other half of that idea, and without it the
 * reward alone is gameable. A pose that carries the fill on four cubes and
 * ALSO happens to clip one cube out of a ring the fill will not reach for
 * another twenty placements scores the same four cubes of advance plus a cube
 * of ordinary coverage, so it wins — and the ring it clipped is now in two
 * pieces, with a module already welded across the join. Measured on a wall:
 * the chain would reach inward for a single cube on its very first turn and
 * strand the whole inner ring.
 *
 * Priced above a cube of coverage on purpose. Taking a cube early is not worth
 * one cube, it costs the fill the run it was going to make later.
 */
function fillReachedPast(cells: Cell[], st: FitState, advance: number): number {
  if (st.fillFrontier === Infinity) return 0;
  let mine = 0;
  for (const c of cells) {
    const k = key(c);
    if (st.routeIndex.has(k) && st.uncovered.has(k)) mine++;
  }
  return Math.max(0, mine - advance);
}

/**
 * How far this body carries the fill ON from where it currently stands.
 *
 * Counted as the number of route cubes it covers starting exactly at the
 * frontier and running consecutively forward — so a module that picks up the
 * next cube of the route and keeps going scores its whole length, and one that
 * covers the same number of cubes somewhere else on the route scores nothing
 * at all. The count stops at a gap in the numbering, which is what keeps one
 * solid patch's fill from claiming to continue into a different patch.
 */
function frontierAdvance(cells: Cell[], st: FitState): number {
  if (st.fillFrontier === Infinity) return 0;
  const have = new Set(cells.map(key));
  let n = 0;
  for (;;) {
    const at = st.routeAt.get(st.fillFrontier + n);
    if (at === undefined || !have.has(at)) break;
    n++;
  }
  return n;
}

/**
 * The longest stretch of this body that walks a fill route IN ORDER.
 *
 * Direction does not matter — a chain may be built either way along the route
 * and the fill is the same fill — so a run counts whether the index rises or
 * falls, as long as it moves by exactly one per cube. One cube off the line
 * ends the run, which is what makes a staircase score as the several
 * disconnected fragments of route it really is.
 *
 * Zero for every shape without a solid patch, so nothing limb-shaped is
 * affected by this at all.
 */
function routeRun(cells: Cell[], st: FitState): number {
  if (!st.routeIndex.size) return 0;
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  let step = 0;
  for (const c of cells) {
    const at = st.routeIndex.get(key(c));
    if (at === undefined) { prev = null; run = 0; continue; }
    if (prev === null) { run = 1; step = 0; }
    else {
      const d = at - prev;
      if (d === step || (step === 0 && (d === 1 || d === -1))) { run++; step = d; }
      else { run = 1; step = 0; }
    }
    prev = at;
    if (run > best) best = run;
  }
  return best;
}

const better = (a: Proposal | null, b: Proposal | null): Proposal | null =>
  (!a ? b : !b ? a : (b.score > a.score ? b : a));

// ── proposal sources ──────────────────────────────────────────────────────────

/**
 * Every pose the precomputed reach table offers from one anchor, scored.
 *
 * The table is 318 poses, which is small enough to scan exhaustively per
 * connector and is the honest way to ask "what CAN this module do from here" —
 * the alternative, guessing a handful of likely folds, is how the previous
 * fitter ended up unable to see the placement it needed.
 */
function proposeFromTable(
  anchorCell: Cell, travel: Cell, anchorPos: Vec3, host: PlacedConnector | null, st: FitState,
  overshootCap = OVERSHOOT_CAP,
): Proposal | null {
  let best: Proposal | null = null;
  for (const pose of reachTable()) {
    best = better(best, evaluate(pose, anchorCell, travel, anchorPos, host, st, overshootCap));
  }
  // A fill that doubles back also gets the solved reversals, which the table
  // does not contain — see uTurnCatalogue. Only where the route actually turns
  // round: solving them is not free, and a spiral never needs one.
  if (st.routeReverses) {
    for (const pose of uTurnCatalogue()) {
      best = better(best, evaluate(pose, anchorCell, travel, anchorPos, host, st, overshootCap));
    }
  }
  return best;
}

/**
 * Score adjustment for what picking THIS split leaves behind on the rest of
 * ONE of the corner's two arms (`arm`), having consumed `used` cubes of it —
 * signed, not a flat bonus, and that sign is the whole point (see below).
 * Called once for the arm this candidate bends OUT along (used = m) and once
 * for the arm it is ANCHORED on (used = k) — both run just as far toward
 * whatever comes next, and either one can strand a far corner.
 *
 * Only a pure, unbent reach-4 module is truly axis-straight (the reach
 * table's reach-1..3 poses are all "near-straight", not axis-true — see
 * their own note), so a chain can only land EXACTLY on a distant cube when
 * the distance to it, minus what THIS corner already consumed, is a whole
 * number of 4-cube hops. A long straight run between two corners is
 * therefore a hidden GLOBAL constraint neither corner can see on its own:
 * both ends have to agree on a pair of splits whose sum, plus whole 4-cube
 * hops, equals the run's exact length, or the far corner is unreachable no
 * matter how clean a candidate it has in isolation — a chain arriving one or
 * two cubes out of phase finds `proposeCorner` empty there and falls back to
 * a generic pose that merely turns at the right cube without laying its own
 * arm straight (the round-8 bug, one level up: a run whose own two ends
 * never agreed on a split).
 *
 * Returns 0 when there is no such constraint to honour at all — the arm
 * dead-ends at a tip or the shape's own edge, where any leftover is fine and
 * nothing downstream needs an exact landing spot. Returning 0 here rather
 * than a flat "pass" is deliberate: a flat bonus for every dead-end option
 * would reward them exactly as much as the option that actually sets up a
 * real far corner, erasing the very distinction this function exists to
 * draw. It is +W_RUN_PARITY only when a real far corner exists AND this
 * split leaves it reachable, and -W_RUN_PARITY when a real far corner exists
 * and this split leaves it stranded.
 */
function armParityBonus(cornerCell: Cell, arm: Cell, used: number, st: FitState): number {
  // Not skeleton.ts's armLength — it caps its scan at ARM_SCAN_CAP (8), which
  // is fine for its own job (a rough "is this arm long or short" bound for
  // tie-breaking) but silently truncates exactly the long runs this check
  // exists to look all the way along.
  let total = 0;
  for (let c = add(cornerCell, arm); st.shape.has(key(c)); c = add(c, arm)) total++;
  const remaining = total - used;
  if (remaining <= 0) return 0;
  const farCell = add(cornerCell, scale(arm, total));
  if (!st.skeleton.corners.has(key(farCell))) return 0; // dead end, not another corner
  const far = st.skeleton.features.find((f) => f.kind === 'corner' && eq(f.cell, farCell));
  const backArm = negCell(arm);
  if (!far || !far.arms.some((a) => eq(a, backArm))) return 0; // not actually facing us
  const farOut = far.arms.find((a) => !eq(a, backArm));
  if (!farOut) return 0;
  const cat = cornerCatalogue();
  const inv = inverseRotationTo(backArm);
  for (const [kFar, mFar] of usableCornerSplits()) {
    if (remaining < kFar || (remaining - kFar) % 4 !== 0) continue;
    if (cat.get(cornerKey(kFar, mFar, inv(farOut)))) return W_RUN_PARITY;
  }
  return -W_RUN_PARITY;
}

/**
 * Poses that put a bend on `corner`, anchored at `anchorCell` travelling
 * `travel` — the catalogue entry for this arm split, rotated into the world.
 *
 * Only fires when the anchor is at exactly the right distance back along one of
 * the corner's arms, which is what the phase bonus in `evaluate` spends its
 * effort steering the chain toward.
 */
function proposeCorner(
  corner: ShapeFeature,
  anchorCell: Cell, travel: Cell, anchorPos: Vec3, host: PlacedConnector | null, st: FitState,
): Proposal | null {
  const inArm = negCell(travel); // we travel toward the corner, so the arm points back
  if (!corner.arms.some((a) => eq(a, inArm))) return null;
  const k = manhattan(anchorCell, corner.cell);
  if (!eq(sub(corner.cell, anchorCell), scale(travel, k))) return null; // not in line with it
  const inv = inverseRotationTo(negCell(travel));
  const cat = cornerCatalogue();

  let best: Proposal | null = null;
  for (const [ck, m] of usableCornerSplits()) {
    if (ck !== k) continue;
    for (const out of corner.arms) {
      if (eq(out, inArm)) continue;
      const poses = cat.get(cornerKey(ck, m, inv(out)));
      if (!poses) continue;
      // Checked on BOTH arms, not just the one this pose bends INTO: the arm
      // this module is ANCHORED on (inArm) runs just as far toward whatever
      // comes next as the arm it bends out along, and a preceding chain that
      // consumed k cells of it needs that same downstream agreement — see
      // armParityBonus. A corner between two long runs has to satisfy both at
      // once, which is exactly the situation this shape's own two corners are
      // in (a long run on either side of each).
      const parityBonus = armParityBonus(corner.cell, out, m, st)
        + armParityBonus(corner.cell, inArm, k, st);
      for (const pose of poses) {
        const p = evaluate(pose, anchorCell, travel, anchorPos, host, st);
        if (p) p.score += parityBonus;
        best = better(best, p);
      }
    }
  }
  return best;
}

/** The best placement available anywhere on the structure, this step. */
function bestProposal(st: FitState, overshootCap = OVERSHOOT_CAP): Proposal | null {
  let best: Proposal | null = null;
  for (const c of st.free) {
    if (!weldTypeIsLegal('A', c.end)) continue;
    if (!sideAvailable(c, st)) continue;
    best = better(best, proposeFromTable(c.cell, c.dir, c.pos, c, st, overshootCap));
    for (const f of st.pending) {
      if (f.kind !== 'corner') continue;
      if (manhattan(c.cell, f.cell) > 3) continue;
      best = better(best, proposeCorner(f, c.cell, c.dir, c.pos, c, st));
    }
  }
  return best;
}

/**
 * The first module, which has nothing to weld onto and so may go anywhere.
 *
 * It goes on the shape's most demanding feature, aligned to it — that is the
 * whole of rule 6. Everything else in the build then grows off this one's
 * connectors, which is what keeps the robot one piece by construction rather
 * than by luck (rule 8).
 */
function proposeRoot(st: FitState): Proposal | null {
  let best: Proposal | null = null;

  for (const f of st.pending.slice(0, ROOT_FEATURES_TRIED)) {
    if (f.kind === 'junction') {
      // Straddle it: anchor two cubes back along an arm so the spine's midpoint
      // — where the side connectors are — lands on the junction itself.
      for (const a of DIRS_6) {
        const anchor = subCell(f.cell, scale(a, 2));
        best = better(best, proposeFromTable(anchor, a, cellPos(anchor), null, st));
      }
    } else if (f.kind === 'corner') {
      for (const inArm of f.arms) {
        for (const [k] of usableCornerSplits()) {
          const anchor = add(f.cell, scale(inArm, k));
          const travel = negCell(inArm);
          best = better(best, proposeCorner(f, anchor, travel, cellPos(anchor), null, st));
          best = better(best, proposeFromTable(anchor, travel, cellPos(anchor), null, st));
        }
      }
    } else {
      for (const a of f.arms.length ? f.arms : DIRS_6) {
        best = better(best, proposeFromTable(f.cell, a, cellPos(f.cell), null, st));
      }
    }
  }

  // A slab is filled from the HEAD of its route, never from the middle.
  //
  // The fill's own features are its U-turns, and a U-turn is reached by
  // anchoring a few cubes BACK along one of its arms — so seeding on one puts
  // the very first module partway down the first line, with the cubes behind
  // it already cut off from any chain that could still reach them. That is
  // exactly what happened: a wall would open three cubes into row one and
  // leave its first two cubes stranded for good. Starting at the head instead
  // means the fill only ever grows forward, which is the whole reason the
  // route is one continuous walk to begin with.
  //
  // And when the shape has no outline left to speak of — no junction, no
  // corner the diagram itself draws — the fill IS the shape, so its head is
  // not merely a candidate for the root, it is the answer. Rule 6 still
  // decides between them: a real junction or corner is more demanding than an
  // area to be filled, so where one exists it still opens the build.
  let fromHead: Proposal | null = null;
  for (const head of st.routeStarts) {
    for (const a of DIRS_6) {
      fromHead = better(fromHead, proposeFromTable(head, a, cellPos(head), null, st));
    }
  }
  if (fromHead && !st.pending.some((f) => !f.fill)) return fromHead;
  best = better(best, fromHead);

  // Nothing on a feature worked — fall back to the longest straight corridor,
  // which is the most module-shaped thing a shape without features can offer.
  if (!best) {
    for (const run of st.skeleton.runs.slice(0, 3)) {
      for (const [cell, dir] of [[run.from, run.dir], [run.to, negCell(run.dir)]] as [Cell, Cell][]) {
        best = better(best, proposeFromTable(cell, dir, cellPos(cell), null, st));
      }
    }
  }
  return best;
}

/**
 * How many of the ranked features the root placement will try before falling
 * back. Only a handful: if the top feature cannot take a module, the next one
 * down almost always can, and scanning the whole list means scanning the whole
 * table from six directions per feature for no gain.
 */
const ROOT_FEATURES_TRIED = 6;

const cellPos = (c: Cell): Vec3 => [c[0], c[1], c[2]];

// ── committing a placement ────────────────────────────────────────────────────

/**
 * Would welding a new module onto `conn` still leave its host within its side
 * budget? A/B ends have no budget — the chain's own two ends are unlimited by
 * this rule. All four SIDE faces may be used at once (modulink.sideWeldsAreLegal,
 * 2026-09-05) — the only remaining limit is that a module physically has four.
 */
function sideAvailable(conn: PlacedConnector, st: FitState): boolean {
  if (conn.end === 'A' || conn.end === 'B') return true;
  const used = st.usedSides.get(conn.moduleId) ?? [];
  return used.length < SIDE_ENDS.length;
}

/** Record that `conn` is now claimed by a real weld, for sideAvailable's count. */
function claimSide(conn: PlacedConnector, st: FitState): void {
  if (conn.end === 'A' || conn.end === 'B') return;
  const used = st.usedSides.get(conn.moduleId) ?? [];
  st.usedSides.set(conn.moduleId, [...used, conn.end]);
}

/** Commit a proposal and return the module it placed. */
function commit(p: Proposal, st: FitState): FittedModule {
  const m: FittedModule = {
    id: `M${st.nextId++}`,
    anchorCell: p.anchorCell,
    anchorPos: p.anchorPos,
    anchorDir: negCell(p.travel),
    endCell: p.endCell,
    endDir: p.endDir,
    cells: p.cells,
    reach: p.pose.reach,
    pose: p.pose,
    weldedTo: p.host?.moduleId ?? null,
    order: st.modules.length,
    // A module inherits its host's chain; a module with no host starts a new one.
    chain: p.host
      ? (st.modules.find((x) => x.id === p.host!.moduleId)?.chain ?? st.chain)
      : st.chain++,
    serves: p.serves?.kind === 'junction' || p.serves?.kind === 'corner'
      ? { kind: p.serves.kind, cell: p.serves.cell }
      : null,
  };
  st.modules.push(m);
  registerDomes(m, st);
  for (const c of p.cells) {
    st.bodyOcc.add(key(c));
    st.uncovered.delete(key(c));
  }

  if (p.host) {
    claimSide(p.host, st);
    // The host connector is spent and the new module's A is spent on it.
    st.free = st.free.filter((c) => !(c.moduleId === p.host!.moduleId && c.end === p.host!.end));
  }
  for (const c of connectorsOf(m)) {
    const k = key(c.cell);
    const list = st.conn.get(k);
    if (list) list.push(c); else st.conn.set(k, [c]);
    if (!(p.host && c.end === 'A')) st.free.push(c);
  }

  if (p.serves?.kind === 'junction') st.aligned.junction++;
  else if (p.serves?.kind === 'corner') st.aligned.corner++;
  if (p.serves) st.servedCells.add(key(p.serves.cell));
  return m;
}

// ── the plan: what the shape still wants ──────────────────────────────────────

/**
 * How many pending features hold cubes at once.
 *
 * Reservations are what let a high-priority feature keep its alignment, but
 * reserving for EVERY feature at once would wall off a solid region entirely —
 * in a slab almost every cube is a junction. Holding cubes only for the top
 * handful gives the ranking teeth where it matters and leaves the rest of the
 * shape free to be covered.
 */
const MAX_RESERVATIONS = 12;

/**
 * Recompute what is still wanted: which features are unserved, which cubes they
 * are holding, and which anchor points a module should aim its free end at.
 *
 * A feature whose cube has been covered without being aligned to is not pending
 * any more — it is MISSED, and is recorded as such so the log can say so rather
 * than quietly implying the fit did what was asked.
 */
function refreshPlan(st: FitState): void {
  // Where the fill has got to. Recomputed every step because a module placed
  // for any other reason may well have covered the next cube of the route on
  // its way past, and the fill should carry on from there rather than double
  // back for something already built.
  st.fillFrontier = Infinity;
  for (const k of st.uncovered) {
    const at = st.routeIndex.get(k);
    if (at !== undefined && at < st.fillFrontier) st.fillFrontier = at;
  }

  const pending: ShapeFeature[] = [];
  for (const f of st.skeleton.features) {
    if (st.servedCells.has(key(f.cell))) continue;
    if (st.bodyOcc.has(key(f.cell))) {
      if (!st.missedKeys.has(key(f.cell))) {
        st.missedKeys.add(key(f.cell));
        if (f.kind === 'junction' || f.kind === 'corner') st.missed.push(f);
      }
      continue;
    }
    if (f.kind === 'junction' || f.kind === 'corner') pending.push(f);
  }
  st.pending = pending;

  st.pendingJunctions = new Map();
  st.pendingCorners = new Map();
  for (const f of pending) {
    if (f.kind === 'junction') st.pendingJunctions.set(key(f.cell), f);
    else st.pendingCorners.set(key(f.cell), f);
  }

  st.reserved = new Map();
  if (!st.reservationsReleased) {
    const hold = (c: Cell, priority: number) => {
      if ((st.reserved.get(key(c)) ?? -1) < priority) st.reserved.set(key(c), priority);
    };
    for (const f of pending.slice(0, MAX_RESERVATIONS)) {
      // A FILL turn holds nothing, and this is not a detail — reserving them
      // deadlocks the fill outright. Reservations exist because a chain merely
      // passing through can steal the cube a junction needed for its spine. But
      // a U-turn is TWO route corners on adjacent cubes, so each one reserved
      // the other's cube at a priority the other could not match, and the one
      // module able to serve both was rejected for trespassing on a
      // reservation held for the very turn it was making. A wall stalled two
      // modules in, chain pointing out through the wall. What keeps a fill
      // honest is its scoring (W_FILL_ADVANCE), not holding cubes hostage.
      if (f.fill) continue;
      hold(f.cell, f.priority);
      // A JUNCTION needs more than its own cube held. Its spine is five cubes
      // long and centred on it, so a module merely passing through the cube NEXT
      // to it blocks the spine just as surely as one sitting on it — and that is
      // what was happening: a corner module two cubes away would take the cells
      // the spine needed, the junction cube itself stayed free, the reservation
      // saw nothing wrong, and the junction then had nowhere to put a spine.
      // Measured on the humanoid: one of its two junctions lost its alignment to
      // a corner, which is precisely the ordering rule 6 exists to prevent.
      if (f.kind !== 'junction') continue;
      for (const a of f.throughAxes.length ? f.throughAxes : f.arms) {
        for (let i = -2; i <= 2; i++) hold(add(f.cell, scale(a, i)), f.priority);
      }
    }
  }

  // Anchor points the pending features want a module to arrive at, so the next
  // module can align on them exactly. A junction wants an anchor two cubes back
  // along an arm; a corner wants one 1, 2 or 3 cubes back, whichever splits its
  // arms into one of the module's real bend forms.
  st.wantedAnchors = new Map();
  const want = (cell: Cell, travel: Cell, priority: number) => {
    const k = `${key(cell)}|${key(travel)}`;
    if ((st.wantedAnchors.get(k) ?? -1) < priority) st.wantedAnchors.set(k, priority);
  };
  for (const f of pending) {
    if (f.kind === 'junction') {
      // ALL SIX DIRECTIONS, not just the occupied arms. A spine only has to put
      // its midpoint on the junction; whether the shape continues out the far
      // side decides how much of the module hangs in air, not whether it fits.
      //
      // Restricting this to arms is what stranded the humanoid's hip. Its arms
      // run left, right and up, so the only anchors advertised were two cubes
      // out along those — all of them in empty space with nothing to weld to.
      // The one anchor that WAS reachable, two cubes up the torso with the
      // spine running down through the hip and its lower half overhanging, was
      // never advertised, so no chain ever arrived there and the junction went
      // unserved while a leg's corner took its cube instead.
      for (const a of DIRS_6) want(subCell(f.cell, scale(a, 2)), a, f.priority);
    } else {
      // Which (k, m) splits are usable AT ALL, in principle, is only half the
      // question — the catalogue is keyed on the ACTUAL turn direction too, and
      // the bend's own self-clearance is not rotationally symmetric (which of
      // its two arms the side connectors sit nearest to differs per direction),
      // so a split that is clean turning one way can self-collide turning the
      // other. `usableCornerSplits` reports a k as usable once ANY direction
      // clears it — advertising every k for every arm regardless of direction
      // used to invite a chain to arrive at a distance THIS corner, approached
      // FROM THIS ARM, has no clean bend for at all: `proposeCorner` would then
      // find nothing there, and the fallback was a generic reach-table pose
      // that merely turns at the corner cube (satisfying `pathTurns`) without
      // laying its continuing arm straight — which is what put a side lock
      // where a clean end-to-end bend belonged. So check the real catalogue
      // entry for this exact (k, inArm, out) before advertising it.
      const cat = cornerCatalogue();
      for (const inArm of f.arms) {
        const out = f.arms.find((a) => !eq(a, inArm));
        if (!out) continue;
        const inv = inverseRotationTo(inArm);
        for (const [k, m] of usableCornerSplits()) {
          if (!cat.get(cornerKey(k, m, inv(out)))) continue;
          want(add(f.cell, scale(inArm, k)), negCell(inArm), f.priority);
        }
      }
    }
  }
}

// ── connectivity ──────────────────────────────────────────────────────────────

/**
 * Neighbor offsets used to decide whether two module bodies are close enough to
 * count as touching. This is NOT the 6 face directions used for shape
 * connectivity (DIRS_6) — a module's real body is a swept collision footprint
 * from continuous FK, and a bent pose regularly threads diagonally across a flat
 * cube grid without ever touching a neighbour face-on. Face-only adjacency made
 * whole rows of a wall invisible to the touching tier even though they sit right
 * next to built cubes on a diagonal.
 */
const NEIGHBORS_26: Vec3[] = (() => {
  const out: Vec3[] = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++)
        if (dx !== 0 || dy !== 0 || dz !== 0) out.push([dx, dy, dz]);
  return out;
})();

/** Flood-fill `cells` under 26-neighbor adjacency: do they all land in one component? */
function cellsAreOnePiece(cells: Cell[]): boolean {
  if (cells.length === 0) return true;
  const set = new Set(cells.map((c) => key(c)));
  const seen = new Set<CellKey>();
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

/**
 * An uncovered cube that already touches the built structure — the best
 * available starting point for a chain that CANNOT weld onto anything.
 *
 * A module offers at most 6 real attachment directions (2 chain ends + 4 side
 * connectors) FROM ONE CUBE — nowhere near enough to weld a fully interlocked
 * tree across a WIDE shape (a wall, a table top, a tower's cross-section),
 * which needs many parallel rows meeting no single cube at all. Requiring
 * every module to weld left most of a wide shape uncovered — not because it
 * cannot physically be built, but because "weld" is stricter than the shape
 * needs there. Side-by-side modules may touch, must not collide, and lock
 * incidentally if a connector happens to line up; a formal weld is not
 * required just to stand next to the rest.
 */
function findTouchingSeed(st: FitState, skip: Set<CellKey>): Cell | null {
  let best: Cell | null = null;
  let bestTouch = 0;
  for (const k of st.uncovered) {
    if (skip.has(k)) continue;
    const c = unkey(k);
    // FACE adjacency, not the 26-way kind used elsewhere in this file. A cube
    // that only touches the structure on a diagonal is not reliably touching it
    // at all: cube centres a diagonal apart are up to ~1.3 cubes from each
    // other, and a module's rods are 0.4 cubes thick, so the two bodies can be
    // nowhere near one another while the footprints look adjacent. Rule 8 says
    // nothing exists unattached, so a chain that cannot weld must at least start
    // flush against a face.
    let touch = 0;
    for (const d of DIRS_6) if (st.bodyOcc.has(key(add(c, d)))) touch++;
    // Most contact wins: it packs a new chain flush against the structure rather
    // than merely meeting it at one cube.
    if (touch > bestTouch) { bestTouch = touch; best = c; }
  }
  return best;
}

/**
 * Weld separate chains into one robot.
 *
 * A FREE END reaches onto another module's connector. End-to-end and end-to-side
 * are both allowed; side-to-side never is, so a weld always has at least one
 * free end in it.
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

  // Sides already carrying a weld, so a module never gets asked to hold a
  // fifth — the only limit now that all four may be used at once.
  const usedSides = new Map<string, ConnectorEnd[]>();
  const sidesOf = (id: string) => usedSides.get(id) ?? [];
  const noteSide = (id: string, end: ConnectorEnd) => {
    if (end === 'A' || end === 'B') return;
    usedSides.set(id, [...sidesOf(id), end]);
  };
  const sideBlocked = (id: string, end: ConnectorEnd) => {
    if (end === 'A' || end === 'B') return false;
    return sidesOf(id).length >= SIDE_ENDS.length;
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
  return { welds, components: roots.size, log };
}

/**
 * Re-order modules so the build ANIMATION is connected at every frame, not just
 * at the end (rule 8).
 *
 * Placement order is already almost right — every module welds onto one that
 * exists — but the touching-chain fallback can start a piece that only becomes
 * attached once its neighbours arrive. A breadth-first walk of the real
 * connection graph (welds first, body contact second) puts every module after
 * something it is attached to, so a partly-revealed build is never a shape with
 * a piece floating beside it.
 */
function orderByConnection(modules: FittedModule[], welds: ChainWeldLink[]): FittedModule[] {
  if (modules.length < 2) return modules;
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };
  for (const m of modules) { if (!adj.has(m.id)) adj.set(m.id, new Set()); }
  for (const m of modules) if (m.weldedTo) link(m.id, m.weldedTo);
  for (const w of welds) link(w.fromModule, w.toModule);

  // Body contact, so a touching chain still counts as attached for reveal order.
  const owner = new Map<CellKey, string[]>();
  for (const m of modules) {
    for (const c of m.cells) {
      const k = key(c);
      const list = owner.get(k);
      if (list) list.push(m.id); else owner.set(k, [m.id]);
    }
  }
  for (const m of modules) {
    for (const c of m.cells) {
      for (const d of NEIGHBORS_26) {
        for (const other of owner.get(key(add(c, d as Cell))) ?? []) {
          if (other !== m.id) link(m.id, other);
        }
      }
    }
  }

  const byId = new Map(modules.map((m) => [m.id, m]));
  const seen = new Set<string>();
  const out: FittedModule[] = [];
  // Seed from the modules in their original placement order, so the root of the
  // fit stays the root of the reveal and any genuinely separate piece follows
  // rather than interleaving.
  for (const seed of modules) {
    if (seen.has(seed.id)) continue;
    const queue = [seed.id];
    seen.add(seed.id);
    while (queue.length) {
      const id = queue.shift()!;
      const m = byId.get(id);
      if (m) out.push(m);
      for (const n of adj.get(id) ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
  }
  return out.map((m, i) => ({ ...m, order: i }));
}

// ── the fit ───────────────────────────────────────────────────────────────────

export interface FitOptions {
  /**
   * Refuse to place any module that would not be attached to the rest of the
   * robot. ON by default, and it is a HARD constraint, not a preference.
   *
   * A robot is one machine. A "fit" that covers more cubes by leaving islands
   * floating in mid-air has not built the shape — it has built several unrelated
   * robots that happen to sit near each other, which is not a thing the hardware
   * can be, and every downstream stage (mobility, the walk planner, the weld
   * graph) is meaningless across a gap no connector spans.
   *
   * The cost is real and is paid in COVERAGE: where nothing already built can
   * reach a region, those cubes are left uncovered and reported, rather than
   * covered by a detached chain. That trade is the right way round — uncovered
   * cubes are visibly, honestly incomplete, whereas floating chains look like a
   * finished robot and are not.
   */
  requireConnected?: boolean;
}

/** Safety valve. No real shape needs anywhere near this many placements. */
const MAX_PLACEMENTS = 500;

/**
 * Build: fit real modules into a cube shape.
 *
 * Returns them in a connectivity-respecting build order, along with whatever
 * could not be covered and whatever the shape asked for that the module could
 * not deliver. An incomplete fit is reported as incomplete — a shape whose
 * corridors are too tight or too short for any fold is a real answer about that
 * shape, and quietly dropping the leftovers would hide it.
 */
export function fitModules(cells: Cell[], options: FitOptions = {}): FitResult {
  const requireConnected = options.requireConnected ?? true;
  // Slabs get their fill route folded into the skeleton here — see
  // serpentine.ts. A shape with no solid patch comes back unchanged.
  const skeleton = withRouteFeatures(analyseShape(cells), cells);
  const routes = serpentineRoutes(cells);

  const st: FitState = {
    shape: new Set(cells.map(key)),
    uncovered: new Set(cells.map(key)),
    bodyOcc: new Set<CellKey>(),
    modules: [],
    log: [],
    nextId: 0,
    chain: 0,
    conn: new Map<CellKey, PlacedConnector[]>(),
    free: [],
    domes: new Map<CellKey, { pos: Vec3; normal: Vec3; moduleId: string }[]>(),
    usedSides: new Map<string, ConnectorEnd[]>(),
    skeleton,
    pending: [],
    pendingJunctions: new Map(),
    pendingCorners: new Map(),
    shapeCorners: new Map(
      skeleton.features.filter((f) => f.kind === 'corner').map((f) => [key(f.cell), f.arms]),
    ),
    routeIndex: (() => {
      const out = new Map<CellKey, number>();
      let base = 0;
      for (const r of routes) {
        r.cells.forEach((c, i) => out.set(key(c), base + i));
        base += r.cells.length + 1; // +1 so two patches never read as adjacent
      }
      return out;
    })(),
    routeStarts: routes.map((r) => r.cells[0]),
    routeReverses: routes.some(routeReverses),
    fillSlab: (() => {
      const all = routes.flatMap((r) => r.cells);
      if (!all.length) return null;
      for (const axis of [0, 1, 2] as const) {
        if (all.every((c) => c[axis] === all[0][axis])) return { axis, value: all[0][axis] };
      }
      return null;
    })(),
    routeAt: (() => {
      const out = new Map<number, CellKey>();
      let base = 0;
      for (const r of routes) {
        r.cells.forEach((c, i) => out.set(base + i, key(c)));
        base += r.cells.length + 1;
      }
      return out;
    })(),
    fillFrontier: Infinity,
    reserved: new Map(),
    wantedAnchors: new Map(),
    missed: [],
    aligned: { junction: 0, corner: 0 },
    servedCells: new Set<CellKey>(),
    missedKeys: new Set<CellKey>(),
    reservationsReleased: false,
  };

  if (!cells.length) {
    return {
      modules: [], covered: [], uncovered: [], runs: 0, chainWelds: [], components: 0,
      spatiallyOnePiece: true, touchingChains: 0,
      junctionsAligned: 0, junctionsTotal: 0, cornersAligned: 0, cornersTotal: 0,
      log: ['nothing to build'],
    };
  }

  const junctionsTotal = skeleton.junctions.size;
  const cornersTotal = skeleton.corners.size;

  // RULE 1. One or two cubes is a diagram too small to say anything about — it
  // says only that SOMETHING is here. One straight module, unfolded, however far
  // it hangs past the cubes. Folding it up to fit inside would be inventing a
  // constraint the diagram never expressed.
  if (skeleton.degenerate) {
    const dir: Cell = cells.length === 2 ? sub(cells[1], cells[0]) : [1, 0, 0];
    const straight = reachTable()
      .filter((p) => p.reach === 4 && segmentCount(p.cells) === 1)
      .sort((a, b) => a.snapError - b.snapError);
    let placed: Proposal | null = null;
    for (const pose of straight) {
      placed = evaluate(pose, cells[0], dir, cellPos(cells[0]), null, st, Infinity);
      if (placed) break;
    }
    if (placed) commit(placed, st);
    return finish(st, cells, requireConnected, 0, junctionsTotal, cornersTotal, [
      'one module: a one- or two-cube diagram says something is here, not how big it is, '
      + 'so the module is placed straight and allowed to overhang rather than folded to fit',
    ]);
  }

  // ROOT. The most demanding feature gets a module aligned to it first (rule 6);
  // everything after grows off this one's connectors (rule 8).
  refreshPlan(st);
  const root = proposeRoot(st);
  if (root) commit(root, st);

  // GROW. Each step, the single best placement anywhere on the structure.
  const touchStuck = new Set<CellKey>();
  let touchingChains = 0;
  let guard = 0;

  while (st.uncovered.size && guard++ < MAX_PLACEMENTS) {
    refreshPlan(st);

    const next = bestProposal(st);
    if (next) { commit(next, st); continue; }

    // Stalled with reservations still held: they are now costing more than they
    // buy, so drop them and let the fit cover what it can. Whatever alignment
    // they were protecting has already been lost or was never reachable.
    if (!st.reservationsReleased && st.pending.length) {
      st.reservationsReleased = true;
      continue;
    }

    // Still nothing welded fits inside the overshoot budget. Rule 8 outranks
    // rule 7: staying attached matters more than staying on the diagram, so
    // before giving up on a weld entirely, allow a module to hang out by up to a
    // full length. The per-cube penalty is unchanged, so this stays a last
    // resort rather than a licence to sprawl — it only wins when the alternative
    // is a chain that is not locked to the robot at all.
    const stretched = bestProposal(st, RELAXED_OVERSHOOT);
    if (stretched) { commit(stretched, st); continue; }

    // Nothing can WELD onto the remaining cubes — but a shape wide enough to
    // need more than one chain routinely runs out of the 4 attachment
    // directions one module offers long before it runs out of cubes. Start a
    // new chain flush against what is already built: touching, not welded, and
    // still collision-checked by the same rules as everything else.
    const seed = findTouchingSeed(st, touchStuck);
    if (!seed) break;
    let started: Proposal | null = null;
    for (const d of DIRS_6) {
      started = better(started, proposeFromTable(seed, d, cellPos(seed), null, st));
    }
    if (started) { commit(started, st); touchingChains++; } else touchStuck.add(key(seed));
  }

  // UNCONSTRAINED MODE ONLY (see FitOptions.requireConnected). Everything above
  // refuses to place a module that is not welded or at least flush against the
  // structure. Without that requirement, keep going from any uncovered cube at
  // all — which produces chains standing off on their own, unrelated in space to
  // the rest. Nothing in the app ships this way; it exists so the cost of the
  // connectivity rule can be measured rather than assumed.
  if (!requireConnected) {
    const stuck = new Set<CellKey>();
    while (st.uncovered.size && guard++ < MAX_PLACEMENTS) {
      refreshPlan(st);
      let seed: Cell | null = null;
      for (const k of st.uncovered) if (!stuck.has(k)) { seed = unkey(k); break; }
      if (!seed) break;
      let started: Proposal | null = null;
      for (const d of DIRS_6) {
        started = better(started, proposeFromTable(seed, d, cellPos(seed), null, st));
      }
      if (started) commit(started, st); else stuck.add(key(seed));
    }
  }

  return finish(st, cells, requireConnected, touchingChains, junctionsTotal, cornersTotal);
}

/** Weld, order, measure and report. Shared by the normal path and rule 1's. */
function finish(
  st: FitState,
  cells: Cell[],
  requireConnected: boolean,
  touchingChains: number,
  junctionsTotal: number,
  cornersTotal: number,
  extraLog: string[] = [],
): FitResult {
  const covered = cells.filter((c) => !st.uncovered.has(key(c)));
  const uncovered = cells.filter((c) => st.uncovered.has(key(c)));
  const joined = weldChains(st.modules);
  const modules = orderByConnection(st.modules, joined.welds);
  const chains = modules.filter((m) => !m.weldedTo).length;

  const log: string[] = [...extraLog];
  log.push(
    modules.length
      ? `built ${modules.length} module(s) in ${chains} chain(s), covering `
        + `${covered.length} of ${cells.length} cubes`
      : 'no modules could be fitted into this shape',
  );

  if (junctionsTotal || cornersTotal) {
    log.push(
      `shape asked for ${junctionsTotal} junction(s) and ${cornersTotal} corner(s); `
      + `${st.aligned.junction} junction(s) got a spine centred on them and `
      + `${st.aligned.corner} corner(s) got a module's own bend`,
    );
  }
  if (st.missed.length) {
    log.push(
      `${st.missed.length} feature(s) were covered without being aligned to — a module `
      + 'reached them before one could be posed on them. Those places are built, but they '
      + 'bend and branch a little off where the diagram put them.',
    );
  }
  if (uncovered.length) {
    log.push(
      `${uncovered.length} cube(s) uncovered — a module bridges 4 cubes straight and fewer `
      + 'when folded, so very short stubs have nothing that fits them'
      + (requireConnected
        ? ', and anything nothing already built could reach was left out rather than covered '
          + 'by a chain floating unattached'
        : ''),
    );
  }
  log.push(...joined.log);
  if (touchingChains) {
    log.push(
      `${touchingChains} chain(s) placed touching the structure without a formal lock — the `
      + "shape needs more parallel rows than one module's 6 directions "
      + '(2 chain ends + 4 side connectors) can weld from one cube. Packed flush and '
      + 'collision-checked, not electrically joined there; any connectors that happened to '
      + 'line up locked anyway.',
    );
  }

  // The honest "is this actually one physical object" check — body-cube
  // adjacency across ALL modules, independent of which pairs are formally
  // welded. A wide shape legitimately has weld-components > 1 while still being
  // one contiguous mass; a GENUINE bug produces pieces that are not even
  // touching, which this catches.
  const allCells = modules.flatMap((m) => m.cells);
  const spatiallyOnePiece = allCells.length > 0 && cellsAreOnePiece(allCells);

  if (requireConnected && modules.length > 0 && !spatiallyOnePiece) {
    log.push(
      'BUG: connectivity was required but the fit still produced physically separate '
      + 'pieces — please report this shape.',
    );
  } else if (requireConnected && modules.length > 0) {
    log.push(
      joined.components === 1
        ? `all ${modules.length} module(s) are welded into one connected robot`
        : `all ${modules.length} module(s) form one physically contiguous robot `
          + `(${joined.components} separately-locked group(s) within it — see above)`,
    );
  }

  return {
    modules,
    covered,
    uncovered,
    runs: chains,
    chainWelds: joined.welds,
    components: joined.components,
    spatiallyOnePiece,
    touchingChains,
    junctionsAligned: st.aligned.junction,
    junctionsTotal,
    cornersAligned: st.aligned.corner,
    cornersTotal,
    log,
  };
}
