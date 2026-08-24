/**
 * gymEnv — a Gym-style reinforcement-learning environment over the model. This is
 * the training-pipeline interface (reset / step / spaces / reward) you'd plug a
 * policy (PPO/SAC/…) into. The sample task is "reach": drive a manipulator chain's
 * tip to a target; reward = closing distance, done on success or timeout.
 *
 * It is kinematic and self-contained (keeps its own joint state, never mutates the
 * doc) so it's fast and deterministic. A physics-backed env (balance/locomotion
 * over Rapier) is Phase 6 — same interface, different dynamics.
 */
import { computeFK } from '@/kinematics/modelFK';
import { chainJoints } from '@/kinematics/modelIK';
import type { Document } from '@/core/model/index';

export interface StepResult { obs: number[]; reward: number; done: boolean; info: { dist: number; step: number }; }

export class ReachEnv {
  doc: Document;
  tipId: string;
  target: [number, number, number];
  chain: any[];
  bounds: [number, number][];
  values: number[];
  maxSteps: number;
  dt: number;
  private _step = 0;
  private _prevDist = 0;

  constructor(doc: Document, tipId: string, target: [number, number, number], opts: { maxSteps?: number; dt?: number } = {}) {
    this.doc = doc;
    this.tipId = tipId;
    this.target = target;
    this.chain = chainJoints(doc, tipId);
    this.bounds = this.chain.map((j) => [j.limit?.lower ?? -Math.PI, j.limit?.upper ?? Math.PI] as [number, number]);
    this.values = this.chain.map((j) => j.state?.value ?? 0);
    this.maxSteps = opts.maxSteps ?? 200;
    this.dt = opts.dt ?? 0.08;
  }

  get actionDim() { return this.chain.length; }       // joint velocity per DOF, in [-1,1]
  get obsDim() { return this.chain.length + 3; }       // joint values + (target - tip)
  jointIds() { return this.chain.map((j) => j.id); }

  private tip(): [number, number, number] {
    const joints: any = {};
    for (const [id, j] of Object.entries(this.doc.joints)) joints[id] = j;
    this.chain.forEach((j, i) => { joints[j.id] = { ...j, state: { ...j.state, value: this.values[i] } }; });
    const fk = computeFK({ ...this.doc, joints });
    const p = fk.get(this.tipId)?.position ?? [0, 0, 0];
    return [p[0], p[1], p[2]];
  }

  private observation(): number[] {
    const t = this.tip();
    return [...this.values, this.target[0] - t[0], this.target[1] - t[1], this.target[2] - t[2]];
  }

  reset(): number[] {
    this._step = 0;
    this.values = this.chain.map((j) => j.state?.value ?? 0);
    const t = this.tip();
    this._prevDist = Math.hypot(...t.map((v, i) => v - this.target[i]));
    return this.observation();
  }

  /** action: per-DOF velocity in [-1,1] (rad/s scaled by dt). */
  step(action: number[]): StepResult {
    this._step++;
    const speed = 1.6;
    this.values = this.values.map((v, i) => {
      const nv = v + (action[i] ?? 0) * speed * this.dt;
      const [lo, hi] = this.bounds[i];
      return Math.max(lo, Math.min(hi, nv));
    });
    const t = this.tip();
    const dist = Math.hypot(...t.map((v, i) => v - this.target[i]));
    // reward: progress toward target, small control penalty, success bonus.
    const progress = this._prevDist - dist;
    const ctrl = 0.001 * action.reduce((s, a) => s + a * a, 0);
    let reward = progress * 10 - ctrl - 0.01;
    const success = dist < 0.05;
    if (success) reward += 5;
    this._prevDist = dist;
    const done = success || this._step >= this.maxSteps;
    return { obs: this.observation(), reward, done, info: { dist, step: this._step } };
  }
}

/** A trivial built-in policy: greedy descent (Jacobian-free) — proportional to the
 *  target error projected onto each joint. Stand-in for a trained network. */
export function greedyPolicy(env: ReachEnv, obs: number[]): number[] {
  // Last 3 obs are (target - tip); nudge each joint by a small random-but-biased
  // signal. A real policy replaces this; here we just demonstrate the loop.
  const err = obs.slice(-3);
  const mag = Math.hypot(err[0], err[1], err[2]) || 1;
  return env.jointIds().map(() => (Math.random() - 0.5) * 0.4 + (err[1] / mag) * 0.3);
}
