/**
 * executor.ts — turns a discrete move list into continuous motion.
 *
 * "It should move and bend and restructure, not disappear and reappear."
 *
 * That is this file's entire job. The planner works in whole cells; a module that
 * jumps from one cell to the next between frames is a teleport, and a teleport is
 * a lie about what the hardware does. So every move is sampled as a pose over
 * t in [0,1]:
 *
 *  - slides interpolate position along the swept cells, so a corner slide bends
 *    round the corner instead of cutting across it,
 *  - pivots rotate the module rigidly about the lattice edge named in the move,
 *    which also carries the module's own orientation with it — after a 90 degrees roll a
 *    module really is lying on a different face, and that matters the moment its
 *    connectors are not symmetric.
 *
 * Poses come out in WORLD units (cells scaled by cellSize), ready for a Three.js
 * object or for a real joint-angle solver to consume. Nothing here imports Three.
 */
import { type Cell } from './lattice';
import { type Move } from './moves';

export interface Pose {
  position: [number, number, number];
  /** quaternion [x, y, z, w] */
  quaternion: [number, number, number, number];
}

export const IDENTITY_QUAT: [number, number, number, number] = [0, 0, 0, 1];

const smoothstep = (t: number) => t * t * (3 - 2 * t);

function quatFromAxisAngle(axis: Cell, angle: number): [number, number, number, number] {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const h = angle / 2;
  const s = Math.sin(h) / len;
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h)];
}

function quatMul(
  a: [number, number, number, number],
  b: [number, number, number, number],
): [number, number, number, number] {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function rotateAbout(
  p: [number, number, number],
  pivot: [number, number, number],
  axis: Cell,
  angle: number,
): [number, number, number] {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const n: [number, number, number] = [axis[0] / len, axis[1] / len, axis[2] / len];
  const v: [number, number, number] = [p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]];
  const c = Math.cos(angle), s = Math.sin(angle);
  const dotNV = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
  const crossNV: [number, number, number] = [
    n[1] * v[2] - n[2] * v[1],
    n[2] * v[0] - n[0] * v[2],
    n[0] * v[1] - n[1] * v[0],
  ];
  // Rodrigues rotation.
  return [
    pivot[0] + v[0] * c + crossNV[0] * s + n[0] * dotNV * (1 - c),
    pivot[1] + v[1] * c + crossNV[1] * s + n[1] * dotNV * (1 - c),
    pivot[2] + v[2] * c + crossNV[2] * s + n[2] * dotNV * (1 - c),
  ];
}

/**
 * Pose of the moving module at normalised time t within a single move.
 * `baseQuat` is the module's orientation before the move, so rotations accumulate
 * across a whole plan rather than resetting each step.
 */
export function poseAt(
  move: Move,
  t: number,
  cellSize: number,
  baseQuat: [number, number, number, number] = IDENTITY_QUAT,
): Pose {
  const tt = smoothstep(Math.max(0, Math.min(1, t)));

  if (move.pivot) {
    const angle = move.pivot.angle * tt;
    const p = rotateAbout(
      [move.from[0], move.from[1], move.from[2]],
      move.pivot.point,
      move.pivot.axis,
      angle,
    );
    const q = quatMul(quatFromAxisAngle(move.pivot.axis, angle), baseQuat);
    return { position: [p[0] * cellSize, p[1] * cellSize, p[2] * cellSize], quaternion: q };
  }

  // Translation: walk the swept cells in order so a corner move traces the corner.
  const waypoints: Cell[] = [move.from, ...move.swept];
  const segs = waypoints.length - 1;
  const scaled = tt * segs;
  const i = Math.min(segs - 1, Math.floor(scaled));
  const local = scaled - i;
  const a = waypoints[i], b = waypoints[i + 1];
  return {
    position: [
      (a[0] + (b[0] - a[0]) * local) * cellSize,
      (a[1] + (b[1] - a[1]) * local) * cellSize,
      (a[2] + (b[2] - a[2]) * local) * cellSize,
    ],
    quaternion: baseQuat,
  };
}

/** Resting pose of a module sitting in a cell. */
export const cellPose = (
  cell: Cell,
  cellSize: number,
  quat: [number, number, number, number] = IDENTITY_QUAT,
): Pose => ({
  position: [cell[0] * cellSize, cell[1] * cellSize, cell[2] * cellSize],
  quaternion: quat,
});

/**
 * The orientation a module ends a move in. Tracked per module across a plan so
 * repeated rolls compose — which is the difference between a module that "looks
 * like it rolled" and one whose connector faces are actually where the animation
 * says they are.
 */
export function orientationAfter(
  move: Move,
  baseQuat: [number, number, number, number],
): [number, number, number, number] {
  if (!move.pivot) return baseQuat;
  return quatMul(quatFromAxisAngle(move.pivot.axis, move.pivot.angle), baseQuat);
}

// ── playback ──────────────────────────────────────────────────────────────────

export interface PlaybackState {
  /** index of the move currently in flight */
  index: number;
  /** progress within that move, 0..1 */
  t: number;
  done: boolean;
}

export interface PlaybackOptions {
  /** seconds per move at speed 1 */
  moveDuration: number;
  speed: number;
  loop: boolean;
}

export const DEFAULT_PLAYBACK: PlaybackOptions = { moveDuration: 0.55, speed: 1, loop: false };

/**
 * Advance playback by `dt` seconds. Pure — the caller owns the state, which keeps
 * this testable and keeps scrubbing (jumping to an arbitrary move) trivial.
 */
export function advance(
  state: PlaybackState,
  dt: number,
  moveCount: number,
  opts: PlaybackOptions,
): PlaybackState {
  if (moveCount === 0) return { index: 0, t: 0, done: true };
  const per = Math.max(0.01, opts.moveDuration / Math.max(0.05, opts.speed));
  let { index, t } = state;
  t += dt / per;
  while (t >= 1) {
    t -= 1;
    index++;
    if (index >= moveCount) {
      if (opts.loop) { index = 0; }
      else return { index: moveCount - 1, t: 1, done: true };
    }
  }
  return { index, t, done: false };
}

/** Total wall-clock length of a plan at the given playback settings. */
export const planDuration = (moveCount: number, opts: PlaybackOptions) =>
  moveCount * (opts.moveDuration / Math.max(0.05, opts.speed));
