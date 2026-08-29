/**
 * player — runs a timeline on the real hardware.
 *
 * Two movement modes, and the difference is worth stating plainly:
 *
 *  LINEAR  one /api/batch per frame. The servo's own trapezoidal profile does the moving:
 *          it accelerates at `acc`, runs at the speed cap, decelerates at the end. Cheap
 *          (one request per frame) and perfectly fine for posing.
 *
 *  SINE    the laptop streams intermediate setpoints along a raised-cosine curve, so
 *          velocity starts at zero, peaks mid-path and returns to zero. The servo is never
 *          asked to jump, so the motion reads as smooth rather than as a series of starts.
 *          This is why the sequencer lives on the laptop: streaming ~25 setpoints a second
 *          across a dozen joints is nothing here and would be real work on the ESP.
 *
 * The speed cap is passed on every batch either way, so SINE can never exceed what LINEAR
 * would have done — the eased path is slower everywhere except its midpoint, where it at
 * most matches. A short move simply never gets near the cap, which is the "common sense"
 * case: there is no time to accelerate, so it does not try.
 */
import { ttlUrl } from '@/state/espTtlStore';
import { useTimelineStore, type Frame } from './timelineStore';

/** Raised cosine: 0 at u=0, 1 at u=1, zero slope at both ends. */
const ease = (u: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;

/** How often we push a setpoint while easing. 25 Hz is smooth and leaves the bus idle. */
const STEP_MS = 40;

/** A move shorter than this is not worth streaming — just send it and let the servo go. */
const MIN_EASE_MS = 120;

let abort: AbortController | null = null;
let running = false;

const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('stopped', 'AbortError')); },
    { once: true });
});

/** POST-free: the board's API is all GET query strings. */
async function sendPose(pose: Record<number, number>, speed: number, acc: number, signal: AbortSignal) {
  const parts = Object.entries(pose).map(([id, deg]) => `${id}=${(+deg).toFixed(1)}`);
  if (!parts.length) return;
  const url = `${ttlUrl()}/api/batch?${parts.join('&')}&speed=${speed}&acc=${acc}`;
  await fetch(url, { cache: 'no-store', signal });
}

/** Angles the arm should be at right now, per the frame we are leaving. */
function poseOf(f: Frame) { return f.pose; }

/** Blend two poses. Joints missing from either side are carried through unchanged. */
function lerpPose(a: Record<number, number>, b: Record<number, number>, k: number) {
  const out: Record<number, number> = {};
  for (const key of Object.keys(b)) {
    const id = Number(key);
    const from = a[id];
    out[id] = from == null ? b[id] : from + (b[id] - from) * k;
  }
  return out;
}

export function isPlaying() { return running; }

export function stopPlayback() {
  if (abort) abort.abort();
  abort = null;
  running = false;
  const st = useTimelineStore.getState();
  st.setPlaying(false);
  st.setPlayIdx(-1);
}

/**
 * Play the timeline from `startIdx`. Resolves when it finishes or is stopped.
 * `onError` is called with a human-readable reason rather than throwing, because a board
 * that stops answering mid-sequence is an expected event, not an exception.
 */
export async function playTimeline(startIdx = 0, onError?: (msg: string) => void) {
  if (running) return;
  const st = useTimelineStore.getState();
  const frames = st.frames;
  if (!frames.length) return;

  abort = new AbortController();
  const signal = abort.signal;
  running = true;
  st.setPlaying(true);

  const acc = 30;

  try {
    do {
      // Where the arm actually is right now is unknown to us mid-sequence, so the first
      // frame is always a plain move: ease from an unknown start would be a guess.
      let prev: Record<number, number> | null = null;

      for (let i = startIdx; i < frames.length; i++) {
        if (signal.aborted) break;
        const live = useTimelineStore.getState();
        const f = live.frames[i];
        if (!f) break;

        useTimelineStore.getState().setPlayIdx(i);

        const speed = f.speed ?? live.globalSpeed;
        const dwell = f.delayMs ?? live.globalDelayMs;
        const target = poseOf(f);

        if (live.sine && prev && dwell >= MIN_EASE_MS) {
          // Spend the dwell moving, not waiting: the frame's time budget IS the move.
          const steps = Math.max(2, Math.round(dwell / STEP_MS));
          for (let k = 1; k <= steps; k++) {
            if (signal.aborted) break;
            const t0 = performance.now();
            await sendPose(lerpPose(prev, target, ease(k / steps)), speed, acc, signal);
            const spent = performance.now() - t0;
            // Subtract the request time so a slow board stretches the move rather than
            // silently running the whole sequence late.
            await sleep(Math.max(0, STEP_MS - spent), signal);
          }
        } else {
          await sendPose(target, speed, acc, signal);
          await sleep(dwell, signal);
        }

        prev = { ...(prev || {}), ...target };
      }
      startIdx = 0;
    } while (!signal.aborted && useTimelineStore.getState().loop);
  } catch (e: any) {
    if (e?.name !== 'AbortError') onError?.(e?.message || String(e));
  } finally {
    running = false;
    abort = null;
    const s = useTimelineStore.getState();
    s.setPlaying(false);
    s.setPlayIdx(-1);
  }
}

/** Jump straight to one frame's pose (used by the "go" button on a frame card). */
export async function gotoFrame(f: Frame, onError?: (msg: string) => void) {
  const st = useTimelineStore.getState();
  const ctl = new AbortController();
  try {
    await sendPose(f.pose, f.speed ?? st.globalSpeed, 30, ctl.signal);
  } catch (e: any) {
    onError?.(e?.message || String(e));
  }
}
