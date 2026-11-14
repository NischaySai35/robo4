/**
 * player — every motion button of the timeline (play, play from here, go), on ALL modules, in step.
 *
 * Nothing is streamed from the laptop any more: a laptop cannot keep two boards in step over Wi-Fi (each request has
 * its own delay, and a napping radio adds up to a second). Every motion is uploaded to the boards first; the laptop
 * then gives every board the same start instant in its own clock (sender.ts startOnBoard), and each plays alone.
 * If one stops part-way, follow() stops all.
 *   play / play from here  the whole timeline, from that frame
 *   go                     a one-frame animation to that frame's pose, at a gentle speed
 * The highlighted frame follows what the first module reports.
 */
import { useTimelineStore, type Frame } from './timelineStore';
import { sendToBoard, startOnBoard, stopOnBoard, boardStatus } from './sender';

let watch: number | null = null;

function follow() {
  if (watch !== null) window.clearInterval(watch);
  const st = useTimelineStore.getState();
  st.setPlaying(true);
  let misses = 0, busy = false;
  watch = window.setInterval(async () => {
    if (busy) return;                 // a slow answer: never pile up requests on the radio
    busy = true;
    const s = await boardStatus().finally(() => { busy = false; });
    if (!s) { if (++misses > 10) endFollow(); return; }
    misses = 0;
    // 14 Nov 2026: one module stopping (guard, E-STOP on it) does NOT stop the others - each runs its own timetable
    if (!s.playing) { endFollow(); return; }
    useTimelineStore.getState().setPlayIdx(s.idx);
  }, 300);
}

function endFollow() {
  if (watch !== null) { window.clearInterval(watch); watch = null; }
  const st = useTimelineStore.getState();
  st.setPlaying(false); st.setPlayIdx(-1);
}

export function isPlaying() { return useTimelineStore.getState().playing; }

/** Stop every module and the highlight. */
export function stopPlayback() {
  endFollow();
  void stopOnBoard();
}

/** Upload, then start together. `say` gets the outcome in words (errors included). */
async function run(frames: Frame[], from: number, say?: (msg: string) => void, what = 'playing') {
  const up = await sendToBoard(frames);
  if (!up.ok) { say?.(`could not upload: ${up.error}`); return; }
  const go = await startOnBoard(from);
  if (!go.ok) { say?.(`uploaded but could not start: ${go.error}`); return; }
  say?.(`${what} on ${up.modules} module${up.modules === 1 ? '' : 's'}${[up.note, go.note].filter(Boolean).map(n => ' — ' + n).join('')}`);
  follow();
}

/** Play the timeline from `startIdx` on every module in it. */
export async function playTimeline(startIdx = 0, say?: (msg: string) => void) {
  const frames = useTimelineStore.getState().frames;
  if (!frames.length) return;
  await run(frames, startIdx, say, startIdx ? `playing from frame ${startIdx + 1}` : 'playing');
}

/**
 * "go" previews a frame, so it moves at a fraction of the sequence speed: it starts from wherever the arm happens to
 * be — often a long, unplanned move — and at playback speed that arrives as a lurch.
 */
const GOTO_SPEED_FRACTION = 0.4;

/** Move every module to one frame's pose (joints missing from it keep the angle earlier frames gave them). */
export async function gotoFrame(f: Frame, say?: (msg: string) => void) {
  const st = useTimelineStore.getState();
  const idx = st.frames.findIndex(x => x.id === f.id);
  const pose: Record<string, number> = {};
  for (const x of idx >= 0 ? st.frames.slice(0, idx + 1) : [f]) Object.assign(pose, x.pose);
  const speed = Math.max(1, Math.round((f.speed ?? st.globalSpeed) * GOTO_SPEED_FRACTION));
  await run([{ ...f, pose, speed, delayMs: 0, holdMs: 0 }], 0, say, `going to ${f.name}`);
}
