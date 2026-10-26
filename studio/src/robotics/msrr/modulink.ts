/**
 * modulink.ts — the TETROBOT module ("try8"): a 7-DOF bendable chain, not a cube.
 *
 * WHY THIS FILE EXISTS
 * The classic MSRR abstraction says one module is one lattice cube. That is true
 * for the mod1 theme and it is what makes the reconfiguration planner tractable.
 * It is NOT true for this module: it is a serial chain roughly four cube-lengths
 * long when fully extended, and it FOLDS. Straight, it lies across four cubes.
 * Elbowed, three. Doubled back, two. Coiled, one.
 *
 * That variability is a property of the module's POSE, not of the lattice. The
 * lattice stays uniformly cubic. What changes is how many of those cubes one
 * module's body actually passes through, which is answered by running real
 * forward kinematics over the joint angles and voxelising the result (see
 * occupancy.ts).
 *
 * THE MODULE (source of truth: assets/tetrobot-module/module_spec.json)
 *
 *   End A lock ─ T1 ─ B1 ─ [Spine1] ─ B2 ─ T2 ─ B3 ─ [Spine2] ─ B4 ─ T3 ─ End B lock
 *                          S1A,S1B                   S2A,S2B
 *
 * Seven joints, in this fixed order: TWIST · BEND · BEND · TWIST · BEND · BEND ·
 * TWIST. Two spines — the bodies between the two bends of a pair — each carry TWO
 * side receivers on opposite faces. So there are six connectors: the two end
 * connectors A and B (facing outward along the chain) and four side receivers
 * S1A, S1B (spine 1) and S2A, S2B (spine 2).
 *
 * This REPLACES the old 6-DOF "MODULINK" model (three bends, one double-length
 * spine carrying all four side connectors at one point, like cube faces). That
 * design is discarded; the old file is in git history. Differences that matter
 * to everything built on this file:
 *   - 7 joints, not 6: four bends (B1..B4) and three twists (T1..T3).
 *   - side connectors are at TWO places along the chain and only two per place,
 *     on opposite faces (normals along the bend axis), not four at one point.
 *   - the six connectors are no longer "the six faces of a cube": at most four
 *     arms leave one spine (two chain ends and two sides), not six.
 *   - twist is +-180 deg, bend +-90 deg, the end locks +-45 deg.
 *
 * UNITS. Everything is in "module units" = metres * UNITS_PER_M, chosen so the
 * straight A->B length stays ~3.79 and a cube (a quarter of it) stays ~0.95 —
 * the lattice, reach table and fitter were all tuned at that scale and keep it.
 *
 * LOCAL FRAME (differs from the CAD/Studio frame, mapping is in the spec):
 * the chain runs along local +Z after the base flip, TWIST rolls about Z, BEND
 * pitches about X. Studio has the long axis along +X and bends about Y; the side
 * receivers face along the bend axis, i.e. local +-X here.
 *
 * Framework-free by design: no THREE, no React. Pose maths is a compact local
 * implementation so this file can be unit-tested and reused by the planner.
 */

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
export interface Pose { position: Vec3; quaternion: Quat }

// ── physical constants ────────────────────────────────────────────────────────

/** module units per metre — keeps the straight length ~3.79 like the old module */
export const UNITS_PER_M = 5.5;
const u = (metres: number) => metres * UNITS_PER_M;

/**
 * Chain segment lengths in metres, from the HINGE positions in the Studio default
 * doc (single-module-demo.json: joint origin is in the parent body's frame, the
 * hinge sits at parent position + origin). Measured from connector A they are
 * T1 0.06697, B1 0.13540, B2 0.29611, T2 0.36453, B3 0.39083, B4 0.55155,
 * T3 0.61996, connector B 0.68693. NOT the `x_m` values in module_spec.json:
 * those are body origins, which sit a few centimetres off the hinges.
 *
 * The module is mirror-symmetric end to end (prefix 0.06697 = last rod 0.06697),
 * and each spine's receivers are at the exact midpoint of the spine, between its
 * two bend axes: 0.2158 m (spine 1) and 0.4712 m (spine 2) from connector A.
 *
 * PREFIX is connector A -> the T1 axis. Then, per rod i, joint i acts at the
 * rod's start and the rod runs to the next joint:
 *   rod 0  T1 -> B1          rod 4  B3 -> B4  (Spine2)
 *   rod 1  B1 -> B2 (Spine1) rod 5  B4 -> T3
 *   rod 2  B2 -> T2          rod 6  T3 -> connector B
 *   rod 3  T2 -> B3
 */
const PREFIX_M = 0.066972;
const ROD_LENGTHS_M = [0.068424, 0.16071, 0.068420, 0.0263, 0.16072, 0.068410, 0.066974];

/** Joints sit flush against their rods now — there is no gap between segments. */
export const SEGMENT_GAP = 0;

/** Connector pad radius: the end lock body is ~80 mm across. */
export const HEMISPHERE_RADIUS = u(0.04);
/**
 * How far a side receiver's seating point is off the spine axis (31.3 mm in the
 * spec: the receiver is recessed in the spine's face, which is ~63 mm across).
 */
export const SIDE_CONNECTOR_RADIAL_OFFSET = u(0.0313);
/**
 * How far along its spine rod (from the rod's start, the bend hinge) the two side
 * receivers sit: the midpoint of the spine, 0.0804 m (the two spines are the same
 * part). That puts them 0.2158 m and 0.4712 m from connector A, which is the
 * "~0.22 m / ~0.48 m" the module spec quotes.
 */
export const SIDE_ALONG_ROD = u(0.08036);
/** Body radius, from the mesh sizes (spine ~63 mm, housings ~75 mm). */
export const ROD_RADIUS = u(0.035);

export const RODS_PER_MODULE = 7;
/** Rods that are spines — the ones carrying side receivers. */
export const SPINE_ROD_INDICES: readonly number[] = Object.freeze([1, 4]);

export type RodKind = 'twist' | 'bend';

/** The one legal rod alphabet. A module always has exactly these seven, in this order. */
export const ROD_ORDER: readonly RodKind[] = Object.freeze([
  'twist', 'bend', 'bend', 'twist', 'bend', 'bend', 'twist',
] as RodKind[]);

/** Joint names in chain order, for UI and logs. */
export const JOINT_NAMES: readonly string[] = Object.freeze(['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']);

/** Joint limits, radians. TWIST is +-180 deg, BEND +-90 deg, the end locks +-45 deg (module_spec.json). */
export const TWIST_LIMIT: [number, number] = [-Math.PI, Math.PI];
export const BEND_LIMIT: [number, number] = [-Math.PI / 2, Math.PI / 2];
export const LOCK_LIMIT: [number, number] = [-Math.PI / 4, Math.PI / 4];

export const rodLength = (index: number): number => u(ROD_LENGTHS_M[index]);
/** Distance from connector A to the first joint (T1). */
export const PREFIX_LENGTH = u(PREFIX_M);

/**
 * Straight-line A->B distance with every joint at zero: the prefix plus all seven
 * rods. 0.68694 m * 5.5 = 3.778 (the old module was 3.79; a cube is a quarter of it)
 */
export const MODULE_CHAIN_LENGTH =
  PREFIX_LENGTH + ROD_LENGTHS_M.reduce((sum, _, i) => sum + rodLength(i), 0);

/**
 * Centre-to-centre distance two connector pads need before they interpenetrate:
 * one pad diameter. The two receivers on one spine are the exception — they face
 * opposite ways on opposite faces of the same body, back to back by design, so
 * they are exempt (see `connectorsMayShareBody`).
 */
export const REQUIRED_DOME_CLEARANCE = 2 * HEMISPHERE_RADIUS;
/** Separation of the two receivers on one spine (they are on opposite faces). */
export const SPINE_SIDE_SEPARATION = 2 * SIDE_CONNECTOR_RADIAL_OFFSET;

// ── connectors ────────────────────────────────────────────────────────────────

export type ConnectorEnd = 'A' | 'B' | 'S1A' | 'S1B' | 'S2A' | 'S2B';

export const CONNECTOR_ENDS: readonly ConnectorEnd[] =
  Object.freeze(['A', 'B', 'S1A', 'S1B', 'S2A', 'S2B'] as ConnectorEnd[]);

export const SIDE_ENDS: readonly ConnectorEnd[] =
  Object.freeze(['S1A', 'S1B', 'S2A', 'S2B'] as ConnectorEnd[]);

export const isSideEnd = (end: ConnectorEnd) => end !== 'A' && end !== 'B';

/** Studio connector id (module_spec.json) for each end, for markers and docs. */
export const CONNECTOR_IDS: Record<ConnectorEnd, string> = {
  A: 'conn-endA', B: 'conn-endB', S1A: 'conn-s1a', S1B: 'conn-s1b', S2A: 'conn-s2a', S2B: 'conn-s2b',
};

/** Which spine rod a side receiver rides on, and which way it faces in that rod's frame. */
interface SideSite { rod: number; normal: Vec3 }
const SIDE_SITES: Record<string, SideSite> = {
  // The receivers face along the bend axis (local X). Studio's "A" faces -Y and
  // "B" +Y with bends about -Y; the mapping to local X keeps A and B opposite.
  S1A: { rod: 1, normal: [1, 0, 0] },
  S1B: { rod: 1, normal: [-1, 0, 0] },
  S2A: { rod: 4, normal: [1, 0, 0] },
  S2B: { rod: 4, normal: [-1, 0, 0] },
};

/** The two receivers of one spine, or the other face of the same spine. */
export function oppositeSideEnd(end: ConnectorEnd): ConnectorEnd | null {
  switch (end) {
    case 'S1A': return 'S1B';
    case 'S1B': return 'S1A';
    case 'S2A': return 'S2B';
    case 'S2B': return 'S2A';
    default: return null;
  }
}

/** Spine number (1 or 2) a side receiver belongs to, or null for an end connector. */
export function spineOf(end: ConnectorEnd): 1 | 2 | null {
  if (end === 'S1A' || end === 'S1B') return 1;
  if (end === 'S2A' || end === 'S2B') return 2;
  return null;
}

/**
 * Faces 90 deg to `end` on the same body. The two receivers of a spine are 180 deg
 * apart and the two spines are far apart, so nothing is ever adjacent: kept so
 * callers that reason about adjacency keep working, and always empty.
 */
export function adjacentSideEnds(_end: ConnectorEnd): ConnectorEnd[] { return []; }

/**
 * May these two connectors of ONE module sit closer than a pad diameter? Only the
 * two receivers on one spine: opposite faces of the same body, back to back.
 */
export function connectorsMayShareBody(a: ConnectorEnd, b: ConnectorEnd): boolean {
  return oppositeSideEnd(a) === b;
}

/**
 * Are these side welds simultaneously buildable on one module? Each of the four
 * receivers can carry one weld, so any subset is fine; it only refuses a weld
 * list that names the same receiver twice or more than four sides.
 */
export function sideWeldsAreLegal(ends: ConnectorEnd[]): boolean {
  const sides = ends.filter(isSideEnd);
  return sides.length <= SIDE_ENDS.length && new Set(sides).size === sides.length;
}

/**
 * Which connector pairings the hardware can weld.
 *
 *   end  <-> end    chain a module nose to tail
 *   end  <-> side   a free end grabs another module's spine — the walking move
 *   side <-> end    the same weld seen from the receiver's module
 *   side <-> side   IMPOSSIBLE. Only the two ENDS carry a lock rotor; a spine
 *                   receiver is passive, so two receivers have nothing to lock
 *                   them together. (An earlier version allowed this; it was wrong.)
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
 *   2. the module BENDS — its seven joints re-pose to swing B toward a target
 *   3. B welds onto the target, usually another module's SIDE receiver,
 *      sometimes another module's end
 *   4. only now does A release
 *   5. the module is anchored at B, A is free, and the cycle repeats
 *
 * Step 4 coming after step 3 is the whole safety property: there is never an
 * instant where the module is holding nothing, so it can neither fall off nor
 * split the structure. `canReleaseEnd` is that invariant in code.
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
      return { ok: false, reason: `${w.own}<->${w.toEnd} cannot be welded` };
    }
  }
  if (!sideWeldsAreLegal(welds.map((w) => w.own))) {
    return {
      ok: false,
      reason: 'a module has four side receivers (two per spine) and each can carry one weld',
    };
  }
  const own = welds.map((w) => w.own);
  if (new Set(own).size !== own.length) {
    return { ok: false, reason: 'a connector can carry only one weld' };
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
 * membership.
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

/** Seven joint angles in radians, indexed to match ROD_ORDER: T1 B1 B2 T2 B3 B4 T3. */
export type ModuleAngles = [number, number, number, number, number, number, number];

export const ZERO_ANGLES: ModuleAngles = [0, 0, 0, 0, 0, 0, 0];

export const limitsFor = (index: number): [number, number] =>
  (ROD_ORDER[index] === 'twist' ? TWIST_LIMIT : BEND_LIMIT);

/** Clamp one joint into its limits. Twist wraps rather than clamps — it covers a full turn. */
export function clampAngle(index: number, angle: number): number {
  if (ROD_ORDER[index] === 'twist') {
    const twoPi = Math.PI * 2;
    return ((((angle + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
  }
  return Math.max(BEND_LIMIT[0], Math.min(BEND_LIMIT[1], angle));
}

export const clampAngles = (a: ModuleAngles): ModuleAngles =>
  a.map((v, i) => clampAngle(i, v)) as ModuleAngles;

/**
 * Throws if a rod list is not the one legal alphabet. Every downstream assumption
 * (which rods are the spines, where the side receivers ride, how many DOF exist)
 * depends on this order holding.
 */
export function assertCanonicalRodOrder(kinds: readonly RodKind[]): void {
  if (kinds.length !== RODS_PER_MODULE) {
    throw new Error(`TETROBOT module needs exactly ${RODS_PER_MODULE} rods, got ${kinds.length}`);
  }
  for (let i = 0; i < RODS_PER_MODULE; i++) {
    if (kinds[i] !== ROD_ORDER[i]) {
      throw new Error(
        `TETROBOT rod ${i} must be ${ROD_ORDER[i]}, got ${kinds[i]} — canonical order is ${ROD_ORDER.join('·')}`,
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
 * Walk the chain: the prefix (connector A to the T1 axis), then per rod the joint
 * rotation and the rod length, starting from the base pose flipped 180 deg about X
 * (connector A faces backwards out of the module).
 */
export function moduleFrames(angles: ModuleAngles, base: Pose = IDENTITY): RodFrame[] {
  const q = clampAngles(angles);
  let frame = composePoses(composePoses(base, FLIP_X_180), translateZ(PREFIX_LENGTH));
  const out: RodFrame[] = [];

  for (let i = 0; i < RODS_PER_MODULE; i++) {
    const kind = ROD_ORDER[i];
    frame = composePoses(frame, kind === 'twist' ? rotateZ(q[i]) : rotateX(q[i]));
    const start = frame;
    const length = rodLength(i);
    frame = composePoses(frame, translateZ(length));
    out.push({ index: i, kind, start, end: frame, length });
  }
  return out;
}

/** Pose at connector B: the end of the last rod. */
export function endPose(angles: ModuleAngles, base: Pose = IDENTITY): Pose {
  const frames = moduleFrames(angles, base);
  return frames[frames.length - 1].end;
}

export interface ConnectorPose {
  end: ConnectorEnd;
  position: Vec3;
  /** unit outward normal — a weld forces two connectors to share a point with opposed normals */
  normal: Vec3;
}

/** All six connectors in world space for a given pose. */
export function connectorPoses(angles: ModuleAngles, base: Pose = IDENTITY): ConnectorPose[] {
  const frames = moduleFrames(angles, base);
  const startFrame = composePoses(base, FLIP_X_180);
  const bPose = frames[frames.length - 1].end;

  const out: ConnectorPose[] = [
    // A sits at the module origin facing back out of the chain.
    { end: 'A', position: base.position, normal: negate(forwardOf(startFrame)) },
    { end: 'B', position: bPose.position, normal: forwardOf(bPose) },
  ];

  // Side receivers ride their spine rod, on the faces along the bend axis.
  for (const end of SIDE_ENDS) {
    const site = SIDE_SITES[end];
    const rod = frames[site.rod];
    const at = composePoses(rod.start, translateZ(SIDE_ALONG_ROD));
    const normal = rotateVec(at.quaternion, site.normal);
    out.push({
      end,
      position: [
        at.position[0] + normal[0] * SIDE_CONNECTOR_RADIAL_OFFSET,
        at.position[1] + normal[1] * SIDE_CONNECTOR_RADIAL_OFFSET,
        at.position[2] + normal[2] * SIDE_CONNECTOR_RADIAL_OFFSET,
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
  // the prefix (connector A to the T1 axis), which has no joint of its own
  const pre = composePoses(composePoses(base, FLIP_X_180), translateZ(PREFIX_LENGTH));
  pts.push(pre.position);
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
