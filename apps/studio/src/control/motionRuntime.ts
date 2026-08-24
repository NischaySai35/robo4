/**
 * motionRuntime — the "move_group" of TETROBOT: plan a collision-free path over a
 * joint chain, time-parameterize it to a limit-respecting trajectory, and execute it
 * by streaming joint values into the model (which republishes /joint_states + /tf).
 *
 * Exposed through the runtime so the rest of the app drives motion uniformly:
 *   action  /move_group        goal {tipId, goalConfig?, planner?} → feedback progress
 *   service /motion/plan        {tipId, goalConfig, planner} → path (waypoints)
 *
 * Planners: 'rrt' | 'rrtstar' | 'prm'. Velocity limits come from each joint's URDF
 * limit.velocity (fallback param); acceleration = velocity × /motion/accel_scale.
 */
import { actions } from '@/runtime/actions';
import { services } from '@/runtime/services';
import { params } from '@/runtime/params';
import { useModelStore } from '@/state/modelStore';
import { chainJoints } from '@/kinematics/modelIK';
import { computeFK } from '@/kinematics/modelFK';
import { CollisionModel } from '@/robotics/collision';
import { planRRT } from '@/robotics/planning/rrt';
import { planRRTStar, planPRM } from '@/robotics/planning/rrtstar';
import { timeParameterize, blendCorners, type TimedTrajectory } from '@/robotics/planning/trajectory';
import { planCartesian } from '@/robotics/planning/cartesian';
import { physicsBridge } from '@/viewport/physicsBridge';
import type { Document } from '@/core/model/index';

export type Planner = 'rrt' | 'rrtstar' | 'prm' | 'cartesian';

export interface ChainContext {
  chain: any[];
  ids: string[];
  bounds: [number, number][];
  start: number[];
  vMax: number[];
  aMax: number[];
  jMax: number[];
  collisionFree: (q: number[]) => boolean;
}

/** Apply joint values to a doc immutably (transient execution helper). */
export function withJointValues(doc: any, vals: Record<string, number>): any {
  const joints: any = { ...doc.joints };
  for (const [id, v] of Object.entries(vals)) {
    const j = joints[id];
    if (j) joints[id] = { ...j, state: { ...j.state, value: v } };
  }
  return { ...doc, joints };
}

export function chainContext(doc: Document, tipId: string): ChainContext | null {
  const chain = chainJoints(doc, tipId);
  if (!chain.length) return null;
  const vDefault = params.getOr('/motion/default_vmax', 1.5);
  const accelScale = params.getOr('/motion/accel_scale', 2.0);
  const jerkScale = params.getOr('/motion/jerk_scale', 10.0);
  const start = chain.map((j: any) => j.state?.value ?? 0);
  const bounds = chain.map((j: any) => [j.limit?.lower ?? -Math.PI, j.limit?.upper ?? Math.PI] as [number, number]);
  const vMax = chain.map((j: any) => (j.limit?.velocity && j.limit.velocity > 0 ? j.limit.velocity : vDefault));
  const aMax = vMax.map((v) => v * accelScale);
  const jMax = aMax.map((a) => a * jerkScale);
  const cm = new CollisionModel(doc, 0);
  const ids = chain.map((j: any) => j.id);
  const collisionFree = (q: number[]) => {
    const vals: Record<string, number> = {};
    ids.forEach((id, i) => { vals[id] = q[i]; });
    return cm.collisionFree(vals);
  };
  return { chain, ids, bounds, start, vMax, aMax, jMax, collisionFree };
}

/** Sample a collision-free goal config (used when none is supplied). */
export function sampleGoal(ctx: ChainContext, tries = 200): number[] | null {
  for (let i = 0; i < tries; i++) {
    const q = ctx.bounds.map(([lo, hi]) => lo + Math.random() * (hi - lo));
    if (ctx.collisionFree(q)) return q;
  }
  return null;
}

export function planPath(ctx: ChainContext, goal: number[], planner: Planner): number[][] | null {
  const opts = { bounds: ctx.bounds, collisionFree: ctx.collisionFree, step: 0.18, maxIter: 2500, goalBias: 0.15 };
  if (planner === 'rrtstar') return planRRTStar(ctx.start, goal, opts);
  if (planner === 'prm') return planPRM(ctx.start, goal, { ...opts, samples: 350, k: 12 });
  return planRRT(ctx.start, goal, opts);
}

/** Plan + time-parameterize into an executable trajectory. */
export function planTrajectory(doc: Document, tipId: string, goal: number[] | null, planner: Planner)
  : { ctx: ChainContext; traj: TimedTrajectory } | null {
  const ctx = chainContext(doc, tipId);
  if (!ctx) return null;

  let path: number[][] | null;
  if (planner === 'cartesian') {
    // Straight task-space line: move the tip +0.3 m in world X from its current pose.
    const tip = computeFK(doc).get(tipId)?.position as [number, number, number] | undefined;
    if (!tip) return null;
    const res = planCartesian(doc, tipId, [tip[0] + 0.3, tip[1], tip[2]], { steps: 24, tol: 0.05 });
    path = res && res.path.length ? res.path : null;
  } else {
    const g = goal ?? sampleGoal(ctx);
    if (!g) return null;
    path = planPath(ctx, g, planner);
  }
  if (!path) return null;
  // Smooth the path before timing it: round sharp corners (bounded joint acceleration)
  // and run a jerk-limited S-curve profile (drive-friendly). Both are parameterized so
  // they can be disabled (blend radius 0 / jerk scale 0) for the original behavior.
  const blendR = params.getOr('/motion/blend_radius', 0.1);
  const smooth = blendR > 0 ? blendCorners(path, blendR) : path;
  const jMax = ctx.jMax.some((j) => j > 0) ? ctx.jMax : undefined;
  const traj = timeParameterize(smooth, { vMax: ctx.vMax, aMax: ctx.aMax, jMax });
  return { ctx, traj };
}

let _inited = false;

export function initMotionRuntime(): void {
  if (_inited) return;
  _inited = true;

  params.declare({ name: '/motion/default_vmax', type: 'number', value: 1.5, min: 0.1, max: 10, step: 0.1,
    description: 'Default joint velocity limit (rad/s) when a joint has none' });
  params.declare({ name: '/motion/accel_scale', type: 'number', value: 2.0, min: 0.2, max: 10, step: 0.1,
    description: 'Acceleration limit = velocity × this' });
  params.declare({ name: '/motion/jerk_scale', type: 'number', value: 10.0, min: 0, max: 50, step: 0.5,
    description: 'Jerk limit = acceleration × this (0 = trapezoidal, no jerk limit)' });
  params.declare({ name: '/motion/blend_radius', type: 'number', value: 0.1, min: 0, max: 1, step: 0.01,
    description: 'Corner-blend radius in joint space (0 = sharp corners)' });

  // service: plan only (returns waypoints)
  // Cartesian move service: tip follows a straight world-space line to targetPos.
  services.advertise<{ tipId: string; targetPos: [number, number, number]; steps?: number }, { fraction: number; states: number }>(
    '/motion/cartesian', (req) => {
      const doc = useModelStore.getState().doc;
      const res = planCartesian(doc, req.tipId, req.targetPos, { steps: req.steps ?? 24 });
      if (!res) return { fraction: 0, states: 0 };
      return { fraction: res.fraction, states: res.path.length };
    });

  services.advertise<{ tipId: string; goalConfig?: number[]; planner?: Planner }, number[][] | null>(
    '/motion/plan', (req) => {
      const doc = useModelStore.getState().doc;
      const ctx = chainContext(doc, req.tipId);
      if (!ctx) return null;
      const g = req.goalConfig ?? sampleGoal(ctx);
      if (!g) return null;
      return planPath(ctx, g, req.planner ?? 'rrtstar');
    });

  // action: plan + execute, streaming progress 0..1
  actions.advertise<{ tipId: string; goalConfig?: number[]; planner?: Planner }, { phase: string; progress: number }, { ok: boolean; states: number; cost: number }>(
    '/move_group', async (goal, ctx) => {
      const doc = useModelStore.getState().doc;
      ctx.report({ phase: 'planning', progress: 0 });
      const planned = planTrajectory(doc, goal.tipId, goal.goalConfig ?? null, goal.planner ?? 'rrtstar');
      if (!planned) throw new Error('planning failed (no collision-free path)');
      const { ctx: cc, traj } = planned;
      if (ctx.signal.aborted) return { ok: false, states: traj.waypoints.length, cost: 0 };

      // execute over wall time, applying sampled joint values transiently
      await new Promise<void>((resolve) => {
        const t0 = performance.now();
        const tick = () => {
          if (ctx.signal.aborted) { resolve(); return; }
          const t = (performance.now() - t0) / 1000;
          const q = traj.duration > 0 ? traj.sample(t) : traj.waypoints[traj.waypoints.length - 1];
          const vals: Record<string, number> = {};
          cc.ids.forEach((id, i) => { vals[id] = q[i]; });
          // Closed-loop when physics is live: command motor targets so the simulated
          // arm tracks the setpoint under gravity/contacts. Else teleport (kinematic).
          if (physicsBridge.active()) physicsBridge.setJointTargets(vals);
          else useModelStore.getState().applyTransient((dd) => withJointValues(dd, vals));
          const p = traj.duration > 0 ? Math.min(1, t / traj.duration) : 1;
          ctx.report({ phase: 'executing', progress: p });
          if (t >= traj.duration) { resolve(); return; }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      let cost = 0;
      for (let i = 1; i < traj.waypoints.length; i++)
        cost += Math.hypot(...traj.waypoints[i].map((v, k) => v - traj.waypoints[i - 1][k]));
      return { ok: !ctx.signal.aborted, states: traj.waypoints.length, cost };
    });
}
