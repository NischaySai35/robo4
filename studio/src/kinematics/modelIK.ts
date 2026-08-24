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

/** Public: rotation vector (axis×angle) of a quaternion — the so(3) error. */
export function quatRotVec(q: THREE.Quaternion): THREE.Vector3 { return rotVec(q); }

/**
 * lmSolveGeneric — Levenberg–Marquardt over an arbitrary error function.
 *
 * The caller supplies the movable joints (`chain`), an initial value map, and an
 * `errorFn(values) → number[]` returning the residual vector to drive to zero. LM
 * adapts damping and ACCEPTS a step only if it lowers ‖error‖, so the residual is
 * MONOTONE (can only decrease) — the property that makes a redundant chain actually
 * close a loop instead of stalling. Returns the best value map found.
 *
 * This is the engine behind connector loop-closure: the error is the RELATIVE mate
 * residual between two connectors, so bending ANY joint on the path between them
 * counts — and DLS spreads the bend across BOTH modules, order-independently.
 *
 * LEAST-TOTAL-BENDING (opts.minTravel): a plain minimum-L2-norm DLS step spreads motion
 * evenly (forces ~50/50). To instead minimise TOTAL joint travel (the L1 objective — which
 * naturally gives 90/10 when one joint closes the loop cheaper, 50/50 only when symmetric)
 * we use Weighted Least-Norm (Chan & Dubey 1995) with IRLS reweighting: each joint's
 * mobility wᵢ⁻¹ = |Δθᵢ so far| + ε, so joints already bending stay cheap and idle joints
 * resist. Weighted DLS step: Δθ = W⁻¹Jᵀ(J W⁻¹Jᵀ + λ²I)⁻¹ e.
 *
 * SPREAD-OUT / VSEPR (opts.spread): an optional SECONDARY objective — a scalar potential to
 * minimise (e.g. Σ 1/dist² between body points, so bodies repel and the assembly doesn't
 * crumble into itself). Its descent direction is projected into the NULLSPACE of the mate
 * Jacobian, so it only rearranges the redundant freedom and never disturbs the connection.
 * This is the classic redundancy-resolution nullspace secondary task used for self-collision
 * avoidance. Applied once the primary task is nearly satisfied.
 */
export function lmSolveGeneric(
  chain: { id: string; type: string; limit?: { lower?: number; upper?: number } }[],
  valuesInit: Record<string, number>,
  errorFn: (v: Record<string, number>) => number[],
  opts: {
    iterations?: number; tol?: number; lambda0?: number; maxStep?: number; minTravel?: boolean;
    spread?: (v: Record<string, number>) => number; spreadGain?: number; spreadIters?: number;
  } = {},
): Record<string, number> {
  const { iterations = 200, tol = 1e-4, lambda0 = 0.1, maxStep = 0.3, minTravel = false, spread, spreadGain = 0.5, spreadIters = 60 } = opts;
  const values: Record<string, number> = { ...valuesInit };
  const norm = (e: number[]) => Math.hypot(...e);
  const errAt = (v: Record<string, number>) => norm(errorFn(v));
  if (chain.length === 0) return values;
  const m = errorFn(values).length;
  const TRAVEL_EPS = 0.03; // rad floor so an unmoved joint can still start bending
  const eps = 1e-4;

  let lambda = lambda0;
  let curErr = errAt(values);
  const best = { vals: { ...values }, err: curErr };

  for (let iter = 0; iter < iterations && curErr > tol; iter++) {
    const e0 = errorFn(values);
    // Numerical Jacobian: m rows × n cols.
    const cols: number[][] = chain.map((j) => {
      const v0 = values[j.id];
      values[j.id] = v0 + eps;
      const ep = errorFn(values);
      values[j.id] = v0;
      // column = -d(error)/dq  (error = target - current, so motion that reduces error)
      return ep.map((ev, r) => (ev - e0[r]) / eps);
    });

    // IRLS mobility per joint: proportional to how far it has already travelled from start
    // (L1 → sparse, least total bending). Uniform when minTravel is off (plain L2, ~even).
    // NORMALISED to mean 1 so only RELATIVE differences matter — otherwise the tiny absolute
    // ε at the start would shrink every step and stall convergence.
    const winvRaw = chain.map((j) => (minTravel ? Math.abs(values[j.id] - valuesInit[j.id]) + TRAVEL_EPS : 1));
    const winvMean = winvRaw.reduce((a, b) => a + b, 0) / winvRaw.length || 1;
    const winv = winvRaw.map((w) => w / winvMean);

    let accepted = false;
    for (let t = 0; t < 6; t++) {
      const l2 = lambda * lambda;
      // A = J W⁻¹ Jᵀ + λ²I  (weight each joint's contribution by its mobility)
      const A: number[][] = Array.from({ length: m }, (_, r) =>
        Array.from({ length: m }, (_, c) => {
          let s = 0; for (let k = 0; k < cols.length; k++) s += winv[k] * cols[k][r] * cols[k][c];
          return r === c ? s + l2 : s;
        }));
      const y = solveLinear(A, e0);
      if (!y) { lambda = Math.min(lambda * 3, 50); continue; }
      const cand: Record<string, number> = { ...values };
      chain.forEach((j, k) => {
        const col = cols[k];
        let jty = 0; for (let r = 0; r < m; r++) jty += col[r] * y[r];
        let dq = -winv[k] * jty; // Δθ = W⁻¹ Jᵀ y
        if (dq > maxStep) dq = maxStep; else if (dq < -maxStep) dq = -maxStep;
        cand[j.id] = clampLimit(j, cand[j.id] + dq);
      });
      const candErr = errAt(cand);
      if (candErr < curErr - 1e-9) {
        for (const id of Object.keys(cand)) values[id] = cand[id];
        curErr = candErr;
        lambda = Math.max(lambda * 0.5, 1e-3);
        accepted = true;
        break;
      }
      lambda = Math.min(lambda * 3, 50);
    }
    if (curErr < best.err) { best.err = curErr; best.vals = { ...values }; }
    if (!accepted) break;
  }

  // ---- SECONDARY PHASE: nullspace spread relaxation ----------------------------------------
  // Now that the mate is satisfied, rearrange ONLY the redundant freedom to push bodies apart
  // (minimise the spread potential), keeping the mate residual tight. Each step descends the
  // potential projected into the task nullspace; kept only if the mate stays closed AND the
  // potential drops. This is the VSEPR-style "as far apart as possible" objective.
  // Only run the secondary once the PRIMARY task actually converged. If it didn't (best.err
  // large), letting the secondary move would just relax a still-unsatisfied constraint — e.g.
  // pull a lock further open. In that case return the closest primary attempt untouched.
  if (spread && best.err < 0.005) {
    for (const id of Object.keys(best.vals)) values[id] = best.vals[id]; // start from the tight pose
    const taskCap = best.err + 3e-4; // the task must end each step at least this tight

    // RESTORATION: a few Gauss–Newton steps that drive errorFn (the loop residual) back down.
    // This is the key: a finite spread step ALWAYS drifts the loop open a little, so instead of
    // rejecting it (which limited us to infinitesimal steps → stuck at energy 1164), we take the
    // spread step and then RE-CLOSE the loop before judging it. Standard gradient-projection with
    // restoration — lets the spread actually descend the energy.
    const restore = (cand: Record<string, number>, iters: number): void => {
      for (let it = 0; it < iters; it++) {
        const e = errorFn(cand);
        if (Math.hypot(...e) <= taskCap) break;
        const jc: number[][] = chain.map((j) => {
          const v0 = cand[j.id]; cand[j.id] = v0 + eps;
          const ep = errorFn(cand); cand[j.id] = v0;
          return ep.map((ev, r) => (ev - e[r]) / eps);
        });
        const l2 = 1e-2 * 1e-2;
        const A: number[][] = Array.from({ length: m }, (_, r) =>
          Array.from({ length: m }, (_, c) => {
            let acc = 0; for (let k = 0; k < jc.length; k++) acc += jc[k][r] * jc[k][c];
            return r === c ? acc + l2 : acc;
          }));
        const y = solveLinear(A, e);
        if (!y) break;
        chain.forEach((j, k) => {
          let jty = 0; for (let r = 0; r < m; r++) jty += jc[k][r] * y[r];
          let dq = -jty; if (dq > maxStep) dq = maxStep; else if (dq < -maxStep) dq = -maxStep;
          cand[j.id] = clampLimit(j, cand[j.id] + dq);
        });
      }
    };

    for (let s = 0; s < spreadIters; s++) {
      const e0 = errorFn(values);
      const cols: number[][] = chain.map((j) => {
        const v0 = values[j.id]; values[j.id] = v0 + eps;
        const ep = errorFn(values); values[j.id] = v0;
        return ep.map((ev, r) => (ev - e0[r]) / eps);
      });
      const p0 = spread(values);
      const g = chain.map((j) => {
        const v0 = values[j.id]; values[j.id] = v0 + eps;
        const p = spread(values); values[j.id] = v0;
        return -(p - p0) / eps; // descend the potential
      });
      // Nullspace projection: g_null = g - Jᵀ(JJᵀ+λ²I)⁻¹(J g).
      const ln = 1e-3;
      const JJt: number[][] = Array.from({ length: m }, (_, r) =>
        Array.from({ length: m }, (_, c) => {
          let acc = 0; for (let k = 0; k < cols.length; k++) acc += cols[k][r] * cols[k][c];
          return r === c ? acc + ln * ln : acc;
        }));
      const Jg = Array.from({ length: m }, (_, r) => { let acc = 0; for (let k = 0; k < cols.length; k++) acc += g[k] * cols[k][r]; return acc; });
      const yn = solveLinear(JJt, Jg);
      if (!yn) break;
      const gnull = chain.map((_, k) => { let cn = 0; for (let r = 0; r < m; r++) cn += cols[k][r] * yn[r]; return g[k] - cn; });
      const gmax = Math.max(...gnull.map(Math.abs), 1e-9);
      const scale = Math.min(spreadGain, maxStep / gmax); // bounded step

      let moved = false;
      for (let bt = 0; bt < 5; bt++) {
        const st = scale * Math.pow(0.5, bt);
        const cand: Record<string, number> = { ...values };
        chain.forEach((j, k) => { cand[j.id] = clampLimit(j, values[j.id] + st * gnull[k]); });
        restore(cand, 8); // re-close the loop after the spread step
        if (errAt(cand) <= taskCap && spread(cand) < p0 - 1e-9) {
          for (const id of Object.keys(cand)) values[id] = cand[id];
          moved = true;
          break;
        }
      }
      if (!moved) break; // no task-safe spread improvement left
    }
    return values;
  }

  return best.vals;
}

/**
 * solvePoseIKLM — robust 6-DOF pose IK via Levenberg–Marquardt with step acceptance.
 *
 * Unlike solveModelIK (fixed damping, single monotone-free DLS), this ADAPTS the damping
 * λ and only ACCEPTS a step if it actually reduces the error:
 *   - far from target → λ grows → small safe gradient-descent steps (no overshoot / no stall);
 *   - near the target → λ shrinks → fast Gauss–Newton convergence (drives residual to ~0).
 * A rejected step raises λ and retries the SAME iteration, so the returned error is
 * MONOTONE — it can only decrease. This is what reliably closes a mate that a redundant
 * chain can physically close but fixed-λ DLS stalls short of.
 *
 * Targets the body `tipId`'s full pose (tgtPos + tgtQuat). Returns the best joint values
 * found (never worse than the start). oriWeight balances rad-vs-metre in the blended error;
 * it only shapes the path — at a reachable exact solution both parts reach zero regardless.
 */
export function solvePoseIKLM(
  doc: any,
  tipId: string,
  tgtPos: THREE.Vector3,
  tgtQuat: THREE.Quaternion,
  opts: { iterations?: number; oriWeight?: number; tol?: number; lambda0?: number; maxStep?: number } = {},
  rootBodyId?: string | null,
): Record<string, number> | null {
  const { iterations = 140, oriWeight = 0.5, tol = 2e-4, lambda0 = 0.1, maxStep = 0.35 } = opts;
  const chain = chainJoints(doc, tipId, rootBodyId);
  if (chain.length === 0) return null;

  const values: Record<string, number> = {};
  for (const j of chain) values[j.id] = j.state?.value ?? 0;
  const q = tgtQuat.clone().normalize();

  // Blended 6-DOF error vector for a candidate pose.
  const errVec = (pose: { pos: THREE.Vector3; quat: THREE.Quaternion }): number[] => {
    const ep = tgtPos.clone().sub(pose.pos);
    const qErr = q.clone().multiply(pose.quat.clone().invert());
    const er = rotVec(qErr).multiplyScalar(oriWeight);
    return [ep.x, ep.y, ep.z, er.x, er.y, er.z];
  };
  const norm = (e: number[]) => Math.hypot(...e);
  const errAt = (v: Record<string, number>) => norm(errVec(tipPose(doc, tipId, v)));

  let lambda = lambda0;
  let curErr = errAt(values);
  const best = { vals: { ...values }, err: curErr };

  for (let iter = 0; iter < iterations && curErr > tol; iter++) {
    const base = tipPose(doc, tipId, values);
    const e = errVec(base);

    // Numerical Jacobian: 6 rows × n cols.
    const cols: number[][] = chain.map((j) => {
      const eps = 1e-4;
      const v0 = values[j.id];
      values[j.id] = v0 + eps;
      const p = tipPose(doc, tipId, values);
      values[j.id] = v0;
      const dp = p.pos.clone().sub(base.pos).divideScalar(eps);
      const dr = rotVec(p.quat.clone().multiply(base.quat.clone().invert())).divideScalar(eps).multiplyScalar(oriWeight);
      return [dp.x, dp.y, dp.z, dr.x, dr.y, dr.z];
    });

    // Try a step; accept only if it reduces error, else raise λ and retry (up to a few tries).
    let accepted = false;
    for (let t = 0; t < 6; t++) {
      const l2 = lambda * lambda;
      const A: number[][] = Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => {
          let s = 0; for (const col of cols) s += col[r] * col[c];
          return r === c ? s + l2 : s;
        }));
      const y = solveLinear(A, e);
      if (!y) { lambda = Math.min(lambda * 3, 50); continue; }

      const cand: Record<string, number> = { ...values };
      chain.forEach((j, k) => {
        const col = cols[k];
        let dq = 0; for (let r = 0; r < 6; r++) dq += col[r] * y[r];
        if (dq > maxStep) dq = maxStep; else if (dq < -maxStep) dq = -maxStep;
        cand[j.id] = clampLimit(j, cand[j.id] + dq);
      });
      const candErr = errAt(cand);
      if (candErr < curErr - 1e-9) {
        for (const id of Object.keys(cand)) values[id] = cand[id];
        curErr = candErr;
        lambda = Math.max(lambda * 0.5, 1e-3); // success → trust the model more
        accepted = true;
        break;
      }
      lambda = Math.min(lambda * 3, 50); // failure → back off toward gradient descent
    }
    if (curErr < best.err) { best.err = curErr; best.vals = { ...values }; }
    if (!accepted) break; // genuinely stuck at this λ range
  }

  return best.vals;
}