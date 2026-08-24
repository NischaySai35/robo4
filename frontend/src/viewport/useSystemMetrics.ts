/**
 * useSystemMetrics — real per-application RAM / CPU / GPU, polled from the Electron shell.
 *
 * This replaces the HUD's old `performance.memory.usedJSHeapSize` readout, which was
 * actively misleading: it measured only the V8 JS heap (so it missed GPU memory, the
 * Jolt WASM heap, and every process other than the renderer), and because it is a
 * pre-GC sawtooth the number was mostly uncollected garbage rather than memory in use.
 * Watching it climb told you nothing about the app's actual footprint.
 *
 * These figures come from `app.getAppMetrics()` in the main process (plus Windows GPU
 * performance counters), scoped to this application, and match what Task Manager shows.
 *
 * TWO SOURCES, AND THE SCOPE DIFFERS — which the UI must not hide:
 *   • Electron  -> `app.getAppMetrics()` over IPC. THIS APPLICATION only, matching the row
 *                  Task Manager shows for it. scope 'app'.
 *   • Browser   -> the Vite dev server's /__metrics endpoint, which sums the PRIVATE working
 *                  set and CPU of the dev server plus the browser's processes. Close to
 *                  Task Manager (measured 883MB against its 944MB for the same Chrome), but
 *                  an OVER-count: the page is one tab in a shared browser process tree and
 *                  nothing outside the browser can attribute a slice of it to one tab.
 *                  scope 'dev', and the HUD labels it.
 * Passing one off as the other would be worse than showing nothing, hence the explicit scope.
 */
import { useEffect, useState } from 'react';

export type MetricsScope = 'app' | 'dev';

export interface SystemMetrics {
  /** Resident memory of every process this app owns, in bytes. */
  ramBytes: number;
  /** Share of the WHOLE cpu used by this app, 0-100 (already normalised by core count). */
  cpuPercent: number;
  /** Busiest GPU engine's utilisation for this app, 0-100. Null when unknown — never
   *  fabricated as 0, since "no GPU data" and "GPU idle" are very different claims. */
  gpuPercent: number | null;
  /** 'app' = this application only (Electron, exact).
   *  'dev' = the editor/terminal hosting the dev server + the whole browser. */
  scope: MetricsScope;
  /** Per-source itemisation of the total, so the figure is never an unexplained number.
   *  Empty in 'app' scope, where there is only one source. */
  parts: { label: string; ramBytes: number; cpuPercent: number }[];
}

export interface SystemMetricsState extends SystemMetrics {
  /** False when no source answered — neither the desktop shell nor a dev server. */
  available: boolean;
}

/** Must match PAYLOAD_VERSION in tools/vite-plugin-metrics.cjs. */
const DEV_PAYLOAD_VERSION = 3;
let warnedStale = false;

const UNAVAILABLE: SystemMetricsState = {
  ramBytes: 0, cpuPercent: 0, gpuPercent: null, scope: 'app', parts: [], available: false,
};

/** Poll interval. CPU/RAM are cheap (an in-process call); the main process independently
 *  throttles the expensive GPU counter sample to its own slower cadence. */
const POLL_MS = 1000;

export function useSystemMetrics(): SystemMetricsState {
  const [metrics, setMetrics] = useState<SystemMetricsState>(UNAVAILABLE);

  useEffect(() => {
    const api = (window as any).tetrobot;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Once the dev endpoint 404s (a production web build, or no dev server), stop asking —
    // a HUD must not retry a dead endpoint once a second for the life of the session.
    let devEndpointDead = false;

    const read = async (): Promise<SystemMetrics | null> => {
      if (api?.systemMetrics) return api.systemMetrics();
      if (devEndpointDead) return null;
      const res = await fetch('/__metrics', { cache: 'no-store' });
      if (!res.ok) { devEndpointDead = true; return null; }
      const json = await res.json();
      // A stale dev server is otherwise indistinguishable from a wrong measurement: Vite
      // restarts on a config edit but Node's require() cache keeps the old .cjs plugin, so
      // an out-of-date sampler can keep serving plausible-looking nonsense (it reported
      // machine-wide RAM for a while after that code was deleted). Say so, once.
      if (json && json.v !== DEV_PAYLOAD_VERSION && !warnedStale) {
        warnedStale = true;
        console.warn(
          `[metrics] dev server is running OLD plugin code (payload v${json.v ?? '?'}, expected v${DEV_PAYLOAD_VERSION}). ` +
          'Fully stop and restart `npm run dev` — a config-triggered auto-restart does NOT reload the .cjs plugins.',
        );
      }
      return json;
    };

    const poll = async () => {
      try {
        const m = await read();
        if (cancelled) return;
        // The dev endpoint reports available:false until it has two samples (CPU is a delta).
        if (m && (m as any).available !== false) {
          setMetrics({
            ramBytes: m.ramBytes ?? 0,
            cpuPercent: m.cpuPercent ?? 0,
            gpuPercent: typeof m.gpuPercent === 'number' ? m.gpuPercent : null,
            scope: m.scope === 'dev' ? 'dev' : 'app',
            parts: Array.isArray((m as any).parts) ? (m as any).parts : [],
            available: true,
          });
        }
      } catch { /* source went away mid-poll — keep the last reading */ }
      // Chained timeout rather than setInterval: if a sample is ever slow, this waits for
      // it instead of stacking overlapping in-flight IPC calls on top of each other.
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  return metrics;
}

/** Bytes → a compact human string (MB below 1 GB, GB above). */
export function formatRam(bytes: number): string {
  const mb = bytes / 1048576;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
}
