/**
 * task — what "training" actually optimizes. A Task defines the LEARNING PROBLEM,
 * decoupled from the robot and the optimizer:
 *
 *   obsDim/actionDim  — the sizes of the observation and action vectors (the policy
 *                       I/O contract).
 *   reset(rng)        — start a new episode, randomizing start + GOAL (this is
 *                       "domain randomization": training on many random situations so
 *                       the learned brain generalizes instead of memorizing one).
 *   observe()         — the sensory vector the policy sees this step.
 *   act(action)       — apply the action, advance one step, return the REWARD (the
 *                       scalar that says how good that step was) + done.
 *
 * A reward is a weighted sum of named TERMS (progress, control penalty, success
 * bonus, upright, energy…). Editing those weights is how you tell the robot what
 * "good" means — the whole skill of RL. Pure & node-testable.
 */
export interface StepOutcome { reward: number; done: boolean; info?: Record<string, number> }

export interface Task {
  readonly obsDim: number;
  readonly actionDim: number;
  reset(rng?: () => number): void;
  observe(): number[];
  act(action: number[]): StepOutcome;
  readonly maxSteps: number;
}

export type TaskFactory = () => Task;

/** Reward as named weighted terms — readable, tunable, and inspectable in the UI. */
export type RewardWeights = Record<string, number>;
export function weightedReward(terms: Record<string, number>, weights: RewardWeights): number {
  let r = 0;
  for (const k in terms) r += terms[k] * (weights[k] ?? 1);
  return r;
}

/**
 * PointReachTask — a self-contained benchmark: a point "robot" in R^d must drive
 * itself to a randomly-placed goal. No model/FK needed, so it's a fast, deterministic
 * way to verify the trainer + policies (and a perfect teaching example of obs/action/
 * reward). Action = velocity per axis in [-1,1]; obs = position + (goal - position).
 */
export class PointReachTask implements Task {
  readonly dim: number;
  readonly obsDim: number;
  readonly actionDim: number;
  readonly maxSteps: number;
  private pos: number[];
  private goal: number[];
  private step = 0;
  private prevDist = 0;
  private weights: RewardWeights;
  private rng: () => number = Math.random;

  constructor(dim = 2, opts: { maxSteps?: number; weights?: RewardWeights } = {}) {
    this.dim = dim;
    this.obsDim = dim * 2;     // position + error-to-goal
    this.actionDim = dim;
    this.maxSteps = opts.maxSteps ?? 60;
    this.pos = new Array(dim).fill(0);
    this.goal = new Array(dim).fill(0);
    this.weights = opts.weights ?? { progress: 10, control: -0.01, success: 5, alive: -0.01 };
  }

  reset(rng: () => number = Math.random): void {
    this.rng = rng;
    this.step = 0;
    this.pos = new Array(this.dim).fill(0).map(() => (rng() * 2 - 1) * 0.2);
    this.goal = new Array(this.dim).fill(0).map(() => (rng() * 2 - 1)); // random goal each episode
    this.prevDist = this.dist();
  }
  private dist(): number { return Math.hypot(...this.pos.map((p, i) => p - this.goal[i])); }
  observe(): number[] { return [...this.pos, ...this.goal.map((g, i) => g - this.pos[i])]; }

  act(action: number[]): StepOutcome {
    this.step++;
    const speed = 0.15;
    for (let i = 0; i < this.dim; i++) {
      this.pos[i] += Math.max(-1, Math.min(1, action[i] ?? 0)) * speed;
    }
    const d = this.dist();
    const success = d < 0.08;
    const terms = {
      progress: this.prevDist - d,                              // moved closer
      control: action.reduce((s, a) => s + a * a, 0),           // effort (penalized via weight<0)
      success: success ? 1 : 0,                                 // bonus
      alive: 1,                                                 // per-step cost (weight<0)
    };
    this.prevDist = d;
    return { reward: weightedReward(terms, this.weights), done: success || this.step >= this.maxSteps, info: { dist: d } };
  }
}
