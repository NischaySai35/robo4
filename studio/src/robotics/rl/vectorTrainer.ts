/**
 * vectorTrainer — massively-parallel training via Evolution Strategies (the engine
 * behind "thousands of robots training simultaneously", Isaac-Gym style — but native).
 *
 * THE IDEA: instead of one robot learning by gradient, we spawn a POPULATION of N
 * slightly-mutated brains, run each on its OWN virtual robot (its own Task instance)
 * for a few randomized episodes, and measure each one's total reward (its "fitness").
 * Then we nudge the master brain θ toward the mutations that did better:
 *
 *     θ ← θ + α · (1 / (N·σ)) · Σ_i  Â_i · ε_i
 *
 * where ε_i is candidate i's mutation and Â_i its rank-normalized advantage. No
 * gradients, no autodiff, no backprop — just running many robots and keeping what
 * works. That is exactly why it scales to thousands of parallel envs and to ANY robot
 * (arm, humanoid, ball, modular) and ANY reward. Pure & node-testable.
 *
 * Refinements included: ANTITHETIC sampling (evaluate +ε and −ε — halves variance),
 * RANK normalization (robust to reward outliers), DOMAIN RANDOMIZATION (each episode
 * re-randomizes the task via a seeded RNG), and multiple episodes per candidate.
 */
import type { Task, TaskFactory } from './task';
import type { Policy } from './policy';

export interface TrainConfig {
  pop?: number;            // population size = robots evaluated per generation (×2 with antithetic)
  sigma?: number;         // mutation scale
  alpha?: number;         // learning rate
  episodesPerEval?: number;
  seed?: number;
}

function gaussRng(rng: () => number): number {
  let u = 0, v = 0, s = 0;
  do { u = rng() * 2 - 1; v = rng() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
  return u * Math.sqrt(-2 * Math.log(s) / s);
}

/** Deterministic, seedable RNG (mulberry32) so training runs are reproducible. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class VectorESTrainer {
  private makeTask: TaskFactory;
  policy: Policy;
  theta: number[];
  pop: number; sigma: number; alpha: number; episodes: number;
  gen = 0; best = -Infinity; history: number[] = [];
  private rng: () => number;
  private workers: Task[];

  constructor(makeTask: TaskFactory, policy: Policy, cfg: TrainConfig = {}) {
    this.makeTask = makeTask;
    this.policy = policy;
    this.theta = [...policy.getParams()];
    this.pop = Math.max(2, cfg.pop ?? 64);
    this.sigma = cfg.sigma ?? 0.1;
    this.alpha = cfg.alpha ?? 0.05;
    this.episodes = cfg.episodesPerEval ?? 2;
    this.rng = makeRng(cfg.seed ?? 12345);
    // A pool of reusable env instances = the "parallel robots".
    this.workers = Array.from({ length: this.pop }, () => makeTask());
  }

  /** Average return of a parameter vector over a few randomized episodes. */
  evaluate(params: number[], task: Task, episodes = this.episodes): number {
    this.policy.setParams(params);
    let total = 0;
    for (let e = 0; e < episodes; e++) {
      task.reset(this.rng);
      let obs = task.observe();
      for (let s = 0; s < task.maxSteps; s++) {
        const action = this.policy.forward(obs);
        const out = task.act(action);
        total += out.reward;
        obs = task.observe();
        if (out.done) break;
      }
    }
    return total / episodes;
  }

  /** One generation: mutate, evaluate the whole population, update θ. */
  generation(): { mean: number; best: number; evalReturn: number } {
    const half = Math.floor(this.pop / 2);
    const eps: number[][] = [];
    const rets: number[] = [];
    const D = this.theta.length;

    // antithetic pairs: +ε and −ε share the same mutation
    for (let i = 0; i < half; i++) {
      const e = new Array(D);
      for (let d = 0; d < D; d++) e[d] = gaussRng(this.rng);
      const task = this.workers[i];
      const plus = this.theta.map((w, d) => w + this.sigma * e[d]);
      const minus = this.theta.map((w, d) => w - this.sigma * e[d]);
      eps.push(e, e.map((x) => -x));
      rets.push(this.evaluate(plus, task), this.evaluate(minus, task));
    }

    // rank-normalize returns → advantages in [-0.5, 0.5]
    const n = rets.length;
    const order = rets.map((r, i) => [r, i] as [number, number]).sort((a, b) => a[0] - b[0]);
    const adv = new Array(n);
    order.forEach(([, idx], rank) => { adv[idx] = rank / (n - 1) - 0.5; });

    // θ ← θ + α/(n·σ) Σ adv_i ε_i
    const scale = this.alpha / (n * this.sigma);
    for (let d = 0; d < D; d++) {
      let g = 0;
      for (let i = 0; i < n; i++) g += adv[i] * eps[i][d];
      this.theta[d] += scale * g;
    }

    const mean = rets.reduce((a, b) => a + b, 0) / n;
    const evalReturn = this.evaluate(this.theta, this.workers[0], Math.max(2, this.episodes));
    this.best = Math.max(this.best, evalReturn);
    this.history.push(evalReturn);
    this.gen++;
    return { mean, best: this.best, evalReturn };
  }

  /** The current trained policy (θ written back into the policy object). */
  trained(): Policy { this.policy.setParams(this.theta); return this.policy; }
}
