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
import { computeFK, mat, buildChildJointMap } from './modelFK';
import type { Document, Body, Geometry } from '@/core/model/index';

const G = new THREE.Vector3(0, -9.81, 0); // gravity field

// ── ST3215 smart-servo model (approximate datasheet figures @ ~12V) ─────────────
export const ST3215 = {
  stallTorque: 2.94, // N·m  (~30 kgf·cm)
  stallCurrent: 2.7, // A
  Kt: 2.94 / 2.7,    // N·m per A
  idle: 0.1,         // A no-load
};

export function estimateCurrent(torqueNm: number) {
  return Math.min(ST3215.idle + Math.abs(torqueNm) / ST3215.Kt, ST3215.stallCurrent);
}

function originMat(o: any) {
  const oo = o ?? {};
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...(oo.position ?? [0, 0, 0])),
    new THREE.Quaternion(...(oo.quaternion ?? [0, 0, 0, 1])),
    new THREE.Vector3(1, 1, 1),
  );
}

/** Volume (m³) of a body's geometry including its scale. */
export function geometryVolume(g: Partial<Geometry> = {}, s = [1, 1, 1]) {
  const [sx, sy, sz] = s.map((v) => Math.abs(v));
  switch (g.type) {
    case 'box': { const [x, y, z] = (g.size as [number, number, number]) ?? [1, 1, 1]; return x * sx * y * sy * z * sz; }
    case 'sphere': { const r = (g.radius ?? 0.5) * Math.max(sx, sy, sz); return (4 / 3) * Math.PI * r ** 3; }
    case 'cylinder':
    case 'capsule': { const r = g.radius ?? 0.5; const l = g.length ?? 1; return Math.PI * (r * sx) * (r * sy) * (l * sz); }
    default: return 0.008 * sx * sy * sz; // mesh: ~0.2 m cube default
  }
}

/** Rough inertia tensor (kg·m²) about the body's center, from geometry + mass. */
export function inertiaTensor(g: Partial<Geometry> = {}, s = [1, 1, 1], mass = 1) {
  const [sx, sy, sz] = s.map((v) => Math.abs(v));
  let ixx, iyy, izz;
  switch (g.type) {
    case 'box': {
      const x = (g.size?.[0] ?? 1) * sx, y = (g.size?.[1] ?? 1) * sy, z = (g.size?.[2] ?? 1) * sz;
      ixx = mass * (y * y + z * z) / 12; iyy = mass * (x * x + z * z) / 12; izz = mass * (x * x + y * y) / 12;
      break;
    }
    case 'sphere': {
      const r = (g.radius ?? 0.5) * Math.max(sx, sy, sz);
      ixx = iyy = izz = (2 / 5) * mass * r * r;
      break;
    }
    case 'cylinder': case 'capsule': {
      const r = (g.radius ?? 0.5) * Math.max(sx, sy), l = (g.length ?? 1) * sz; // axis along z
      ixx = iyy = mass * (3 * r * r + l * l) / 12; izz = 0.5 * mass * r * r;
      break;
    }
    default: { const a = Math.cbrt(geometryVolume(g, s) || 1e-6); ixx = iyy = izz = mass * (2 * a * a) / 12; }
  }
  return { ixx, iyy, izz, ixy: 0, ixz: 0, iyz: 0 };
}

export function bodyMass(body: Body, doc: Document) {
  const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
  const density = m?.density ?? 1000; // kg/m³
  return density * geometryVolume(body.visual?.geometry, body.transform?.scale);
}

/** Total mass + center of mass (world) of all bodies. */
export function centerOfMass(doc: Document, fk = computeFK(doc)) {
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
function subtreeBodies(childrenOf: any, start: any) {
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
export function jointLoads(doc: Document, fk = computeFK(doc)) {
  const masses = new Map();
  for (const body of Object.values(doc.bodies)) masses.set(body.id, bodyMass(body, doc));

  const childrenOf = new Map();
  for (const j of Object.values(doc.joints)) {
    if (!childrenOf.has(j.parentBodyId)) childrenOf.set(j.parentBodyId, []);
    childrenOf.get(j.parentBodyId).push(j.childBodyId);
  }

  const out = new Map();
  for (const j of Object.values(doc.joints)) {
    const parent = j.parentBodyId ? doc.bodies[j.parentBodyId] : null;
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

// ── Surface stress field (FEA-style heatmap) ────────────────────────────────
const MOVABLE = new Set(['revolute', 'continuous', 'prismatic']);

/** Fusion-style scalar→colour ramp: 0 blue → cyan → green → yellow → 1 red. */
export function stressColor(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const stops: [number, number, number][] = [[0, 0, 1], [0, 1, 1], [0, 1, 0], [1, 1, 0], [1, 0, 0]];
  const x = t * 4, i = Math.min(3, Math.floor(x)), f = x - i;
  const a = stops[i], b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/**
 * Per-body stress field for surface colouring. For each body returns the world
 * anchors of the load path through it (proximal support → distal joint) and the
 * normalised load (0..1 of peak) at each end. A vertex's colour is then the ramp
 * of the load interpolated along that segment — high where the member is most
 * loaded (near a heavily-torqued joint), fading toward lightly loaded ends.
 *
 * This is a fast load-transmission proxy (not a true FEA solve), but it produces
 * the familiar continuous blue→red gradient over the actual geometry.
 */
export function bodyStressField(doc: Document, fk = computeFK(doc), loads = jointLoads(doc, fk)) {
  const childJoint = buildChildJointMap(doc);
  const parentJoints = new Map<any, any[]>();
  for (const j of Object.values(doc.joints)) {
    if (!parentJoints.has(j.parentBodyId)) parentJoints.set(j.parentBodyId, []);
    parentJoints.get(j.parentBodyId)!.push(j);
  }
  const tor = (j: any) => Math.abs(loads.get(j.id)?.torque ?? 0);
  let maxT = 1e-6;
  for (const j of Object.values(doc.joints)) maxT = Math.max(maxT, tor(j));

  const pivotWorld = (j: any) => {
    const pm = fk.get(j.parentBodyId)?.matrix?.clone() ?? mat(doc.bodies[j.parentBodyId]?.transform);
    return new THREE.Vector3().setFromMatrixPosition(pm.multiply(originMat(j.origin)));
  };

  const out = new Map<string, { P: number[]; D: number[]; tP: number; tD: number; maxTorque: number }>();
  for (const body of Object.values(doc.bodies)) {
    const center = new THREE.Vector3(...(fk.get(body.id)?.position ?? [0, 0, 0]));

    // Walk up through welds to the first movable joint that supports this body.
    let Mprox = maxT, Panchor = center.clone(), cur: any = body.id, guard = 0;
    while (guard++ < 64) {
      const j = childJoint.get(cur);
      if (!j) { Mprox = maxT; Panchor = center.clone(); break; }       // root → carries all
      if (MOVABLE.has(j.type)) { Mprox = tor(j); Panchor = pivotWorld(j); break; }
      cur = j.parentBodyId;
      if (!cur) { Mprox = maxT; break; }
    }

    // Distal end: the strongest movable joint hanging off this body (else a free tip).
    let Mdist = 0, Danchor = center.clone().multiplyScalar(2).sub(Panchor);
    const dj = (parentJoints.get(body.id) ?? []).filter((j) => MOVABLE.has(j.type));
    if (dj.length) {
      const main = dj.reduce((a, b) => (tor(b) > tor(a) ? b : a));
      Mdist = tor(main); Danchor = pivotWorld(main);
    }

    out.set(body.id, {
      P: [Panchor.x, Panchor.y, Panchor.z],
      D: [Danchor.x, Danchor.y, Danchor.z],
      tP: Math.min(Mprox / maxT, 1),
      tD: Math.min(Mdist / maxT, 1),
      maxTorque: maxT,
    });
  }
  return out;
}