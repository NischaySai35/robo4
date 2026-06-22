/**
 * policy — the "brain" that maps observations → actions. A policy is just a function
 * obs→action backed by a flat PARAMETER VECTOR (θ). Training = searching θ for the
 * vector that earns the most reward. Keeping θ as one flat array means ANY optimizer
 * (Evolution Strategies, CMA-ES, policy gradient) can train ANY policy with no
 * autodiff — perfect for running thousands of robots in the browser. Pure, node-testable.
 *
 *  - LinearPolicy : action = tanh(W·obs + b)            (fast, few params)
 *  - MLPPolicy    : a small multi-layer perceptron       (nonlinear, more capable)
 *
 * Both expose: get/set the parameter vector, forward(obs), and a serializable spec so
 * a trained brain can be stored in the model document and replayed later.
 */
export interface PolicySpec {
  kind: 'linear' | 'mlp';
  obsDim: number;
  actionDim: number;
  hidden?: number[];        // mlp only
  params: number[];         // the trained θ
}

export interface Policy {
  readonly obsDim: number;
  readonly actionDim: number;
  readonly nParams: number;
  forward(obs: number[]): number[];
  getParams(): number[];
  setParams(p: number[]): void;
  spec(): PolicySpec;
}

const tanh = Math.tanh;

export class LinearPolicy implements Policy {
  obsDim: number; actionDim: number; nParams: number;
  private W: number[];   // actionDim × (obsDim + 1)  (last col = bias)
  constructor(obsDim: number, actionDim: number, params?: number[]) {
    this.obsDim = obsDim; this.actionDim = actionDim;
    this.nParams = actionDim * (obsDim + 1);
    this.W = params ? [...params] : new Array(this.nParams).fill(0);
  }
  forward(obs: number[]): number[] {
    const out = new Array(this.actionDim);
    const stride = this.obsDim + 1;
    for (let a = 0; a < this.actionDim; a++) {
      let dot = this.W[a * stride + this.obsDim]; // bias
      for (let k = 0; k < this.obsDim; k++) dot += this.W[a * stride + k] * obs[k];
      out[a] = tanh(dot);
    }
    return out;
  }
  getParams() { return this.W; }
  setParams(p: number[]) { this.W = p; }
  spec(): PolicySpec { return { kind: 'linear', obsDim: this.obsDim, actionDim: this.actionDim, params: this.W }; }
}

export class MLPPolicy implements Policy {
  obsDim: number; actionDim: number; nParams: number;
  private sizes: number[];           // [obs, h1, h2, …, action]
  private params: number[];
  private offsets: { w: number; b: number; inp: number; out: number }[] = [];

  constructor(obsDim: number, actionDim: number, hidden: number[] = [32, 32], params?: number[]) {
    this.obsDim = obsDim; this.actionDim = actionDim;
    this.sizes = [obsDim, ...hidden, actionDim];
    let n = 0;
    for (let l = 0; l < this.sizes.length - 1; l++) {
      const inp = this.sizes[l], out = this.sizes[l + 1];
      this.offsets.push({ w: n, b: n + inp * out, inp, out });
      n += inp * out + out;
    }
    this.nParams = n;
    this.params = params ? [...params] : this._initHe();
    this._hidden = hidden;
  }
  private _hidden: number[];
  private _initHe(): number[] {
    // small random init so untrained nets aren't degenerate
    const p = new Array(this.nParams);
    for (let i = 0; i < this.nParams; i++) p[i] = (Math.random() * 2 - 1) * 0.2;
    return p;
  }
  forward(obs: number[]): number[] {
    let x = obs;
    for (let l = 0; l < this.offsets.length; l++) {
      const { w, b, inp, out } = this.offsets[l];
      const y = new Array(out);
      for (let o = 0; o < out; o++) {
        let s = this.params[b + o];
        for (let i = 0; i < inp; i++) s += this.params[w + o * inp + i] * x[i];
        // tanh on output layer (bounded actions), ReLU on hidden
        y[o] = l === this.offsets.length - 1 ? tanh(s) : Math.max(0, s);
      }
      x = y;
    }
    return x;
  }
  getParams() { return this.params; }
  setParams(p: number[]) { this.params = p; }
  spec(): PolicySpec { return { kind: 'mlp', obsDim: this.obsDim, actionDim: this.actionDim, hidden: this._hidden, params: this.params }; }
}

/** Rebuild a policy from a stored spec (e.g. a brain loaded from the .nischay model). */
export function policyFromSpec(spec: PolicySpec): Policy {
  if (spec.kind === 'mlp') return new MLPPolicy(spec.obsDim, spec.actionDim, spec.hidden ?? [32, 32], spec.params);
  return new LinearPolicy(spec.obsDim, spec.actionDim, spec.params);
}
