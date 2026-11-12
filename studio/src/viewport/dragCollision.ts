/**
 * dragCollision — does a dragged pose put a part into the floor or into another part? (Nischay 12 Nov: "does it have collision
 * control in my dragging?" - before, only the grabbed TIP was kept above the floor; every other part went through the floor,
 * itself and other modules.)
 *
 * Shapes = each part's own collision points (ModelEditor._meshHullPointsPhysics, the SAME hull the gravity sim uses):
 *   floor: every hull point of every part vs the floor height;
 *   parts: an oriented box per part (its hull's local bounds), separating-axis test, for parts not joined to each other.
 * Pairs already touching when the drag starts are ignored (the box is looser than the mesh: neighbours one joint apart can
 * overlap at rest), so only NEW contacts stop a drag. Ideal kinematics only - nothing here is physics.
 * REUSE-CHECKED: obb|separating axis|collid|penetrat -> PhysicsSim/DynamicSim (whole physics worlds, not a per-pose check),
 * ModelEditor._penetrationReport (floor-only debug log): neither answers "is this pose free" fast enough for every pointermove.
 */
import * as THREE from 'three';
import type { Document } from '@/core/model/index';  // the pose to test: core/model withJointValues

export interface PartBox { id: string; center: THREE.Vector3; half: THREE.Vector3; pts: Float32Array }
export type Hit = { kind: 'floor'; a: string } | { kind: 'part'; a: string; b: string } | null;
type FK = Map<string, { position: number[]; quaternion: number[] }>;

const FLOOR_TOL = 0.002;     // 2 mm below the floor still counts as resting on it
const PART_TOL = 0.001;      // boxes must overlap by more than 1 mm

/** each part's local box from its hull points (scaled like the body) */
export function partBoxes(doc: Document, hullOf: (id: string) => Float32Array | null): Map<string, PartBox> {
  const out = new Map<string, PartBox>();
  for (const [id, b] of Object.entries(doc.bodies) as [string, any][]) {
    const h = hullOf(id); if (!h || h.length < 12) continue;
    const s = b.transform?.scale ?? [1, 1, 1];
    const pts = new Float32Array(h.length);
    const mn = new THREE.Vector3(Infinity, Infinity, Infinity), mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (let i = 0; i < h.length; i += 3) {
      const x = h[i] * s[0], y = h[i + 1] * s[1], z = h[i + 2] * s[2];
      pts[i] = x; pts[i + 1] = y; pts[i + 2] = z;
      mn.min(new THREE.Vector3(x, y, z)); mx.max(new THREE.Vector3(x, y, z));
    }
    out.set(id, { id, center: mn.clone().add(mx).multiplyScalar(0.5), half: mx.clone().sub(mn).multiplyScalar(0.5), pts });
  }
  return out;
}

/** parts one OR two joints apart never count as colliding: they meet at the joint by design, and the module's own joint
 *  limits keep a neighbour's neighbour clear; the loose boxes made those false hits (12 Nov: "T2_Housing would hit Spine2"
 *  on a normal bend). The usual robot-arm rule (adjacent links excluded). */
export function jointedPairs(doc: Document): Set<string> {
  const s = new Set<string>(), nb = new Map<string, Set<string>>();
  const link = (a: string, b: string) => { (nb.get(a) ?? nb.set(a, new Set()).get(a)!).add(b); };
  for (const j of Object.values(doc.joints) as any[]) {
    if (!j.parentBodyId || !j.childBodyId || j.state?.disabled) continue;
    link(j.parentBodyId, j.childBodyId); link(j.childBodyId, j.parentBodyId);
  }
  for (const [a, ns] of nb) for (const b of ns) { s.add(pairKey(a, b)); for (const c of nb.get(b) ?? []) if (c !== a) s.add(pairKey(a, c)); }
  return s;
}
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

interface World { c: THREE.Vector3; ax: THREE.Vector3[]; h: number[] }
function worldBox(box: PartBox, f: { position: number[]; quaternion: number[] }): World {
  const q = new THREE.Quaternion(f.quaternion[0], f.quaternion[1], f.quaternion[2], f.quaternion[3]);
  const c = box.center.clone().applyQuaternion(q).add(new THREE.Vector3(f.position[0], f.position[1], f.position[2]));
  return { c, ax: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)].map((v) => v.applyQuaternion(q)), h: [box.half.x, box.half.y, box.half.z] };
}

/** separating-axis test of two oriented boxes: true = they overlap by more than PART_TOL */
export function boxesOverlap(A: World, B: World): boolean {
  const T = B.c.clone().sub(A.c);
  const axes: THREE.Vector3[] = [...A.ax, ...B.ax];
  for (const a of A.ax) for (const b of B.ax) { const c = new THREE.Vector3().crossVectors(a, b); if (c.lengthSq() > 1e-10) axes.push(c.normalize()); }
  for (const L of axes) {
    const rA = A.h[0] * Math.abs(A.ax[0].dot(L)) + A.h[1] * Math.abs(A.ax[1].dot(L)) + A.h[2] * Math.abs(A.ax[2].dot(L));
    const rB = B.h[0] * Math.abs(B.ax[0].dot(L)) + B.h[1] * Math.abs(B.ax[1].dot(L)) + B.h[2] * Math.abs(B.ax[2].dot(L));
    if (Math.abs(T.dot(L)) > rA + rB - PART_TOL) return false;
  }
  return true;
}

function lowestY(box: PartBox, f: { position: number[]; quaternion: number[] }): number {
  const q = new THREE.Quaternion(f.quaternion[0], f.quaternion[1], f.quaternion[2], f.quaternion[3]);
  const v = new THREE.Vector3(); let lo = Infinity;
  for (let i = 0; i < box.pts.length; i += 3) { v.set(box.pts[i], box.pts[i + 1], box.pts[i + 2]).applyQuaternion(q); lo = Math.min(lo, v.y + f.position[1]); }
  return lo;
}

/** what already touches in this pose (ignored for the rest of the drag): part pairs, and parts already under the floor */
export function touching(fk: FK, boxes: Map<string, PartBox>, joined: Set<string>, floorY: number | undefined): Set<string> {
  const s = new Set<string>(); const ws = new Map<string, World>();
  for (const [id, b] of boxes) { const f = fk.get(id); if (f) ws.set(id, worldBox(b, f)); }
  const ids = [...ws.keys()];
  for (let i = 0; i < ids.length; i++) for (let k = i + 1; k < ids.length; k++) {
    const key = pairKey(ids[i], ids[k]);
    if (!joined.has(key) && boxesOverlap(ws.get(ids[i])!, ws.get(ids[k])!)) s.add(key);
  }
  if (floorY !== undefined) for (const [id, b] of boxes) { const f = fk.get(id); if (f && lowestY(b, f) < floorY - FLOOR_TOL) s.add(`floor|${id}`); }
  return s;
}

/** the first NEW contact in this pose, or null if the pose is free */
export function firstHit(fk: FK, boxes: Map<string, PartBox>, joined: Set<string>, ignore: Set<string>, floorY: number | undefined): Hit {
  if (floorY !== undefined) for (const [id, b] of boxes) {
    const f = fk.get(id); if (!f || ignore.has(`floor|${id}`)) continue;
    if (lowestY(b, f) < floorY - FLOOR_TOL) return { kind: 'floor', a: id };
  }
  const ws = new Map<string, World>();
  for (const [id, b] of boxes) { const f = fk.get(id); if (f) ws.set(id, worldBox(b, f)); }
  const ids = [...ws.keys()];
  for (let i = 0; i < ids.length; i++) for (let k = i + 1; k < ids.length; k++) {
    const key = pairKey(ids[i], ids[k]);
    if (joined.has(key) || ignore.has(key)) continue;
    if (boxesOverlap(ws.get(ids[i])!, ws.get(ids[k])!)) return { kind: 'part', a: ids[i], b: ids[k] };
  }
  return null;
}
