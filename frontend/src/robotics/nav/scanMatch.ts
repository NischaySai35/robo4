/**
 * scanMatch — 2D ICP (Iterative Closest Point) scan matching.
 *
 * This is the core of real SLAM (what SLAM Toolbox does): by aligning a new LiDAR scan to
 * the previous one, the robot estimates **how far it actually moved** — so it can localize
 * from its sensors instead of assuming a perfect, ground-truth pose. On real hardware,
 * wheel odometry drifts; scan matching corrects it. (Loop closure / pose-graph optimization
 * is the next layer beyond this — see analysis notes.)
 *
 * Pure & node-testable. Brute-force nearest neighbor (fine for a few hundred beam points).
 */
export interface Pose2D { x: number; z: number; theta: number }

export const IDENTITY_POSE: Pose2D = { x: 0, z: 0, theta: 0 };

type Pt = [number, number];

function apply(p: Pose2D, pt: Pt): Pt {
  const c = Math.cos(p.theta), s = Math.sin(p.theta);
  return [c * pt[0] - s * pt[1] + p.x, s * pt[0] + c * pt[1] + p.z];
}

function compose(a: Pose2D, b: Pose2D): Pose2D {
  // a ∘ b : apply b then a
  const c = Math.cos(a.theta), s = Math.sin(a.theta);
  return {
    x: a.x + c * b.x - s * b.z,
    z: a.z + s * b.x + c * b.z,
    theta: a.theta + b.theta,
  };
}

function nearest(target: Pt[], q: Pt): Pt | null {
  let best: Pt | null = null;
  let bd = Infinity;
  for (const t of target) {
    const d = (t[0] - q[0]) ** 2 + (t[1] - q[1]) ** 2;
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

export interface IcpResult {
  /** Transform that maps `source` onto `target`. */
  pose: Pose2D;
  /** Mean residual distance after alignment (lower = better fit). */
  rmse: number;
  iterations: number;
}

/**
 * Align `source` points onto `target` points. Returns the rigid transform (x, z, θ) that
 * best maps source→target, plus the residual error. `guess` seeds the search (e.g. odometry).
 */
export function icpMatch(target: Pt[], source: Pt[], guess: Pose2D = IDENTITY_POSE, maxIters = 25, tol = 1e-5): IcpResult {
  let pose = { ...guess };
  let rmse = Infinity;
  let iter = 0;
  if (target.length < 2 || source.length < 2) return { pose, rmse, iterations: 0 };

  for (; iter < maxIters; iter++) {
    // 1) transform source by current pose, find correspondences in target
    const src: Pt[] = [];
    const dst: Pt[] = [];
    let sumSq = 0;
    for (const s of source) {
      const ts = apply(pose, s);
      const n = nearest(target, ts);
      if (!n) continue;
      src.push(ts);
      dst.push(n);
      sumSq += (ts[0] - n[0]) ** 2 + (ts[1] - n[1]) ** 2;
    }
    if (src.length < 2) break;
    const newRmse = Math.sqrt(sumSq / src.length);

    // 2) best rigid transform from src→dst (closed-form 2D Procrustes)
    let mx = 0, mz = 0, nx = 0, nz = 0;
    for (let i = 0; i < src.length; i++) { mx += src[i][0]; mz += src[i][1]; nx += dst[i][0]; nz += dst[i][1]; }
    mx /= src.length; mz /= src.length; nx /= src.length; nz /= src.length;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < src.length; i++) {
      const ax = src[i][0] - mx, az = src[i][1] - mz;
      const bx = dst[i][0] - nx, bz = dst[i][1] - nz;
      sxx += ax * bx + az * bz; // dot
      sxy += ax * bz - az * bx; // cross
    }
    const dtheta = Math.atan2(sxy, sxx);
    const c = Math.cos(dtheta), s = Math.sin(dtheta);
    const dx = nx - (c * mx - s * mz);
    const dz = nz - (s * mx + c * mz);

    // 3) compose the incremental transform onto the pose
    pose = compose({ x: dx, z: dz, theta: dtheta }, pose);

    if (Math.abs(rmse - newRmse) < tol) { rmse = newRmse; iter++; break; }
    rmse = newRmse;
  }
  return { pose, rmse, iterations: iter };
}

export { apply as applyPose2D, compose as composePose2D };
