/**
 * amcl — Adaptive Monte-Carlo Localization (Nav2's amcl, native).
 *
 * A particle filter over the robot's 2D pose (x, y, θ). `predict` pushes particles
 * through the motion model with noise; `update` reweights them by a measurement
 * likelihood (e.g. how well a LiDAR scan matches the map at that hypothesis) and
 * resamples (low-variance / systematic resampling) so the cloud concentrates on poses
 * that explain the data. `estimate` returns the weighted-mean pose. Pure, node-testable.
 */
export interface Particle { x: number; y: number; theta: number; w: number }
export interface Pose2D { x: number; y: number; theta: number }

const gauss = (sigma: number) => {
  // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export class ParticleFilter {
  particles: Particle[] = [];

  constructor(public n = 300) {}

  /** Seed particles around an initial guess. */
  init(pose: Pose2D, spread = { xy: 0.5, theta: 0.3 }): void {
    this.particles = Array.from({ length: this.n }, () => ({
      x: pose.x + gauss(spread.xy),
      y: pose.y + gauss(spread.xy),
      theta: pose.theta + gauss(spread.theta),
      w: 1 / this.n,
    }));
  }

  /** Motion update: apply a relative (dx, dy in robot frame, dtheta) with noise. */
  predict(motion: { dx: number; dy: number; dtheta: number }, noise = { xy: 0.02, theta: 0.02 }): void {
    for (const p of this.particles) {
      const c = Math.cos(p.theta), s = Math.sin(p.theta);
      p.x += motion.dx * c - motion.dy * s + gauss(noise.xy);
      p.y += motion.dx * s + motion.dy * c + gauss(noise.xy);
      p.theta += motion.dtheta + gauss(noise.theta);
    }
  }

  /** Measurement update: reweight by likelihood(pose) ≥ 0, normalize, then resample. */
  update(likelihood: (p: Pose2D) => number): void {
    let sum = 0;
    for (const p of this.particles) { p.w *= Math.max(1e-12, likelihood(p)); sum += p.w; }
    if (sum <= 0) { for (const p of this.particles) p.w = 1 / this.n; return; }
    for (const p of this.particles) p.w /= sum;
    if (this.effectiveN() < this.n / 2) this.resample();
  }

  /** Number of effective particles (low = degenerate → resample). */
  effectiveN(): number {
    let s2 = 0;
    for (const p of this.particles) s2 += p.w * p.w;
    return s2 > 0 ? 1 / s2 : 0;
  }

  /** Low-variance (systematic) resampling. */
  resample(): void {
    const N = this.particles.length;
    const out: Particle[] = [];
    const r = Math.random() / N;
    let c = this.particles[0].w, i = 0;
    for (let m = 0; m < N; m++) {
      const u = r + m / N;
      while (u > c && i < N - 1) { i++; c += this.particles[i].w; }
      const s = this.particles[i];
      out.push({ x: s.x, y: s.y, theta: s.theta, w: 1 / N });
    }
    this.particles = out;
  }

  /** Weighted-mean pose estimate (θ via circular mean). */
  estimate(): Pose2D {
    let x = 0, y = 0, sx = 0, sy = 0, sw = 0;
    for (const p of this.particles) { x += p.w * p.x; y += p.w * p.y; sx += p.w * Math.cos(p.theta); sy += p.w * Math.sin(p.theta); sw += p.w; }
    const inv = sw > 0 ? 1 / sw : 1;
    return { x: x * inv, y: y * inv, theta: Math.atan2(sy, sx) };
  }
}
