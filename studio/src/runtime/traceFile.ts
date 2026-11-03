/**
 * traceFile.ts — reads a callback trace written by GOS (`App(trace=path)`, Chrome's trace format) for the Runtime
 * panel's Trace tab: one bar per callback run, and totals per callback. Pure and node-testable.
 */
// REUSE-CHECKED: trace|perfetto|traceEvents in studio/src -> nothing reads traces; messageBus stats and recorder bags
// are about messages, not how long callbacks took. Format comes from gos/python/gos/execution.py Tracer.

export interface TraceBar { name: string; thread: number; startMs: number; durMs: number }
export interface TraceRow { name: string; count: number; totalMs: number; medianMs: number; worstMs: number }
export interface Trace { bars: TraceBar[]; rows: TraceRow[]; threads: number[]; lengthMs: number }

/** Parse the text of a trace file. Throws with a sentence saying what is wrong. */
export function parseTrace(text: string): Trace {
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not JSON, so it is not a GOS trace.'); }
  const events = Array.isArray(data) ? data : data?.traceEvents;
  if (!Array.isArray(events)) throw new Error('No trace events in this file. Make one with gos.App(trace="trace.json").');
  const timed = events.filter((e) => e?.ph === 'X' && Number.isFinite(e.ts) && Number.isFinite(e.dur));
  if (!timed.length) throw new Error('This trace is empty: no callback ran while it was recording.');
  const t0 = Math.min(...timed.map((e) => e.ts));
  const bars: TraceBar[] = timed.map((e) => ({ name: String(e.name), thread: e.tid ?? 0, startMs: (e.ts - t0) / 1000, durMs: e.dur / 1000 }));
  const byName = new Map<string, number[]>();
  for (const b of bars) { const d = byName.get(b.name); if (d) d.push(b.durMs); else byName.set(b.name, [b.durMs]); }
  const rows = [...byName].map(([name, d]) => {
    d.sort((a, b) => a - b);
    return { name, count: d.length, totalMs: d.reduce((a, b) => a + b, 0), medianMs: d[d.length >> 1], worstMs: d[d.length - 1] };
  }).sort((a, b) => b.totalMs - a.totalMs);
  return { bars, rows, threads: [...new Set(bars.map((b) => b.thread))], lengthMs: Math.max(...bars.map((b) => b.startMs + b.durMs)) };
}
