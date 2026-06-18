/**
 * analysis.js — static engineering analysis over the model (Phase 8).
 *
 * Computes per-body mass (geometry volume × material density), the assembly's
 * center of mass, and the static gravity-holding torque at each joint (the torque
 * a motor must supply to hold everything downstream against gravity). Torque is
 * mapped to an estimated motor current using a simple ST3215 model, so the sim
 * connects to the real servos.
 *
 * Geometry types are compared as string literals (no '@/' imports) so this stays
 * Node-testable. Mesh volume is a rough default (no bounds in the model yet).
 */
import * as THREE from 'three';
import { computeFK, mat } from './modelFK.js';

const G = new THREE.Vector3(0, -9.81, 0); // gravity field

// ── ST3215 smart-servo model (approximate datasheet figures @ ~12V) ─────────────
export const ST3215 = {
  stallTorque: 2.94, // N·m  (~30 kgf·cm)
  stallCurrent: 2.7, // A
  Kt: 2.94 / 2.7,    // N·m per A
  idle: 0.1,         // A no-load
};

export function estimateCurrent(torqueNm) {
  return Math.min(ST3215.idle + Math.abs(torqueNm) / ST3215.Kt, ST3215.stallCurrent);
}

function originMat(o) {
  const oo = o ?? {};
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...(oo.position ?? [0, 0, 0])),
    new THREE.Quaternion(...(oo.quaternion ?? [0, 0, 0, 1])),
    new THREE.Vector3(1, 1, 1),
  );
}

/** Volume (m³) of a body's geometry including its scale. */
export function geometryVolume(g = {}, s = [1, 1, 1]) {
  const [sx, sy, sz] = s.map((v) => Math.abs(v));
  switch (g.type) {
    case 'box': { const [x, y, z] = g.size ?? [1, 1, 1]; return x * sx * y * sy * z * sz; }
    case 'sphere': { const r = (g.radius ?? 0.5) * Math.max(sx, sy, sz); return (4 / 3) * Math.PI * r ** 3; }
    case 'cylinder':
    case 'capsule': { const r = g.radius ?? 0.5; const l = g.length ?? 1; return Math.PI * (r * sx) * (r * sy) * (l * sz); }
    default: return 0.008 * sx * sy * sz; // mesh: ~0.2 m cube default
  }
}

export function bodyMass(body, doc) {
  const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
  const density = m?.density ?? 1000; // kg/m³
  return density * geometryVolume(body.visual?.geometry, body.transform?.scale);
}

/** Total mass + center of mass (world) of all bodies. */
export function centerOfMass(doc, fk = computeFK(doc)) {
  let M = 0;
  const c = new THREE.Vector3();
  for (const body of Object.values(doc.bodies)) {
    const m = bodyMass(body, doc);
    const w = fk.get(body.id);
    if (!w) continue;
    c.addScaledVector(new THREE.Vector3(...w.position), m);
    M += m;
  }
  if (M > 0) c.divideScalar(M);
  return { mass: M, com: [c.x, c.y, c.z] };
}

// Bodies downstream of (and including) a body, following parent→child joints.
function subtreeBodies(childrenOf, start) {
  const out = new Set([start]);
  const q = [start];
  while (q.length) {
    const cur = q.shift();
    for (const ch of childrenOf.get(cur) ?? []) if (!out.has(ch)) { out.add(ch); q.push(ch); }
  }
  return out;
}

/**
 * Static gravity-holding torque (N·m, signed about the joint axis) and estimated
 * current per joint. Returns Map jointId -> { torque, current, overload }.
 */
export function jointLoads(doc, fk = computeFK(doc)) {
  const masses = new Map();
  for (const body of Object.values(doc.bodies)) masses.set(body.id, bodyMass(body, doc));

  const childrenOf = new Map();
  for (const j of Object.values(doc.joints)) {
    if (!childrenOf.has(j.parentBodyId)) childrenOf.set(j.parentBodyId, []);
    childrenOf.get(j.parentBodyId).push(j.childBodyId);
  }

  const out = new Map();
  for (const j of Object.values(doc.joints)) {
    const parent = doc.bodies[j.parentBodyId];
    if (!parent) { out.set(j.id, { torque: 0, current: estimateCurrent(0), overload: false }); continue; }
    const pMat = fk.get(j.parentBodyId)?.matrix?.clone() ?? mat(parent.transform);
    const jw = pMat.multiply(originMat(j.origin));
    const pivot = new THREE.Vector3().setFromMatrixPosition(jw);
    const axis = new THREE.Vector3(...(j.axis ?? [0, 0, 1])).normalize().transformDirection(jw);

    const torqueVec = new THREE.Vector3();
    for (const bid of subtreeBodies(childrenOf, j.childBodyId)) {
      const w = fk.get(bid);
      if (!w) continue;
      const r = new THREE.Vector3(...w.position).sub(pivot);
      const force = G.clone().multiplyScalar(masses.get(bid) ?? 0);
      torqueVec.add(r.cross(force));
    }
    const torque = torqueVec.dot(axis);
    out.set(j.id, { torque, current: estimateCurrent(torque), overload: Math.abs(torque) > ST3215.stallTorque });
  }
  return out;
}
