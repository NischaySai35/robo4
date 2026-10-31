/**
 * frameScheduler — the only caller of requestAnimationFrame (P3, RESTRUCTURING §5).
 *
 * Same contract as the browser pair, but every callback shares one browser frame, so a view can
 * be drawn after all state ticks and an idle app with nothing queued asks for no frames at all.
 * One callback throwing must not stop the others: they include the viewport render loops.
 */
type FrameCallback = (now: number) => void;

let queue = new Map<number, FrameCallback>();
let nextId = 1;
let pending = false;

const requestBrowserFrame = (fn: FrameCallback) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fn);
  else setTimeout(() => fn(performance.now()), 16); // Node tests have no browser frames
};

function runFrame(now: number) {
  pending = false;
  const due = queue;
  queue = new Map();
  for (const fn of due.values()) {
    try { fn(now); } catch (e) { console.error('frame callback failed:', e); }
  }
}

export function scheduleFrame(fn: FrameCallback): number {
  const id = nextId++;
  queue.set(id, fn);
  if (!pending) { pending = true; requestBrowserFrame(runFrame); }
  return id;
}

export function cancelFrame(id: number | null | undefined) {
  if (id != null) queue.delete(id);
}
