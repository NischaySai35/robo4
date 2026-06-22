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
 * Per-body stress field for surface colouring — the BENDING MOMENT each member
 * transmits under gravity, the way CAD/FEA tools plot structural load.
 *
 * For each link we compute the internal bending moment magnitude |Σ r × (m·g)| of all
 * the mass it carries, taken about its PROXIMAL support (where it's effectively fixed)
 * and about its DISTAL end. This is pose-correct and axis-independent: a horizontally
 * EXTENDED arm has large horizontal lever arms → high moment → red near the supports;
 * a vertical arm has tiny lever arms → low moment → blue. (The old version used the
 * torque about each joint's ROTATION axis, which is ~0 for a vertical/yaw joint even
 * when the member is heavily bent — hence the "extended link shows blue" bug.)
 *
 * Returns the world load-path anchors (P→D) + the normalised moment (0..1 of the peak
 * member) at each end; BodyRenderer ramps the colour along P→D. A fast structural
 * proxy, not a full FEA solve, but physically consistent.
 */
export function bodyStressField(doc: Document, fk = computeFK(doc), _loads = jointLoads(doc, fk)) {
  const childJoint = buildChildJointMap(doc);
  const childrenOf = new Map<any, any[]>();
  const parentJoints = new Map<any, any[]>();
  for (const j of Object.values(doc.joints)) {
    if (!childrenOf.has(j.parentBodyId)) childrenOf.set(j.parentBodyId, []);
    childrenOf.get(j.parentBodyId)!.push(j.childBodyId);
    if (!parentJoints.has(j.parentBodyId)) parentJoints.set(j.parentBodyId, []);
    parentJoints.get(j.parentBodyId)!.push(j);
  }

  const massOf = (id: string) => bodyMass(doc.bodies[id], doc);
  const posOf = (id: string) => new THREE.Vector3(...(fk.get(id)?.position ?? [0, 0, 0]));
  const pivotWorld = (j: any) => {
    const pm = fk.get(j.parentBodyId)?.matrix?.clone() ?? mat(doc.bodies[j.parentBodyId]?.transform);
    return new THREE.Vector3().setFromMatrixPosition(pm.multiply(originMat(j.origin)));
  };
  // |Σ (com_i − anchor) × (m_i · g)| over a set of bodies = bending moment magnitude.
  const bendAbout = (anchor: THREE.Vector3, ids: Iterable<string>) => {
    const M = new THREE.Vector3();
    for (const id of ids) M.add(posOf(id).clone().sub(anchor).cross(G.clone().multiplyScalar(massOf(id))));
    return M.length();
  };

  const recs: { id: string; P: THREE.Vector3; D: THREE.Vector3; Mp: number; Md: number }[] = [];
  for (const body of Object.values(doc.bodies)) {
    const center = posOf(body.id);

    // Proximal support: walk up welds to the first movable joint (else this is a root).
    let Panchor = center.clone(), cur: any = body.id, guard = 0;
    while (guard++ < 64) {
      const j = childJoint.get(cur);
      if (!j) { Panchor = center.clone(); break; }
      if (MOVABLE.has(j.type)) { Panchor = pivotWorld(j); break; }
      cur = j.parentBodyId;
      if (!cur) break;
    }

    const subtree = subtreeBodies(childrenOf, body.id);             // this body + all downstream
    const downstream = [...subtree].filter((id) => id !== body.id);
    const Mp = bendAbout(Panchor, subtree);                          // moment at the fixed end

    // Distal end: a movable joint hanging off this body, else the far end of the body.
    let Danchor = center.clone().multiplyScalar(2).sub(Panchor);
    const dj = (parentJoints.get(body.id) ?? []).filter((j) => MOVABLE.has(j.type));
    if (dj.length) Danchor = pivotWorld(dj[0]);
    const Md = downstream.length ? bendAbout(Danchor, downstream) : 0; // lighter further out

    recs.push({ id: body.id, P: Panchor, D: Danchor, Mp, Md });
  }

  // Normalise to the most-loaded member (FEA convention: colour = fraction of peak).
  const maxM = Math.max(1e-6, ...recs.map((r) => r.Mp));
  const out = new Map<string, { P: number[]; D: number[]; tP: number; tD: number; maxTorque: number }>();
  for (const r of recs) {
    out.set(r.id, {
      P: [r.P.x, r.P.y, r.P.z],
      D: [r.D.x, r.D.y, r.D.z],
      tP: Math.min(r.Mp / maxM, 1),
      tD: Math.min(r.Md / maxM, 1),
      maxTorque: maxM,
    });
  }
  return out;
}