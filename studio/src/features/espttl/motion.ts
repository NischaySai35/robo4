/**
 * motion — the same move planner the board runs, so the timeline can show what a frame will
 * really take BEFORE it is sent. Keep the constants in step with ANIM_* in
 * firmware/esp32_multi/esp32_multi.ino.
 *
 * The board sends ONE goal per joint per frame and the servo's own trapezoid does the moving
 * (streaming setpoints at the servo makes it re-plan every update and fight itself). Each
 * trapezoid spends a share rf of the move speeding up and rf slowing down: 1/3 with Sine on,
 * 0.15 with it off. For D steps in T:  v = D / (T (1 - rf))   a = v / (rf T).
 * Speed 1..10 is the PEAK joint velocity (speed/10 x 180 deg/s), and the acceleration limit
 * comes with it (reaching that peak takes RAMP_S). The frame takes the longest of the
 * requested time (0 = auto) and every joint's own minimum, so nothing is clipped and all
 * joints finish together.
 */
export const STEPS_PER_DEG = 4096 / 360;
export const VMAX_DEG_S = 180;       // peak velocity at speed 10
const RAMP_S = 0.35;
const RF_SINE = 1 / 3;
const RF_LINEAR = 0.15;
const MIN_FRAME_S = 0.12;

/** Peak joint velocity for a speed setting, deg/s. */
export const peakDegPerS = (speed: number) => (Math.min(10, Math.max(1, speed)) / 10) * VMAX_DEG_S;

const rf = (sine: boolean) => (sine ? RF_SINE : RF_LINEAR);
const kv = (sine: boolean) => 1 / (1 - rf(sine));
const ka = (sine: boolean) => 1 / (rf(sine) * (1 - rf(sine)));

/** Smooth 0..1 -> 0..1 easing (minimum-jerk) used by Stream from laptop. */
export function profile(u: number, sine: boolean): number {
  u = Math.min(1, Math.max(0, u));
  if (sine) return u * u * u * (10 + u * (-15 + 6 * u));
  const r = RF_LINEAR, vp = 1 / (1 - r);
  if (u < r) return 0.5 * vp / r * u * u;
  if (u > 1 - r) { const w = 1 - u; return 1 - 0.5 * vp / r * w * w; }
  return 0.5 * vp * r + vp * (u - r);
}

export interface FramePlan {
  /** What the frame will actually take, ms. */
  ms: number;
  /** The shortest it could take under the speed and acceleration limits, ms. */
  minMs: number;
  /** True when the requested time was too short and the frame had to stretch. */
  stretched: boolean;
  /** The joint that sets the minimum (largest need), if any moved. */
  limitingId: number | null;
}

export function planFrame(
  from: Record<number, number> | null,
  to: Record<number, number>,
  speed: number,
  requestedMs: number,          // 0 = auto
  sine: boolean,
): FramePlan {
  const vCap = peakDegPerS(speed) * STEPS_PER_DEG;
  const aMax = vCap / RAMP_S;
  let tMin = 0;
  let limitingId: number | null = null;
  for (const key of Object.keys(to)) {
    const id = Number(key);
    const a = from?.[id];
    if (a == null) continue;                              // no known start: assume it is there
    const D = Math.abs(to[id] - a) * STEPS_PER_DEG;
    if (D < 4) continue;
    const t = Math.max(kv(sine) * D / vCap, Math.sqrt(ka(sine) * D / aMax));
    if (t > tMin) { tMin = t; limitingId = id; }
  }
  const req = Math.max(0, requestedMs) / 1000;
  const T = Math.max(req, tMin, MIN_FRAME_S);
  return {
    ms: Math.round(T * 1000),
    minMs: Math.round(Math.max(tMin, MIN_FRAME_S) * 1000),
    stretched: requestedMs > 0 && tMin > req + 0.02,
    limitingId,
  };
}

/** Plan every frame in order. `live` is where the arm is now (the first frame's start). */
export function planTimeline(
  frames: { pose: Record<number, number>; speed: number | null; delayMs: number | null }[],
  globalSpeed: number, globalDelayMs: number, sine: boolean,
  live: Record<number, number> | null,
): FramePlan[] {
  const out: FramePlan[] = [];
  let prev: Record<number, number> | null = live && Object.keys(live).length ? { ...live } : null;
  for (const f of frames) {
    out.push(planFrame(prev, f.pose, f.speed ?? globalSpeed, f.delayMs ?? globalDelayMs, sine));
    prev = { ...(prev || {}), ...f.pose };
  }
  return out;
}
