/**
 * memoryMonitor — a background heap-pressure watcher, not a fixed reload trigger.
 *
 * There is no browser API to force garbage collection or to reclaim GPU memory
 * in general — the only real lever application code has is: (a) make sure every
 * THREE.js object we're done with is actually .dispose()'d (a correctness bug if
 * missing, fixed at the source, not something a monitor can paper over), and
 * (b) proactively drop caches that are safe to rebuild on demand, like unused
 * parsed-mesh templates in AssetCache. This monitor does (b), continuously and
 * dynamically — checking MORE often as heap usage climbs, instead of a single
 * hard-coded "reload at N MB" cutoff. It never reloads or reconnects anything;
 * worst case if it's wrong is a re-parse of an asset next time it's needed.
 */
import { pruneUnusedAssets } from '@/viewport/renderers/AssetCache';

interface MemSample { t: number; bytes: number }

const MB = 1024 * 1024;
const HISTORY_MAX = 20;

export function startMemoryMonitor(getDoc: () => { assets?: Record<string, unknown> } | null | undefined) {
  const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  if (!perfMemory) return () => {}; // API only exists in Chromium (Electron/Chrome) — no-op elsewhere

  const history: MemSample[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const growthMBPerMin = (): number => {
    if (history.length < 2) return 0;
    const first = history[0], last = history[history.length - 1];
    const minutes = (last.t - first.t) / 60000;
    if (minutes <= 0) return 0;
    return (last.bytes - first.bytes) / MB / minutes;
  };

  const tick = () => {
    if (stopped) return;
    const bytes = perfMemory.usedJSHeapSize;
    history.push({ t: Date.now(), bytes });
    if (history.length > HISTORY_MAX) history.shift();

    const mb = bytes / MB;
    const growth = growthMBPerMin();

    // Prune reclaimable caches more eagerly the higher/faster usage climbs —
    // "always on, more active when it's high" rather than one fixed threshold.
    const shouldPrune = mb > 300 || growth > 15;
    if (shouldPrune) {
      const doc = getDoc();
      const used = new Set(Object.keys(doc?.assets ?? {}));
      const evicted = pruneUnusedAssets(used);
      if (evicted > 0) console.info(`[memoryMonitor] heap ${mb.toFixed(0)}MB, growth ${growth.toFixed(1)}MB/min — evicted ${evicted} unused cached asset template(s)`);
    }

    // Check sooner while memory is under real pressure, back off when it's calm —
    // avoids both wasting cycles and letting a fast leak run unchecked between checks.
    const nextDelay = mb > 800 || growth > 30 ? 5000 : mb > 300 || growth > 10 ? 15000 : 45000;
    timer = setTimeout(tick, nextDelay);
  };

  timer = setTimeout(tick, 5000);
  return () => { stopped = true; if (timer) clearTimeout(timer); };
}
