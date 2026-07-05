/**
 * collision — native self/world collision checking for motion planning.
 *
 * Builds an Allowed-Collision Matrix (ACM) from the model — the same idea MoveIt's
 * SRDF `disable_collisions` encodes — then tests any joint configuration by
 * recomputing FK and checking body-pair overlap. No external engine, no ROS.
 *
 * ACM (pairs that are NEVER treated as colliding):
 *   • jointed pairs               — links that share a joint are designed to touch
 *   • 2-hop neighbours (optional) — links one joint apart (a–c–b) often overlap at
 *                                   bulky housings; disabled by default like MoveIt's
 *                                   "adjacent" sampling
 *   • rest-pose overlaps          — anything intersecting at the home pose
 *   • caller-supplied allowedPairs
 *
 * Shape tests (tightest available for the pair):
 *   • capsule ↔ capsule — segment-to-segment distance vs summed radii (exact for
 *                         arm-like links; no axis-aligned "growth" when they rotate)
 *   • everything else   — world-AABB penetration
 *
 * A penetration TOLERANCE means a pair only counts as colliding once it overlaps by
 * more than `tolerance` metres — so the tiny (sub-mm) interpenetration every real
 * jointed assembly has, plus AABB jitter, never registers as a crash.
 */
import * as THREE from 'three';
import { computeFK } from '@/kinematics/modelFK';
import type { Document } from '@/core/model/index';

const MARGIN = 1.0;             // no inflation — tolerance handles slop instead
const DEFAULT_TOLERANCE = 0.005; // 5 mm: below this, "touching" is not a collision

type ShapeKind = 'capsule' | 'box';
interface Shape {
  kind: ShapeKind;
  half: [number, number, number]; // world-AABB half extents (broadphase + non-capsule)
  radius: number;                 // capsule radius (world)
  halfLen: number;                // capsule half-length along local Z (world)
}

function shapeOf(body: any): Shape {
  const g = body.visual?.geometry ?? {};
  const s = body.transform?.scale ?? [1, 1, 1];
  const a = Math.abs(s[0] ?? 1), b = Math.abs(s[1] ?? 1), c = Math.abs(s[2] ?? 1);
  switch (g.type) {
    case 'sphere': {
      const r = (g.radius ?? 0.5) * Math.max(a, b, c);
      return { kind: 'capsule', half: [r, r, r], radius: r, halfLen: 0 };
    }
    case 'cylinder': case 'capsule': case 'cone': {
      // Our cylinder/capsule/cone run along local Z (matches URDF).
      const r = (g.radius ?? 0.5) * Math.max(a, b), l = (g.length ?? 1) * c;
      return { kind: 'capsule', half: [r, r, l / 2], radius: r, halfLen: Math.max(0, l / 2 - r) };
    }
    case 'box': {
      const sz = g.size ?? [1, 1, 1];
      return { kind: 'box', half: [Math.abs(sz[0]) * a / 2, Math.abs(sz[1]) * b / 2, Math.abs(sz[2]) * c / 2], radius: 0, halfLen: 0 };
    }
    default:
      return { kind: 'box', half: [0.4 * a, 0.4 * b, 0.4 * c], radius: 0, halfLen: 0 };
  }
}

function worldAabb(half: [number, number, number], M: THREE.Matrix4) {
  const [hx, hy, hz] = half;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const v = new THREE.Vector3();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    v.set(sx * hx, sy * hy, sz * hz).applyMatrix4(M);
    min[0] = Math.min(min[0], v.x); min[1] = Math.min(min[1], v.y); min[2] = Math.min(min[2], v.z);
    max[0] = Math.max(max[0], v.x); max[1] = Math.max(max[1], v.y); max[2] = Math.max(max[2], v.z);
  }
  return { min, max };
}

/** AABB penetration depth (min overlap across axes); <=0 means separated. */
function aabbPenetration(A: any, B: any): number {
  const dx = Math.min(A.max[0], B.max[0]) - Math.max(A.min[0], B.min[0]);
  const dy = Math.min(A.max[1], B.max[1]) - Math.max(A.min[1], B.min[1]);
  const dz = Math.min(A.max[2], B.max[2]) - Math.max(A.min[2], B.min[2]);
  if (dx <= 0 || dy <= 0 || dz <= 0) return -1;
  return Math.min(dx, dy, dz);
}

/** Closest distance between two 3D segments [p1,q1] and [p2,q2] (Ericson, RTCD §5.1.9). */
function segSegDistance(p1: THREE.Vector3, q1: THREE.Vector3, p2: THREE.Vector3, q2: THREE.Vector3): number {
  const d1 = q1.clone().sub(p1);  // segment 1 direction
  const d2 = q2.clone().sub(p2);  // segment 2 direction
  const r = p1.clone().sub(p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  const EPS = 1e-12;
  let s: number, t: number;
  if (a <= EPS && e <= EPS) { s = 0; t = 0; }         // both points
  else if (a <= EPS) { s = 0; t = Math.min(1, Math.max(0, f / e)); } // seg1 a point
  else {
    const cc = d1.dot(r);
    if (e <= EPS) { t = 0; s = Math.min(1, Math.max(0, -cc / a)); }  // seg2 a point
    else {
      const bb = d1.dot(d2), denom = a * e - bb * bb;
      s = denom > EPS ? Math.min(1, Math.max(0, (bb * f - cc * e) / denom)) : 0;
      t = (bb * s + f) / e;
      if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -cc / a)); }
      else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (bb - cc) / a)); }
    }
  }
  const c1 = p1.clone().add(d1.multiplyScalar(s));
  const c2 = p2.clone().add(d2.multiplyScalar(t));
  return c1.distanceTo(c2);
}

export class CollisionModel {
  private doc: Document;
  private ids: string[];
  private shapes = new Map<string, Shape>();
  private disabled = new Set<string>();
  private groundY: number;
  private tol: number;
  private floor: boolean;

  constructor(
    doc: Document,
    groundY = 0,
    options: { allowedPairs?: [string, string][]; tolerance?: number; neighborHops?: 1 | 2; floor?: boolean } = {},
  ) {
    this.doc = doc;
    this.groundY = groundY;
    this.tol = options.tolerance ?? DEFAULT_TOLERANCE;
    // Enforce a world floor? Locomotion/navigation want it; a kinematic arm resting ON
    // the ground (base below y=0) would otherwise report collision in EVERY pose.
    this.floor = options.floor ?? true;
    this.ids = Object.keys(doc.bodies);
    for (const id of this.ids) {
      const sh = shapeOf(doc.bodies[id]);
      sh.half = sh.half.map((v) => v * MARGIN) as [number, number, number];
      this.shapes.set(id, sh);
    }

    // ── Allowed-Collision Matrix ────────────────────────────────────────────────
    // 1-hop: jointed pairs never collide (they share a pivot and touch by design).
    const neighbors = new Map<string, Set<string>>();
    const addNbr = (a: string, b: string) => {
      if (!neighbors.has(a)) neighbors.set(a, new Set());
      neighbors.get(a)!.add(b);
    };
    for (const j of Object.values(doc.joints)) {
      if (j.parentBodyId && j.childBodyId) {
        this.disabled.add(this.key(j.parentBodyId, j.childBodyId));
        addNbr(j.parentBodyId, j.childBodyId);
        addNbr(j.childBodyId, j.parentBodyId);
      }
    }
    // 2-hop: links one joint apart (a–c–b) share a common neighbour c. Bulky housings
    // routinely overlap there, so disable by default (MoveIt disables these via sampling).
    if ((options.neighborHops ?? 2) >= 2) {
      for (const set of neighbors.values()) {
        const arr = [...set];
        for (let i = 0; i < arr.length; i++)
          for (let k = i + 1; k < arr.length; k++)
            this.disabled.add(this.key(arr[i], arr[k]));
      }
    }
    // Caller-supplied SRDF-style allowed pairs.
    for (const [a, b] of options.allowedPairs ?? []) this.disabled.add(this.key(a, b));
    // Rest-pose overlaps are "designed to touch".
    const fk = computeFK(doc);
    const boxes = new Map(this.ids.map((id) => [id, worldAabb(this.shapes.get(id)!.half, fk.get(id)?.matrix ?? new THREE.Matrix4())]));
    for (let i = 0; i < this.ids.length; i++) for (let k = i + 1; k < this.ids.length; k++) {
      if (aabbPenetration(boxes.get(this.ids[i]), boxes.get(this.ids[k])) > 0) this.disabled.add(this.key(this.ids[i], this.ids[k]));
    }
  }

  private key(a: string, b: string) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

  /** World capsule endpoints (along local Z), given the body's world matrix. */
  private capsuleSeg(sh: Shape, M: THREE.Matrix4): [THREE.Vector3, THREE.Vector3] {
    const p = new THREE.Vector3(0, 0, -sh.halfLen).applyMatrix4(M);
    const q = new THREE.Vector3(0, 0, sh.halfLen).applyMatrix4(M);
    return [p, q];
  }

  /** True if the configuration (jointId→value overrides) is collision-free. */
  collisionFree(values: Record<string, number>): boolean {
    const joints: any = { ...this.doc.joints };
    for (const [id, v] of Object.entries(values)) { const j = joints[id]; if (j) joints[id] = { ...j, state: { ...j.state, value: v } }; }
    const fk = computeFK({ ...this.doc, joints });
    const boxes = new Map<string, any>();
    const mats = new Map<string, THREE.Matrix4>();
    for (const id of this.ids) {
      const M = fk.get(id)?.matrix;
      if (!M) continue;
      const bb = worldAabb(this.shapes.get(id)!.half, M);
      if (this.floor && bb.min[1] < this.groundY - 0.02) return false; // through the floor
      boxes.set(id, bb); mats.set(id, M);
    }
    for (let i = 0; i < this.ids.length; i++) for (let k = i + 1; k < this.ids.length; k++) {
      const a = this.ids[i], b = this.ids[k];
      if (this.disabled.has(this.key(a, b))) continue;
      const A = boxes.get(a), B = boxes.get(b);
      if (!A || !B) continue;
      // Broadphase: if the (already loose) AABBs don't even overlap, no contact.
      if (aabbPenetration(A, B) <= 0) continue;
      const sa = this.shapes.get(a)!, sb = this.shapes.get(b)!;
      if (sa.kind === 'capsule' && sb.kind === 'capsule') {
        // Exact capsule test: segment distance vs summed radii, minus tolerance.
        const [pa, qa] = this.capsuleSeg(sa, mats.get(a)!);
        const [pb, qb] = this.capsuleSeg(sb, mats.get(b)!);
        const gap = segSegDistance(pa, qa, pb, qb) - (sa.radius + sb.radius);
        if (gap < -this.tol) return false;
      } else {
        // Coarser AABB penetration for box/mixed pairs, with the same tolerance.
        if (aabbPenetration(A, B) > this.tol) return false;
      }
    }
    return true;
  }
}
