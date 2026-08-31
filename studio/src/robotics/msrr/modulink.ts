/**
 * modulink.ts — the MODULINK module: a bendable 6-rod chain, not a cube.
 *
 * WHY THIS FILE EXISTS
 * The classic MSRR abstraction says one module is one lattice cube. That is true
 * for the mod1 theme and it is what makes the reconfiguration planner tractable.
 * It is NOT true for a MODULINK module: this thing is a serial chain roughly four
 * cube-lengths long when fully extended, and it FOLDS. Straight, it lies across
 * four cubes. Elbowed, three. Doubled back, two. Coiled, one.
 *
 * That variability is the whole point and it is a property of the module's POSE,
 * not of the lattice. The lattice stays uniformly cubic. What changes is how many
 * of those cubes one module's body actually passes through, which is answered by
 * running real forward kinematics over the joint angles and voxelising the result
 * (see occupancy.ts).
 *
 * STRUCTURE (fixed, asserted — a module is always exactly this)
 *
 *   Connector A ─ rod0 ─ rod1 ─ rod2 ─ rod3(BIG) ─ rod4 ─ rod5 ─ Connector B
 *                                  │
 *                       4 side connectors (UP/RIGHT/DOWN/LEFT)
 *                       ride the midpoint of rod3, facing radially out
 *
 * Rod-kind sequence is fixed: TWIST · BEND · BEND · TWIST · BEND · TWIST.
 * Rod index 3 is the "big rod" — the twist rod flanked by BEND on both sides,
 * twice as long as the other twists (length only, same radius). It is the spine,
 * and the four side connectors branch from its midpoint.
 *
 * Six lock faces = the six faces of a cube: A, B, UP, RIGHT, DOWN, LEFT. All six
 * have identical geometry. A connector is a lock point, not a joint — welding two
 * connectors forces them to the same point with opposed outward normals.
 *
 * DOF: 6 revolute per module. TWIST rolls about local Z (0…360°), BEND pitches
 * about local X (−90°…+90°). TWIST-BEND pairs behave like a 2-DOF universal
 * joint; the three twists also give end-to-end roll control.
 *
 * Framework-free by design: no THREE, no React. Pose maths is a compact local
 * implementation so this file can be unit-tested and reused by the planner.
 */

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
export interface Pose { position: Vec3; quaternion: Quat }

// ── physical constants ────────────────────────────────────────────────────────

export const TWIST_ROD_LENGTH = 0.5;
export const BEND_ROD_LENGTH = 0.55;
/** rod 3 is a twist rod at double length — the spine */
export const BIG_ROD_LENGTH_SCALE = 2;
export const SEGMENT_GAP = 0.02;
export const HEMISPHERE_RADIUS = 0.42;
export const SIDE_CONNECTOR_RADIAL_OFFSET = 0.6;
/**
 * Rod cylinder radius, from the hardware spec. Every rod is this thick, the
 * big spine rod included — the spine is LONGER (BIG_ROD_LENGTH_SCALE), not
 * fatter.
 *
 * This matters geometrically, not just cosmetically: a side connector rides
 * at SIDE_CONNECTOR_RADIAL_OFFSET (0.6) from the rod axis with a dome of
 * HEMISPHERE_RADIUS (0.42), so the dome's inner edge lands at 0.6 - 0.42 =
 * 0.18, just INSIDE this 0.2 rod surface. That overlap is what makes a side
 * dome read as mounted flush on the spine. Drawing either radius smaller
 * than spec opens a visible gap and the dome appears to float in mid-air
 * beside the rod, attached to nothing.
 */
export const ROD_RADIUS = 0.2;

export const RODS_PER_MODULE = 6;
export const BIG_ROD_INDEX = 3;

export type RodKind = 'twist' | 'bend';

/** The one legal rod alphabet. A module always has exactly these six, in this order. */
export const ROD_ORDER: readonly RodKind[] = Object.freeze([
  'twist', 'bend', 'bend', 'twist', 'bend', 'twist',
] as RodKind[]);

/** Joint limits, radians. TWIST is unlimited roll; BEND is ±90°. */
export const TWIST_LIMIT: [number, number] = [0, Math.PI * 2];
export const BEND_LIMIT: [number, number] = [-Math.PI / 2, Math.PI / 2];

export const rodLength = (index: number): number => {
  const kind = ROD_ORDER[index];
  if (kind === 'bend') return BEND_ROD_LENGTH;
  return TWIST_ROD_LENGTH * (index === BIG_ROD_INDEX ? BIG_ROD_LENGTH_SCALE : 1);
};

/**
 * Straight-line A→B distance with every joint at zero: the sum of all six rod
 * lengths plus seven gaps (one before each rod, one trailing to connector B).
 * 2*0.5 + 2*0.5(big) + 3*0.55 + 7*0.02 = 3.79
 */
export const MODULE_CHAIN_LENGTH =
  ROD_ORDER.reduce((sum, _, i) => sum + rodLength(i), 0) + (RODS_PER_MODULE + 1) * SEGMENT_GAP;

/** Centre-to-centre distance between two side connectors 90° apart on the same rod. */
export const ADJACENT_SIDE_SEPARATION = SIDE_CONNECTOR_RADIAL_OFFSET * Math.SQRT2;
/** Centre-to-centre distance two connector domes need before they interpenetrate. */
export const REQUIRED_DOME_CLEARANCE = 2 * HEMISPHERE_RADIUS;

/**
 * Fraction of the dome clearance kept in hand before two connectors are called
 * safe. Bare geometric non-overlap is not clearance: parts have tolerances, the
 * domes are the mating surfaces, and a plan that banks on a sub-millimetre gap
 * is a plan that fails in metal.
 */
export const DOME_CLEARANCE_MARGIN = 0.05;

/**
 * Adjacent side connectors clash, so a module supports at most TWO side welds and
 * they must be opposite each other (UP/DOWN or LEFT/RIGHT). This shapes every
 * branching decision downstream.
 *
 * A NOTE ON THE SOURCE SPEC, because the numbers do not agree with its prose.
 * The MODULINK write-up says adjacent side connectors "sit 0.6*sqrt(2) ~= 0.707
 * apart". That arithmetic is stale: 0.6*sqrt(2) = 0.8485. The 0.707 figure is
 * 0.5*sqrt(2), left over from when the radial offset was 0.5. At the current
 * offset of 0.6 the true separation is 0.8485 against a 0.84 requirement — the
 * domes clear by 0.0085, about 1%, which is nothing. The source project also
 * MEASURED real interpenetration at junctions (10 overlapping pairs, 0.642 deep),
 * so they clash in practice regardless of which side of the line the bare
 * inequality falls on. Hence the margin: computed, not asserted, and it reports
 * true at the documented geometry for the documented reason.
 */
export const ADJACENT_SIDE_FACES_CLASH =
  ADJACENT_SIDE_SEPARATION < REQUIRED_DOME_CLEARANCE * (1 + DOME_CLEARANCE_MARGIN);

/** How much room is actually left between two adjacent side domes. Negative = overlap. */
export const ADJACENT_SIDE_CLEARANCE = ADJACENT_SIDE_SEPARATION - REQUIRED_DOME_CLEARANCE;

// ── connectors ────────────────────────────────────────────────────────────────

export type ConnectorEnd = 'A' | 'B' | 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';

export const CONNECTOR_ENDS: readonly ConnectorEnd[] =
  Object.freeze(['A', 'B', 'UP', 'RIGHT', 'DOWN', 'LEFT'] as ConnectorEnd[]);

export const SIDE_ENDS: readonly ConnectorEnd[] =
  Object.freeze(['UP', 'RIGHT', 'DOWN', 'LEFT'] as ConnectorEnd[]);

export const isSideEnd = (end: ConnectorEnd) => end !== 'A' && end !== 'B';

/** Radial direction each side connector faces, in the big rod's local frame. */
const SIDE_DIRECTION: Record<string, Vec3> = {
  UP: [0, 1, 0],
  RIGHT: [1, 0, 0],
  DOWN: [0, -1, 0],
  LEFT: [-1, 0, 0],
};

/** The two side faces 90° away from `end` — the ones that cannot also carry a weld. */
export function adjacentSideEnds(end: ConnectorEnd): ConnectorEnd[] {
  switch (end) {
    case 'UP':
    case 'DOWN': return ['RIGHT', 'LEFT'];
    case 'RIGHT':
    case 'LEFT': return ['UP', 'DOWN'];
    default: return []; // A and B are on the chain axis, they clash with nothing
  }
}

/** The face directly opposite `end` — the only side face that may share a module. */
export function oppositeSideEnd(end: ConnectorEnd): ConnectorEnd | null {
  switch (end) {
    case 'UP': return 'DOWN';
    case 'DOWN': return 'UP';
    case 'RIGHT': return 'LEFT';
    case 'LEFT': return 'RIGHT';
    default: return null;
  }
}

/**
 * Are these side welds simultaneously buildable on one module? Enforces the
 * two-welds-and-they-must-be-opposite rule that ADJACENT_SIDE_FACES_CLASH implies.
 */
export function sideWeldsAreLegal(ends: ConnectorEnd[]): boolean {
  const sides = ends.filter(isSideEnd);
  if (sides.length <= 1) return true;
  if (sides.length > 2) return false;
  return oppositeSideEnd(sides[0]) === sides[1];
}

/**
 * Which connector pairings the hardware can actually weld.
 *
 *   end ↔ end   — the common case: modules chain nose to tail through A/B.
 *   end ↔ side  — allowed: a free end grabs another module's flank. This is the
 *                 move that lets a chain branch and that the gait below depends on.
 *   side ↔ side — NEVER. Two side connectors cannot mate with each other.
 *
 * So every weld has at least one END (A or B) in it. That single rule is what
 * makes the locomotion gait below the shape it is: a module always travels on
 * its ends, and a side connector is only ever something to travel TO.
 */
export function weldTypeIsLegal(a: ConnectorEnd, b: ConnectorEnd): boolean {
  return !(isSideEnd(a) && isSideEnd(b));
}

/**
 * THE LOCOMOTION GAIT — how one module relocates, hand over hand.
 *
 * A module never lets go of the structure. It moves by keeping one connector
 * welded while the other reaches, exactly like an inchworm:
 *
 *   1. anchored by one end (say A), the free end (B) is somewhere in space
 *   2. the module BENDS — its six joints re-pose to swing B toward a target
 *   3. B welds onto the target, usually another module's SIDE connector,
 *      sometimes another module's end
 *   4. only now does A release
 *   5. the module is anchored at B, A is free, and the cycle repeats
 *
 * Step 4 coming after step 3 is the whole safety property: there is never an
 * instant where the module is holding nothing, so it can neither fall off nor
 * split the structure. `canReleaseEnd` is that invariant in code.
 *
 * Note this is a fundamentally different move model from the sliding-cube and
 * pivoting-cube abstractions in moves.ts. Those relocate a rigid cube between
 * adjacent lattice cells. This relocates a multi-cube bendable body between
 * CONNECTORS, and its reach is set by the joint limits, not by cell adjacency.
 */
export interface ChainWeld {
  /** this module's connector that is welded */
  own: ConnectorEnd;
  /** the module it is welded to */
  toModuleId: string;
  /** that module's connector */
  toEnd: ConnectorEnd;
}

/** Is a proposed set of welds on ONE module physically buildable? */
export function weldSetIsLegal(welds: ChainWeld[]): { ok: boolean; reason: string } {
  for (const w of welds) {
    if (!weldTypeIsLegal(w.own, w.toEnd)) {
      return {
        ok: false,
        reason: `${w.own}↔${w.toEnd} is a side-to-side weld, which this connector design cannot make`,
      };
    }
  }
  if (!sideWeldsAreLegal(welds.map((w) => w.own))) {
    return {
      ok: false,
      reason: 'a module can carry at most two side welds and they must be on opposite faces '
        + '(UP/DOWN or LEFT/RIGHT) — adjacent side domes interpenetrate',
    };
  }
  return { ok: true, reason: '' };
}

/**
 * May this module let go of `end` right now? Only if something else still holds
 * it. Releasing the last weld would drop the module out of the structure, which
 * no step of the gait is ever allowed to do.
 */
export function canReleaseEnd(welds: ChainWeld[], end: ConnectorEnd): { ok: boolean; reason: string } {
  if (!welds.some((w) => w.own === end)) {
    return { ok: false, reason: `${end} is not welded to anything` };
  }
  if (welds.length <= 1) {
    return {
      ok: false,
      reason: `${end} is this module's only weld — releasing it would detach the module entirely. `
        + 'Grab the next connector first, then release.',
    };
  }
  return { ok: true, reason: '' };
}

// ── pose maths (compact, dependency-free) ─────────────────────────────────────

export const IDENTITY: Pose = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };

/**
 * Quaternion carrying a module's local +Z (connector A's outward normal) onto a
 * lattice direction — the orientation half of "this module is anchored here,
 * pointing that way".
 *
 * Lives here rather than in the renderer because the FITTER needs it too: real
 * connector positions come from running forward kinematics from this base, and
 * a weld is defined in real space ("same point, opposed normals"), not by cube
 * membership. Two copies of this table would be two chances to disagree about
 * where a connector physically is.
 *
 * These are the quaternion counterparts of fitModules.ROTATIONS, which does the
 * same job for integer cells; the two are cross-checked against each other in
 * moduleGeometry.test.ts rather than trusted by inspection.
 */
const BASE_Q = Math.SQRT1_2;
const BASE_QUAT: Record<string, Quat> = {
  '0,0,1': [0, 0, 0, 1],      // identity
  '0,0,-1': [1, 0, 0, 0],     // 180 degrees about X
  '1,0,0': [0, BASE_Q, 0, BASE_Q],
  '-1,0,0': [0, -BASE_Q, 0, BASE_Q],
  '0,1,0': [-BASE_Q, 0, 0, BASE_Q],
  '0,-1,0': [BASE_Q, 0, 0, BASE_Q],
};

export const baseQuatFor = (dir: readonly number[]): Quat =>
  BASE_QUAT[`${dir[0]},${dir[1]},${dir[2]}`] ?? [0, 0, 0, 1];

function quatMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function rotateVec(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

/** a then b — b expressed in a's frame. */
export function composePoses(a: Pose, b: Pose): Pose {
  const r = rotateVec(a.quaternion, b.position);
  return {
    position: [a.position[0] + r[0], a.position[1] + r[1], a.position[2] + r[2]],
    quaternion: quatMul(a.quaternion, b.quaternion),
  };
}

const axisAngle = (axis: Vec3, angle: number): Quat => {
  const h = angle / 2;
  const s = Math.sin(h);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h)];
};

export const translateZ = (d: number): Pose => ({ position: [0, 0, d], quaternion: [0, 0, 0, 1] });
export const rotateZ = (a: number): Pose => ({ position: [0, 0, 0], quaternion: axisAngle([0, 0, 1], a) });
export const rotateX = (a: number): Pose => ({ position: [0, 0, 0], quaternion: axisAngle([1, 0, 0], a) });

/** Connector A faces backwards down the chain, so the walk starts flipped. */
export const FLIP_X_180: Pose = rotateX(Math.PI);

/** Direction the frame's +Z points, in world. */
export const forwardOf = (p: Pose): Vec3 => rotateVec(p.quaternion, [0, 0, 1]);

// ── joint angles ──────────────────────────────────────────────────────────────

/** Six joint angles in radians, indexed to match ROD_ORDER. */
export type ModuleAngles = [number, number, number, number, number, number];

export const ZERO_ANGLES: ModuleAngles = [0, 0, 0, 0, 0, 0];

export const limitsFor = (index: number): [number, number] =>
  (ROD_ORDER[index] === 'twist' ? TWIST_LIMIT : BEND_LIMIT);

/** Clamp one joint into its limits. Twist wraps rather than clamps — it is a full roll. */
export function clampAngle(index: number, angle: number): number {
  if (ROD_ORDER[index] === 'twist') {
    const twoPi = Math.PI * 2;
    return ((angle % twoPi) + twoPi) % twoPi;
  }
  return Math.max(BEND_LIMIT[0], Math.min(BEND_LIMIT[1], angle));
}

export const clampAngles = (a: ModuleAngles): ModuleAngles =>
  a.map((v, i) => clampAngle(i, v)) as ModuleAngles;

/**
 * Throws if a rod list is not the one legal alphabet. Ported from the MODULINK
 * source deliberately: every downstream assumption (which rod is the spine, where
 * the side connectors ride, how many DOF exist) depends on this order holding.
 */
export function assertCanonicalRodOrder(kinds: readonly RodKind[]): void {
  if (kinds.length !== RODS_PER_MODULE) {
    throw new Error(`MODULINK module needs exactly ${RODS_PER_MODULE} rods, got ${kinds.length}`);
  }
  for (let i = 0; i < RODS_PER_MODULE; i++) {
    if (kinds[i] !== ROD_ORDER[i]) {
      throw new Error(
        `MODULINK rod ${i} must be ${ROD_ORDER[i]}, got ${kinds[i]} — canonical order is ${ROD_ORDER.join('·')}`,
      );
    }
  }
}

// ── forward kinematics ────────────────────────────────────────────────────────

export interface RodFrame {
  index: number;
  kind: RodKind;
  /** frame at the rod's proximal end, after its joint rotation */
  start: Pose;
  /** frame at the rod's distal end */
  end: Pose;
  length: number;
}

/**
 * Walk the chain: gap → joint rotation → rod length, per rod, starting from the
 * base pose flipped 180° about X (connector A faces backwards out of the module).
 */
export function moduleFrames(angles: ModuleAngles, base: Pose = IDENTITY): RodFrame[] {
  const q = clampAngles(angles);
  let frame = composePoses(base, FLIP_X_180);
  const out: RodFrame[] = [];

  for (let i = 0; i < RODS_PER_MODULE; i++) {
    frame = composePoses(frame, translateZ(SEGMENT_GAP));
    const kind = ROD_ORDER[i];
    frame = composePoses(frame, kind === 'twist' ? rotateZ(q[i]) : rotateX(q[i]));
    const start = frame;
    const length = rodLength(i);
    frame = composePoses(frame, translateZ(length));
    out.push({ index: i, kind, start, end: frame, length });
  }
  return out;
}

/** Pose at connector B: the chain end plus the trailing gap. */
export function endPose(angles: ModuleAngles, base: Pose = IDENTITY): Pose {
  const frames = moduleFrames(angles, base);
  return composePoses(frames[frames.length - 1].end, translateZ(SEGMENT_GAP));
}

export interface ConnectorPose {
  end: ConnectorEnd;
  position: Vec3;
  /** unit outward normal — a weld forces two connectors to share a point with opposed normals */
  normal: Vec3;
}

/** All six lock faces in world space for a given pose. */
export function connectorPoses(angles: ModuleAngles, base: Pose = IDENTITY): ConnectorPose[] {
  const frames = moduleFrames(angles, base);
  const startFrame = composePoses(base, FLIP_X_180);
  const bPose = composePoses(frames[frames.length - 1].end, translateZ(SEGMENT_GAP));

  const out: ConnectorPose[] = [
    // A sits at the module origin facing back out of the chain.
    { end: 'A', position: base.position, normal: negate(forwardOf(startFrame)) },
    { end: 'B', position: bPose.position, normal: forwardOf(bPose) },
  ];

  // Side connectors ride the MIDPOINT of the big rod, facing radially out.
  const big = frames[BIG_ROD_INDEX];
  const mid = composePoses(big.start, translateZ(big.length / 2));
  for (const end of SIDE_ENDS) {
    const dir = SIDE_DIRECTION[end];
    const normal = rotateVec(mid.quaternion, dir);
    out.push({
      end,
      position: [
        mid.position[0] + normal[0] * SIDE_CONNECTOR_RADIAL_OFFSET,
        mid.position[1] + normal[1] * SIDE_CONNECTOR_RADIAL_OFFSET,
        mid.position[2] + normal[2] * SIDE_CONNECTOR_RADIAL_OFFSET,
      ],
      normal,
    });
  }
  return out;
}

const negate = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];

/**
 * Points along the module's centreline, sampled finely enough to voxelise.
 * `samplesPerRod` controls resolution: the default oversamples relative to the
 * cube size so a rod cannot skip a cube it actually passes through.
 */
export function sampleCenterline(
  angles: ModuleAngles,
  base: Pose = IDENTITY,
  samplesPerRod = 8,
): Vec3[] {
  const frames = moduleFrames(angles, base);
  const pts: Vec3[] = [base.position];
  for (const f of frames) {
    for (let s = 1; s <= samplesPerRod; s++) {
      const p = composePoses(f.start, translateZ((f.length * s) / samplesPerRod));
      pts.push(p.position);
    }
  }
  pts.push(endPose(angles, base).position);
  return pts;
}

/** Straight-line distance actually spanned by this pose — folds shorten it. */
export function spanOf(angles: ModuleAngles, base: Pose = IDENTITY): number {
  const e = endPose(angles, base).position;
  return Math.hypot(e[0] - base.position[0], e[1] - base.position[1], e[2] - base.position[2]);
}
