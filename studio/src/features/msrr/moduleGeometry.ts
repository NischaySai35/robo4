/**
 * moduleGeometry.ts — turn a fitted module into drawable 3D geometry.
 *
 * WHY THIS FILE EXISTS
 * Build computes exactly where every module sits, how it folds, and which
 * connector welds to which — and until this file, none of that was drawn. The
 * viewport rendered a coloured proxy cube per body cube instead, which made a
 * correct build look like a pile of dice. The kinematics were always there
 * (modulink.ts); nothing was asking them for rod positions.
 *
 * So this is the missing translation layer: fitted module -> rod segments,
 * joints and connector domes, in the viewport's own units.
 *
 * TWO COORDINATE SYSTEMS, RECONCILED HERE
 * modulink.ts works in physical module units (a straight module is
 * MODULE_CHAIN_LENGTH = 3.79 long). The sandbox viewport works in cube units,
 * one cube per unit, and a straight module spans exactly four of them. So every
 * position coming out of the kinematics is divided by MODULINK_CUBE_SIZE before
 * it is drawn. Doing that here, once, is why the renderer never has to think
 * about it.
 */
import {
  type ModuleAngles, type Pose, type Vec3, type Quat,
  moduleFrames, connectorPoses, ROD_ORDER, BIG_ROD_INDEX,
  HEMISPHERE_RADIUS, SIDE_CONNECTOR_RADIAL_OFFSET,
  ROD_RADIUS as SPEC_ROD_RADIUS,
} from '@/robotics/msrr/modulink';
import { MODULINK_CUBE_SIZE } from '@/robotics/msrr/occupancy';
import type { Cell } from '@/robotics/msrr/lattice';
import type { FittedModule } from '@/robotics/msrr/fitModules';

/**
 * Quaternion carrying the module's local +Z (connector A's outward normal) onto
 * each lattice direction.
 *
 * These are the rotation-matrix counterparts of fitModules.ROTATIONS, which does
 * the same job for integer cells. Both must agree or the drawn module will point
 * somewhere the planner did not put it, so each one is checked against its
 * matrix twin in the tests rather than trusted by inspection.
 */
const R = Math.SQRT1_2;
const BASE_QUAT: Record<string, Quat> = {
  '0,0,1': [0, 0, 0, 1],      // identity
  '0,0,-1': [1, 0, 0, 0],     // 180 degrees about X
  '1,0,0': [0, R, 0, R],      // +90 about Y
  '-1,0,0': [0, -R, 0, R],    // -90 about Y
  '0,1,0': [-R, 0, 0, R],     // -90 about X
  '0,-1,0': [R, 0, 0, R],     // +90 about X
};

export const baseQuatFor = (dir: Cell): Quat =>
  BASE_QUAT[`${dir[0]},${dir[1]},${dir[2]}`] ?? [0, 0, 0, 1];

/** One drawable rod: a capsule/cylinder run between two points, in cube units. */
export interface RodSegment {
  from: Vec3;
  to: Vec3;
  /** rods are not all the same thickness — the big rod reads as the spine */
  radius: number;
  isBigRod: boolean;
}

/** A joint between two rods, drawn as a knuckle. */
export interface JointMarker {
  at: Vec3;
  radius: number;
  /** twist joints roll about the chain, bend joints pitch — worth telling apart */
  kind: 'twist' | 'bend';
}

/** A connector dome, drawn at a lock face. */
export interface ConnectorMarker {
  at: Vec3;
  /** unit outward normal, so the dome can face the way it actually mates */
  normal: Vec3;
  radius: number;
  isEnd: boolean;
}

export interface ModuleGeometry {
  moduleId: string;
  rods: RodSegment[];
  joints: JointMarker[];
  connectors: ConnectorMarker[];
  /**
   * The chain as a polyline, alternating rod ends: every rod's start AND end, so
   * twelve points for six rods. The inter-rod gaps matter — the module is not a
   * continuous line, it is rods separated by SEGMENT_GAP, and a polyline that
   * skipped those could not be rebuilt at true lengths.
   */
  points: Vec3[];
  /** distance between consecutive points: rod, gap, rod, gap, ... */
  segLengths: number[];
  /** just the six rod lengths, for callers that want them without the gaps */
  rodLengths: number[];
}

/** Physical units -> cube units, so a straight module spans exactly four cubes. */
const S = 1 / MODULINK_CUBE_SIZE;

// Drawn thicknesses, ALL derived from the hardware spec and converted to cube
// units — no cosmetic fudge factors.
//
// An earlier version shrank the domes (END * 0.62, SIDE * 0.40) purely to make
// the chain "read" better, and that quietly broke the geometry it was meant to
// illustrate: a side dome belongs at radial offset 0.6 with radius 0.42, so its
// inner edge sits at 0.18 — just inside the 0.2 rod surface, i.e. flush-mounted.
// Shrunk to 0.40 of that, its inner edge moved out to ~0.45 while the rod
// surface stayed at ~0.18, leaving a quarter-cube of empty space between rod and
// dome. That is exactly the reported "side hemispheres floating in air": not a
// placement bug at all, a size one. Spec sizes touch; invented sizes float.
const ROD_RADIUS_CUBES = SPEC_ROD_RADIUS * S;
// The spine is longer, not thicker — same radius as every other rod.
const BIG_ROD_RADIUS = ROD_RADIUS_CUBES;
const ROD_RADIUS = ROD_RADIUS_CUBES;
// Joints are the knuckles between rods; drawn just proud of the rod so the
// articulation is visible without inventing a diameter the spec does not give.
const JOINT_RADIUS = ROD_RADIUS_CUBES * 1.15;
const END_DOME_RADIUS = HEMISPHERE_RADIUS * S;
const SIDE_DOME_RADIUS = HEMISPHERE_RADIUS * S;

/**
 * Full drawable geometry for one placed module.
 *
 * Runs the real forward kinematics from its solved joint angles, anchored where
 * Build put it and pointing the way Build oriented it — so what is drawn is the
 * same configuration the planner reasoned about, not an approximation of it.
 */
export function moduleGeometry(m: FittedModule): ModuleGeometry {
  const angles: ModuleAngles = m.pose.angles;
  const base: Pose = { position: [0, 0, 0], quaternion: baseQuatFor(m.anchorDir) };

  // Kinematics run at the module's own scale about the origin, then everything
  // is scaled into cube units and shifted onto the module's anchor cube.
  // Anchored at the module's REAL position, which is the centre of anchorCell
  // for an end-to-end weld but deliberately is not for a side weld — a side
  // connector rides ~0.63 cube units off the spine axis. Drawing from the cell
  // instead put a side-welded module ~0.98 cube units from the dome it is
  // locked to, so the pair rendered as two separated domes rather than one
  // sphere. (?? keeps older callers that build a FittedModule by hand working.)
  const anchor = m.anchorPos ?? m.anchorCell;
  const toCube = (p: Vec3): Vec3 => [
    anchor[0] + p[0] * S,
    anchor[1] + p[1] * S,
    anchor[2] + p[2] * S,
  ];

  const frames = moduleFrames(angles, base);

  const rods: RodSegment[] = frames.map((f) => ({
    from: toCube(f.start.position),
    to: toCube(f.end.position),
    radius: f.index === BIG_ROD_INDEX ? BIG_ROD_RADIUS : ROD_RADIUS,
    isBigRod: f.index === BIG_ROD_INDEX,
  }));

  // A knuckle at the proximal end of every rod — that is where its joint acts.
  const joints: JointMarker[] = frames.map((f) => ({
    at: toCube(f.start.position),
    radius: JOINT_RADIUS,
    kind: ROD_ORDER[f.index],
  }));

  const connectors: ConnectorMarker[] = connectorPoses(angles, base).map((c) => {
    const isEnd = c.end === 'A' || c.end === 'B';
    return {
      at: toCube(c.position),
      normal: c.normal,
      radius: isEnd ? END_DOME_RADIUS : SIDE_DOME_RADIUS,
      isEnd,
    };
  });

  const points: Vec3[] = [];
  for (const f of frames) {
    points.push(toCube(f.start.position));
    points.push(toCube(f.end.position));
  }
  const segLengths: number[] = [];
  for (let i = 1; i < points.length; i++) {
    segLengths.push(Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
      points[i][2] - points[i - 1][2],
    ));
  }
  const rodLengths = rods.map((r) => Math.hypot(
    r.to[0] - r.from[0], r.to[1] - r.from[1], r.to[2] - r.from[2],
  ));

  return { moduleId: m.id, rods, joints, connectors, points, segLengths, rodLengths };
}

/**
 * A module part-way between two configurations, for animating a move.
 *
 * WHY THE CHAIN IS REBUILT RATHER THAN CROSS-FADED
 * Interpolating rod endpoints directly would stretch and shrink the rods as the
 * module moves, which is exactly the thing real hardware cannot do. So the
 * POLYLINE is interpolated, and then the chain is walked out from the anchor
 * re-imposing each rod's true length — every rod stays rigid and every joint
 * stays connected, so what plays back reads as a chain bending rather than a
 * shape morphing.
 *
 * HONEST LIMIT: this is a visual tween between two verified configurations, not
 * the joint trajectory the arm would actually follow. Both endpoints are real,
 * planner-checked poses; the path between them is plausible motion, not a solved
 * one. It exists so a move reads as movement instead of a jump — the guarantee
 * that matters (start and end are legal, collision-free placements) is the
 * planner's, and is unaffected.
 */
export function tweenGeometry(
  a: ModuleGeometry, b: ModuleGeometry, t: number,
  opts: { sharedIsFarEndOfA?: boolean } = {},
): ModuleGeometry {
  const k = Math.max(0, Math.min(1, t));
  // Smoothstep, so a move eases rather than starting and stopping abruptly.
  const e = k * k * (3 - 2 * k);
  if (a.points.length !== b.points.length) return e < 0.5 ? a : b;

  // a.points[0] and b.points[0] are the same physical anchor ONLY when both
  // configurations share their held connector — true by default (a module's
  // first move in a plan: both are its original build anchor), but NOT true
  // from a module's second move onward, where b is anchored at the connector
  // the module just grabbed in the PREVIOUS move — a's FAR end, not a's
  // anchor. Lerping index-for-index in that case blends two chains that do
  // not share an origin at all: the anchor itself visibly slides through
  // empty space mid-move, reported as the module "reversing in thin air, not
  // locked to anything".
  //
  // This is a caller fact, not something to guess from geometry: an earlier
  // version tried to detect it from which endpoints were closest, which
  // misfires whenever two genuinely unrelated chains happen to sit near each
  // other anyway — e.g. two different modules from the same build, which are
  // welded end to end by construction and so are ALWAYS close there. Only the
  // caller knows whether b continues a's chain or is an unrelated pose, so it
  // says so explicitly via `sharedIsFarEndOfA`.
  const farIsShared = opts.sharedIsFarEndOfA ?? false;

  const aPoints = farIsShared ? [...a.points].reverse() : a.points;
  const aSegLengths = farIsShared ? [...a.segLengths].reverse() : a.segLengths;

  const target: Vec3[] = aPoints.map((p, i) => [
    p[0] + (b.points[i][0] - p[0]) * e,
    p[1] + (b.points[i][1] - p[1]) * e,
    p[2] + (b.points[i][2] - p[2]) * e,
  ]);

  // Walk the chain out from the shared (pinned) end, forcing every segment —
  // rods AND the gaps between them — back to its real length.
  const walked: Vec3[] = [target[0]];
  for (let i = 0; i < aSegLengths.length; i++) {
    const from = walked[i];
    const to = target[i + 1];
    const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
    const d = Math.hypot(dx, dy, dz) || 1;
    const len = aSegLengths[i] + ((b.segLengths[i] ?? aSegLengths[i]) - aSegLengths[i]) * e;
    walked.push([from[0] + (dx / d) * len, from[1] + (dy / d) * len, from[2] + (dz / d) * len]);
  }
  // Back to a's original point order — rods/joints below are indexed against
  // a's (and b's) un-reversed layout, and the walk above was only reversed to
  // pin the correct end.
  const fixed = farIsShared ? [...walked].reverse() : walked;

  // Rods are the even segments; the odd ones are the gaps between them.
  const rods: RodSegment[] = a.rods.map((r, i) => ({
    from: fixed[i * 2],
    to: fixed[i * 2 + 1],
    radius: r.radius,
    isBigRod: r.isBigRod,
  }));
  const joints: JointMarker[] = a.joints.map((j, i) => ({ ...j, at: fixed[i * 2] }));

  // Connectors ride the chain: the two ends sit at its tips, the side faces on
  // the big rod's midpoint. Interpolating their normals is not worth the cost
  // mid-move — they are only used to orient a sphere.
  const connectors: ConnectorMarker[] = a.connectors.map((c, i) => {
    const other = b.connectors[i];
    if (!other) return c;
    return {
      ...c,
      at: [
        c.at[0] + (other.at[0] - c.at[0]) * e,
        c.at[1] + (other.at[1] - c.at[1]) * e,
        c.at[2] + (other.at[2] - c.at[2]) * e,
      ],
    };
  });

  const rodLengths = rods.map((r) => Math.hypot(
    r.to[0] - r.from[0], r.to[1] - r.from[1], r.to[2] - r.from[2],
  ));
  return {
    moduleId: a.moduleId, rods, joints, connectors,
    points: fixed, segLengths: a.segLengths, rodLengths,
  };
}

/** Geometry for a whole build, in assembly order. */
export const buildGeometry = (modules: FittedModule[]): ModuleGeometry[] =>
  modules.map(moduleGeometry);

/** Exposed for the test that pins the drawn side-connector offset to the model. */
export const SIDE_OFFSET_IN_CUBES = SIDE_CONNECTOR_RADIAL_OFFSET * S;
