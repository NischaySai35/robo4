/**
 * occupancy.ts — how many cubes does one module take up?
 *
 * THE CORRECTION THIS FILE ENCODES
 * A module is not a cube and it does not have a fixed cuboid footprint. It is a
 * bendable chain, and how many lattice cubes it accounts for is a property of its
 * POSE:
 *
 *   fully extended  → 4 cubes
 *   one elbow       → 3 cubes
 *   doubled back    → 2 cubes
 *   coiled tight    → 1 cube
 *
 * The lattice stays uniformly cubic throughout. Nothing about the grid changes —
 * only how much of it one module accounts for.
 *
 * TWO DIFFERENT QUESTIONS, KEPT APART
 * "How many cubes does this module take up" has two honest answers and they are
 * not the same number, so both are computed and named separately:
 *
 *  cubes (REACH) — how many cube-steps the module bridges from connector A to
 *  connector B. This is the 4/3/2/1 figure, and it is the structural one: it says
 *  how much of a target shape one module can span. Straight, a module reaches
 *  four cubes along; fold it and it reaches fewer, because bending spends chain
 *  length on turning instead of travelling. This is what determines how many
 *  modules a structure needs.
 *
 *  sweptCells (BODY) — which cubes the module's physical centreline actually
 *  passes through. Used for collision, and deliberately NOT the headline number,
 *  because a bent chain snakes diagonally and can clip MORE cubes than a straight
 *  one even while reaching less far. Conflating the two would say a folded module
 *  is bigger than an extended one, which is backwards.
 *
 * Both come from running the real forward kinematics in modulink.ts. Neither is
 * declared as a constant.
 */
import { type Cell, key, unkey, DIRS_6, add } from './lattice';
import {
  type ModuleAngles, type Pose, type Vec3,
  IDENTITY, MODULE_CHAIN_LENGTH, ZERO_ANGLES,
  sampleCenterline,
} from './modulink';

/**
 * Cube edge length, in the same units the MODULINK geometry uses.
 *
 * Pinned to a quarter of the module's straight length so a fully extended module
 * spans exactly four cubes — the anchor point for the whole 4/3/2/1 scale. Every
 * other pose's cube count then falls out of the kinematics rather than being
 * declared.
 */
export const CUBES_PER_STRAIGHT_MODULE = 4;
export const MODULINK_CUBE_SIZE = MODULE_CHAIN_LENGTH / CUBES_PER_STRAIGHT_MODULE;

/** Which cube contains a world point. */
export const cubeOf = (p: Vec3, cubeSize: number): Cell => [
  Math.floor(p[0] / cubeSize),
  Math.floor(p[1] / cubeSize),
  Math.floor(p[2] / cubeSize),
];

/**
 * How far the endpoint samples are pulled inward, as a fraction of a cube.
 *
 * A module's length is an exact multiple of the cube size, so a straight module
 * placed against a cube boundary ends EXACTLY on another boundary. Math.floor
 * puts that final point in the next cube up, and the module reads as spanning
 * five cubes when its body only ever occupies four. The body is a half-open
 * interval — it fills the cube it is leaving, not the one it merely touches — so
 * the endpoints are inset by a hair to express that. Small enough that a genuine
 * intrusion into a further cube still registers.
 */
const BOUNDARY_INSET = 1e-6;

function insetEndpoints(points: Vec3[], cubeSize: number): Vec3[] {
  if (points.length < 2) return points;
  const eps = cubeSize * BOUNDARY_INSET;
  const pull = (from: Vec3, toward: Vec3): Vec3 => {
    const dx = toward[0] - from[0], dy = toward[1] - from[1], dz = toward[2] - from[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-12) return from;
    const t = Math.min(0.5, eps / len);
    return [from[0] + dx * t, from[1] + dy * t, from[2] + dz * t];
  };
  const out = [...points];
  out[0] = pull(points[0], points[1]);
  out[out.length - 1] = pull(points[points.length - 1], points[points.length - 2]);
  return out;
}

/**
 * Every cube a polyline passes through. Points are assumed dense enough that
 * consecutive samples land in the same or an adjacent cube; sampleCenterline's
 * default resolution guarantees that at MODULINK_CUBE_SIZE.
 */
export function cubesAlong(points: Vec3[], cubeSize: number): Cell[] {
  const seen = new Set<string>();
  const out: Cell[] = [];
  for (const p of insetEndpoints(points, cubeSize)) {
    const c = cubeOf(p, cubeSize);
    const k = key(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

/** Grow a cube set by `steps` face-neighbours — a conservative clearance reading. */
export function dilate(cells: Cell[], steps: number): Cell[] {
  let cur = new Set(cells.map(key));
  for (let i = 0; i < Math.max(0, Math.round(steps)); i++) {
    const next = new Set(cur);
    for (const k of cur) {
      const c = unkey(k);
      for (const d of DIRS_6) next.add(key(add(c, d)));
    }
    cur = next;
  }
  return [...cur].map(unkey);
}

/** Shift a cube set so its first cube sits at the origin — a comparable footprint. */
export function normalizeFootprint(cells: Cell[]): Cell[] {
  if (!cells.length) return [];
  const [ox, oy, oz] = cells[0];
  return cells.map((c) => [c[0] - ox, c[1] - oy, c[2] - oz] as Cell);
}

export interface PoseOccupancy {
  /**
   * How many cube-steps this pose bridges from connector A to connector B.
   * THE headline number: 4 straight, down to 1 fully coiled.
   */
  cubes: number;
  /** straight-line A→B distance, in module units */
  span: number;
  /** cubes the body's centreline passes through, relative to its base cube */
  sweptCells: Cell[];
  /** how many cubes the body clips — can exceed `cubes` when the chain snakes */
  sweptCount: number;
}

/**
 * How many cubes of reach a pose is worth. Rounded to the nearest whole cube
 * because a module has to land ON lattice positions to weld to its neighbours —
 * it cannot bridge two and a half cubes and connect to anything. Never below 1:
 * a module always accounts for at least the cube it sits in.
 */
export const spanToCubes = (span: number, cubeSize: number): number =>
  Math.max(1, Math.round(span / cubeSize));

/**
 * The occupancy of one module at one pose — reach, body sweep, and raw span.
 * Give it joint angles, get back how much lattice this module accounts for.
 */
export function poseOccupancy(
  angles: ModuleAngles,
  base: Pose = IDENTITY,
  cubeSize = MODULINK_CUBE_SIZE,
): PoseOccupancy {
  const points = sampleCenterline(angles, base);
  const swept = cubesAlong(points, cubeSize);
  const e = points[points.length - 1];
  const span = Math.hypot(
    e[0] - base.position[0], e[1] - base.position[1], e[2] - base.position[2],
  );
  return {
    cubes: spanToCubes(span, cubeSize),
    span,
    sweptCells: normalizeFootprint(swept),
    sweptCount: swept.length,
  };
}

// ── the pose library ──────────────────────────────────────────────────────────

export interface ModulePoseDef {
  id: string;
  label: string;
  /** what this pose is for, in one line */
  hint: string;
  angles: ModuleAngles;
}

const D = (deg: number) => (deg * Math.PI) / 180;

/**
 * Canonical poses, ordered most-extended to most-folded — 4 cubes of reach down
 * to 1.
 *
 * Only BEND joints are used here. Twists roll the chain about its own axis, which
 * reorients where a later bend points but does not by itself change how far the
 * module reaches — so bends are what actually spend reach, and keeping twists at
 * zero makes each pose easy to reason about and to draw.
 *
 * The cube counts are NOT declared here. They are computed by poseOccupancy from
 * the real kinematics, and asserted in the tests — if a constant in modulink.ts
 * changes, these counts move with it instead of silently going stale.
 */
export const MODULINK_POSES: ModulePoseDef[] = [
  {
    id: 'straight',
    label: 'Straight',
    hint: 'Fully extended. Reaches furthest, claims the most cubes.',
    angles: [0, 0, 0, 0, 0, 0],
  },
  {
    id: 'gentle',
    label: 'Gentle arc',
    hint: 'Every bend part-way over — a smooth curve rather than a corner.',
    angles: [0, D(35), D(35), 0, D(35), 0],
  },
  {
    id: 'elbow',
    label: 'Elbow',
    hint: 'One bend hard over: an L corner. The standard turn.',
    angles: [0, 0, D(90), 0, 0, 0],
  },
  {
    id: 'zigzag',
    label: 'Zigzag',
    hint: 'Opposed bends — the chain doglegs and comes back onto its own axis.',
    angles: [0, D(90), -D(90), 0, D(90), 0],
  },
  {
    id: 'hook',
    label: 'Hook',
    hint: 'Two bends the same way: the chain doubles back on itself.',
    angles: [0, D(90), D(90), 0, 0, 0],
  },
  {
    id: 'coil',
    label: 'Coil',
    hint: 'Every bend hard over — the tightest fold, the smallest footprint.',
    angles: [0, D(90), D(90), 0, D(90), 0],
  },
];

export const poseById = (id: string): ModulePoseDef | undefined =>
  MODULINK_POSES.find((p) => p.id === id);

export const DEFAULT_POSE_ID = 'straight';

export interface PoseSummary extends ModulePoseDef, PoseOccupancy {}

/** Every canonical pose with its computed reach and body sweep — what the UI lists. */
export function poseLibrary(cubeSize = MODULINK_CUBE_SIZE): PoseSummary[] {
  return MODULINK_POSES.map((p) => ({ ...p, ...poseOccupancy(p.angles, IDENTITY, cubeSize) }));
}

/** Min/max cubes of reach a module can be worth across the whole pose library. */
export function cubeRange(cubeSize = MODULINK_CUBE_SIZE): [number, number] {
  const counts = poseLibrary(cubeSize).map((p) => p.cubes);
  return [Math.min(...counts), Math.max(...counts)];
}

/** Cubes of reach in the straight pose — the fully extended reference. */
export const straightCubeCount = (cubeSize = MODULINK_CUBE_SIZE) =>
  poseOccupancy(ZERO_ANGLES, IDENTITY, cubeSize).cubes;
