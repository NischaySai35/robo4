/// <reference lib="webworker" />
/**
 * planWorker.ts — runs the v2 planner off the page's main thread (a plan can take
 * minutes: every candidate dock solves a closed pose and a safe joint path).
 *
 * in:  { kind: 'plan', current: Config, target: ShapeEntry, maxExpansions?, effort? }
 * out: { kind: 'progress', msg } … then { kind: 'done', plan }
 */
import { planTo } from './planner';
import type { Config, ShapeEntry } from './model';

self.onmessage = (ev: MessageEvent) => {
  const m = ev.data as { kind: 'plan'; current: Config; target: ShapeEntry; maxExpansions?: number; effort?: number };
  if (m.kind !== 'plan') return;
  const t0 = performance.now();
  const plan = planTo(m.current, m.target, {
    maxExpansions: m.maxExpansions ?? 6,
    effort: m.effort ?? 1,
    onProgress: (msg) => (self as unknown as Worker).postMessage({ kind: 'progress', msg }),
  });
  (self as unknown as Worker).postMessage({ kind: 'done', plan, ms: performance.now() - t0 });
};
