/**
 * rigidGeomXml — shared geometry-to-MJCF <geom>/<mesh> emission for the
 * "compound rigid body" sims (RigidTumbleSim, DynamicSim, BoxWorld), which
 * each place a body's collider at an explicit LOCAL offset (rel pos/quat)
 * rather than mjcfGen.ts's body-tree walk (where the offset comes from the
 * enclosing <body> frame). Same geometry-mapping logic as mjcfGen.ts and
 * colliderFactory.ts, factored out because these callers need a `<geom
 * pos="..." quat="...">` at an arbitrary point inside a shared parent body,
 * not a nested <body>.
 */
import * as THREE from 'three';
import { GeometryType } from '@/core/model/index';
import type { Document } from '@/core/model/index';

function radiallyUniform(sx: number, sy: number): boolean {
  const a = Math.abs(sx), b = Math.abs(sy);
  return Math.abs(a - b) <= 1e-4 * Math.max(a, b, 1);
}

// ── Rest-pose "designed to touch" collision exclusion (ACM) ────────────────
// MuJoCo auto-excludes a body from colliding with its OWN parent in the
// compiled tree (adjacent-body default), but does NOT auto-exclude
// non-adjacent pairs — e.g. a knuckle nested inside a DIFFERENT branch's
// link, or two modules that happen to sit flush against each other by
// design. Left unexcluded, bodies that overlap at their rest pose produce
// severe interpenetration on the very first contact-solver pass, which is
// exactly what blows the simulation to NaN/Inf from frame one (mjWARN_BADQPOS
// et al, hammering the console every step). PhysicsSim's generator
// (mjcfGen.ts) already computed this; DynamicSim's never did — this is that
// same logic, factored out so both use it.
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

function worldAabb(body: any, M: THREE.Matrix4) {
  const [hx, hy, hz] = halfExtents(body).map((v) => v * ACM_MARGIN) as [number, number, number];
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const v = new THREE.Vector3();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    v.set(sx * hx, sy * hy, sz * hz).applyMatrix4(M);
    min[0] = Math.min(min[0], v.x); min[1] = Math.min(min[1], v.y); min[2] = Math.min(min[2], v.z);
    max[0] = Math.max(max[0], v.x); max[1] = Math.max(max[1], v.y); max[2] = Math.max(max[2], v.z);
  }
  return { min, max };
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
  for (const id of ids) boxes.set(id, worldAabb(bodies[id], worldMat(id)));
  for (let i = 0; i < ids.length; i++) {
    for (let k = i + 1; k < ids.length; k++) {
      if (aabbOverlap(boxes.get(ids[i])!, boxes.get(ids[k])!)) disabled.add(pairKey(ids[i], ids[k]));
    }
  }
  return disabled;
}

export interface RigidGeomOpts {
  friction?: string; // MJCF "sliding torsional rolling" triplet
  density?: number;
  // NOTE: no restitution/bounciness knob — MJCF's bounce equivalent is a
  // solref/solimp pair, not a single scalar, and none of the current callers
  // actually need visible bounce (Rapier's restitution values here were 0 or
  // small anyway). Add properly (solref-based) if a caller needs real bounce.
}

/** mesh_<id> <mesh> asset entry, or '' if this body isn't a mesh / has no hull points. */
export function rigidBodyMeshAssetXml(body: any, hullPoints: Float32Array | null): string {
  const g = body.visual?.geometry ?? {};
  if (g.type !== GeometryType.MESH || !hullPoints || hullPoints.length < 12) return '';
  const s = body.transform?.scale ?? [1, 1, 1];
  const sx = Math.abs(s[0]), sy = Math.abs(s[1]), sz = Math.abs(s[2]);
  const meshName = `mesh_${body.id}`;
  const verts: string[] = [];
  for (let i = 0; i < hullPoints.length; i += 3) {
    verts.push(`${hullPoints[i] * sx} ${hullPoints[i + 1] * sy} ${hullPoints[i + 2] * sz}`);
  }
  return `<mesh name="${meshName}" vertex="${verts.join(' ')}"/>`;
}

/**
 * A <geom> for `body`'s collision shape, placed at local `pos`/`quat` inside
 * whatever parent <body> the caller is building (a compound rigid, unlike
 * mjcfGen's nested-body-per-model-body tree). Returns null only if geometry
 * is missing — mirrors colliderFactory.makeColliderDesc's contract.
 */
export function rigidBodyGeomXml(body: any, hullPoints: Float32Array | null, pos: THREE.Vector3, quat: THREE.Quaternion, opts: RigidGeomOpts = {}): string | null {
  const g = body.visual?.geometry ?? {};
  const s = body.transform?.scale ?? [1, 1, 1];
  const sx = Math.abs(s[0]), sy = Math.abs(s[1]), sz = Math.abs(s[2]);
  const attrs = [
    opts.friction ? `friction="${opts.friction}"` : '',
    opts.density != null ? `density="${opts.density}"` : 'density="1000"',
  ].filter(Boolean).join(' ');
  const poseAttrs = `pos="${pos.x} ${pos.y} ${pos.z}" quat="${quat.w} ${quat.x} ${quat.y} ${quat.z}"`;

  const cuboidFallback = () => {
    switch (g.type) {
      case GeometryType.CYLINDER:
      case GeometryType.CAPSULE:
      case GeometryType.CONE: {
        const r = g.radius ?? 0.5, l = g.length ?? 1;
        return `<geom type="box" size="${r * sx} ${r * sy} ${(l * sz) / 2}" ${poseAttrs} ${attrs}/>`;
      }
      default:
        return `<geom type="box" size="${0.4 * sx} ${0.4 * sy} ${0.4 * sz}" ${poseAttrs} ${attrs}/>`;
    }
  };

  switch (g.type) {
    case GeometryType.SPHERE:
      return `<geom type="sphere" size="${(g.radius ?? 0.5) * Math.max(sx, sy, sz)}" ${poseAttrs} ${attrs}/>`;
    case GeometryType.BOX: {
      const sz0 = g.size ?? [1, 1, 1];
      return `<geom type="box" size="${Math.abs(sz0[0] * s[0]) / 2} ${Math.abs(sz0[1] * s[1]) / 2} ${Math.abs(sz0[2] * s[2]) / 2}" ${poseAttrs} ${attrs}/>`;
    }
    case GeometryType.CYLINDER: {
      if (!radiallyUniform(sx, sy)) return cuboidFallback();
      const r = (g.radius ?? 0.5) * sx, halfH = ((g.length ?? 1) * sz) / 2;
      return `<geom type="cylinder" size="${r} ${halfH}" ${poseAttrs} ${attrs}/>`;
    }
    case GeometryType.CAPSULE: {
      if (!radiallyUniform(sx, sy)) return cuboidFallback();
      const r = (g.radius ?? 0.5) * sx, halfH = ((g.length ?? 1) * sz) / 2;
      return `<geom type="capsule" size="${r} ${halfH}" ${poseAttrs} ${attrs}/>`;
    }
    case GeometryType.CONE: {
      if (!radiallyUniform(sx, sy)) return cuboidFallback();
      const r = (g.radius ?? 0.5) * sx, halfH = ((g.length ?? 1) * sz) / 2;
      return `<geom type="cylinder" size="${r} ${halfH}" ${poseAttrs} ${attrs}/>`; // no native MJCF cone
    }
    case GeometryType.MESH: {
      if (hullPoints && hullPoints.length >= 12) {
        return `<geom type="mesh" mesh="mesh_${body.id}" ${poseAttrs} ${attrs}/>`;
      }
      return cuboidFallback();
    }
    default:
      return cuboidFallback();
  }
}
