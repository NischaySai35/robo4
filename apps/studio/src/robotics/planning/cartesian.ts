/**
 * cartesian — straight-line (task-space) path planning (MoveIt's computeCartesianPath).
 *
 * Joint-space planners (RRT) move the tip along arbitrary curves. Many tasks need the
 * END-EFFECTOR to follow a Cartesian line (insert a peg, draw a seam). We interpolate
 * the tip position in world space over N steps and solve IK at each, seeding from the
 * previous solution for continuity. Returns the joint-space waypoints (one per step)
 * and the achieved fraction of the requested path. Node-testable on a real arm.
 */
import { solveModelIK, chainJoints } from '@/kinematics/modelIK';
import { computeFK } from '@/kinematics/modelFK';
import type { Document } from '@/core/model/index';

function withJointValues(doc: any, vals: Record<string, number>): any {
  const joints: any = { ...doc.joints };
  for (const [id, v] of Object.entries(vals)) { const j = joints[id]; if (j) joints[id] = { ...j, state: { ...j.state, value: v } }; }
  return { ...doc, joints };
}

export interface CartesianResult {
  /** joint-value vectors (chain order) for each achieved waypoint */
  path: number[][];
  ids: string[];
  /** fraction of the requested Cartesian path achieved within tolerance [0,1] */
  fraction: number;
}

/**
 * Plan a Cartesian move of the tip from its current position to `targetPos` (world),
 * in `steps` linear increments. `eefStep` failure tolerance (m) decides when a step's
 * IK is "good enough"; the fraction stops at the first unreachable step.
 */
export function planCartesian(doc: Document, tipId: string, targetPos: [number, number, number],
  opts: { steps?: number; tol?: number } = {}): CartesianResult | null {
  const chain = chainJoints(doc, tipId);
  if (!chain.length) return null;
  const steps = opts.steps ?? 20;
  const tol = opts.tol ?? 0.02;
  const ids = chain.map((j: any) => j.id);

  const fk0 = computeFK(doc);
  const start = fk0.get(tipId)?.position as [number, number, number] | undefined;
  if (!start) return null;

  const path: number[][] = [];
  let cur = doc as any;
  let achieved = 0;
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    const target: [number, number, number] = [
      start[0] + (targetPos[0] - start[0]) * f,
      start[1] + (targetPos[1] - start[1]) * f,
      start[2] + (targetPos[2] - start[2]) * f,
    ];
    const sol = solveModelIK(cur, tipId, target, { iterations: 40 });
    if (!sol) break;
    cur = withJointValues(cur, sol);
    const tip = computeFK(cur).get(tipId)?.position as [number, number, number];
    const err = Math.hypot(tip[0] - target[0], tip[1] - target[1], tip[2] - target[2]);
    if (err > tol) break;                 // step unreachable → stop, report fraction
    path.push(ids.map((id) => sol[id]));
    achieved = f;
  }

  return { path, ids, fraction: achieved };
}
