/**
 * restPoseExclude — which body pairs a physics world must NOT collide: jointed pairs
 * plus pairs that already overlap at the rest pose ("designed to touch").
 */
import * as THREE from 'three';
import { GeometryType } from '@/core/model/index';
import type { Document } from '@/core/model/index';
import { worldAabb } from '@/robotics/collision';

// ── Rest-pose "designed to touch" collision exclusion (ACM) ────────────────
// MuJoCo auto-excludes a body from colliding with its OWN parent in the
// compiled tree (adjacent-body default), but does NOT auto-exclude
// non-adjacent pairs — e.g. a knuckle nested inside a DIFFERENT branch's
// link, or two modules that happen to sit flush against each other by
// design. Left unexcluded, bodies that overlap at their rest pose produce
// severe interpenetration on the very first contact-solver pass, which is
// exactly what blows the simulation to NaN/Inf from frame one (mjWARN_BADQPOS
// et al, hammering the console every step). 
const ACM_MARGIN = 1.04; // inflate rest-pose AABBs slightly so just-touching parts still count

function halfExtents(body: any): [number, number, number] {
  const g = body.visual?.geometry ?? {};
  const s = body.transform?.scale ?? [1, 1, 1];
  const a = Math.abs(s[0]), b = Math.abs(s[1]), c = Math.abs(s[2]);
  switch (g.type) {
    case GeometryType.SPHERE: { const r = (g.radius ?? 0.5) * Math.max(a, b, c); return [r, r, r]; }
    case GeometryType.BOX: { const sz = g.size ?? [1, 1, 1]; return [Math.abs(sz[0]) * a / 2, Math.abs(sz[1]) * b / 2, Math.abs(sz[2]) * c / 2]; }
    case GeometryType.CYLINDER:
    case GeometryType.CAPSULE: { const r = g.radius ?? 0.5, l = g.length ?? 1; return [r * a, r * b, l * c / 2]; }
    default: return [0.4 * a, 0.4 * b, 0.4 * c];
  }
}

function aabbOverlap(A: { min: number[]; max: number[] }, B: { min: number[]; max: number[] }): boolean {
  return A.min[0] <= B.max[0] && A.max[0] >= B.min[0]
    && A.min[1] <= B.max[1] && A.max[1] >= B.min[1]
    && A.min[2] <= B.max[2] && A.max[2] >= B.min[2];
}
function pairKey(a: string, b: string): string { return a < b ? `${a}|${b}` : `${b}|${a}`; }

/**
 * Every "a|b" body-id pair (pairKey-sorted) that should NOT collide: directly
 * jointed pairs, plus any pair whose rest-pose AABBs already overlap
 * ("designed to touch"). `bodies` may be a subset (only entries present get
 * AABB-checked; a joint referencing a missing id is skipped).
 */
export function restPoseExcludePairs(doc: Document, bodies: Record<string, any>, worldMat: (id: string) => THREE.Matrix4): Set<string> {
  const disabled = new Set<string>();
  for (const j of Object.values(doc.joints) as any[]) {
    if (j.parentBodyId && j.childBodyId) disabled.add(pairKey(j.parentBodyId, j.childBodyId));
  }
  const ids = Object.keys(bodies);
  const boxes = new Map<string, ReturnType<typeof worldAabb>>();
  for (const id of ids) boxes.set(id, worldAabb(halfExtents(bodies[id]).map((v) => v * ACM_MARGIN) as [number, number, number], worldMat(id)));
  for (let i = 0; i < ids.length; i++) {
    for (let k = i + 1; k < ids.length; k++) {
      if (aabbOverlap(boxes.get(ids[i])!, boxes.get(ids[k])!)) disabled.add(pairKey(ids[i], ids[k]));
    }
  }
  return disabled;
}
