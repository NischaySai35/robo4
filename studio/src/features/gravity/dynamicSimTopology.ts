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
    const centre = new THREE.Vector3();
    // Robust centre estimate: mean of all vertices, not the bounding-box midpoint — the bbox
    // center shifts toward whichever single extreme vertex happens to stick out furthest,
    // which made otherwise-identical wheel instances (same asset, different mesh sampling/
    // instancing) estimate slightly DIFFERENT centres. That's exactly the kind of few-mm
    // inconsistency that leaves some wheels resting a hair lower than others — the chassis
    // settles tilted, with only the "taller" wheels touching and the rest floating just above
    // the ground, even though nothing about gravity/contact itself is behaving incorrectly.
    let vertCount = 0;
    if (verts) {
      for (let i = 0; i < verts.length; i += 3) {
        tmp.set(verts[i] * scale[0], verts[i + 1] * scale[1], verts[i + 2] * scale[2]).applyMatrix4(M).sub(bodyOrigin);
        centre.add(tmp);
        vertCount++;
      }
      if (vertCount > 0) centre.multiplyScalar(1 / vertCount);
    }
    let radius = 0, aMin = Infinity, aMax = -Infinity;
    const radii: number[] = [];
    if (verts && vertCount > 0) for (let i = 0; i < verts.length; i += 3) {
      tmp.set(verts[i] * scale[0], verts[i + 1] * scale[1], verts[i + 2] * scale[2]).applyMatrix4(M).sub(bodyOrigin).sub(centre);
      const ax = tmp.dot(axisW); const rad = Math.sqrt(Math.max(0, tmp.lengthSq() - ax * ax));
      radii.push(rad);
      if (ax < aMin) aMin = ax; if (ax > aMax) aMax = ax;
    }
    if (radii.length > 0) {
      // 95th-percentile radius, not the raw max — a single stray/outlier vertex (a seam, a
      // rounding artifact) could inflate the raw max differently between two otherwise-
      // identical wheel meshes; the 95th percentile is far more stable/repeatable while still
      // comfortably containing nearly the entire wheel (only the mm-padding below needs to
      // cover the remaining few outliers, not the whole gap a raw max vs. typical-radius
      // mismatch would leave).
      radii.sort((a, b) => a - b);
      // 99th, not 95th. The percentile exists to reject a stray outlier vertex (a seam, a
      // rounding artifact), but 95 throws away a real 5% of the rim on a part whose radii
      // genuinely vary — an end-lock connector is not a round wheel — so it UNDERSIZED the
      // collision cylinder, which is what the generous padding below was compensating for.
      // 99 is still outlier-robust while landing much closer to the true extent, so the
      // padding can shrink to something visually negligible.
      radius = radii[Math.min(radii.length - 1, Math.floor(radii.length * 0.99))];
    }
    if (!(radius > 0)) {
      const g: any = doc.bodies[bid]?.visual?.geometry ?? {};
      // No mesh vertices to measure. Only a genuinely ROUND primitive can have its wheel
      // geometry inferred from its declared geometry; anything else (a box, a torus, a body
      // still awaiting its asset) has no radius to speak of, and the old `g.radius ?? 0.04`
      // fabricated a flat 4cm one regardless of how big the body actually was — a 20cm box
      // got a 4cm wheel cylinder bearing no relation to its own size. Skip those: they keep
      // their real collision shape and ordinary ground contact, which is the honest answer
      // for a body that isn't shaped like a wheel.
      if (!(g.radius > 0)) continue;
      const s = Math.max(...scale.map(Math.abs)) || 1;
      radius = g.radius * s;
      aMin = -(g.length ?? 0.06) * s / 2; aMax = -aMin;
      centre.set(0, 0, 0);
    }
    const axialMid = (aMin + aMax) / 2;
    const offset = centre.clone().add(axisW.clone().multiplyScalar(axialMid));
    // Padding covers the remaining gap between this estimate and the true visual mesh (the
    // hull is stride-sampled, so it can still undersize slightly), biased oversize because a
    // wheel floating a hair reads better than one clipping through the floor.
    //
    // It was a FLAT +0.01/+0.005, which is 25% oversize on a 40mm wheel — the wheel's collision
    // surface sat a full centimetre below its visual surface, so the model visibly hovered.
    // That went unnoticed while Jolt's 2cm speculative-contact default (see joltLoader) was
    // separately stopping bodies 2cm short of the floor: one error was hiding inside the other.
    // With contact now correct to ~1mm, this has to be scaled to the part like every other
    // length in this engine, not left as a flat metre-scale constant.
    const r0 = Math.max(0.01, radius);
    const h0 = Math.max(0.01, (aMax - aMin) / 2);
    const pad = Math.min(0.003, Math.max(0.0005, r0 * 0.02)); // 2% of radius, 0.5-3mm
    wheelCyl.set(bid, { axisW, radius: r0 + pad, halfLen: h0 + pad * 0.5, offset });
  }
  return wheelCyl;
}
