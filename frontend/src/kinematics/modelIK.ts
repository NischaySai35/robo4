/**
 * modelIK — inverse kinematics over the model graph (damped least squares).
 *
 * Given a tip body and a world-space target, solve the joint values along the
 * chain from the tip up to its root so the tip's FK pose reaches the target.
 * Uses a numerical Jacobian (perturb each movable joint, measure tip motion) and
 * DLS (J^T (J J^T + λ²I)^-1 e), which is robust near singularities. Reuses the
 * same computeFK as forward kinematics, so it works for any imported robot.
 *
 * Two modes:
 *  - position-only (3-DOF error) — the default, used by drag-from-tip IK;
 *  - full pose (6-DOF: position + orientation) — pass `targetQuaternion`, used for
 *    industrial manipulation where the tool frame matters (welding, dispensing, grasp).
 */
import * as THREE from 'three';
import { computeFK, buildChildJointMap } from './modelFK';
import type { Document } from '@/core/model/index';

const MOVABLE = new Set(['revolute', 'continuous', 'prismatic']);

/**
 * BFS through the undirected joint graph from rootId to tipId.
 * Returns the ordered list of joints along that path (root → tip order).
 * Used in rigid mode so joints on BOTH sides of the grounded body are reachable.
 */
function chainJointsFromRoot(doc: any, tipId: string, rootId: string): any[] {
  if (tipId === rootId) return [];

  // Build undirected adjacency (same as computeFKGraph)
  const adj = new Map<string, { joint: any; neighborId: string }[]>();
  for (const id of Object.keys(doc.bodies)) adj.set(id, []);
  for (const j of Object.values(doc.joints) as any[]) {
    if (j.parentBodyId && j.childBodyId && doc.bodies[j.parentBodyId] && doc.bodies[j.childBodyId]) {
      adj.get(j.parentBodyId)!.push({ joint: j, neighborId: j.childBodyId });
      adj.get(j.childBodyId)!.push({ joint: j, neighborId: j.parentBodyId });
    }
  }

  // BFS from root to tip to find the path
  const prev = new Map<string, { joint: any; from: string }>();
  const visited = new Set<string>([rootId]);
  const queue: string[] = [rootId];
  let found = false;
  while (queue.length > 0 && !found) {
    const cur = queue.shift()!;
    for (const { joint, neighborId } of adj.get(cur) ?? []) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      prev.set(neighborId, { joint, from: cur });
      if (neighborId === tipId) { found = true; break; }
      queue.push(neighborId);
    }
  }
  if (!found) return [];

  // Reconstruct path from tip back to root
  const out: any[] = [];
  let cur = tipId;
  while (cur !== rootId) {
    const p = prev.get(cur);
    if (!p) return [];
    out.unshift(p.joint);
    cur = p.from;
  }
  return out.filter((j: any) => MOVABLE.has(j.type));
}

/**
 * Ordered movable joints along the chain from root → tip.
 * In rigid mode (rigidRootId provided): BFS through the undirected joint graph so
 * joints on both sides of the grounded body are reachable by IK.
 * In free-float mode: walks upward via the original parent→child tree structure.
 */
export function chainJoints(doc: any, tipId: any, rigidRootId?: string | null) {
  if (rigidRootId && doc.bodies[rigidRootId]) {
    return chainJointsFromRoot(doc, tipId, rigidRootId);
  }
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

/** FK tip pose (position + orientation) for a candidate set of joint values. */
function tipPose(doc: Document, tipId: string, values: Record<string, number>) {
  const joints: Record<string, unknown> = {};
  for (const [id, j] of Object.entries(doc.joints)) {
    joints[id] = id in values ? { ...j, state: { ...j.state, value: values[id] } } : j;
  }
  const fk = computeFK({ ...doc, joints });
  const t = fk.get(tipId);
  return {
    pos: new THREE.Vector3(...(t ? t.position : [0, 0, 0])),
    quat: new THREE.Quaternion(...(t ? t.quaternion : [0, 0, 0, 1])),
  };
}

/**
 * The rotation vector (axis × angle) of a quaternion — the so(3) error used as the
 * orientation part of the IK error. Takes the shortest path (q and -q are equal).
 */
function rotVec(q: THREE.Quaternion): THREE.Vector3 {
  const w = Math.min(1, Math.max(-1, q.w));
  const s = Math.sqrt(Math.max(0, 1 - w * w));
  if (s < 1e-8) return new THREE.Vector3(0, 0, 0); // ~no rotation
  const angle = 2 * Math.acos(Math.abs(w));
  const sign = w < 0 ? -1 : 1; // shortest-path: flip if scalar part negative
  return new THREE.Vector3(q.x, q.y, q.z).multiplyScalar((sign * angle) / s);
}

/**
 * Solve A·x = b for a small symmetric positive-definite m×m system via Gaussian
 * elimination with partial pivoting. Returns null if singular. Used for the DLS
 * normal equations (J Jᵀ + λ²I)·y = e at both m=3 (position) and m=6 (full pose).
 */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const m = b.length;
  const M = A.map((row, i) => [...row, b[i]]); // augmented
  for (let col = 0; col < m; col++) {
    let piv = col;
    for (let r = col + 1; r < m; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let c = col; c <= m; c++) M[col][c] /= d;
    for (let r = 0; r < m; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let c = col; c <= m; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[m]);
}

const clampLimit = (j: any, v: any) => {
  if (j.type === 'continuous') return v;
  const lo = j.limit?.lower ?? -Math.PI, hi = j.limit?.upper ?? Math.PI;
  return Math.max(lo, Math.min(hi, v));
};

interface IKOptions {
  iterations?: number;
  lambda?: number;
  eps?: number;
  tol?: number;
  /** Target orientation [x,y,z,w]; when set, IK also matches the tip's orientation (6-DOF). */
  targetQuaternion?: [number, number, number, number] | number[];
  /** Weight on the orientation error (rad) relative to position (m). Default 1. */
  oriWeight?: number;
  /** Max |Δq| per joint per iteration (rad/m), for stability. Default 0.5. */
  maxStep?: number;
}

/**
 * Solve IK. Returns { jointId: newValue } for the chain joints (or null if no chain).
 * Position-only by default; pass `targetQuaternion` for full 6-DOF pose IK.
 */
export function solveModelIK(doc: any, tipId: any, target: any, opts: IKOptions = {}, rootBodyId?: string | null) {
  const { iterations = 24, lambda = 0.6, eps = 1e-4, tol = 1e-3, oriWeight = 1 } = opts;
  const chain = chainJoints(doc, tipId, rootBodyId);
  if (chain.length === 0) return null;

  const usePose = opts.targetQuaternion != null;
  // Step clamp stabilizes 6-DOF; position-only keeps its original uncapped behavior.
  const maxStep = opts.maxStep ?? (usePose ? 0.5 : Infinity);
  const m = usePose ? 6 : 3;
  const values: Record<string, any> = {};
  for (const j of chain) values[j.id] = j.state?.value ?? 0;
  const tgtPos = new THREE.Vector3(target[0], target[1], target[2]);
  const tgtQuat = usePose
    ? new THREE.Quaternion(...(opts.targetQuaternion as number[])).normalize()
    : null;

  /** Build the m-length error vector for the current values. */
  const errorVec = (pose: { pos: THREE.Vector3; quat: THREE.Quaternion }): number[] => {
    const ep = tgtPos.clone().sub(pose.pos);
    if (!usePose) return [ep.x, ep.y, ep.z];
    // orientation error as a world-frame rotation vector: qErr = qTarget * qCur⁻¹
    const qErr = tgtQuat!.clone().multiply(pose.quat.clone().invert());
    const er = rotVec(qErr).multiplyScalar(oriWeight);
    return [ep.x, ep.y, ep.z, er.x, er.y, er.z];
  };

  for (let iter = 0; iter < iterations; iter++) {
    const base = tipPose(doc, tipId, values);
    const e = errorVec(base);
    let enorm = 0; for (const v of e) enorm += v * v;
    if (Math.sqrt(enorm) < tol) break;

    // Numerical Jacobian columns: d(tip pose)/d(qk), each an m-vector.
    const cols: number[][] = chain.map((j) => {
      const v0 = values[j.id];
      values[j.id] = v0 + eps;
      const p = tipPose(doc, tipId, values);
      values[j.id] = v0;
      const dp = p.pos.clone().sub(base.pos).divideScalar(eps);
      if (!usePose) return [dp.x, dp.y, dp.z];
      // d(orientation): rotation vector of (qPerturbed · qBase⁻¹) per unit q
      const dq = rotVec(p.quat.clone().multiply(base.quat.clone().invert()))
        .divideScalar(eps).multiplyScalar(oriWeight);
      return [dp.x, dp.y, dp.z, dq.x, dq.y, dq.z];
    });

    // (J Jᵀ + λ²I) y = e   → y (m-vector)
    const l2 = lambda * lambda;
    const A: number[][] = Array.from({ length: m }, (_, r) =>
      Array.from({ length: m }, (_, c) => {
        let s = 0;
        for (const col of cols) s += col[r] * col[c];
        return r === c ? s + l2 : s;
      }));
    const y = solveLinear(A, e);
    if (!y) break;

    // dq_k = col_k · y ; clamp the step then the joint limit
    chain.forEach((j, k) => {
      const col = cols[k];
      let dq = 0; for (let r = 0; r < m; r++) dq += col[r] * y[r];
      if (dq > maxStep) dq = maxStep; else if (dq < -maxStep) dq = -maxStep;
      values[j.id] = clampLimit(j, values[j.id] + dq);
    });
  }

  return values;
}