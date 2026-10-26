/**
 * physicsView.ts — play a MuJoCo run (verify_service /simulate) on the Studio's real meshes.
 *
 * The service records every part of every module (v2 world: metres, Y up, quaternion xyzw).
 * MuJoCo's body frames and the Studio's mesh frames differ by a fixed offset per part; it is
 * measured, not typed in: frame 0 of the run is the drawn (nominal) pose, so for each part
 *   K = inverse(MuJoCo pose at frame 0) ∘ (Studio pose of the same part, same nominal pose)
 * and every later frame is drawn at  MuJoCo pose(t) ∘ K.
 */
import type { FittedModule } from '@/robotics/msrr/fitModules';
import type { Vec3, Quat } from '@/robotics/msrr/modulink';
import { moduleBodies } from '@/features/msrr/moduleGeometry';
import { toView } from './v2View';

export interface PhysRun {
  bodies: [string, string][];
  frame0: number[];
  frames: { t: number; p: number[] }[];
  events: { step: number; verb: string; label: string; t: number; latched?: boolean; note?: string; end_off_mm?: number[] }[];
  fps: number;
  randomized: boolean;
  seed: number;
  finite: boolean;
  /** floor receivers in that world, and which module end is LOCKED in each (Studio v2 coords, metres) */
  receivers?: { id: string; x: number; z: number; locked: string | null }[];
}

/** A floor receiver as the viewport draws it: its seat in viewport units, a label, locked or not */
export interface ReceiverMark { p: Vec3; label: string; locked: boolean }
export const receiverMarks = (list: { id: string; x: number; z: number; locked: string | null }[] | undefined): ReceiverMark[] =>
  (list ?? []).map((r) => ({ p: toView([r.x, 0, r.z]) as Vec3, label: r.locked ? `${r.id} · LOCKED ${r.locked}` : r.id, locked: !!r.locked }));

const qmul = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qconj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];
const qrot = (q: Quat, v: Vec3): Vec3 => {
  const r = qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q));
  return [r[0], r[1], r[2]];
};

/** MuJoCo pose of body i in a flat frame, in viewport units */
const poseAt = (flat: number[], i: number): { p: Vec3; q: Quat } => {
  const o = i * 7;
  return { p: toView([flat[o], flat[o + 1], flat[o + 2]]) as Vec3, q: [flat[o + 3], flat[o + 4], flat[o + 5], flat[o + 6]] };
};

export interface PhysPrepared { run: PhysRun; nominal: FittedModule[]; K: { p: Vec3; q: Quat }[] }

/** each part's mesh <-> MuJoCo body offset is a constant of the part (not of the pose): learned once, reused for any run */
const OFFSETS = new Map<string, { p: Vec3; q: Quat }>();
export const haveOffsets = () => OFFSETS.size > 0;

/** A run of modules the Studio has no configuration for (e.g. a shape built in physics): drawn from MuJoCo poses only,
 *  with the offsets learned from an earlier aligned run. `stub` = any drawn module (its fields are only placeholders). */
export function prepareRaw(run: PhysRun, stub: FittedModule): PhysPrepared {
  const ids = [...new Set(run.bodies.map(([mid]) => mid))];
  const K = run.bodies.map(([, name]) => OFFSETS.get(name) ?? { p: [0, 0, 0] as Vec3, q: [0, 0, 0, 1] as Quat });
  return { run, nominal: ids.map((id) => ({ ...stub, id })), K };
}

/** Line every MuJoCo part up with its Studio mesh, using frame 0 (both in the same nominal pose). */
export function preparePhys(run: PhysRun, nominal: FittedModule[]): PhysPrepared {
  const studio = new Map<string, { p: Vec3; q: Quat }>();
  for (const m of nominal) for (const b of moduleBodies(m)) studio.set(`${m.id}|${b.name}`, { p: b.position, q: b.quaternion });
  const K = run.bodies.map(([mid, name], i) => {
    const mj = poseAt(run.frame0, i);
    const st = studio.get(`${mid}|${name}`);
    if (!st) return { p: [0, 0, 0] as Vec3, q: [0, 0, 0, 1] as Quat };
    const qi = qconj(mj.q);
    const k = { p: qrot(qi, [st.p[0] - mj.p[0], st.p[1] - mj.p[1], st.p[2] - mj.p[2]]), q: qmul(qi, st.q) };
    OFFSETS.set(name, k);
    return k;
  });
  return { run, nominal, K };
}

/** The robot as MuJoCo has it at time t (seconds of simulated time). */
export function physFrame(pp: PhysPrepared, t: number): FittedModule[] {
  const fr = pp.run.frames;
  if (!fr.length) return pp.nominal;
  const k = Math.max(0, Math.min(fr.length - 1, Math.round(t * pp.run.fps)));
  const flat = fr[k].p;
  const poses = new Map<string, Record<string, { position: Vec3; quaternion: Quat }>>();
  pp.run.bodies.forEach(([mid, name], i) => {
    const mj = poseAt(flat, i), K = pp.K[i];
    const pr = qrot(mj.q, K.p);
    const rec = poses.get(mid) ?? {};
    rec[name] = { position: [mj.p[0] + pr[0], mj.p[1] + pr[1], mj.p[2] + pr[2]], quaternion: qmul(mj.q, K.q) };
    poses.set(mid, rec);
  });
  return pp.nominal.map((m) => ({ ...m, bodyPoses: poses.get(m.id) }));
}

export const physDuration = (pp: PhysPrepared) => (pp.run.frames.length ? pp.run.frames[pp.run.frames.length - 1].t - pp.run.frames[0].t : 0);
