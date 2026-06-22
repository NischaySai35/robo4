/**
 * collision — native self/world collision checking for motion planning.
 *
 * Builds an allowed-collision matrix from the model (pairs that are jointed or
 * overlap at the rest pose are ignored — they're designed to touch) once, then
 * tests any joint configuration by recomputing FK and checking world-AABB overlap
 * of every remaining body pair. No external engine, no ROS — pure model + FK.
 */
import * as THREE from 'three';
import { computeFK } from '@/kinematics/modelFK';
import type { Document } from '@/core/model/index';

const MARGIN = 1.02;

function halfExtents(body: any): [number, number, number] {
  const g = body.visual?.geometry ?? {};
  const s = body.transform?.scale ?? [1, 1, 1];
  const a = Math.abs(s[0]), b = Math.abs(s[1]), c = Math.abs(s[2]);
  switch (g.type) {
    case 'sphere': { const r = (g.radius ?? 0.5) * Math.max(a, b, c); return [r, r, r]; }
    case 'box': { const sz = g.size ?? [1, 1, 1]; return [Math.abs(sz[0]) * a / 2, Math.abs(sz[1]) * b / 2, Math.abs(sz[2]) * c / 2]; }
    case 'cylinder': case 'capsule': { const r = g.radius ?? 0.5, l = g.length ?? 1; return [r * a, r * b, l * c / 2]; }
    default: return [0.4 * a, 0.4 * b, 0.4 * c];
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
const overlap = (A: any, B: any) =>
  A.min[0] <= B.max[0] && A.max[0] >= B.min[0] &&
  A.min[1] <= B.max[1] && A.max[1] >= B.min[1] &&
  A.min[2] <= B.max[2] && A.max[2] >= B.min[2];

export class CollisionModel {
  private doc: Document;
  private ids: string[];
  private half = new Map<string, [number, number, number]>();
  private disabled = new Set<string>();
  private groundY: number;

  constructor(doc: Document, groundY = 0, options: { allowedPairs?: [string, string][] } = {}) {
    this.doc = doc;
    this.groundY = groundY;
    this.ids = Object.keys(doc.bodies);
    for (const id of this.ids) this.half.set(id, halfExtents(doc.bodies[id]).map((v) => v * MARGIN) as [number, number, number]);
    // Jointed pairs never collide.
    for (const j of Object.values(doc.joints)) {
      if (j.parentBodyId && j.childBodyId) this.disabled.add(this.key(j.parentBodyId, j.childBodyId));
    }
    // SRDF-style allowed-collision matrix: caller-supplied pairs that should never
    // be treated as colliding (e.g. adjacent links that always touch).
    for (const [a, b] of options.allowedPairs ?? []) this.disabled.add(this.key(a, b));
    // Rest-pose overlaps are "designed to touch".
    const fk = computeFK(doc);
    const boxes = new Map(this.ids.map((id) => [id, worldAabb(this.half.get(id)!, fk.get(id)?.matrix ?? new THREE.Matrix4())]));
    for (let i = 0; i < this.ids.length; i++) for (let k = i + 1; k < this.ids.length; k++) {
      if (overlap(boxes.get(this.ids[i]), boxes.get(this.ids[k]))) this.disabled.add(this.key(this.ids[i], this.ids[k]));
    }
  }

  private key(a: string, b: string) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

  /** True if the configuration (jointId→value overrides) is collision-free. */
  collisionFree(values: Record<string, number>): boolean {
    const joints: any = { ...this.doc.joints };
    for (const [id, v] of Object.entries(values)) { const j = joints[id]; if (j) joints[id] = { ...j, state: { ...j.state, value: v } }; }
    const fk = computeFK({ ...this.doc, joints });
    const boxes = new Map<string, any>();
    for (const id of this.ids) {
      const M = fk.get(id)?.matrix;
      if (!M) continue;
      const bb = worldAabb(this.half.get(id)!, M);
      if (bb.min[1] < this.groundY - 0.02) return false; // through the floor
      boxes.set(id, bb);
    }
    for (let i = 0; i < this.ids.length; i++) for (let k = i + 1; k < this.ids.length; k++) {
      const a = this.ids[i], b = this.ids[k];
      if (this.disabled.has(this.key(a, b))) continue;
      const A = boxes.get(a), B = boxes.get(b);
      if (A && B && overlap(A, B)) return false;
    }
    return true;
  }
}
