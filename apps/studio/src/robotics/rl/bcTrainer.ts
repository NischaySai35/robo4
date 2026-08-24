/**
 * bcTrainer — Behavioral Cloning with Adam optimizer and analytical backprop.
 *
 * What is BC?
 *   Instead of searching for a good brain by trial-and-error (ES/CMA), we TEACH
 *   it: show it (obs → action) pairs from demonstrations (IK trajectories, manual
 *   driving, etc.) and minimize the error between what the policy outputs and what
 *   the demo shows. This is standard supervised learning — fast, stable, no physics.
 *
 *   Trade-off: BC can only be as good as the demos. But for manipulation tasks where
 *   a good IK solution exists, BC-trained policies generalize surprisingly well.
 *
 * Implementation:
 *   BCNet is a from-scratch MLP with explicit forward+backward (no autodiff library).
 *   Adam optimizer (β1=0.9, β2=0.999) — more stable than SGD for noisy mini-batches.
 *   Compatible with existing PolicySpec so trained nets save/load like any RL policy.
 */
import type { Policy, PolicySpec } from './policy';

// ── BCNet ─────────────────────────────────────────────────────────────────────

interface LayerCache {
  input: number[];
  preAct: number[];   // pre-activation z = W·input + b
  output: number[];   // post-activation h = act(z)
}

/**
 * Feed-forward MLP with explicit backprop. Implements the Policy interface so it can
 * be saved to the model and replayed by the existing Watch / Run-saved machinery.
 */
export class BCNet implements Policy {
  readonly obsDim: number;
  readonly actionDim: number;
  readonly nParams: number;

  private sizes: number[];
  private params: number[];
  private offsets: { w: number; b: number; inp: number; out: number }[];

  // Adam state
  private m: number[];
  private v: number[];
  private t = 0;
  private readonly β1 = 0.9;
  private readonly β2 = 0.999;
  private readonly ε = 1e-8;

  constructor(obsDim: number, actionDim: number, hidden: number[] = [32, 32]) {
    this.obsDim = obsDim; this.actionDim = actionDim;
    this.sizes = [obsDim, ...hidden, actionDim];
    this.offsets = [];
    let n = 0;
    for (let l = 0; l < this.sizes.length - 1; l++) {
      const inp = this.sizes[l], out = this.sizes[l + 1];
      this.offsets.push({ w: n, b: n + inp * out, inp, out });
      n += inp * out + out;
    }
    this.nParams = n;

    // He initialization — prevents gradient vanishing in deep ReLU nets
    this.params = Array.from({ length: n }, () => (Math.random() * 2 - 1) * 0.2);
    for (let l = 0; l < this.offsets.length; l++) {
      const { w, inp, out } = this.offsets[l];
      const std = Math.sqrt(2 / inp);
      for (let o = 0; o < out; o++)
        for (let i = 0; i < inp; i++)
          this.params[w + o * inp + i] = (Math.random() * 2 - 1) * std;
    }

    this.m = new Array(n).fill(0);
    this.v = new Array(n).fill(0);
  }

  // ── Forward ─────────────────────────────────────────────────────────────────

  forward(obs: number[]): number[] {
    return this._fwdCached(obs).at(-1)!.output;
  }

  forwardCached(obs: number[]): LayerCache[] { return this._fwdCached(obs); }

  private _fwdCached(obs: number[]): LayerCache[] {
    const caches: LayerCache[] = [];
    let x = obs;
    for (let l = 0; l < this.offsets.length; l++) {
      const { w, b, inp, out } = this.offsets[l];
      const isLast = l === this.offsets.length - 1;
      const preAct = new Array(out);
      for (let o = 0; o < out; o++) {
        let s = this.params[b + o];
        for (let i = 0; i < inp; i++) s += this.params[w + o * inp + i] * x[i];
        preAct[o] = s;
      }
      // Output: tanh (bounded actions); hidden: ReLU
      const output = isLast ? preAct.map(Math.tanh) : preAct.map(z => Math.max(0, z));
      caches.push({ input: x, preAct, output });
      x = output;
    }
    return caches;
  }

  // ── Backward ────────────────────────────────────────────────────────────────

  /**
   * Compute gradient of MSE loss w.r.t. all params.
   * Returns a flat array of the same shape as params.
   */
  backward(caches: LayerCache[], target: number[]): number[] {
    const grad = new Array(this.nParams).fill(0);
    const out = caches.at(-1)!.output;

    // dL/d(output) = (output - target),  dL/d(preAct) through tanh: * (1 - tanh²)
    let delta = out.map((y, i) => (y - target[i]) * (1 - y * y));

    for (let l = this.offsets.length - 1; l >= 0; l--) {
      const { w, b, inp, out: outSize } = this.offsets[l];
      const cache = caches[l];

      // Weight + bias gradients
      for (let o = 0; o < outSize; o++) {
        grad[b + o] += delta[o];
        for (let i = 0; i < inp; i++) grad[w + o * inp + i] += delta[o] * cache.input[i];
      }

      if (l > 0) {
        // Propagate delta to previous layer: dInput = W^T @ delta
        const dInput = new Array(inp).fill(0);
        for (let i = 0; i < inp; i++)
          for (let o = 0; o < outSize; o++) dInput[i] += this.params[w + o * inp + i] * delta[o];
        // Through ReLU: zero out where preAct ≤ 0
        delta = dInput.map((g, i) => g * (caches[l - 1].preAct[i] > 0 ? 1 : 0));
      }
    }
    return grad;
  }

  /**
   * Adam update. gradSum is a sum of gradients over a mini-batch of `batchSize` samples.
   * Returns the RMS of the parameter update (useful to monitor convergence).
   */
  adamStep(gradSum: number[], batchSize: number, lr: number): number {
    this.t++;
    const b1t = this.β1 ** this.t;
    const b2t = this.β2 ** this.t;
    let rms = 0;
    for (let i = 0; i < this.nParams; i++) {
      const g = gradSum[i] / batchSize;
      this.m[i] = this.β1 * this.m[i] + (1 - this.β1) * g;
      this.v[i] = this.β2 * this.v[i] + (1 - this.β2) * g * g;
      const step = lr * (this.m[i] / (1 - b1t)) / (Math.sqrt(this.v[i] / (1 - b2t)) + this.ε);
      this.params[i] -= step;
      rms += step * step;
    }
    return Math.sqrt(rms / this.nParams);
  }

  // ── Policy interface ─────────────────────────────────────────────────────────

  getParams(): number[] { return this.params; }
  setParams(p: number[]): void { this.params = [...p]; }
  spec(): PolicySpec {
    return {
      kind: 'mlp',
      obsDim: this.obsDim,
      actionDim: this.actionDim,
      hidden: this.sizes.slice(1, -1),
      params: [...this.params],
    };
  }
}

// ── Demo storage ──────────────────────────────────────────────────────────────

export interface DemoPair { obs: number[]; action: number[] }

export interface Demo {
  id: string;
  label: string;
  taskType: string;
  pairs: DemoPair[];
  timestamp: number;
}

// ── BCTrainer ─────────────────────────────────────────────────────────────────

export class BCTrainer {
  net: BCNet;
  demos: Demo[] = [];
  epoch = 0; loss = Infinity;

  constructor(obsDim: number, actionDim: number, hidden: number[] = [32, 32]) {
    this.net = new BCNet(obsDim, actionDim, hidden);
  }

  addDemo(d: Demo) { this.demos.push(d); }
  clearDemos() { this.demos = []; }
  totalPairs(): number { return this.demos.reduce((s, d) => s + d.pairs.length, 0); }

  /**
   * One full pass (epoch) of mini-batch Adam over all demonstrations.
   * Returns mean MSE loss for this epoch.
   */
  trainEpoch(lr = 1e-3, batchSize = 32): number {
    const all: DemoPair[] = [];
    for (const d of this.demos) all.push(...d.pairs);
    if (all.length === 0) return Infinity;

    // Fisher-Yates shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }

    let totalLoss = 0; let nBatches = 0;
    for (let start = 0; start < all.length; start += batchSize) {
      const batch = all.slice(start, start + batchSize);
      const gradSum = new Array(this.net.nParams).fill(0);
      let batchLoss = 0;
      for (const { obs, action } of batch) {
        const caches = this.net.forwardCached(obs);
        const pred = caches.at(-1)!.output;
        batchLoss += pred.reduce((s, y, i) => s + (y - action[i]) ** 2, 0) / pred.length;
        const g = this.net.backward(caches, action);
        for (let i = 0; i < gradSum.length; i++) gradSum[i] += g[i];
      }
      this.net.adamStep(gradSum, batch.length, lr);
      totalLoss += batchLoss / batch.length; nBatches++;
    }

    this.epoch++;
    this.loss = nBatches > 0 ? totalLoss / nBatches : Infinity;
    return this.loss;
  }

  trained(): Policy { return this.net; }
}

// ── Demo generation helpers ───────────────────────────────────────────────────

/**
 * Generate a reach demo by linearly interpolating from `startValues` to `targetValues`
 * over `steps` timesteps and recording (obs, action) pairs. This gives BC a clean,
 * collision-unaware trajectory — good enough for manipulation.
 */
export function makeReachDemo(
  startValues: number[],
  targetValues: number[],
  target3D: [number, number, number],
  tipFn: (vals: number[]) => [number, number, number],
  label: string,
  steps = 60,
): Demo {
  const pairs: DemoPair[] = [];
  const n = startValues.length;
  const speed = 1.6, dt = 0.08;

  let vals = [...startValues];
  for (let s = 0; s < steps; s++) {
    const t = (s + 1) / steps;
    const nextVals = startValues.map((v, i) => v + t * (targetValues[i] - v));

    // Action = normalized joint velocity from current to next
    const rawAction = nextVals.map((nv, i) => (nv - vals[i]) / (speed * dt));
    const action = rawAction.map(a => Math.max(-1, Math.min(1, a)));

    // Observation = joint values + 3D error to target
    const tip = tipFn(vals);
    const obs = [...vals, target3D[0] - tip[0], target3D[1] - tip[1], target3D[2] - tip[2]];

    pairs.push({ obs, action });
    vals = nextVals;
    if (vals.every((v, i) => Math.abs(v - targetValues[i]) < 0.01)) break;
  }

  return { id: `demo-${Date.now()}`, label, taskType: 'reach', pairs, timestamp: Date.now() };
}

/**
 * Generate a navigation demo from a waypoint path. Each step the robot follows the
 * next waypoint using a simple P-controller, recording (obs, action) pairs.
 */
export function makeNavDemo(
  waypoints: [number, number][],
  label: string,
  steps = 200,
): Demo {
  const pairs: DemoPair[] = [];
  let x = 0, y = 0, heading = 0;
  let wpIdx = 0;
  const dt = 0.05, maxV = 1.5, maxOmega = 2.0, arenaR = 3.0;

  for (let s = 0; s < steps && wpIdx < waypoints.length; s++) {
    const [gx, gy] = waypoints[wpIdx];
    const dist = Math.hypot(x - gx, y - gy);
    if (dist < 0.15) { wpIdx++; continue; }

    const desired = Math.atan2(gy - y, gx - x);
    let err = desired - heading;
    while (err > Math.PI) err -= 2 * Math.PI;
    while (err < -Math.PI) err += 2 * Math.PI;

    // P-controller
    const v = Math.min(1, dist / 0.5) * Math.cos(err);
    const omega = Math.max(-1, Math.min(1, 2 * err / Math.PI));

    const obs = [Math.cos(err), Math.sin(err), dist / arenaR, v, omega];
    const action = [v, omega];
    pairs.push({ obs, action });

    // Advance kinematic model
    heading += omega * maxOmega * dt;
    heading = ((heading + Math.PI) % (2 * Math.PI)) - Math.PI;
    x += v * maxV * Math.cos(heading) * dt;
    y += v * maxV * Math.sin(heading) * dt;
  }

  return { id: `demo-nav-${Date.now()}`, label, taskType: 'navigate', pairs, timestamp: Date.now() };
}
