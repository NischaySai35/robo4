/**
 * obsNormalizer — online per-dimension observation normalization.
 *
 * WHY THIS MATTERS: Raw observations from a robot span wildly different scales
 * (joint angles in radians, distances in meters, velocities in m/s). Without
 * normalization, large-magnitude features dominate the gradient signal and small
 * ones are effectively ignored. Normalizing to zero-mean / unit-variance is the
 * single highest-ROI change you can make to training stability — confirmed by
 * every major RL framework (IsaacLab, MuJoCo Playground, Stable-Baselines3).
 *
 * Algorithm: Welford's online algorithm — numerically stable, single-pass, no
 * need to store all observations. Updates running mean and M2 (sum of squared
 * deviations) incrementally.
 *
 * NormalizedObsTask wraps any Task transparently: the trainers don't need
 * to know about normalization at all. Create ONE normalizer, share the reference
 * across all parallel worker tasks so statistics accumulate from every episode.
 */
import type { Task } from './task';

export class ObsNormalizer {
  private n = 0;
  private mean: Float64Array;
  private M2: Float64Array;
  readonly dim: number;

  constructor(dim: number) {
    this.dim = dim;
    this.mean = new Float64Array(dim);
    this.M2 = new Float64Array(dim).fill(1); // init M2=1 → std≈1 before any data
  }

  /** Incorporate one observation vector (Welford's incremental update). */
  update(obs: number[]): void {
    this.n++;
    for (let i = 0; i < this.dim; i++) {
      const x = obs[i] ?? 0;
      const delta = x - this.mean[i];
      this.mean[i] += delta / this.n;
      this.M2[i] += delta * (x - this.mean[i]);
    }
  }

  /** Normalize: (x - μ) / σ, clamped to ±10 to prevent extreme values. */
  normalize(obs: number[]): number[] {
    if (this.n < 2) return obs;
    const out = new Array(this.dim);
    for (let i = 0; i < this.dim; i++) {
      const std = Math.sqrt(this.M2[i] / (this.n - 1) + 1e-8);
      out[i] = Math.max(-10, Math.min(10, ((obs[i] ?? 0) - this.mean[i]) / std));
    }
    return out;
  }

  /** Number of observations seen so far. */
  count() { return this.n; }

  toJSON() {
    return { n: this.n, mean: Array.from(this.mean), M2: Array.from(this.M2) };
  }

  loadJSON(d: { n: number; mean: number[]; M2: number[] }) {
    this.n = d.n;
    for (let i = 0; i < this.dim; i++) {
      this.mean[i] = d.mean[i] ?? 0;
      this.M2[i]   = d.M2[i]   ?? 1;
    }
  }
}

/**
 * NormalizedObsTask — transparent wrapper that applies ObsNormalizer to any Task.
 *
 * Usage:
 *   const norm = new ObsNormalizer(baseTask.obsDim);
 *   const makeNorm = () => new NormalizedObsTask(makeTask(), norm);
 *   const trainer = new VectorESTrainer(makeNorm, policy, cfg);
 *
 * All worker tasks share the same `norm` reference → statistics accumulate
 * across the entire population, every generation.
 */
export class NormalizedObsTask implements Task {
  readonly obsDim: number;
  readonly actionDim: number;
  readonly maxSteps: number;

  constructor(private inner: Task, private norm: ObsNormalizer) {
    this.obsDim    = inner.obsDim;
    this.actionDim = inner.actionDim;
    this.maxSteps  = inner.maxSteps;
  }

  reset(rng?: () => number) { this.inner.reset(rng); }

  observe(): number[] {
    const raw = this.inner.observe();
    this.norm.update(raw);
    return this.norm.normalize(raw);
  }

  act(action: number[]) { return this.inner.act(action); }

  // Forward optional Task methods
  setWeights(w: any)       { (this.inner as any).setWeights?.(w); }
  setTarget(v: any)        { (this.inner as any).setTarget?.(v); }
  setGoal(x: number, y: number) { (this.inner as any).setGoal?.(x, y); }
  currentPose()            { return (this.inner as any).currentPose?.(); }
  currentGoal()            { return (this.inner as any).currentGoal?.(); }
  jointIds()               { return (this.inner as any).jointIds?.(); }
  currentValues()          { return (this.inner as any).currentValues?.(); }
}
