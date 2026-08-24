/**
 * poseTask — joint-space pose matching task.
 *
 * Train a brain to drive any joint chain to a TARGET POSE (set of joint angles).
 * Useful for:
 *   - "hold this pose" (constant target)
 *   - "snap to keyframe N from the animation timeline"
 *   - "go to home position" (zeros)
 *   - pose interpolation (target changes over time)
 *
 * obs = [current joint values (×N), joint error to target (×N)]
 * act = per-joint velocity in [-1, 1]
 * reward = −joint_error + success_bonus − control − time
 */
import { chainJoints } from '@/kinematics/modelIK';
import { weightedReward, type Task, type RewardWeights } from './task';
import type { Document } from '@/core/model/index';

export const POSE_DEFAULT_WEIGHTS: RewardWeights = {
  match: 5,        // −sqrt(Σ err²) — penalty for joint-space distance
  arrive: 10,      // bonus for reaching target within tolerance
  control: -0.02,  // smooth motion
  alive: -0.01,
};

export class PoseTask implements Task {
  readonly obsDim: number;
  readonly actionDim: number;
  readonly maxSteps: number;

  private chain: any[];
  private ids: string[];
  private bounds: [number, number][];
  private values: number[];
  private target: number[];
  private step = 0;
  private weights: RewardWeights;
  private rng: () => number = Math.random;
  private doc: Document;
  private tipId: string;

  constructor(
    doc: Document,
    tipId: string,
    targetValues?: number[],
    opts: { maxSteps?: number; weights?: RewardWeights; rigidRoot?: string | null } = {},
  ) {
    this.doc = doc; this.tipId = tipId;
    this.chain = chainJoints(doc, tipId, opts.rigidRoot ?? null);
    this.ids = this.chain.map((j) => j.id);
    this.bounds = this.chain.map((j) => [j.limit?.lower ?? -Math.PI, j.limit?.upper ?? Math.PI] as [number, number]);
    this.values = this.chain.map((j) => j.state?.value ?? 0);
    this.target = targetValues?.length === this.chain.length ? [...targetValues] : this.chain.map(() => 0);
    this.actionDim = this.chain.length;
    this.obsDim = this.chain.length * 2;    // current values + error vector
    this.maxSteps = opts.maxSteps ?? 80;
    this.weights = opts.weights ?? { ...POSE_DEFAULT_WEIGHTS };
  }

  setTarget(values: number[]) { this.target = [...values]; }
  setWeights(w: RewardWeights) { this.weights = w; }
  jointIds() { return this.ids; }
  currentValues() { return this.values; }

  reset(rng: () => number = Math.random): void {
    this.rng = rng; this.step = 0;
    // Domain randomization: start from random in-bounds configuration
    this.values = this.bounds.map(([lo, hi]) => lo + rng() * (hi - lo));
  }

  observe(): number[] {
    return [...this.values, ...this.values.map((v, i) => this.target[i] - v)];
  }

  private error(): number {
    return Math.sqrt(this.values.reduce((s, v, i) => s + (v - this.target[i]) ** 2, 0));
  }

  act(action: number[]) {
    this.step++;
    const speed = 1.5, dt = 0.05;
    this.values = this.values.map((v, i) => {
      const nv = v + Math.max(-1, Math.min(1, action[i] ?? 0)) * speed * dt;
      const [lo, hi] = this.bounds[i];
      return Math.max(lo, Math.min(hi, nv));
    });
    const err = this.error();
    const arrived = err < 0.05 * Math.sqrt(this.chain.length); // joint-count-scaled tol
    const terms = {
      match: -err,
      arrive: arrived ? 1 : 0,
      control: action.reduce((s, a) => s + a * a, 0),
      alive: 1,
    };
    return {
      reward: weightedReward(terms, this.weights),
      done: arrived || this.step >= this.maxSteps,
      info: { error: err },
    };
  }
}
