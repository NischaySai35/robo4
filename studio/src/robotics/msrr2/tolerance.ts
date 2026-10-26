/**
 * tolerance.ts — how far each joint of a module can move from the current pose while the
 * whole robot stays physically OK (static check incl. sag, PLA flex, receiver play, tip push).
 * Sweeps one joint at a time in STEP_DEG steps outward until the check fails or the limit.
 * This is the "what movements are possible from here" map the Robot tab shows.
 */
import { type Config, type ModuleId, JOINTS, isBend, PLAN_BEND_DEG, CONFIG, cloneConfig, type JointName } from './model';
import { checkStatic } from './statics';

const STEP_DEG = 5;

export interface JointRange { joint: JointName; now: number; min: number; max: number; why: { min: string; max: string } }

export function jointTolerance(cfg: Config, module: ModuleId): JointRange[] {
  const out: JointRange[] = [];
  for (const j of JOINTS) {
    const now = cfg.pose[module][j] - 180;
    const lim = isBend(j) ? PLAN_BEND_DEG : CONFIG.limits.twistDeg - 30;  // twists: the controller keeps 30° off the stops
    const reach = (dir: 1 | -1): { v: number; why: string } => {
      let v = now;
      for (;;) {
        const next = Math.max(-lim, Math.min(lim, v + dir * STEP_DEG));
        if (next === v) return { v, why: 'joint limit' };
        const c = cloneConfig(cfg); c.pose[module][j] = 180 + next;
        const r = checkStatic(c);
        if (!r.ok) return { v, why: r.reasons[0] ?? 'fails' };
        v = next;
      }
    };
    const lo = reach(-1), hi = reach(1);
    out.push({ joint: j, now, min: lo.v, max: hi.v, why: { min: lo.why, max: hi.why } });
  }
  return out;
}
