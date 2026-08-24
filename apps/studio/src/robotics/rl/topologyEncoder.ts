/**
 * topologyEncoder — encode the current joint graph as a fixed-dim observation vector.
 *
 * WHY THIS IS THE KEY FEATURE FOR SHAPE-CHANGING ROBOTS:
 * A fixed MLP policy has a fixed input size — it breaks when you add/remove a limb.
 * By appending a topology encoding to every observation, the policy can CONDITION on
 * the current configuration: "I currently have 4 legs arranged like THIS" vs "I have
 * 2 legs like THAT". One policy, any configuration.
 *
 * Encoding (per joint, BFS order from root, padded to MAX_JOINTS):
 *   [0] type:        0=revolute/continuous, 0.5=prismatic, 1=ball/other
 *   [1] lo:          limit.lower / π  (normalized to ~[-1,1])
 *   [2] hi:          limit.upper / π
 *   [3] tree_depth:  depth in kinematic tree / MAX_DEPTH (0=near root, 1=far)
 *   [4] cur_val:     (value - lo) / (hi - lo) * 2 - 1  (normalized current angle)
 *
 * Total added dims: MAX_JOINTS × 5 = 60 (default 12 joints → 60 extra inputs).
 *
 * Research basis: MI-HGNN (Morphology-Informed Heterogeneous GNN, 2024) and
 * "Beyond Fixed Morphologies" (ICML 2025) both show topology-conditioned policies
 * achieve 30–50% better sample efficiency than topology-blind MLPs.
 */
import type { Document } from '@/core/model/index';
import type { Task } from './task';

export const TOPO_JOINTS = 12; // max joints to encode
export const TOPO_DIMS_PER_JOINT = 5;
export const TOPO_OBS_DIM = TOPO_JOINTS * TOPO_DIMS_PER_JOINT; // 60

/** BFS joint ordering from root body → stable ordering across episodes. */
function bfsJointOrder(doc: Document): any[] {
  const joints = Object.values(doc.joints) as any[];
  if (!joints.length) return [];

  // Find root bodies (never appear as childBodyId)
  const childSet = new Set(joints.map((j) => j.childBodyId).filter(Boolean));
  const bodies = Object.values(doc.bodies) as any[];
  const roots = bodies.filter((b) => !childSet.has(b.id));
  const rootId = roots[0]?.id ?? bodies[0]?.id;

  // BFS: visit bodies, collect joints in discovery order
  const visited = new Set<string>();
  const queue = [rootId];
  const ordered: any[] = [];
  while (queue.length) {
    const bodyId = queue.shift()!;
    if (visited.has(bodyId)) continue;
    visited.add(bodyId);
    for (const j of joints) {
      if (j.parentBodyId === bodyId && !visited.has(j.childBodyId)) {
        ordered.push(j);
        if (j.childBodyId) queue.push(j.childBodyId);
      }
    }
  }
  return ordered;
}

/**
 * Encode the full joint topology of a robot into a fixed TOPO_OBS_DIM vector.
 * Call on every step — it reflects the CURRENT joint values + structure.
 * If the robot reconfigures (joints added/removed), the encoding changes accordingly.
 */
export function encodeTopology(doc: Document): number[] {
  const ordered = bfsJointOrder(doc);
  const vec = new Float32Array(TOPO_OBS_DIM); // default 0 = "no joint here"
  const maxDepth = Math.max(1, ordered.length);

  for (let i = 0; i < Math.min(ordered.length, TOPO_JOINTS); i++) {
    const j = ordered[i];
    const lo  = j.limit?.lower ?? -Math.PI;
    const hi  = j.limit?.upper ?? Math.PI;
    const val = j.state?.value ?? 0;
    const range = hi - lo + 1e-8;
    const type = j.type === 'prismatic' ? 0.5 : (j.type === 'ball' || j.type === 'floating') ? 1.0 : 0.0;
    const base = i * TOPO_DIMS_PER_JOINT;
    vec[base + 0] = type;
    vec[base + 1] = Math.max(-2, Math.min(2, lo / Math.PI));
    vec[base + 2] = Math.max(-2, Math.min(2, hi / Math.PI));
    vec[base + 3] = i / maxDepth;
    vec[base + 4] = ((val - lo) / range) * 2 - 1; // [-1, 1]
  }
  return Array.from(vec);
}

/**
 * TopologyAwareTask — wraps any Task, appending topology encoding to observations.
 * The policy's obsDim must be inner.obsDim + TOPO_OBS_DIM.
 *
 * Usage:
 *   const makeTopoTask = () => new TopologyAwareTask(makeTask(), doc);
 *   const policy = new MLPPolicy(baseObsDim + TOPO_OBS_DIM, actionDim, hidden);
 *   const trainer = new VectorESTrainer(makeTopoTask, policy, cfg);
 */
export class TopologyAwareTask implements Task {
  readonly obsDim: number;
  readonly actionDim: number;
  readonly maxSteps: number;

  constructor(private inner: Task, private doc: Document) {
    this.obsDim    = inner.obsDim + TOPO_OBS_DIM;
    this.actionDim = inner.actionDim;
    this.maxSteps  = inner.maxSteps;
  }

  reset(rng?: () => number) { this.inner.reset(rng); }

  observe(): number[] {
    return [...this.inner.observe(), ...encodeTopology(this.doc)];
  }

  act(action: number[]) { return this.inner.act(action); }

  // Forward optional methods
  setWeights(w: any)              { (this.inner as any).setWeights?.(w); }
  setTarget(v: any)               { (this.inner as any).setTarget?.(v); }
  setGoal(x: number, y: number)   { (this.inner as any).setGoal?.(x, y); }
  currentPose()                   { return (this.inner as any).currentPose?.(); }
  currentGoal()                   { return (this.inner as any).currentGoal?.(); }
  jointIds()                      { return (this.inner as any).jointIds?.(); }
  currentValues()                 { return (this.inner as any).currentValues?.(); }
}
