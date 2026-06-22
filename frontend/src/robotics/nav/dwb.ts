/**
 * dwb — Dynamic-Window-Based local planner (Nav2's DWB / DWA controller, native).
 *
 * Given the robot's current pose + velocity and a goal, sample admissible (v, ω)
 * commands within the dynamic window (reachable in one step under accel limits), roll
 * each out forward over a short horizon, reject paths that hit lethal cost, and score
 * the survivors by progress-to-goal + heading + clearance + speed. Returns the best
 * command — the reactive layer beneath the global plan. Pure, node-testable.
 */
import type { CostGrid } from './costmap';
import { costAt, LETHAL } from './costmap';

export interface Pose2D { x: number; y: number; theta: number }
export interface DWBConfig {
  vMax: number; vMin: number; wMax: number;
  accV: number; accW: number;
  dt: number; horizon: number;          // rollout step + total time
  vSamples: number; wSamples: number;
  wGoal: number; wHeading: number; wClear: number; wSpeed: number;
}

export const DEFAULT_DWB: DWBConfig = {
  vMax: 0.6, vMin: 0, wMax: 1.5, accV: 1.0, accW: 2.5,
  dt: 0.1, horizon: 1.2, vSamples: 7, wSamples: 15,
  wGoal: 2.0, wHeading: 0.6, wClear: 0.8, wSpeed: 0.3,
};

export interface DWBResult { v: number; w: number; score: number; rollout: Pose2D[] }

function rollout(pose: Pose2D, v: number, w: number, cfg: DWBConfig): Pose2D[] {
  const steps = Math.max(1, Math.round(cfg.horizon / cfg.dt));
  const path: Pose2D[] = [];
  let { x, y, theta } = pose;
  for (let i = 0; i < steps; i++) {
    theta += w * cfg.dt;
    x += v * Math.cos(theta) * cfg.dt;
    y += v * Math.sin(theta) * cfg.dt;
    path.push({ x, y, theta });
  }
  return path;
}

export function planDWB(pose: Pose2D, vel: { v: number; w: number }, goal: { x: number; y: number },
  cm: CostGrid, cfg: DWBConfig = DEFAULT_DWB): DWBResult | null {
  // dynamic window: velocities reachable within accel limits this step
  const vLo = Math.max(cfg.vMin, vel.v - cfg.accV * cfg.dt);
  const vHi = Math.min(cfg.vMax, vel.v + cfg.accV * cfg.dt);
  const wLo = Math.max(-cfg.wMax, vel.w - cfg.accW * cfg.dt);
  const wHi = Math.min(cfg.wMax, vel.w + cfg.accW * cfg.dt);

  let best: DWBResult | null = null;
  const d0 = Math.hypot(goal.x - pose.x, goal.y - pose.y) || 1;

  for (let iv = 0; iv < cfg.vSamples; iv++) {
    const v = cfg.vSamples > 1 ? vLo + (vHi - vLo) * (iv / (cfg.vSamples - 1)) : vLo;
    for (let iw = 0; iw < cfg.wSamples; iw++) {
      const w = cfg.wSamples > 1 ? wLo + (wHi - wLo) * (iw / (cfg.wSamples - 1)) : wLo;
      const path = rollout(pose, v, w, cfg);

      // reject if any sampled pose lands on lethal cost; accumulate cost otherwise
      let maxCost = 0, hit = false;
      for (const p of path) { const c = costAt(cm, p.x, p.y); if (c >= LETHAL) { hit = true; break; } maxCost = Math.max(maxCost, c); }
      if (hit) continue;

      const end = path[path.length - 1];
      const dGoal = Math.hypot(goal.x - end.x, goal.y - end.y);
      const goalScore = 1 - dGoal / d0;                          // closer is better
      const headAngle = Math.atan2(goal.y - end.y, goal.x - end.x);
      let dh = Math.abs(((headAngle - end.theta + Math.PI) % (2 * Math.PI)) - Math.PI);
      const headScore = 1 - dh / Math.PI;                        // facing goal is better
      const clearScore = 1 - maxCost;                            // away from obstacles
      const speedScore = cfg.vMax > 0 ? v / cfg.vMax : 0;

      const score = cfg.wGoal * goalScore + cfg.wHeading * headScore + cfg.wClear * clearScore + cfg.wSpeed * speedScore;
      if (!best || score > best.score) best = { v, w, score, rollout: path };
    }
  }
  return best;
}
