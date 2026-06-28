/**
 * analysis.ts — static engineering analysis over the robot model.
 *
 * Computes per-body mass, assembly center of mass, and static gravity-holding
 * torque at each joint (the torque a motor must produce to hold everything
 * downstream against gravity).
 *
 * ── NEW: Industrial-grade additions ─────────────────────────────────────────
 *
 * Per-joint motor lookup (joint.meta.motorType → motorDatabase):
 *   Overload threshold, stall torque, Kt, and no-load current are now
 *   motor-specific rather than hardcoded ST3215 everywhere.
 *
 * Von Mises stress + structural safety factor (bodyMechanics):
 *   σ_vm = √(σ_bending² + 3τ_torsion²)
 *   FoS  = yield_strength / σ_vm
 *
 *   The full 3D torque vector at each joint's pivot is decomposed into:
 *   - Bending moment M (perpendicular to the link axis)
 *   - Torsion T       (along the link axis)
 *
 *   Cross-section is modelled as a solid circle with radius = rHint (see
 *   rHintOf). This is a conservative approximation — accurate for cylindrical
 *   links, slightly conservative for box sections.
 *
 *   Section moduli:
 *     Wb = π r³ / 4  → σ_bending = M / Wb
 *     Wt = π r³ / 2  → τ_torsion = |T| / Wt
 *
 * Material lookup (body material name → materialDatabase):
 *   Fuzzy-matched against the doc.materials name string. Defaults to PLA
 *   (conservative for 3D-printed hobby robots).
 *
 * Stays Node-testable: geometry types compared as string literals, no
 * dynamic imports inside pure functions.
 */
import * as THREE from 'three';
import { computeFK, mat, buildChildJointMap } from './modelFK';
import type { Document, Body, Geometry } from '@/core/model/index';
import { getMotorSpec } from './motorDatabase';
import { getMaterialProps } from './materialDatabase';

const G = new THREE.Vector3(0, -9.81, 0); // gravity field (m/s²)

// ── Backward-compatible ST3215 constant (other modules import this) ───────────
export const ST3215 = {
  stallTorque:  2.94,            // N·m
  stallCurrent: 2.70,            // A
  Kt:           2.94 / 2.70,     // N·m/A
  idle:         0.10,            // A (no-load)
};

/** Estimate motor current from torque using a given motor spec (or ST3215 default). */
export function estimateCurrent(torqueNm: number, motor = getMotorSpec('ST3215')) {
  return Math.min(motor.noLoadCurrent + Math.abs(torqueNm) / motor.Kt, motor.stallCurrent);
}

// ── Geometry helpers ────────────────────────────────────────────────────────

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
    default: return 0.008 * sx * sy * sz;
  }
}

/** Approximate inertia tensor (kg·m²) about the body's center. */
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
      const r = (g.radius ?? 0.5) * Math.max(sx, sy), l = (g.length ?? 1) * sz;
      ixx = iyy = mass * (3 * r * r + l * l) / 12; izz = 0.5 * mass * r * r;
      break;
    }
    default: { const a = Math.cbrt(geometryVolume(g, s) || 1e-6); ixx = iyy = izz = mass * (2 * a * a) / 12; }
  }
  return { ixx, iyy, izz, ixy: 0, ixz: 0, iyz: 0 };
}

export function bodyMass(body: Body, doc: Document) {
  const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
  const density = m?.density ?? 1000;
  return density * geometryVolume(body.visual?.geometry, body.transform?.scale);
}

/** Total mass and world-space center of mass. */
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

// ── Subtree traversal ───────────────────────────────────────────────────────

function subtreeBodies(childrenOf: Map<any, any[]>, start: any) {
  const out = new Set([start]);
  const q = [start];
  while (q.length) {
    const cur = q.shift();
    for (const ch of childrenOf.get(cur) ?? []) if (!out.has(ch)) { out.add(ch); q.push(ch); }
  }
  return out;
}

// ── Per-joint pivot helpers (shared by jointLoads + bodyMechanics) ──────────

function pivotForJoint(j: any, doc: Document, fk: Map<string, any>) {
  const parent = j.parentBodyId ? doc.bodies[j.parentBodyId] : null;
  if (!parent) return null;
  const pMat = (fk.get(j.parentBodyId)?.matrix?.clone() ?? mat(parent.transform)) as THREE.Matrix4;
  const jw = pMat.clone().multiply(originMat(j.origin));
  return { pivot: new THREE.Vector3().setFromMatrixPosition(jw), jw };
}

// ── Joint loads (gravity-holding torque + current per joint) ────────────────

/**
 * Static gravity-holding torque, estimated current, and overload flag per joint.
 * Uses the motor spec from joint.meta.motorType (falls back to ST3215).
 */
export function jointLoads(doc: Document, fk = computeFK(doc)) {
  const masses = new Map<string, number>();
  for (const body of Object.values(doc.bodies)) masses.set(body.id, bodyMass(body, doc));

  const childrenOf = new Map<string, string[]>();
  for (const j of Object.values(doc.joints)) {
    if (!j.parentBodyId || !j.childBodyId) continue;
    if (!childrenOf.has(j.parentBodyId)) childrenOf.set(j.parentBodyId, []);
    childrenOf.get(j.parentBodyId)!.push(j.childBodyId);
  }

  const out = new Map<string, { torque: number; current: number; overload: boolean; motorName: string }>();
  for (const j of Object.values(doc.joints)) {
    const motor  = getMotorSpec((j as any).meta?.motorType);
    const pInfo  = pivotForJoint(j, doc, fk);
    if (!pInfo) {
      out.set(j.id, { torque: 0, current: estimateCurrent(0, motor), overload: false, motorName: motor.name });
      continue;
    }
    const { pivot, jw } = pInfo;
    const axis = new THREE.Vector3(...((j.axis as number[]) ?? [0, 0, 1])).normalize().transformDirection(jw);

    const torqueVec = new THREE.Vector3();
    for (const bid of subtreeBodies(childrenOf, j.childBodyId)) {
      const w = fk.get(bid);
      if (!w) continue;
      const r = new THREE.Vector3(...w.position).sub(pivot);
      torqueVec.add(r.clone().cross(G.clone().multiplyScalar(masses.get(bid) ?? 0)));
    }
    const torque = torqueVec.dot(axis);
    out.set(j.id, {
      torque,
      current:    estimateCurrent(torque, motor),
      overload:   Math.abs(torque) > motor.stallTorque,
      motorName:  motor.name,
    });
  }
  return out;
}

// ── Full 3D torque vectors at each joint (for structural analysis) ──────────

function jointTorqueVectors(doc: Document, fk: Map<string, any>) {
  const masses = new Map<string, number>();
  for (const body of Object.values(doc.bodies)) masses.set(body.id, bodyMass(body, doc));

  const childrenOf = new Map<string, string[]>();
  for (const j of Object.values(doc.joints)) {
    if (!j.parentBodyId || !j.childBodyId) continue;
    if (!childrenOf.has(j.parentBodyId)) childrenOf.set(j.parentBodyId, []);
    childrenOf.get(j.parentBodyId)!.push(j.childBodyId);
  }

  const out = new Map<string, THREE.Vector3>();
  for (const j of Object.values(doc.joints)) {
    const pInfo = pivotForJoint(j, doc, fk);
    if (!pInfo) { out.set(j.id, new THREE.Vector3()); continue; }
    const { pivot } = pInfo;
    const tv = new THREE.Vector3();
    for (const bid of subtreeBodies(childrenOf, j.childBodyId)) {
      const w = fk.get(bid);
      if (!w) continue;
      const r = new THREE.Vector3(...w.position).sub(pivot);
      tv.add(r.clone().cross(G.clone().multiplyScalar(masses.get(bid) ?? 0)));
    }
    out.set(j.id, tv);
  }
  return out;
}

// ── Surface stress heatmap ──────────────────────────────────────────────────

const MOVABLE = new Set(['revolute', 'continuous', 'prismatic', 'ball', 'planar', 'floating']);

/** Fusion-style scalar→colour ramp: 0 blue → cyan → green → yellow → 1 red. */
export function stressColor(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const stops: [number, number, number][] = [[0, 0, 1], [0, 1, 1], [0, 1, 0], [1, 1, 0], [1, 0, 0]];
  const x = t * 4, i = Math.min(3, Math.floor(x)), f = x - i;
  const a = stops[i], b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// Effective cross-section radius for a body (solid circular approximation).
function rHintOf(body: Body): number {
  const g  = body.visual?.geometry ?? {};
  const sc = body.transform?.scale ?? [1, 1, 1];
  const ab = (v: number) => Math.abs(v);
  switch ((g as Partial<Geometry>).type) {
    case 'sphere':   return ((g as any).radius ?? 0.5) * Math.max(ab(sc[0]), ab(sc[1]), ab(sc[2]));
    case 'cylinder':
    case 'capsule':  return ((g as any).radius ?? 0.5) * Math.max(ab(sc[0]), ab(sc[1]));
    case 'box': {
      const dims = [
        ((g as any).size?.[0] ?? 1) * ab(sc[0]),
        ((g as any).size?.[1] ?? 1) * ab(sc[1]),
        ((g as any).size?.[2] ?? 1) * ab(sc[2]),
      ].sort((a, b) => a - b);
      return (dims[0] + dims[1]) / 4; // equivalent radius from two cross-section dims
    }
    default: return 0.15;
  }
}

// Walk up the joint graph to find the nearest proximal MOVABLE joint.
function proxJointOf(bodyId: string, childJoint: Map<string, any>) {
  let cur: any = bodyId, guard = 0;
  while (guard++ < 64) {
    const j = childJoint.get(cur);
    if (!j) return null;
    if (MOVABLE.has(j.type)) return j;
    cur = j.parentBodyId;
    if (!cur) return null;
  }
  return null;
}

/**
 * Per-body stress field for the 3D surface heatmap.
 *
 * tP/tD = fraction of the motor's stall torque used at the proximal/distal
 * joint of this body. Red = at the motor's physical limit; blue = light load.
 */
export function bodyStressField(doc: Document, fk = computeFK(doc), loads = jointLoads(doc, fk)) {
  const childJoint   = buildChildJointMap(doc);
  const parentJoints = new Map<any, any[]>();
  const childrenOf   = new Map<any, any[]>();
  for (const j of Object.values(doc.joints)) {
    if (!parentJoints.has(j.parentBodyId)) parentJoints.set(j.parentBodyId, []);
    parentJoints.get(j.parentBodyId)!.push(j);
    if (!childrenOf.has(j.parentBodyId)) childrenOf.set(j.parentBodyId, []);
    childrenOf.get(j.parentBodyId)!.push(j.childBodyId);
  }

  const pivotWorld = (j: any) => {
    const pm = fk.get(j.parentBodyId)?.matrix?.clone() ?? mat(doc.bodies[j.parentBodyId]?.transform);
    return new THREE.Vector3().setFromMatrixPosition((pm as THREE.Matrix4).multiply(originMat(j.origin)));
  };
  const posOf = (id: string) => new THREE.Vector3(...(fk.get(id)?.position ?? [0, 0, 0]));

  // Peak torque fraction across all joints (for structural base colouring).
  const allTorques = [...loads.values()].map((l) => Math.abs(l.torque));
  // Floor at 10% of the weakest motor's stall torque in the assembly.
  const peakMotorStall = Math.max(...Object.values(doc.joints).map((j) => getMotorSpec((j as any).meta?.motorType).stallTorque));
  const peakTorque = Math.max(peakMotorStall * 0.1, ...allTorques);

  const out = new Map<string, { P: number[]; D: number[]; tP: number; tD: number; maxTorque: number; rHint: number }>();

  for (const body of Object.values(doc.bodies)) {
    const center    = posOf(body.id);
    const proxJoint = proxJointOf(body.id, childJoint);

    let tP: number, Panchor: THREE.Vector3;
    if (proxJoint) {
      const motor = getMotorSpec((proxJoint as any).meta?.motorType);
      const torq  = loads.get(proxJoint.id)?.torque ?? 0;
      tP      = Math.min(Math.abs(torq) / motor.stallTorque, 1);
      Panchor = pivotWorld(proxJoint);
    } else {
      tP      = Math.min(peakTorque / peakMotorStall, 1);
      Panchor = center.clone();
    }

    const distalJoints = (parentJoints.get(body.id) ?? []).filter((j) => MOVABLE.has(j.type));
    let tD: number, Danchor: THREE.Vector3;
    if (distalJoints.length) {
      const dj    = distalJoints[0];
      const motor = getMotorSpec((dj as any).meta?.motorType);
      const torq  = loads.get(dj.id)?.torque ?? 0;
      tD      = Math.min(Math.abs(torq) / motor.stallTorque, 1);
      Danchor = pivotWorld(dj);
    } else {
      tD      = 0;
      Danchor = center.clone().multiplyScalar(2).sub(Panchor);
    }

    out.set(body.id, {
      P: [Panchor.x, Panchor.y, Panchor.z],
      D: [Danchor.x, Danchor.y, Danchor.z],
      tP, tD,
      maxTorque: peakTorque,
      rHint:     rHintOf(body),
    });
  }
  return out;
}

// ── Structural mechanics: von Mises stress + safety factor ─────────────────

export interface BodyMechanicsResult {
  vonMises:   number;  // Pa — von Mises stress at the outer fiber of the proximal cross-section
  fos:        number;  // dimensionless — Factor of Safety (yieldStrength / vonMises); Infinity if no load
  bending:    number;  // N·m — bending moment (perpendicular to link axis)
  torsion:    number;  // N·m — torsional moment (along link axis, absolute value)
  matName:    string;  // matched material name (from materialDatabase)
  yieldMPa:  number;  // MPa — material yield strength for display
}

/**
 * Computes structural stress and safety factor for every body.
 *
 * Algorithm per body:
 *   1. Find the proximal (nearest parent) movable joint.
 *   2. Compute the full 3D torque vector at that joint's pivot due to
 *      downstream body weights.
 *   3. Decompose the torque into bending M (⊥ to link axis) and torsion T (‖).
 *   4. Apply solid-circular section moduli:
 *         σ = M / Wb,  τ = |T| / Wt
 *         Wb = π r³ / 4,  Wt = π r³ / 2  (r = rHint)
 *   5. von Mises:  σ_vm = √(σ² + 3τ²)
 *   6. FoS = yield_strength / σ_vm
 */
export function bodyMechanics(doc: Document, fk = computeFK(doc)): Map<string, BodyMechanicsResult> {
  const childJoint = buildChildJointMap(doc);
  const tvecs      = jointTorqueVectors(doc, fk);

  const out = new Map<string, BodyMechanicsResult>();

  for (const body of Object.values(doc.bodies)) {
    const proxJoint = proxJointOf(body.id, childJoint);
    const matEntry  = doc.materials[body.visual?.materialId ?? ''];
    const matName   = matEntry?.name ?? '';
    const matProps  = getMaterialProps(matName);

    if (!proxJoint) {
      // Structural base — no joint above, not a failure point in this model
      out.set(body.id, { vonMises: 0, fos: Infinity, bending: 0, torsion: 0, matName, yieldMPa: matProps.yieldStrength / 1e6 });
      continue;
    }

    // Full torque vector at the proximal joint pivot
    const tv = tvecs.get(proxJoint.id) ?? new THREE.Vector3();

    // Link axis: from joint pivot toward body CoM
    const pInfo = pivotForJoint(proxJoint, doc, fk);
    if (!pInfo) { out.set(body.id, { vonMises: 0, fos: Infinity, bending: 0, torsion: 0, matName, yieldMPa: matProps.yieldStrength / 1e6 }); continue; }
    const comPos   = new THREE.Vector3(...(fk.get(body.id)?.position ?? [0, 0, 0]));
    const linkVec  = comPos.clone().sub(pInfo.pivot);
    const linkLen  = linkVec.length();
    if (linkLen < 1e-4) { out.set(body.id, { vonMises: 0, fos: Infinity, bending: 0, torsion: 0, matName, yieldMPa: matProps.yieldStrength / 1e6 }); continue; }
    const linkAxis = linkVec.clone().divideScalar(linkLen);

    // Decompose: torsion = torque projected onto link axis; bending = perpendicular
    const T_scalar = tv.dot(linkAxis);                                     // N·m (signed)
    const M_vec    = tv.clone().addScaledVector(linkAxis, -T_scalar);      // perpendicular
    const M        = M_vec.length();                                       // N·m
    const T        = Math.abs(T_scalar);                                   // N·m

    // Effective cross-section radius
    const r = rHintOf(body);
    if (r < 1e-5) {
      out.set(body.id, { vonMises: 0, fos: Infinity, bending: M, torsion: T, matName, yieldMPa: matProps.yieldStrength / 1e6 });
      continue;
    }

    // Solid circular section moduli: Wb = π r³/4, Wt = π r³/2
    const r3  = r * r * r;
    const Wb  = Math.PI * r3 / 4;
    const Wt  = Math.PI * r3 / 2;
    const sig = M / Wb;      // Pa (bending normal stress at outer fiber)
    const tau = T / Wt;      // Pa (torsional shear stress at outer fiber)
    const vm  = Math.sqrt(sig * sig + 3 * tau * tau); // Pa (von Mises)

    const fos = vm > 1 ? matProps.yieldStrength / vm : Infinity; // avoid ÷0

    out.set(body.id, {
      vonMises: vm,
      fos,
      bending:  M,
      torsion:  T,
      matName,
      yieldMPa: matProps.yieldStrength / 1e6,
    });
  }
  return out;
}
