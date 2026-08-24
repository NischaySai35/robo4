/**
 * frameProfiler — opt-in main-thread profiler for diagnosing low FPS.
 *
 * The viewport FPS counter measures how often requestAnimationFrame *fires*, not
 * GPU cost. When it reads far below 60 on a light scene (e.g. ~300K triangles),
 * the bottleneck is the JS MAIN THREAD, not the renderer. This profiler pinpoints
 * where the time goes: per-frame section timings (tick vs render) plus a global
 * long-task / GC-pause monitor.
 *
 * ENABLE (zero cost when off):
 *   • add `?profile` to the URL, or
 *   • run `localStorage.robo_profile = '1'` in the console, then reload.
 *
 * Reads a 1 Hz summary to the console:
 *   [frame] fps=8  tick avg 4.1 / max 9  render avg 2.0 / max 6  (ms)
 *   [longtask] 187ms  ← anything >50ms is a dropped-frames stall (often GC)
 */

function profilerEnabled(): boolean {
  try {
    if (typeof location !== 'undefined' && location.search.includes('profile')) return true;
    return localStorage.getItem('robo_profile') === '1';
  } catch { return false; }
}

export interface FrameProfiler {
  frameStart(): void;
  mark(section: 'tick' | 'render'): void;
  frameEnd(): void;
  dispose(): void;
}

const NOOP: FrameProfiler = {
  frameStart() {}, mark() {}, frameEnd() {}, dispose() {},
};

export function createFrameProfiler(): FrameProfiler {
  if (!profilerEnabled()) return NOOP;

  const now = () => performance.now();
  let t0 = 0, tMark = 0;
  let frames = 0;
  let winStart = now();
  const acc = { tick: 0, render: 0 };
  const max = { tick: 0, render: 0 };
  let lastHeap = heapMB();

  function heapMB(): number | null {
    const m = (performance as any).memory;
    return m ? Math.round(m.usedJSHeapSize / 1048576) : null;
  }

  // Global long-task monitor: any task blocking the thread >50ms drops frames.
  // These are usually GC pauses (large heap) or a heavy synchronous callback
  // (e.g. a setInterval doing FK / stress recompute), which the per-frame timers
  // below won't attribute since they fire outside the RAF loop.
  let obs: PerformanceObserver | null = null;
  try {
    obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.duration >= 50) {
          const attr = (e as any).attribution?.[0]?.name ?? '';
          // eslint-disable-next-line no-console
          console.warn(`[longtask] ${Math.round(e.duration)}ms — main-thread stall${attr ? ` (${attr})` : ''}`);
        }
      }
    });
    obs.observe({ entryTypes: ['longtask'] });
  } catch { /* longtask API unavailable (Firefox/Safari) — per-frame timers still work */ }

  // eslint-disable-next-line no-console
  console.info('[frameProfiler] ON — 1 Hz summary below. Disable with `delete localStorage.robo_profile` + reload.');

  return {
    frameStart() { t0 = now(); tMark = t0; },
    mark(section) {
      const t = now();
      const dt = t - tMark;
      tMark = t;
      acc[section] += dt;
      if (dt > max[section]) max[section] = dt;
    },
    frameEnd() {
      frames++;
      const t = now();
      if (t - winStart >= 1000) {
        const fps = Math.round((frames * 1000) / (t - winStart));
        const avg = (k: 'tick' | 'render') => (acc[k] / Math.max(1, frames)).toFixed(1);
        const heap = heapMB();
        const dHeap = heap != null && lastHeap != null ? heap - lastHeap : null;
        lastHeap = heap;
        // eslint-disable-next-line no-console
        console.info(
          `[frame] fps=${fps}  tick ${avg('tick')}/${max.tick.toFixed(0)}  ` +
          `render ${avg('render')}/${max.render.toFixed(0)} ms` +
          (heap != null ? `  heap ${heap}MB${dHeap != null ? ` (${dHeap >= 0 ? '+' : ''}${dHeap})` : ''}` : ''),
        );
        frames = 0; winStart = t; acc.tick = 0; acc.render = 0; max.tick = 0; max.render = 0;
      }
    },
    dispose() { obs?.disconnect(); },
  };
}
