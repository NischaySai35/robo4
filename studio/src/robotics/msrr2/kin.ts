/**
 * kin.ts — one try8 module in the world, in METRES with Y up.
 *
 * Wraps the verified chain kinematics (robotics/msrr/modulink.ts, which matches the
 * Studio module doc) and adds what the v2 planner needs and the cube planner never had:
 *   - the ten real bodies with their MASS and centre of mass (from the module doc),
 *   - every joint's world position and axis (for gravity torques),
 *   - every port as a full frame: position, outward normal z, key/roll direction x,
 *   - collision spheres along the body, tagged by rigid segment.
 *
 * SEGMENTS. The module is eight rigid pieces separated by the seven joints:
 *   seg 0  End A lock (+ rotor)        joint 0 = T1 between seg 0 and 1
 *   seg 1  T1 housing / B1 fork        joint 1 = B1
 *   seg 2  Spine 1  (ports S1A, S1B)   joint 2 = B2
 *   seg 3  T2 housing                  joint 3 = T2
 *   seg 4  T2 ring / B3 fork           joint 4 = B3
 *   seg 5  Spine 2  (ports S2A, S2B)   joint 5 = B4
 *   seg 6  T3 housing                  joint 6 = T3
 *   seg 7  End B lock (+ rotor)
 */
import doc from '@/core/factory/single-module-demo.json';
import {
  moduleFrames, IDENTITY, UNITS_PER_M, ROD_ORDER, composePoses,
  type Pose as MPose, type ModuleAngles,
} from '@/robotics/msrr/modulink';
import { invertPose } from '@/robotics/msrr/chainMoves';
import { restBodies, studioToModel } from '@/robotics/msrr/restLayout';
import { type V3, type Q, type Frame, qrot, scale, add, norm, cross } from './vec';
import type { PortId } from './model';

export const PORT_SEG: Record<PortId, number> = { A: 0, S1A: 2, S1B: 2, S2A: 5, S2B: 5, B: 7 };
const PORT_BODY: Record<PortId, [string, string]> = {
  A: ['EndA_LockModule', 'conn-endA'], B: ['EndB_LockModule', 'conn-endB'],
  S1A: ['Spine1_B1B2', 'conn-s1a'], S1B: ['Spine1_B1B2', 'conn-s1b'],
  S2A: ['Spine2_B3B4', 'conn-s2a'], S2B: ['Spine2_B3B4', 'conn-s2b'],
};

/** Collision radius per segment (m), from the mesh sizes: end locks ~80 mm, body ~70 mm. */
export const SEG_RADIUS = [0.039, 0.036, 0.034, 0.036, 0.036, 0.034, 0.036, 0.039];

export interface BodyW { name: string; seg: number; mass: number; com: V3; frame: Frame }
export interface JointW { index: number; pos: V3; axis: V3; kind: 'twist' | 'bend' }
export interface PortW { pos: V3; z: V3; x: V3 }
export interface SphereW { seg: number; c: V3; r: number }
export interface ModuleGeo {
  bodies: BodyW[];
  joints: JointW[];
  ports: Record<PortId, PortW>;
  spheres: SphereW[];
  mass: number;
}

interface DocConn { id: string; position: number[]; normal: number[]; roll: number[] }
interface DocBody { name: string; inertial: { mass: number; com: number[] }; meta?: { connectors?: DocConn[] } }
const DOC_BODIES = new Map((Object.values((doc as any).bodies) as DocBody[]).map((b) => [b.name, b]));

const U = UNITS_PER_M;
const toM = (v: readonly number[]): V3 => [v[0] / U, v[1] / U, v[2] / U];

/** World pose of the module's base frame (A at the origin, +Z = A's outward normal), metres. */
export type BaseW = Frame;

let restFramesCache: ReturnType<typeof moduleFrames> | null = null;
const restFrames = () => (restFramesCache ??= moduleFrames([0, 0, 0, 0, 0, 0, 0] as ModuleAngles, IDENTITY));
const FLIP: MPose = { position: [0, 0, 0], quaternion: [1, 0, 0, 0] };

/**
 * Geometry of one module at joint angles `rad` (model convention: 0 = straight,
 * order T1 B1 B2 T2 B3 B4 T3) whose base frame sits at `base` in the world.
 */
export function moduleGeo(rad: readonly number[], base: BaseW): ModuleGeo {
  const mbase: MPose = { position: [base.p[0] * U, base.p[1] * U, base.p[2] * U], quaternion: base.q };
  const frames = moduleFrames(rad as unknown as ModuleAngles, mbase);
  const rf = restFrames();
  const baseFrame = composePoses(mbase, FLIP);
  const carry = (seg: number): MPose => {
    const fq = seg === 0 ? baseFrame : frames[seg - 1].start;
    const f0 = seg === 0 ? FLIP : rf[seg - 1].start;
    return composePoses(fq, invertPose(f0));
  };
  const carriers: MPose[] = Array.from({ length: 8 }, (_, s) => carry(s));
  const at = (seg: number, restModel: readonly number[]): V3 => {
    const c = carriers[seg];
    return toM(add(c.position as V3, qrot(c.quaternion as Q, restModel as V3)));
  };

  const bodies: BodyW[] = [];
  const bodyRest = new Map<string, { seg: number; rest: V3 }>();
  let mass = 0;
  for (const rb of restBodies()) {
    const seg = rb.carrier + 1;
    bodyRest.set(rb.name, { seg, rest: rb.position });
    const db = DOC_BODIES.get(rb.name)!;
    const comModel = add(rb.position, scale(studioToModel(db.inertial.com), U));
    const c = carriers[seg];
    bodies.push({
      name: rb.name, seg, mass: db.inertial.mass, com: at(seg, comModel),
      frame: { p: at(seg, rb.position), q: c.quaternion as Q },
    });
    mass += db.inertial.mass;
  }

  const joints: JointW[] = frames.map((f, i) => ({
    index: i,
    pos: toM(f.start.position),
    axis: norm(qrot(f.start.quaternion as Q, ROD_ORDER[i] === 'twist' ? [0, 0, 1] : [1, 0, 0])),
    kind: ROD_ORDER[i],
  }));

  const ports = {} as Record<PortId, PortW>;
  for (const [pid, [bname, cid]] of Object.entries(PORT_BODY) as [PortId, [string, string]][]) {
    const conn = DOC_BODIES.get(bname)!.meta!.connectors!.find((c) => c.id === cid)!;
    const { seg, rest } = bodyRest.get(bname)!;
    const c = carriers[seg];
    const pos = at(seg, add(rest, scale(studioToModel(conn.position), U)));
    const z = norm(qrot(c.quaternion as Q, studioToModel(conn.normal)));
    let x = norm(qrot(c.quaternion as Q, studioToModel(conn.roll)));
    // make the key direction exactly perpendicular to the normal
    x = norm(cross(cross(z, x), z));
    ports[pid] = { pos, z, x };
  }

  // Collision spheres along the centreline: A, the seven joints, B.
  // The end lock bodies sit BEHIND their connector faces, so the first/last sphere is
  // set back by its radius: its surface is flush with the face instead of bulging 39 mm
  // in front of it (which put a seated end 33 mm "into" its floor receiver).
  const inset = (face: V3, toward: V3, r: number): V3 => {
    const d = [toward[0] - face[0], toward[1] - face[1], toward[2] - face[2]];
    const L = Math.hypot(d[0], d[1], d[2]) || 1;
    const k = Math.min(r, L * 0.9) / L;
    return [face[0] + d[0] * k, face[1] + d[1] * k, face[2] + d[2] * k];
  };
  const pts: V3[] = [inset(ports.A.pos, joints[0].pos, SEG_RADIUS[0]), ...joints.map((j) => j.pos), inset(ports.B.pos, joints[6].pos, SEG_RADIUS[7])];
  const spheres: SphereW[] = [];
  for (let s = 0; s < 8; s++) {
    const a = pts[s], b = pts[s + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.ceil(L / 0.02));
    for (let k = 0; k <= n; k++) {
      if (k === n && s < 7) continue; // the joint point belongs to the next segment
      const t = k / n;
      spheres.push({ seg: s, c: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], r: SEG_RADIUS[s] });
    }
  }
  return { bodies, joints, ports, spheres, mass };
}

/** Port frames of a module whose base frame is the identity (cached per angle set by callers). */
export function localPorts(rad: readonly number[]): Record<PortId, PortW> {
  return moduleGeo(rad, { p: [0, 0, 0], q: [0, 0, 0, 1] }).ports;
}
