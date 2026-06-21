/**
 * es — Evolution Strategies trainer (real, in-app learning; no ROS, no server).
 *
 * Optimises a linear policy  action = tanh(W · obs)  to maximise episode return on
 * a Gym-style env. Each generation samples a population of weight perturbations,
 * evaluates their returns, and nudges the weights toward the better ones
 * (OpenAI-ES update). Return improves generation over generation — genuine
 * training you can watch, then run the learned policy.
 */
import { ReachEnv } from './gymEnv';

export type MakeEnv = () => ReachEnv;

function rollout(env: ReachEnv, W: number[], aDim: number, oDim: number): number {
  let obs = env.reset();
  let total = 0;
  for (let s = 0; s < env.maxSteps; s++) {
    const action = new Array(aDim);
    for (let j = 0; j < aDim; j++) {
      let dot = 0;
      for (let k = 0; k < oDim; k++) dot += W[j * oDim + k] * obs[k];
      action[j] = Math.tanh(dot);
    }
    const r = env.step(action);
    total += r.reward;
    obs = r.obs;
    if (r.done) break;
  }
  return total;
}

export class ESTrainer {
  private makeEnv: MakeEnv;
  aDim: number;
  oDim: number;
  dim: number;
  W: number[];
  pop: number;
  sigma: number;
  alpha: number;
  gen = 0;
  best = -Infinity;
  history: number[] = [];

  constructor(makeEnv: MakeEnv, opts: { pop?: number; sigma?: number; alpha?: number } = {}) {
    this.makeEnv = makeEnv;
    const probe = makeEnv();
    this.aDim = probe.actionDim;
    this.oDim = probe.obsDim;
    this.dim = this.aDim * this.oDim;
    this.W = new Array(this.dim).fill(0);
    this.pop = opts.pop ?? 16;
    this.sigma = opts.sigma ?? 0.25;
    this.alpha = opts.alpha ?? 0.06;
  }

  /** One ES generation. Returns the mean return of the current weights. */
  generation(): number {
    const n = this.pop;
    const eps: number[][] = [];
    const rets: number[] = [];
    for (let i = 0; i < n; i++) {
      const e = new Array(this.dim);
      for (let d = 0; d < this.dim; d++) e[d] = gauss();
      eps.push(e);
      const Wp = this.W.map((w, d) => w + this.sigma * e[d]);
      rets.push(rollout(this.makeEnv(), Wp, this.aDim, this.oDim));
    }
    // Normalise returns → advantages.
    const mean = rets.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1;
    const adv = rets.map((r) => (r - mean) / std);
    // Gradient estimate: W += alpha/(n·sigma) Σ adv_i · eps_i
    const scale = this.alpha / (n * this.sigma);
    for (let d = 0; d < this.dim; d++) {
      let g = 0;
      for (let i = 0; i < n; i++) g += adv[i] * eps[i][d];
      this.W[d] += scale * g;
    }
    this.gen++;
    const evalReturn = rollout(this.makeEnv(), this.W, this.aDim, this.oDim);
    this.best = Math.max(this.best, evalReturn);
    this.history.push(evalReturn);
    return evalReturn;
  }

  /** The learned policy as a function obs → action. */
  policy() {
    const { W, aDim, oDim } = this;
    return (obs: number[]) => {
      const action = new Array(aDim);
      for (let j = 0; j < aDim; j++) {
        let dot = 0;
        for (let k = 0; k < oDim; k++) dot += W[j * oDim + k] * obs[k];
        action[j] = Math.tanh(dot);
      }
      return action;
    };
  }
}

let _spare: number | null = null;
function gauss(): number {
  if (_spare != null) { const v = _spare; _spare = null; return v; }
  let u = 0, v = 0, s = 0;
  do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
  const m = Math.sqrt(-2 * Math.log(s) / s);
  _spare = v * m;
  return u * m;
}
