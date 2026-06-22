/**
 * trajectory — time-parameterization of a geometric joint path (MoveIt's TOTG role).
 *
 * A planner returns WAYPOINTS (no timing). To execute on a real robot you need a
 * trajectory: position (and velocity) as a function of TIME that never exceeds each
 * joint's velocity/acceleration limits. We parameterize the path by arc-length `s`
 * and run a trapezoidal velocity profile on `s`, with the path-space speed/accel caps
 * derived from the most-constraining joint on each segment. The result is smooth,
 * limit-respecting, and close to time-optimal for the given path. No React/Three.
 */
export interface Limits {
  /** per-joint max |velocity| (rad/s or m/s) */
  vMax: number[];
  /** per-joint max |acceleration| */
  aMax: number[];
}

export interface TimedTrajectory {
  duration: number;                 // seconds
  /** position vector at time t (clamped to [0,duration]) */
  sample: (t: number) => number[];
  /** velocity vector at time t */
  velocity: (t: number) => number[];
  waypoints: number[][];
}

const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const norm = (a: number[]) => Math.hypot(...a);

export function timeParameterize(path: number[][], limits: Limits): TimedTrajectory {
  // Degenerate paths.
  if (path.length === 0) {
    return { duration: 0, sample: () => [], velocity: () => [], waypoints: path };
  }
  if (path.length === 1) {
    const q = path[0];
    return { duration: 0, sample: () => [...q], velocity: () => q.map(() => 0), waypoints: path };
  }

  // Cumulative arc-length + per-segment unit direction.
  const segLen: number[] = [];
  const segDir: number[][] = [];
  const cum: number[] = [0];
  let sdotMax = Infinity, sddotMax = Infinity;
  for (let i = 1; i < path.length; i++) {
    const d = sub(path[i], path[i - 1]);
    const len = norm(d);
    segLen.push(len);
    const dir = len > 1e-9 ? d.map((v) => v / len) : d.map(() => 0);
    segDir.push(dir);
    cum.push(cum[i - 1] + len);
    // path-space caps from the binding joint on this segment
    for (let j = 0; j < dir.length; j++) {
      const a = Math.abs(dir[j]);
      if (a > 1e-6) {
        sdotMax = Math.min(sdotMax, limits.vMax[j] / a);
        sddotMax = Math.min(sddotMax, limits.aMax[j] / a);
      }
    }
  }
  const L = cum[cum.length - 1];
  if (L < 1e-9 || !isFinite(sdotMax) || !isFinite(sddotMax)) {
    const q = path[path.length - 1];
    return { duration: 0, sample: () => [...q], velocity: () => q.map(() => 0), waypoints: path };
  }

  // Trapezoidal (or triangular) profile on s ∈ [0, L].
  const vCruise = Math.min(sdotMax, Math.sqrt(L * sddotMax)); // can't exceed what accel allows over L/2
  const tAcc = vCruise / sddotMax;
  const sAcc = 0.5 * sddotMax * tAcc * tAcc;
  const sCruise = Math.max(0, L - 2 * sAcc);
  const tCruise = sCruise / vCruise;
  const duration = 2 * tAcc + tCruise;

  // s(t) and sdot(t) along the profile.
  const sAt = (t: number): { s: number; sdot: number } => {
    if (t <= 0) return { s: 0, sdot: 0 };
    if (t >= duration) return { s: L, sdot: 0 };
    if (t < tAcc) return { s: 0.5 * sddotMax * t * t, sdot: sddotMax * t };
    if (t < tAcc + tCruise) {
      const dt = t - tAcc;
      return { s: sAcc + vCruise * dt, sdot: vCruise };
    }
    const dt = t - tAcc - tCruise;
    return { s: sAcc + sCruise + vCruise * dt - 0.5 * sddotMax * dt * dt, sdot: vCruise - sddotMax * dt };
  };

  // map s → segment index + local fraction
  const locate = (s: number): { seg: number; f: number } => {
    const sc = Math.min(L, Math.max(0, s));
    let seg = 0;
    while (seg < segLen.length - 1 && cum[seg + 1] < sc) seg++;
    const f = segLen[seg] > 1e-9 ? (sc - cum[seg]) / segLen[seg] : 0;
    return { seg, f };
  };

  const sample = (t: number): number[] => {
    const { s } = sAt(t);
    const { seg, f } = locate(s);
    return path[seg].map((v, j) => v + (path[seg + 1][j] - v) * f);
  };
  const velocity = (t: number): number[] => {
    const { s, sdot } = sAt(t);
    const { seg } = locate(s);
    return segDir[seg].map((d) => d * sdot);
  };

  return { duration, sample, velocity, waypoints: path };
}
