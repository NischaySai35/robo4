/**
 * modelIK — inverse kinematics over the model graph (damped least squares).
 *
 * Given a tip body and a world-space target, solve the joint values along the
 * chain from the tip up to its root so the tip's FK position reaches the target.
 * Uses a numerical Jacobian (perturb each movable joint, measure tip motion) and
 * DLS (J^T (J J^T + λ²I)^-1 e), which is robust near singularities. Reuses the
 * same computeFK as forward kinematics, so it works for any imported robot.
 */
import * as THREE from 'three';
import { computeFK, buildChildJointMap } from './modelFK';
import type { Document } from '@/core/model/index';

const MOVABLE = new Set(['revolute', 'continuous', 'prismatic']);

/** Ordered movable joints from root → tip for the chain ending at tipId. */
export function chainJoints(doc, tipId) {
  const childJoint = buildChildJointMap(doc);
  const out: any[] = [];
  const seen = new Set();
  let cur = tipId;
  while (true) {
    const j = childJoint.get(cur);
    if (!j || seen.has(j.id)) break;
    seen.add(j.id);
    out.unshift(j);
    cur = j.parentBodyId;
  }
  return out.filter((j) => MOVABLE.has(j.type));
}

function tipPosition(doc: Document, tipId: string, values: Record<string, number>) {
  const joints: Record<string, unknown> = {};
  for (const [id, j] of Object.entries(doc.joints)) {
    joints[id] = id in values ? { ...j, state: { ...j.state, value: values[id] } } : j;
  }
  const fk = computeFK({ ...doc, joints });
  const t = fk.get(tipId);
  return new THREE.Vector3(...(t ? t.position : [0, 0, 0]));
}

// Invert a symmetric 3x3 (returns null if singular).
function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const id = 1 / det;
  return [
    A * id, (c * h - b * i) * id, (b * f - c * e) * id,
    B * id, (a * i - c * g) * id, (c * d - a * f) * id,
    C * id, (b * g - a * h) * id, (a * e - b * d) * id,
  ];
}

const clampLimit = (j, v) => {
  if (j.type === 'continuous') return v;
  const lo = j.limit?.lower ?? -Math.PI, hi = j.limit?.upper ?? Math.PI;
  return Math.max(lo, Math.min(hi, v));
};

/**
 * Solve IK. Returns { jointId: newValue } for the chain joints (or null if no chain).
 */
export function solveModelIK(doc, tipId, target, { iterations = 24, lambda = 0.6, eps = 1e-4, tol = 1e-3 } = {}) {
  const chain = chainJoints(doc, tipId);
  if (chain.length === 0) return null;

  const values = {};
  for (const j of chain) values[j.id] = j.state?.value ?? 0;
  const tgt = new THREE.Vector3(target[0], target[1], target[2]);

  for (let iter = 0; iter < iterations; iter++) {
    const tip = tipPosition(doc, tipId, values);
    const e = tgt.clone().sub(tip);
    if (e.length() < tol) break;

    // Numerical Jacobian: columns = d(tip)/d(qk)
    const cols = chain.map((j) => {
      const v0 = values[j.id];
      values[j.id] = v0 + eps;
      const tp = tipPosition(doc, tipId, values);
      values[j.id] = v0;
      return tp.sub(tip).divideScalar(eps); // Vector3
    });

    // JJt (3x3) + λ²I
    const l2 = lambda * lambda;
    const jjt = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const c of cols) {
      jjt[0] += c.x * c.x; jjt[1] += c.x * c.y; jjt[2] += c.x * c.z;
      jjt[3] += c.y * c.x; jjt[4] += c.y * c.y; jjt[5] += c.y * c.z;
      jjt[6] += c.z * c.x; jjt[7] += c.z * c.y; jjt[8] += c.z * c.z;
    }
    jjt[0] += l2; jjt[4] += l2; jjt[8] += l2;
    const inv = inv3(jjt);
    if (!inv) break;

    // y = inv * e   (3-vector)
    const y = [
      inv[0] * e.x + inv[1] * e.y + inv[2] * e.z,
      inv[3] * e.x + inv[4] * e.y + inv[5] * e.z,
      inv[6] * e.x + inv[7] * e.y + inv[8] * e.z,
    ];

    // dq_k = col_k · y ; apply clamped
    chain.forEach((j, k) => {
      const c = cols[k];
      const dq = c.x * y[0] + c.y * y[1] + c.z * y[2];
      values[j.id] = clampLimit(j, values[j.id] + dq);
    });
  }

  return values;
}