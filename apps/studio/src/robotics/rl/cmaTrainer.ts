/**
 * cmaTrainer — Separable CMA-ES (sep-CMA-ES) trainer.
 *
 * Why better than plain ES?
 *   ES uses a fixed, identity-shaped Gaussian for mutations. CMA-ES adapts TWO things:
 *   (1) sigma — the global step size grows when progress is consistent, shrinks when we're
 *       circling. This is Cumulative Step-size Adaptation (CSA).
 *   (2) diagC — per-dimension variance. If one joint needs large moves while another needs
 *       fine adjustment, CMA-ES learns that. For manipulation this alone gives ~2× convergence.
 *
 * "Separable" means we only track the DIAGONAL of the covariance matrix — O(D) per generation
 * instead of O(D³) for full CMA-ES. For typical robot policies (< 5000 params) this captures
 * most of the benefit at a fraction of the cost.
 *
 * Reference: Hansen, "The CMA Evolution Strategy: A Tutorial" (2016), sep-CMA section.
 */
import type { Task, TaskFactory } from './task';
import type { Policy } from './policy';
import { makeRng } from './vectorTrainer';

export interface CMAConfig {
  sigma?: number;           // initial global step size (default 0.5)
  lambda?: number;          // population size (default 4+3⌊ln D⌋)
  episodesPerEval?: number; // episodes per candidate (default 2)
  seed?: number;
}

export class CMATrainer {
  readonly D: number;
  theta: number[];           // current mean (best estimate)
  gen = 0; best = -Infinity; history: number[] = [];

  private sigma: number;
  private diagC: number[];   // per-dimension variance (diagonal of covariance matrix C)
  private ps: number[];      // step-size cumulative path
  private pc: number[];      // covariance cumulative path
  lambda: number;
  private mu: number;
  private w: number[];       // recombination weights for top-mu candidates
  private mueff: number;     // effective mass of recombination
  // CMA adaptation rates (Hansen's formulas for sep-CMA-ES, scaled by 1+1/D)
  private cc: number; private cs: number; private c1: number;
  private cmu: number; private damps: number; private chiN: number;
  private rng: () => number;
  private episodes: number;
  private workers: Task[];
  private policy: Policy;

  constructor(makeTask: TaskFactory, policy: Policy, cfg: CMAConfig = {}) {
    this.D = policy.nParams;
    this.theta = [...policy.getParams()];
    this.sigma = cfg.sigma ?? 0.5;
    this.rng = makeRng(cfg.seed ?? 42);
    this.policy = policy;
    this.episodes = cfg.episodesPerEval ?? 2;

    this.lambda = cfg.lambda ?? Math.max(4 + Math.floor(3 * Math.log(this.D)), 10);
    this.mu = Math.floor(this.lambda / 2);

    // Log-linear weights — top candidate gets much more weight than last in top-half
    const rawW = Array.from({ length: this.mu }, (_, i) =>
      Math.log(this.mu + 0.5) - Math.log(i + 1));
    const wSum = rawW.reduce((s, v) => s + v, 0);
    this.w = rawW.map(v => v / wSum);
    this.mueff = 1 / this.w.reduce((s, v) => s + v * v, 0);

    // Adaptation rates (sep-CMA-ES — multiplied by (1+1/D) vs full CMA-ES)
    const D = this.D;
    this.cc = (4 + this.mueff / D) / (D + 4 + 2 * this.mueff / D);
    this.cs = (this.mueff + 2) / (D + this.mueff + 5);
    this.c1 = 2 / ((D + 1.3) ** 2 + this.mueff) * (1 + 1 / D);
    this.cmu = Math.min(
      1 - this.c1,
      2 * (this.mueff - 2 + 1 / this.mueff) / ((D + 2) ** 2 + this.mueff),
    ) * (1 + 1 / D);
    this.damps = 1 + 2 * Math.max(0, Math.sqrt((this.mueff - 1) / (D + 1)) - 1) + this.cs;
    // E[||N(0,I)||] — used to normalize ps for sigma update
    this.chiN = Math.sqrt(D) * (1 - 1 / (4 * D) + 1 / (21 * D * D));

    this.diagC = new Array(D).fill(1);
    this.ps = new Array(D).fill(0);
    this.pc = new Array(D).fill(0);
    this.workers = Array.from({ length: this.lambda }, () => makeTask());
  }

  private gauss(): number {
    let u = 0, v = 0, s = 0;
    do { u = this.rng() * 2 - 1; v = this.rng() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    return u * Math.sqrt(-2 * Math.log(s) / s);
  }

  private evaluate(params: number[], task: Task): number {
    this.policy.setParams(params);
    let total = 0;
    for (let e = 0; e < this.episodes; e++) {
      task.reset(this.rng);
      let obs = task.observe();
      for (let s = 0; s < task.maxSteps; s++) {
        const out = task.act(this.policy.forward(obs));
        total += out.reward; obs = task.observe();
        if (out.done) break;
      }
    }
    return total / this.episodes;
  }

  generation(): { mean: number; best: number; evalReturn: number } {
    const D = this.D;

    // Sample: x_k[d] = m[d] + sigma * sqrt(diagC[d]) * z_k[d],  z_k ~ N(0, I)
    const zs: number[][] = [], xs: number[][] = [];
    for (let k = 0; k < this.lambda; k++) {
      const z = Array.from({ length: D }, () => this.gauss());
      const x = this.theta.map((v, d) => v + this.sigma * Math.sqrt(this.diagC[d]) * z[d]);
      zs.push(z); xs.push(x);
    }

    const rets = xs.map((x, k) => this.evaluate(x, this.workers[k]));
    const order = rets.map((r, i) => [r, i] as [number, number]).sort((a, b) => b[0] - a[0]);

    // New mean: weighted average of top-mu candidates
    const newM = new Array(D).fill(0);
    for (let i = 0; i < this.mu; i++) {
      const x = xs[order[i][1]];
      for (let d = 0; d < D; d++) newM[d] += this.w[i] * x[d];
    }

    // Weighted direction in unit-Gaussian space: z_w = Σ w_i z_{i:λ}
    const zw = new Array(D).fill(0);
    for (let i = 0; i < this.mu; i++) {
      const z = zs[order[i][1]];
      for (let d = 0; d < D; d++) zw[d] += this.w[i] * z[d];
    }

    // CSA: cumulative step-size path (tracks how linearly the mean is moving)
    const csq = Math.sqrt(this.cs * (2 - this.cs) * this.mueff);
    for (let d = 0; d < D; d++) this.ps[d] = (1 - this.cs) * this.ps[d] + csq * zw[d];

    // Sigma update: grow if |ps|/chiN > 1 (consistent progress), shrink otherwise
    const psNorm = Math.sqrt(this.ps.reduce((s, v) => s + v * v, 0));
    this.sigma *= Math.exp((this.cs / this.damps) * (psNorm / this.chiN - 1));
    this.sigma = Math.max(1e-8, Math.min(this.sigma, 10));

    // Covariance path update
    const hsig = psNorm
      / (Math.sqrt(1 - (1 - this.cs) ** (2 * (this.gen + 1))) * this.chiN) < 1.4 + 2 / (D + 1) ? 1 : 0;
    const ccq = Math.sqrt(this.cc * (2 - this.cc) * this.mueff);
    for (let d = 0; d < D; d++) {
      this.pc[d] = (1 - this.cc) * this.pc[d]
        + hsig * ccq * (newM[d] - this.theta[d]) / (this.sigma + 1e-12);
    }

    // Diagonal covariance update (sep-CMA-ES rank-1 + rank-μ)
    for (let d = 0; d < D; d++) {
      let muSum = 0;
      for (let i = 0; i < this.mu; i++) muSum += this.w[i] * zs[order[i][1]][d] ** 2;
      this.diagC[d] = Math.max(1e-20,
        (1 - this.c1 - this.cmu) * this.diagC[d]
        + this.c1 * (this.pc[d] ** 2 + (1 - hsig) * this.cc * (2 - this.cc) * this.diagC[d])
        + this.cmu * muSum * this.diagC[d],
      );
    }

    this.theta = newM;
    const evalReturn = this.evaluate(this.theta, this.workers[0]);
    this.best = Math.max(this.best, evalReturn);
    this.history.push(evalReturn);
    this.gen++;

    return { mean: rets.reduce((s, r) => s + r, 0) / this.lambda, best: this.best, evalReturn };
  }

  /** Current best parameter vector written back into the policy object */
  trained(): Policy { this.policy.setParams(this.theta); return this.policy; }
}
