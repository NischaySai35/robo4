/**
 * modelTask — a Task that trains a REAL robot chain in the model (kinematic reach).
 *
 * Bridges the generic RL engine (policy/task/trainer) to an actual manipulator: the
 * chain from a tip body to its root. Each episode randomizes a reachable target
 * (domain randomization) so the trained brain generalizes to any target, not one.
 * Observation = joint values + (target − tip); action = per-joint velocity in [-1,1].
 * Reward = weighted progress + success − control − time, via the shared term system.
 *
 * Kinematic + self-contained (keeps its own joint values, never mutates the doc) so a
 * whole population trains fast. Used by the Training panel and node tests.
 */
import { computeFK } from '@/kinematics/modelFK';
import { chainJoints } from '@/kinematics/modelIK';
import { weightedReward, type Task, type RewardWeights } from './task';
import { CollisionModel } from '@/robotics/collision';
import type { Document } from '@/core/model/index';

export const REACH_DEFAULT_WEIGHTS: RewardWeights = { progress: 10, success: 5, control: -0.01, alive: -0.01, collision: -0.5 };

export class ModelReachTask implements Task {
  readonly obsDim: number;
  readonly actionDim: number;
  readonly maxSteps: number;
  private doc: Document;
  private tipId: string;
  private chain: any[];
  private ids: string[];
  private bounds: [number, number][];
  private values: number[];
  private base: [number, number, number];
  private reach: number;
  private target: [number, number, number] = [0, 0, 0];
  private step = 0;
  private prevDist = 0;
  private weights: RewardWeights;
  private rng: () => number = Math.random;
  private cm: CollisionModel;

  constructor(doc: Document, tipId: string, opts: { maxSteps?: number; weights?: RewardWeights; rigidRoot?: string | null } = {}) {
    this.doc = doc;
    this.tipId = tipId;
    // With a rigid grounding, walk the GRAPH from the grounded base to the tip so the
    // chain spans every joint in between (not just the tip's tree-ancestors — which,
    // when the base is grounded far from the tree root, would move only the top joints).
    this.chain = chainJoints(doc, tipId, opts.rigidRoot ?? null);
    this.ids = this.chain.map((j) => j.id);
    this.bounds = this.chain.map((j) => [j.limit?.lower ?? -Math.PI, j.limit?.upper ?? Math.PI] as [number, number]);
    this.values = this.chain.map((j) => j.state?.value ?? 0);
    // Self/world collision so motion is RIGID — the arm can't fold through itself.
    // Self-collision only — no world floor. A reach arm rests ON the ground (base
    // below y=0), so a floor check would report collision in every pose and freeze it.
    this.cm = new CollisionModel(doc, 0, { floor: false });
    this.actionDim = this.chain.length;
    this.obsDim = this.chain.length + 3;
    this.maxSteps = opts.maxSteps ?? 80;
    this.weights = opts.weights ?? { ...REACH_DEFAULT_WEIGHTS };

    // workspace estimate: base = root of the chain, reach = base→rest-tip distance.
    const fk = computeFK(doc);
    const rootJoint = this.chain[0];
    const basePos = fk.get(rootJoint?.parentBodyId)?.position ?? [0, 0, 0];
    this.base = [basePos[0], basePos[1], basePos[2]];
    const tip = fk.get(tipId)?.position ?? this.base;
    this.reach = Math.max(0.2, Math.hypot(tip[0] - this.base[0], tip[1] - this.base[1], tip[2] - this.base[2]));
  }

  setWeights(w: RewardWeights) { this.weights = w; }
  jointIds() { return this.ids; }
  /** Workspace centre (root of the chain) and approximate max reach, so callers can
   *  clamp a user-placed target into the arm's physically reachable sphere. */
  workspaceCenter(): [number, number, number] { return this.base; }
  reachRadius(): number { return this.reach; }
  currentTarget() { return this.target; }
  currentValues() { return this.values; }
  /** Override the goal (used by interactive "reach to this point" runs). */
  setTarget(p: [number, number, number]) { this.target = p; this.prevDist = this.distance(); }
  /** Distance from the tip to the current target (for live readouts). */
  tipDistance() { return this.distance(); }

  private tip(): [number, number, number] {
    const joints: any = { ...this.doc.joints };
    this.chain.forEach((j, i) => { joints[j.id] = { ...j, state: { ...j.state, value: this.values[i] } }; });
    const p = computeFK({ ...this.doc, joints }).get(this.tipId)?.position ?? [0, 0, 0];
    return [p[0], p[1], p[2]];
  }

  /** True if a joint configuration self/world-collides. */
  private collides(vals: number[]): boolean {
    const map: Record<string, number> = {};
    this.ids.forEach((id, i) => { map[id] = vals[i]; });
    return !this.cm.collisionFree(map);
  }

  reset(rng: () => number = Math.random, opts: { randomizeStart?: boolean; target?: [number, number, number] } = {}): void {
    this.rng = rng;
    this.step = 0;
    // Start pose: random in-limits (training: domain randomization) or home/zeros
    // (watch playback: looks sensible). Re-sample a few times to avoid starting in a
    // self-collided pose.
    if (opts.randomizeStart === false) {
      this.values = this.bounds.map(([lo, hi]) => Math.max(lo, Math.min(hi, 0)));
    } else {
      this.values = this.bounds.map(([lo, hi]) => lo + rng() * (hi - lo));
      for (let tries = 0; tries < 8 && this.collides(this.values); tries++) {
        this.values = this.bounds.map(([lo, hi]) => lo + rng() * (hi - lo));
      }
    }
    // random reachable target: a point in a spherical shell around the base
    const u = 0.4 + rng() * 0.55;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const r = this.reach * u;
    this.target = opts.target ?? [
      this.base[0] + r * Math.sin(phi) * Math.cos(theta),
      this.base[1] + r * Math.cos(phi) * 0.7,        // bias toward horizontal targets
      this.base[2] + r * Math.sin(phi) * Math.sin(theta),
    ];
    this.prevDist = this.distance();
  }

  private distance(): number {
    const t = this.tip();
    return Math.hypot(t[0] - this.target[0], t[1] - this.target[1], t[2] - this.target[2]);
  }

  observe(): number[] {
    const t = this.tip();
    return [...this.values, this.target[0] - t[0], this.target[1] - t[1], this.target[2] - t[2]];
  }

  act(action: number[]) {
    this.step++;
    const speed = 1.6, dt = 0.08;
    const proposed = this.values.map((v, i) => {
      const nv = v + Math.max(-1, Math.min(1, action[i] ?? 0)) * speed * dt;
      const [lo, hi] = this.bounds[i];
      return Math.max(lo, Math.min(hi, nv));
    });
    // RIGID: if the move would push parts into each other (or an obstacle), reject it
    // and hold position — the arm stops at contact instead of passing through. Training
    // is penalized so it learns collision-free motion.
    const hit = this.collides(proposed);
    if (!hit) this.values = proposed;

    const d = this.distance();
    const success = d < 0.06;
    const terms = {
      progress: this.prevDist - d,
      success: success ? 1 : 0,
      control: action.reduce((s, a) => s + a * a, 0),
      alive: 1,
      collision: hit ? 1 : 0,
    };
    this.prevDist = d;
    // `terms` (raw) + `collided` are surfaced so the Training panel can log a
    // per-term reward breakdown and see WHICH term dominates the score.
    return { reward: weightedReward(terms, this.weights), done: success || this.step >= this.maxSteps, info: { dist: d, terms, collided: hit } };
  }
}
