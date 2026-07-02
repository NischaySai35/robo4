/**
 * navigationTask — 2D differential-drive kinematic navigation.
 *
 * For wheeled / car robots. No physics needed — uses a pure kinematic model:
 *   state  = (x, y, heading θ)
 *   action = [forward_speed, turn_rate]  both in [-1, 1]
 *   obs    = [cos(θ_err), sin(θ_err), dist/R, v, ω]
 *
 * Heading error is encoded as (cos, sin) so the policy sees a continuous signal
 * with no discontinuity at ±π. This is the standard formulation for navigation.
 *
 * Watch mode: the TrainingPanel moves the model's root body (position, quaternion)
 * to match the kinematic pose, so the robot visually navigates across the viewport.
 */
import { weightedReward, type Task, type RewardWeights } from './task';

export const NAV_DEFAULT_WEIGHTS: RewardWeights = {
  progress: 10,    // moved closer to goal
  align: 1,        // heading toward goal, proportional to speed
  control: -0.05,  // penalize large wheel commands (smooth driving)
  alive: -0.01,    // per-step cost (efficiency pressure)
  arrive: 10,      // large bonus for reaching goal
};

export class NavigationTask implements Task {
  readonly obsDim = 5;
  readonly actionDim = 2;
  readonly maxSteps: number;

  private weights: RewardWeights;
  private arenaR: number;

  // Kinematic state
  private x = 0; private y = 0; private heading = 0;
  private v = 0; private omega = 0;
  private goalX = 0; private goalY = 0;
  private step = 0; private prevDist = 0;
  private rng: () => number = Math.random;

  constructor(opts: { maxSteps?: number; weights?: RewardWeights; arenaRadius?: number } = {}) {
    this.maxSteps = opts.maxSteps ?? 120;
    this.weights = opts.weights ?? { ...NAV_DEFAULT_WEIGHTS };
    this.arenaR = opts.arenaRadius ?? 2.5;
  }

  setWeights(w: RewardWeights) { this.weights = w; }

  /** Current kinematic pose — used by watch mode to move the robot base. */
  currentPose(): { x: number; y: number; heading: number } {
    return { x: this.x, y: this.y, heading: this.heading };
  }

  currentGoal(): { x: number; y: number } { return { x: this.goalX, y: this.goalY }; }

  setGoal(x: number, y: number) {
    this.goalX = x; this.goalY = y;
    this.prevDist = this._dist();
  }

  reset(rng: () => number = Math.random): void {
    this.rng = rng;
    this.step = 0; this.v = 0; this.omega = 0;
    // Random start (centered, not at edge)
    const r = rng() * this.arenaR * 0.4;
    const a = rng() * Math.PI * 2;
    this.x = r * Math.cos(a); this.y = r * Math.sin(a);
    this.heading = rng() * Math.PI * 2;
    // Random goal — not trivially close
    let gr: number, ga: number;
    do { gr = (0.4 + rng() * 0.6) * this.arenaR; ga = rng() * Math.PI * 2; }
    while (Math.hypot(gr * Math.cos(ga) - this.x, gr * Math.sin(ga) - this.y) < 0.5);
    this.goalX = gr * Math.cos(ga); this.goalY = gr * Math.sin(ga);
    this.prevDist = this._dist();
  }

  private _dist(): number {
    return Math.hypot(this.x - this.goalX, this.y - this.goalY);
  }

  private _headingErr(): number {
    const desired = Math.atan2(this.goalY - this.y, this.goalX - this.x);
    let e = desired - this.heading;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    return e;
  }

  observe(): number[] {
    const err = this._headingErr();
    return [Math.cos(err), Math.sin(err), this._dist() / this.arenaR, this.v, this.omega];
  }

  act(action: number[]) {
    this.step++;
    const dt = 0.05, maxV = 1.5, maxOmega = 2.0;

    this.v = Math.max(-1, Math.min(1, action[0] ?? 0));
    this.omega = Math.max(-1, Math.min(1, action[1] ?? 0));

    // Differential-drive kinematics
    this.heading += this.omega * maxOmega * dt;
    this.heading = ((this.heading + Math.PI) % (2 * Math.PI)) - Math.PI;
    this.x += this.v * maxV * Math.cos(this.heading) * dt;
    this.y += this.v * maxV * Math.sin(this.heading) * dt;

    const d = this._dist();
    const arrived = d < 0.15;
    const err = this._headingErr();

    const terms = {
      progress: this.prevDist - d,
      align: Math.cos(err) * Math.abs(this.v) * dt,
      control: (action[0] ?? 0) ** 2 + (action[1] ?? 0) ** 2,
      alive: 1,
      arrive: arrived ? 1 : 0,
    };
    this.prevDist = d;
    return {
      reward: weightedReward(terms, this.weights),
      done: arrived || this.step >= this.maxSteps,
      info: { x: this.x, y: this.y, dist: d },
    };
  }
}
