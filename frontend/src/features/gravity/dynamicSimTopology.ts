/**
 * dynamicSimTopology — the engine-agnostic parts of DynamicSim's semantics:
 * jointMode() classification and wheel-cylinder geometry estimation. Pure
 * math, no physics-engine calls — used by the Jolt-backed dynamicSim.ts.
 *
 * jointMode(doc, joint) resolves each joint to:
 *   'rigid' -> fused solid (a Jolt FixedConstraint — effectively rigid, no
 *              relative motion). Matches the old MJCF "no <joint> = welded"
 *              behavior, and before that Rapier's union-find compound body.
 *   'free'  -> a real constraint, damped, NO motor — swings passively.
 *   'motor' -> a real constraint with a velocity motor (spin-driven, brakes
 *              to 0 rad/s when idle).
 */
import * as THREE from 'three';
import type { Document } from '@/core/model/index';
import { isMotorJoint, isEndBody } from '@/features/motor/endBody';

export type JointMode = 'rigid' | 'free' | 'motor';

export function jointMode(doc: any, j: any): JointMode {
  if (j.type === 'fixed') return 'rigid';
  if (isMotorJoint(doc, j)) return 'motor';
  if (j.meta?.free) return 'free';
  return 'rigid';
}

const matOf = (t: any) => new THREE.Matrix4().compose(
  new THREE.Vector3(...(t?.position ?? [0, 0, 0])),
  new THREE.Quaternion(...(t?.quaternion ?? [0, 0, 0, 1])),
  new THREE.Vector3(1, 1, 1),
);
const originMat = (o: any) => matOf(o ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] });

export interface WheelGeom { axisW: THREE.Vector3; radius: number; halfLen: number; offset: THREE.Vector3 }

/** Mesh-vertex-based wheel radius/axle estimation, ported verbatim from the original Rapier version. */
export function computeWheelGeometry(doc: Document, worldMat: (id: string) => THREE.Matrix4, meshVerts?: ((id: string) => Float32Array | null) | null): Map<string, WheelGeom> {
  const wheelCyl = new Map<string, WheelGeom>();
  for (const j of Object.values(doc.joints) as any[]) {
    if (j.state?.disabled || jointMode(doc, j) !== 'motor') continue;
    const bid = isEndBody(doc.bodies[j.parentBodyId]) ? j.parentBodyId : j.childBodyId;
    const pivotW = worldMat(j.parentBodyId).multiply(originMat(j.origin));
    const axisW = new THREE.Vector3(...(j.axis ?? [0, 0, 1])).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(pivotW)).normalize();
    const M = worldMat(bid); const bodyOrigin = new THREE.Vector3().setFromMatrixPosition(M);
    const scale = doc.bodies[bid]?.transform?.scale ?? [1, 1, 1];
    const verts = meshVerts?.(bid) ?? null;
    const tmp = new THREE.Vector3();
    const mn = new THREE.Vector3(Infinity, Infinity, Infinity), mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    if (verts) for (let i = 0; i < verts.length; i += 3) {
      tmp.set(verts[i] * scale[0], verts[i + 1] * scale[1], verts[i + 2] * scale[2]).applyMatrix4(M).sub(bodyOrigin);
      mn.min(tmp); mx.max(tmp);
    }
    const centre = mn.clone().add(mx).multiplyScalar(0.5);
    let radius = 0, aMin = Infinity, aMax = -Infinity;
    if (verts && isFinite(centre.x)) for (let i = 0; i < verts.length; i += 3) {
      tmp.set(verts[i] * scale[0], verts[i + 1] * scale[1], verts[i + 2] * scale[2]).applyMatrix4(M).sub(bodyOrigin).sub(centre);
      const ax = tmp.dot(axisW); const rad = Math.sqrt(Math.max(0, tmp.lengthSq() - ax * ax));
      if (rad > radius) radius = rad; if (ax < aMin) aMin = ax; if (ax > aMax) aMax = ax;
    }
    if (!(radius > 0)) { const g: any = doc.bodies[bid]?.visual?.geometry ?? {}; const s = Math.max(...scale.map(Math.abs)) || 1; radius = (g.radius ?? 0.04) * s; aMin = -(g.length ?? 0.06) * s / 2; aMax = -aMin; centre.set(0, 0, 0); }
    const axialMid = (aMin + aMax) / 2;
    const offset = centre.clone().add(axisW.clone().multiplyScalar(axialMid));
    // Padding bumped from the original +0.003/+0.001 (barely a sliver): this radius is
    // estimated from a possibly-simplified/stride-sampled hull of the wheel mesh's vertices
    // (see convexHullPoints), which can undersize the true visual mesh — enough to let the
    // rendered wheel visibly poke into the floor even while physics correctly rests the
    // (slightly-too-small) collision cylinder on the ground with a valid positive height.
    // A few mm of the collision shape being a bit larger than the true mesh (slight
    // "floating") is far less visually jarring than the mesh visibly clipping through the
    // floor, so pad generously rather than tightly.
    wheelCyl.set(bid, { axisW, radius: Math.max(0.01, radius) + 0.01, halfLen: Math.max(0.01, (aMax - aMin) / 2) + 0.005, offset });
  }
  return wheelCyl;
}
