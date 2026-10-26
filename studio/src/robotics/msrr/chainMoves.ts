/**
 * chainMoves.ts — the mod2 (MODULINK) move set: where can a free end actually reach?
 *
 * THE GAIT, RESTATED
 * A module travels hand over hand. Anchored by one end, it bends, swings its free
 * end onto a target connector, welds there, and only then releases the old anchor.
 * So the question that defines the whole move set is: ANCHORED HERE, IN WHICH
 * POSE, WHERE DOES THE FREE END LAND?
 *
 * DISCRETE, NOT CONTINUOUS
 * That question could be answered by solving the six joints toward an arbitrary
 * target (continuous IK). It is answered here by enumeration instead: sweep joint
 * space, run the real forward kinematics for each combination, and keep the ones
 * whose free end lands on a cube lattice point facing a lattice axis. The output
 * is a finite, precomputed table of landing spots, built once and cached.
 *
 * That is the standard MSRR approach and it is chosen deliberately. The search
 * stays finite and fast, every move in it is a pose the hardware can actually
 * hold, and — the part that matters most — a plan built from a finite verified
 * table cannot contain a move that turns out to be unreachable. Continuous IK
 * reaches more targets but makes every candidate move an IK call, and puts the
 * burden of proof on the solver converging.
 *
 * WHY 90° TWIST STEPS SPECIFICALLY
 * The connectors have four-fold symmetry — a lock mates every 90° — so a twist
 * that is not a multiple of 90° cannot seat a connector anyway. The quantization
 * is not an approximation of the hardware here; it is the hardware.
 *
 * LATTICE CONVENTION, WHICH DIFFERS FROM occupancy.ts ON PURPOSE
 * Here a cube is CENTRED on an integer multiple of the cube size, so connector A
 * sits at cube [0,0,0] and a straight module puts connector B at [0,0,-4] — four
 * cube steps of reach, matching the 4/3/2/1 scale. occupancy.ts answers a
 * different question (which cubes does the body's volume fill) and uses a
 * corner-origin grid for it. Both are internally consistent; they are not the
 * same grid and are never mixed.
 */
import { type Cell, key, manhattan } from './lattice';
import {
  type ModuleAngles, type ConnectorEnd, type ConnectorPose, type Vec3, type Pose, type Quat,
  IDENTITY, sampleCenterline, rodLength, PREFIX_LENGTH,
  isSideEnd, weldTypeIsLegal,
  moduleFrames, composePoses, rotateVec,
  endPose, connectorPoses,
} from './modulink';
import { MODULINK_POSES, MODULINK_CUBE_SIZE, CUBES_PER_STRAIGHT_MODULE } from './occupancy';

/**
 * Twist joints can only seat every 90° — the connectors are four-fold symmetric
 * (slots at 45 + 90k deg). Written 0..270 deg; the joint covers +-180, so 270 is
 * the same pose as -90 and is what the table stores.
 */
export const TWIST_STEPS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

/**
 * Bend resolution, in degrees, swept over the ±90° range (the joint itself goes to
 * ±90°, the joint's full range). Four bends, not three, so
 * the sweep is coarser than it used to be: 13^4 combinations per twist.
 *
 * Unlike twist, bend is NOT quantized by the hardware — it is a continuous
 * revolute joint. It is enumerated at a fine step here because the canonical
 * pose library was chosen to be legible (straight, elbow, hook, coil), not to
 * land on a cube lattice, and it turns out almost none of those folds do: at 90°
 * bends only near-straight configurations put the free end on a lattice point.
 * Sweeping the bend range finds the angles that actually seat.
 *
 * This is still a discrete, finite, precomputed table — the search never solves
 * IK at runtime. It just means the table is built by enumerating joint space
 * rather than by trusting six hand-picked poses.
 */
export const BEND_STEP_DEG = 22.5;

/** How many alternative body routes to keep per landing spot, for collision slack. */
export const ALTERNATES_PER_TARGET = 2;

/**
 * How far off a lattice point a pose's free end may land and still be counted.
 * A connector has to physically seat, so a pose that ends a third of a cube away
 * from any lattice position is not a move — it is a near miss, and admitting it
 * would put unreachable moves into plans.
 */
export const MAX_SNAP_ERROR = 0.3;

/**
 * Positional tolerances that are about the PHYSICAL weld (how close two pads must
 * be to seat), not about lattice snapping, are written in the cubes the lattice
 * was first tuned at (4 per module) and rescaled by this so they keep meaning the
 * same number of centimetres when the cube is halved. MAX_SNAP_ERROR itself is
 * left alone: a finer lattice should snap more tightly, not less.
 */
export const PHYSICAL_TOLERANCE_SCALE = CUBES_PER_STRAIGHT_MODULE / 4;

/** How closely the free end's facing must line up with a lattice axis to seat. */
export const MIN_AXIS_ALIGNMENT = 0.9;

const AXES: Cell[] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

/** Nearest lattice axis to a direction, or null if it does not line up with one. */
export function snapDir(v: Vec3): Cell | null {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  const n: Vec3 = [v[0] / len, v[1] / len, v[2] / len];
  let best: Cell | null = null;
  let bestDot = MIN_AXIS_ALIGNMENT;
  for (const a of AXES) {
    const d = n[0] * a[0] + n[1] * a[1] + n[2] * a[2];
    if (d > bestDot) { bestDot = d; best = a; }
  }
  return best;
}

/** Rigid inverse of a Pose: composePoses(invertPose(p), p) is the identity. */
export function invertPose(p: Pose): Pose {
  const q: Quat = [-p.quaternion[0], -p.quaternion[1], -p.quaternion[2], p.quaternion[3]];
  const inv = rotateVec(q, [-p.position[0], -p.position[1], -p.position[2]]);
  return { position: inv, quaternion: q };
}

/** Cubes the body passes through, on the centre-at-integer grid used by this file. */
export function sweptCellsCentred(angles: ModuleAngles, cubeSize: number, base: Pose = IDENTITY): Cell[] {
  const seen = new Set<string>();
  const out: Cell[] = [];
  for (const p of sampleCenterline(angles, base)) {
    const c: Cell = [
      Math.round(p[0] / cubeSize),
      Math.round(p[1] / cubeSize),
      Math.round(p[2] / cubeSize),
    ];
    const k = key(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

/**
 * One reachable configuration: a pose the module can hold, and where that puts
 * its free end relative to its anchor.
 */
export interface LatticePose {
  id: string;
  /** which canonical bend pattern this is built on */
  bendPoseId: string;
  /** the quantized twist angles, in 90° steps, for the three twists T1 / T2 / T3 */
  twistSteps: [number, number, number];
  angles: ModuleAngles;
  /** free end's cube, relative to the anchor's cube at [0,0,0] */
  endOffset: Cell;
  /** lattice direction the free end's connector faces */
  endDir: Cell;
  /** cubes the body occupies, relative to the anchor's cube */
  cells: Cell[];
  /** cube steps of reach — the 4/3/2/1 number */
  reach: number;
  /** how far the true kinematic endpoint sat from the snapped lattice point, in cubes */
  snapError: number;
  /**
   * The four side receivers: which cube each one is filed under and which lattice
   * direction it faces. Two per spine, so S1A/S1B share a cube and S2A/S2B share
   * another (usually a different one).
   *
   * A receiver sits a few centimetres off its spine's axis, so it is nearly at
   * the rod's centreline, but along the chain it is NOT at a cube centre, so the
   * cube it is filed under is the lattice's approximation of it. Weld checks use
   * the real position (fitModules.connectorsOf), never this.
   * A direction the pose does not leave on a lattice axis is left out.
   */
  sides: SideSite[];
  /**
   * Which physical connector this pose is held by. 'A' and 'B' are bookkeeping
   * labels for whichever end is held versus free (see fitModules.ts) — nothing
   * downstream branches on this. It exists so the fast-path/reference-kinematics
   * cross-check test can re-derive a mirrored entry correctly.
   */
  anchorEnd: 'A' | 'B';
}

/** One side receiver as the lattice sees it. */
export interface SideSite { end: ConnectorEnd; offset: Cell; dir: Cell }

/**
 * The correct BASE POSE for recomputing a placed module's real, continuous
 * geometry — rod segments, connector positions, drawn shape — from `pose.angles`,
 * given which physical connector is actually anchored.
 *
 * A quarter of the reach table's poses are NOT held from connector A: they are
 * the mirror pass below, built by reusing an A-anchored pose's `angles` but held
 * from the OTHER physical end (`anchorEnd: 'B'`, id suffix "#B<n>") — the module
 * doesn't care which physical connector is which, see the mirror's own comment.
 * `moduleFrames` itself always assumes A is what sits at `base`, so recomputing
 * geometry for one of these with a bare `{position:[0,0,0], quaternion:
 * baseQuatFor(anchorDir)}` places the chain as if A were held when B is —
 * wrongly, by the pose's own reach.
 *
 * `invB`, the pose's own A->B transform inverted, composed as the innermost
 * transform, re-bases the chain so physical B — not A — sits at the local
 * origin facing local +Z, matching the convention `outer` already expects to
 * rotate into world space. This is exactly what table-build time already did
 * for these poses' `cells`/`sides` (`invB` below), which is why
 * the LATTICE bookkeeping for one was always fine while re-deriving continuous
 * geometry from scratch, ignoring this, was not.
 *
 * Exported for moduleGeometry.ts's renderer, which needs the rod/joint frames
 * this base produces directly (rods have no 'A'/'B' label to get backwards).
 * fitModules.ts should reach for `bookkeepingConnectors` below instead, unless
 * it specifically wants raw physical-end labels.
 */
export function anchoredBase(pose: LatticePose, outerQuat: Quat): Pose {
  const outer: Pose = { position: [0, 0, 0], quaternion: outerQuat };
  if (pose.anchorEnd === 'A') return outer;
  const invB = invertPose(endPose(pose.angles, IDENTITY));
  return composePoses(outer, invB);
}

/**
 * All six lock faces of a placed module, in WORLD space, labelled by which one
 * is bookkeeping-anchored and which is bookkeeping-free — the sense fitModules.ts
 * and moduleGeometry.ts actually need, as opposed to which is physically rod-end
 * "A" or "B".
 *
 * THE BUG THIS FIXES, found from a real build a user reported as visibly wrong:
 * one module's rendered bend was in the wrong place, and the module after it
 * read as physically disconnected, though every LATTICE-level number (which
 * cubes, which cell) was entirely correct — the coverage report said "fully
 * covered" while the build was visibly two robots wearing one description.
 *
 * `anchoredBase` alone is not enough to fix this. `connectorPoses` always
 * labels the chain's very first connector "A" and its very last "B", REGARDLESS
 * of which one a pose is anchored by — because that labelling is intrinsic to
 * the rod chain itself, not to how the pose is being used. For an A-anchored
 * pose those two senses happen to coincide (physical A IS the anchor), which is
 * exactly why the bug hid in ordinary testing: three quarters of all placements
 * never exercise the mismatch. For a MIRRORED pose (`anchorEnd: 'B'`) they do
 * not coincide — physical B is the anchor, physical A is the free end — so a
 * caller asking `.find(c => c.end === 'A')` meaning "the connector we're
 * anchored by" silently got the FAR end's position instead: a weld computed at
 * (5.0, 5.0, 1.0) came out at (1.8, 1.9, 0.0), four cubes from anything else in
 * the structure — while `cells`/`endCell`/coverage, which never go through
 * `connectorPoses`, stayed correct throughout, hiding the defect from every
 * lattice-level check.
 *
 * So the two physical end labels are swapped back for a mirrored pose, once,
 * here — after that every caller can keep asking for 'A' meaning "anchored" and
 * 'B' meaning "free", which is the bookkeeping fitModules.ts's own header
 * comment documents and has always assumed. Side connectors need no such
 * swap: they are not "A" or "B", and their positions come out correctly placed
 * from `anchoredBase` alone (a rigid re-basing moves every point consistently,
 * connector labels aside).
 */
export function bookkeepingConnectors(pose: LatticePose, outerQuat: Quat): ConnectorPose[] {
  const cp = connectorPoses(pose.angles, anchoredBase(pose, outerQuat));
  if (pose.anchorEnd === 'A') return cp;
  return cp.map((c) => (
    c.end === 'A' ? { ...c, end: 'B' as ConnectorEnd }
      : c.end === 'B' ? { ...c, end: 'A' as ConnectorEnd }
        : c
  ));
}

let tableCache: { cubeSize: number; poses: LatticePose[] } | null = null;

/**
 * Allocation-free forward kinematics for the table build's inner loop, with
 * T1 = T3 = 0 (T1 is recovered by symmetry, T3 cannot move the end — see reachTable).
 *
 * This is the same walk as modulink.moduleFrames — gap, joint, rod length, per
 * rod, from a base flipped 180° about X — but with the quaternion algebra
 * inlined and no RodFrame objects created. moduleFrames stays the readable
 * reference implementation and a test pins the two together; this exists purely
 * because the table build calls it ~110k times and object churn dominated.
 */
// Scratch state for fastEndPose. Module-level rather than function locals so the
// three helpers are plain functions instead of closures allocated afresh on each
// of ~27k calls per table build. Single-threaded, written and read only by
// fastEndPose and its caller, never observable outside this file.
let _qx = 0, _qy = 0, _qz = 0, _qw = 1;
let _px = 0, _py = 0, _pz = 0;

/** advance along the frame's own +Z by d */
function _stepZ(d: number) {
  // third column of the rotation matrix for (_qx,_qy,_qz,_qw)
  _px += d * 2 * (_qx * _qz + _qw * _qy);
  _py += d * 2 * (_qy * _qz - _qw * _qx);
  _pz += d * (1 - 2 * (_qx * _qx + _qy * _qy));
}
/** q *= rotateZ(a) */
function _rotZ(a: number) {
  const s = Math.sin(a / 2), c = Math.cos(a / 2);
  const x = _qx * c + _qy * s;
  const y = -_qx * s + _qy * c;
  const z = _qw * s + _qz * c;
  const w = _qw * c - _qz * s;
  _qx = x; _qy = y; _qz = z; _qw = w;
}
/** q *= rotateX(a) */
function _rotX(a: number) {
  const s = Math.sin(a / 2), c = Math.cos(a / 2);
  const x = _qw * s + _qx * c;
  const y = _qy * c + _qz * s;
  const z = -_qy * s + _qz * c;
  const w = _qw * c - _qx * s;
  _qx = x; _qy = y; _qz = z; _qw = w;
}

const ROD_LENGTHS: number[] = [0, 1, 2, 3, 4, 5, 6].map(rodLength);

/** Leaves the result in the module scratch; read it with `fastPosition`/`fastForward`. */
function fastEndPose(b1: number, b2: number, t2: number, b3: number, b4: number): void {
  // Start at FLIP_X_180: quaternion (1,0,0,0).
  _qx = 1; _qy = 0; _qz = 0; _qw = 0;
  _px = 0; _py = 0; _pz = 0;

  // connector A -> T1 axis, then per rod: joint rotation, rod length. T1 and T3 are
  // fixed at 0 here (see reachTable): T1 is recovered by symmetry, T3 cannot move
  // the end connector at all.
  _stepZ(PREFIX_LENGTH);
  _stepZ(ROD_LENGTHS[0]);                        // T1 (0), rod T1 -> B1
  _rotX(b1); _stepZ(ROD_LENGTHS[1]);             // B1, Spine1
  _rotX(b2); _stepZ(ROD_LENGTHS[2]);             // B2
  _rotZ(t2); _stepZ(ROD_LENGTHS[3]);             // T2
  _rotX(b3); _stepZ(ROD_LENGTHS[4]);             // B3, Spine2
  _rotX(b4); _stepZ(ROD_LENGTHS[5]);             // B4
  _stepZ(ROD_LENGTHS[6]);                        // T3 (0), rod T3 -> connector B
}

/**
 * Allocation-free end position and facing for ANY first twist (not just the table's
 * quarter turns), as [px, py, pz, fx, fy, fz]. T1 turns the whole chain about world Z
 * (see reachTable), so it is the T1 = 0 result rotated by -t1 about Z. The IK solver calls
 * this thousands of times per query; the generic quaternion FK was most of its cost.
 */
export function fastEndState(t1: number, b1: number, b2: number, t2: number, b3: number, b4: number, out: number[]): number[] {
  fastEndPose(b1, b2, t2, b3, b4);
  const c = Math.cos(t1), s = Math.sin(t1);
  const fx = 2 * (_qx * _qz + _qw * _qy), fy = 2 * (_qy * _qz - _qw * _qx), fz = 1 - 2 * (_qx * _qx + _qy * _qy);
  out[0] = _px * c + _py * s; out[1] = -_px * s + _py * c; out[2] = _pz;
  out[3] = fx * c + fy * s; out[4] = -fx * s + fy * c; out[5] = fz;
  return out;
}

const fastPosition = (): Vec3 => [_px, _py, _pz];
const fastForward = (): Vec3 => [
  2 * (_qx * _qz + _qw * _qy),
  2 * (_qy * _qz - _qw * _qx),
  1 - 2 * (_qx * _qx + _qy * _qy),
];

/**
 * Every distinct (pose → landing spot) the module has. Deduped by what actually
 * matters downstream — where the free end lands, which way it faces, and which
 * cubes the body fills — so two twist combinations that produce an identical
 * placement collapse into one entry rather than inflating the search.
 */
export function reachTable(cubeSize = MODULINK_CUBE_SIZE): LatticePose[] {
  if (tableCache && tableCache.cubeSize === cubeSize) return tableCache.poses;

  const bendSteps: number[] = [];
  for (let d = -90; d <= 90; d += BEND_STEP_DEG) bendSteps.push((d * Math.PI) / 180);

  interface Candidate { angles: ModuleAngles; endOffset: Cell; endDir: Cell; snapError: number }
  const bySpot = new Map<string, Candidate[]>();

  // ── two symmetries that cut the enumeration by 16x ────────────────────────
  //
  // t5 (the last twist) rotates rod 5 about its OWN axis, and rod 5 is a twist
  // rod, so the translation that follows runs along the same axis: t5 cannot
  // move the endpoint, and cannot change which way the end connector faces
  // either (rotating about Z leaves +Z alone). It is a free roll about the end
  // axis — useful for keying the connector, irrelevant to where the module
  // reaches. So it is fixed at 0 here and left as a spare degree of freedom.
  //
  // t0 (the first twist) rotates the whole rest of the chain about the base
  // axis. Because Rx(pi)*Rz(a) == Rz(-a)*Rx(pi), the pose for any t0 is the
  // t0 = 0 pose rotated about world Z — so the chain is solved once and the
  // four twist settings come from cheap axis swaps rather than four more FK
  // passes. At 90 degree steps those swaps are exact, not approximations.
  const quarterTurns: ((v: Vec3) => Vec3)[] = [
    (v) => v,
    (v) => [v[1], -v[0], v[2]],
    (v) => [-v[0], -v[1], v[2]],
    (v) => [-v[1], v[0], v[2]],
  ];

  for (const t2 of TWIST_STEPS) {
    for (const b1 of bendSteps) {
      for (const b2 of bendSteps) {
        for (const b3 of bendSteps) {
         for (const b4 of bendSteps) {
          fastEndPose(b1, b2, t2, b3, b4);
          const basePos = fastPosition();
          const baseFwd = fastForward();

          for (let ti = 0; ti < quarterTurns.length; ti++) {
            const turn = quarterTurns[ti];
            const pos = turn(basePos);
            const fwd = turn(baseFwd);

            const raw: Vec3 = [pos[0] / cubeSize, pos[1] / cubeSize, pos[2] / cubeSize];
            const endOffset: Cell = [Math.round(raw[0]), Math.round(raw[1]), Math.round(raw[2])];
            const snapError = Math.hypot(
              raw[0] - endOffset[0], raw[1] - endOffset[1], raw[2] - endOffset[2],
            );
            if (snapError > MAX_SNAP_ERROR) continue;
            // A module that reaches nowhere is not a move.
            if (endOffset[0] === 0 && endOffset[1] === 0 && endOffset[2] === 0) continue;

            const endDir = snapDir(fwd);
            if (!endDir) continue;

            const angles: ModuleAngles = [TWIST_STEPS[ti], b1, b2, t2, b3, b4, 0];
            const k = `${key(endOffset)}|${key(endDir)}`;
            const list = bySpot.get(k);
            if (list) list.push({ angles, endOffset, endDir, snapError });
            else bySpot.set(k, [{ angles, endOffset, endDir, snapError }]);
          }
         }
        }
      }
    }
  }

  // Pass 2: for each landing spot keep a few genuinely different body routes,
  // cheapest snap first, so the planner has alternatives when one is blocked.
  const out: LatticePose[] = [];
  for (const [, candidates] of bySpot) {
    candidates.sort((a, b) => a.snapError - b.snapError);
    const routes = new Set<string>();
    for (const c of candidates) {
      if (routes.size >= ALTERNATES_PER_TARGET) break;
      const cells = sweptCellsCentred(c.angles, cubeSize);
      const sig = cells.map(key).sort().join(',');
      if (routes.has(sig)) continue;
      routes.add(sig);
      const sides = sideSites(c.angles, cubeSize);
      out.push({
        id: `${key(c.endOffset)}@${key(c.endDir)}#${routes.size}`,
        bendPoseId: nearestNamedPose(c.angles),
        twistSteps: [
          TWIST_STEPS.indexOf(c.angles[0]),
          TWIST_STEPS.indexOf(c.angles[3]),
          TWIST_STEPS.indexOf(c.angles[6]),
        ] as [number, number, number],
        angles: c.angles,
        endOffset: c.endOffset,
        endDir: c.endDir,
        cells,
        reach: manhattan([0, 0, 0], c.endOffset),
        snapError: c.snapError,
        sides,
        anchorEnd: 'A',
      });
    }
  }

  // ── the mirror: hold the OTHER end ──────────────────────────────────────
  //
  // Everything above assumes the module is held by what this file calls its
  // anchor and swings its free end outward. But a module does not care which
  // physical connector is which — "A" and "B" are bookkeeping labels applied to
  // whichever end is currently held versus currently free (see fitModules.ts).
  // So every pose above is also valid held from its OTHER end, with the roles
  // reversed: invert the pose's own A->free rigid transform, and the same joint
  // angles now describe the anchor's ORIGINAL position as a new landing spot.
  //
  // Reusing the reference (non-fast) kinematics here is deliberate and fine:
  // this only runs once per already-selected pose (~300 of them), not once per
  // raw joint-space combination (~27k), so the object-churn cost that made the
  // fast path worthwhile in pass 1 does not apply here.
  const mirroredBySpot = new Map<string, { angles: ModuleAngles; endOffset: Cell; endDir: Cell; snapError: number }[]>();
  for (const p of out) {
    const invB = invertPose(endPose(p.angles, IDENTITY));
    const a = connectorPoses(p.angles, invB).find((c) => c.end === 'A');
    if (!a) continue;

    const raw: Vec3 = [a.position[0] / cubeSize, a.position[1] / cubeSize, a.position[2] / cubeSize];
    const endOffset: Cell = [Math.round(raw[0]), Math.round(raw[1]), Math.round(raw[2])];
    const snapError = Math.hypot(raw[0] - endOffset[0], raw[1] - endOffset[1], raw[2] - endOffset[2]);
    if (snapError > MAX_SNAP_ERROR) continue;
    if (endOffset[0] === 0 && endOffset[1] === 0 && endOffset[2] === 0) continue;

    const endDir = snapDir(a.normal);
    if (!endDir) continue;

    const k = `${key(endOffset)}|${key(endDir)}`;
    const list = mirroredBySpot.get(k);
    if (list) list.push({ angles: p.angles, endOffset, endDir, snapError });
    else mirroredBySpot.set(k, [{ angles: p.angles, endOffset, endDir, snapError }]);
  }

  const mirrored: LatticePose[] = [];
  for (const [, candidates] of mirroredBySpot) {
    candidates.sort((a, b) => a.snapError - b.snapError);
    const routes = new Set<string>();
    for (const c of candidates) {
      if (routes.size >= ALTERNATES_PER_TARGET) break;
      const invB = invertPose(endPose(c.angles, IDENTITY));
      const cells = sweptCellsCentred(c.angles, cubeSize, invB);
      const sig = cells.map(key).sort().join(',');
      if (routes.has(sig)) continue;
      routes.add(sig);
      const sides = sideSites(c.angles, cubeSize, invB);
      mirrored.push({
        id: `${key(c.endOffset)}@${key(c.endDir)}#B${routes.size}`,
        bendPoseId: nearestNamedPose(c.angles),
        twistSteps: [
          TWIST_STEPS.indexOf(c.angles[0]),
          TWIST_STEPS.indexOf(c.angles[3]),
          TWIST_STEPS.indexOf(c.angles[6]),
        ] as [number, number, number],
        angles: c.angles,
        endOffset: c.endOffset,
        endDir: c.endDir,
        cells,
        reach: manhattan([0, 0, 0], c.endOffset),
        snapError: c.snapError,
        sides,
        anchorEnd: 'B',
      });
    }
  }

  const all = [...out, ...mirrored];
  all.sort((a, b) => b.reach - a.reach || a.id.localeCompare(b.id));
  tableCache = { cubeSize, poses: all };
  return all;
}

/**
 * Where each side receiver lands, as the lattice sees it: the cube it is filed
 * under (the receiver's position rounded to a cube centre) and the lattice axis
 * it faces. A receiver whose normal is not within the axis tolerance of a lattice
 * direction is left out — it cannot be welded to from a lattice-aligned pose.
 */
export function sideSites(
  angles: ModuleAngles, cubeSize: number, base: Pose = IDENTITY,
): SideSite[] {
  const out: SideSite[] = [];
  for (const c of connectorPoses(angles, base)) {
    if (!isSideEnd(c.end)) continue;
    const dir = snapDir(c.normal);
    if (!dir) continue;
    out.push({
      end: c.end,
      offset: [
        Math.round(c.position[0] / cubeSize),
        Math.round(c.position[1] / cubeSize),
        Math.round(c.position[2] / cubeSize),
      ],
      dir,
    });
  }
  return out;
}

/** Closest canonical pose by bend angles — a readable label, not a constraint. */
export function nearestNamedPose(angles: ModuleAngles): string {
  let best = MODULINK_POSES[0];
  let bestD = Infinity;
  for (const p of MODULINK_POSES) {
    const d = Math.abs(p.angles[1] - angles[1])
      + Math.abs(p.angles[2] - angles[2])
      + Math.abs(p.angles[4] - angles[4]);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best.id;
}

/** Drop the cached table — call if a geometry constant changes at runtime. */
export function invalidateReachTable() { tableCache = null; }

// ── landing spots ─────────────────────────────────────────────────────────────

export interface ReachTarget {
  /** cube the free end lands in, relative to the anchor cube */
  offset: Cell;
  /** direction the free end faces there */
  dir: Cell;
  /** ids of every pose that achieves this landing */
  poseIds: string[];
  /** fewest cubes of body the module uses to get there */
  minCells: number;
}

/**
 * The distinct places a free end can be put, collapsing poses that land in the
 * same spot facing the same way. This is what a planner enumerates per move: the
 * module does not care which of four equivalent folds it uses, only that the
 * connector seats where it needs to.
 */
export function reachTargets(cubeSize = MODULINK_CUBE_SIZE): ReachTarget[] {
  const bySpot = new Map<string, ReachTarget>();
  for (const p of reachTable(cubeSize)) {
    const k = `${key(p.endOffset)}|${key(p.endDir)}`;
    const hit = bySpot.get(k);
    if (hit) {
      hit.poseIds.push(p.id);
      hit.minCells = Math.min(hit.minCells, p.cells.length);
    } else {
      bySpot.set(k, {
        offset: p.endOffset,
        dir: p.endDir,
        poseIds: [p.id],
        minCells: p.cells.length,
      });
    }
  }
  return [...bySpot.values()].sort(
    (a, b) => manhattan([0, 0, 0], b.offset) - manhattan([0, 0, 0], a.offset),
  );
}

/** Poses that land the free end exactly at `offset` facing `dir`. */
export function posesReaching(offset: Cell, dir: Cell, cubeSize = MODULINK_CUBE_SIZE): LatticePose[] {
  return reachTable(cubeSize).filter(
    (p) => key(p.endOffset) === key(offset) && key(p.endDir) === key(dir),
  );
}

// ── moves ─────────────────────────────────────────────────────────────────────

/**
 * A candidate relocation: the module keeps `holdEnd` welded, folds into `pose`,
 * and seats `moveEnd` onto the target connector. The old anchor releases only
 * after this weld is made — see canReleaseEnd in modulink.ts.
 */
export interface ChainMove {
  moduleId: string;
  /** the connector that stays put through the move */
  holdEnd: ConnectorEnd;
  /** the connector that travels and re-welds */
  moveEnd: ConnectorEnd;
  /** module being grabbed */
  targetModuleId: string;
  /** connector being grabbed */
  targetEnd: ConnectorEnd;
  /** cube the moving end ends up in */
  targetCell: Cell;
  pose: LatticePose;
  /** cubes the body occupies after the move, in world cube coordinates */
  cells: Cell[];
}

/** A connector sitting somewhere in the structure, available to be grabbed. */
export interface OpenConnector {
  moduleId: string;
  end: ConnectorEnd;
  cell: Cell;
  /** direction it faces */
  dir: Cell;
  /** side connectors already welded on that module, for the two-opposite rule */
  usedSides: ConnectorEnd[];
}

export interface MoveContext {
  /** cubes already occupied by other modules — the moving body must avoid these */
  occupied: Set<string>;
  /** every free connector in the structure */
  open: OpenConnector[];
}

const addCell = (a: Cell, b: Cell): Cell => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const negCell = (a: Cell): Cell => [-a[0], -a[1], -a[2]];

/**
 * Every legal place this module can put its free end, given where it is anchored.
 *
 * A candidate survives only if all of these hold:
 *   - some pose lands the free end exactly on the target connector's cube
 *   - the two connectors face each other (a weld opposes outward normals)
 *   - the weld type is possible at all
 *   - the receiver being grabbed is not already carrying a weld
 *   - no cube of the module's body collides with anything already there
 */
export function legalChainMoves(
  moduleId: string,
  holdEnd: ConnectorEnd,
  moveEnd: ConnectorEnd,
  anchorCell: Cell,
  ctx: MoveContext,
  cubeSize = MODULINK_CUBE_SIZE,
): ChainMove[] {
  const out: ChainMove[] = [];
  const table = reachTable(cubeSize);

  for (const target of ctx.open) {
    if (target.moduleId === moduleId) continue; // a module cannot weld to itself
    if (!weldTypeIsLegal(moveEnd, target.end)) continue;

    // Each receiver carries one weld; its twin on the other face of the spine is
    // independent of it.
    if (isSideEnd(target.end) && target.usedSides.includes(target.end)) continue;

    const wantedOffset: Cell = [
      target.cell[0] - anchorCell[0],
      target.cell[1] - anchorCell[1],
      target.cell[2] - anchorCell[2],
    ];
    // A weld opposes outward normals: our end must face back at theirs.
    const wantedDir = negCell(target.dir);

    for (const pose of table) {
      if (key(pose.endOffset) !== key(wantedOffset)) continue;
      if (key(pose.endDir) !== key(wantedDir)) continue;

      const cells = pose.cells.map((c) => addCell(c, anchorCell));
      // The body may pass through its own anchor cube and the cube it is
      // grabbing, but nothing else that is already occupied.
      const blocked = cells.some((c) => {
        const k = key(c);
        if (k === key(anchorCell) || k === key(target.cell)) return false;
        return ctx.occupied.has(k);
      });
      if (blocked) continue;

      out.push({
        moduleId,
        holdEnd,
        moveEnd,
        targetModuleId: target.moduleId,
        targetEnd: target.end,
        targetCell: target.cell,
        pose,
        cells,
      });
      break; // one pose per target is enough; they are equivalent placements
    }
  }
  return out;
}

/** One-line description of a move, for the plan list and the hardware log. */
export function describeChainMove(m: ChainMove, index?: number): string {
  const n = index === undefined ? '' : `${index + 1}. `;
  return `${n}${m.moduleId}: hold ${m.holdEnd}, fold to ${m.pose.bendPoseId}, `
    + `swing ${m.moveEnd} onto ${m.targetModuleId}.${m.targetEnd} at (${m.targetCell.join(',')}), `
    + `then release ${m.holdEnd === 'A' ? 'B' : 'A'}`;
}

// ── reporting ─────────────────────────────────────────────────────────────────

export interface ReachSummary {
  poseCount: number;
  targetCount: number;
  /** reach in cubes, min and max, across the table */
  reachRange: [number, number];
  /** worst lattice snap error accepted, in cubes */
  worstSnap: number;
  /** how many landing spots exist at each reach distance */
  byReach: { reach: number; targets: number }[];
}

export function reachSummary(cubeSize = MODULINK_CUBE_SIZE): ReachSummary {
  const table = reachTable(cubeSize);
  const targets = reachTargets(cubeSize);
  const reaches = table.map((p) => p.reach);

  const counts = new Map<number, number>();
  for (const t of targets) {
    const r = manhattan([0, 0, 0], t.offset);
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }

  return {
    poseCount: table.length,
    targetCount: targets.length,
    reachRange: [Math.min(...reaches), Math.max(...reaches)],
    worstSnap: table.reduce((m, p) => Math.max(m, p.snapError), 0),
    byReach: [...counts.entries()]
      .map(([reach, t]) => ({ reach, targets: t }))
      .sort((a, b) => b.reach - a.reach),
  };
}
