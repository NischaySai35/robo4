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
  /**
   * per-joint max |jerk| (rad/s³ or m/s³). When provided, a JERK-LIMITED (S-curve)
   * profile is used instead of trapezoidal, so acceleration ramps smoothly instead of
   * stepping — real servos/drives track it without the vibration & overshoot that a
   * trapezoidal (infinite-jerk) profile causes. Omit for the original trapezoidal path.
   */
  jMax?: number[];
}

/** A constant-jerk phase used to assemble an S-curve profile. */
interface Phase { dur: number; j: number; }

/**
 * Rest-to-rest jerk-limited (double-S) profile over a scalar distance D, honoring
 * peak velocity/acceleration/jerk caps. Returns the 7 (some possibly zero-length)
 * constant-jerk phases. Follows the standard Biagiotti–Melchiorri case analysis.
 */
function sCurvePhases(D: number, vmax: number, amax: number, jmax: number): Phase[] {
  let Tj: number, Ta: number, Tv: number;
  // 1) Does acceleration reach amax during the accel ramp?
  if (vmax * jmax >= amax * amax) { Tj = amax / jmax; Ta = Tj + vmax / amax; }
  else { Tj = Math.sqrt(vmax / jmax); Ta = 2 * Tj; }

  // 2) Is vmax actually reached over the distance? (accel+decel cover vmax*Ta)
  if (D > vmax * Ta) {
    Tv = (D - vmax * Ta) / vmax;
  } else {
    Tv = 0; // no cruise — recompute a reduced-peak profile
    if (D >= 2 * amax * amax * amax / (jmax * jmax)) {
      // amax still reached: D = amax·(Ta − Tj)·Ta  →  solve quadratic for Ta
      Tj = amax / jmax;
      Ta = Tj / 2 + Math.sqrt(Tj * Tj / 4 + D / amax);
    } else {
      // amax not reached: pure ramp-up/ramp-down, D = 2·jmax·Tj³
      Tj = Math.cbrt(D / (2 * jmax));
      Ta = 2 * Tj;
    }
  }
  const Tc = Math.max(0, Ta - 2 * Tj); // constant-acceleration sub-phase
  return [
    { dur: Tj, j: jmax }, { dur: Tc, j: 0 }, { dur: Tj, j: -jmax }, // accel S
    { dur: Tv, j: 0 },                                              // cruise
    { dur: Tj, j: -jmax }, { dur: Tc, j: 0 }, { dur: Tj, j: jmax }, // decel S
  ];
}

/** Build a time→(s, sdot) sampler by analytically integrating constant-jerk phases. */
function integratePhases(phases: Phase[], L: number) {
  // Cumulative phase start states (t, s, v, a).
  const starts: { t: number; s: number; v: number; a: number }[] = [];
  let t = 0, s = 0, v = 0, a = 0;
  for (const p of phases) {
    starts.push({ t, s, v, a });
    const d = p.dur;
    s += v * d + 0.5 * a * d * d + (1 / 6) * p.j * d * d * d;
    v += a * d + 0.5 * p.j * d * d;
    a += p.j * d;
    t += d;
  }
  const duration = t;
  const sAt = (tt: number): { s: number; sdot: number } => {
    if (tt <= 0) return { s: 0, sdot: 0 };
    if (tt >= duration) return { s: L, sdot: 0 };
    // find the active phase
    let k = phases.length - 1;
    for (let i = 0; i < phases.length; i++) {
      if (tt < starts[i].t + phases[i].dur) { k = i; break; }
    }
    const st = starts[k], d = tt - st.t, j = phases[k].j;
    const s = st.s + st.v * d + 0.5 * st.a * d * d + (1 / 6) * j * d * d * d;
    const sdot = st.v + st.a * d + 0.5 * j * d * d;
    return { s: Math.min(L, Math.max(0, s)), sdot: Math.max(0, sdot) };
  };
  return { duration, sAt };
}

/**
 * Round the sharp corners of a piecewise-linear joint path so direction changes
 * GRADUALLY instead of instantly. A sharp corner forces an instantaneous change of
 * joint-velocity direction → an acceleration spike no real drive can follow, which
 * jerk-limiting the path *parameter* alone cannot fix. We replace each interior
 * waypoint with a quadratic-Bézier blend within `radius` of the corner, clamped to
 * half of each adjacent segment so blends never overlap. Near-straight corners and
 * degenerate segments are passed through unchanged. Endpoints are preserved exactly.
 *
 * `radius` is in joint-space units (rad/m); `segments` controls blend smoothness.
 */
export function blendCorners(path: number[][], radius: number, segments = 8): number[][] {
  if (path.length < 3 || radius <= 0) return path.map((p) => [...p]);
  const len = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));
  const lerp = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

  const out: number[][] = [[...path[0]]];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1], cur = path[i], next = path[i + 1];
    const lIn = len(prev, cur), lOut = len(cur, next);
    if (lIn < 1e-9 || lOut < 1e-9) continue; // degenerate segment → drop the corner
    // unit directions in/out; skip blending if the corner is ~straight
    const dIn = cur.map((v, k) => (v - prev[k]) / lIn);
    const dOut = next.map((v, k) => (next[k] - cur[k]) / lOut);
    const cosTheta = dIn.reduce((s, v, k) => s + v * dOut[k], 0);
    if (cosTheta > 0.9999) { out.push([...cur]); continue; }

    const r = Math.min(radius, lIn / 2, lOut / 2);
    const A = lerp(cur, prev, r / lIn); // back along the incoming segment
    const B = lerp(cur, next, r / lOut); // forward along the outgoing segment
    out.push(A);
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      // quadratic Bézier A→cur→B (cur is the control point)
      const p1 = lerp(A, cur, t), p2 = lerp(cur, B, t);
      out.push(lerp(p1, p2, t));
    }
    out.push(B);
  }
  out.push([...path[path.length - 1]]);
  // drop consecutive duplicates that can arise from clamping
  const dedup: number[][] = [];
  for (const p of out) {
    if (!dedup.length || len(dedup[dedup.length - 1], p) > 1e-9) dedup.push(p);
  }
  return dedup;
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
  const useJerk = Array.isArray(limits.jMax) && limits.jMax.some((v) => Number.isFinite(v) && v > 0);
  const segLen: number[] = [];
  const segDir: number[][] = [];
  const cum: number[] = [0];
  let sdotMax = Infinity, sddotMax = Infinity, sdddotMax = Infinity;
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
        if (useJerk) sdddotMax = Math.min(sdddotMax, (limits.jMax![j] || Infinity) / a);
      }
    }
  }
  const L = cum[cum.length - 1];
  if (L < 1e-9 || !isFinite(sdotMax) || !isFinite(sddotMax)) {
    const q = path[path.length - 1];
    return { duration: 0, sample: () => [...q], velocity: () => q.map(() => 0), waypoints: path };
  }

  // Profile on s ∈ [0, L]: jerk-limited (S-curve) when jMax is given, else trapezoidal.
  let duration: number;
  let sAt: (t: number) => { s: number; sdot: number };
  if (useJerk && isFinite(sdddotMax) && sdddotMax > 0) {
    const prof = integratePhases(sCurvePhases(L, sdotMax, sddotMax, sdddotMax), L);
    duration = prof.duration;
    sAt = prof.sAt;
  } else {
    // Trapezoidal (or triangular) profile on s ∈ [0, L].
    const vCruise = Math.min(sdotMax, Math.sqrt(L * sddotMax)); // can't exceed what accel allows over L/2
    const tAcc = vCruise / sddotMax;
    const sAcc = 0.5 * sddotMax * tAcc * tAcc;
    const sCruise = Math.max(0, L - 2 * sAcc);
    const tCruise = sCruise / vCruise;
    duration = 2 * tAcc + tCruise;
    sAt = (t: number): { s: number; sdot: number } => {
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
  }

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
