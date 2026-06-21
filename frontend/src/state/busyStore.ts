/**
 * busyStore — a tiny global "something heavy is running" channel.
 *
 * Long operations (entering Edit Mode on a dense mesh, importing a big CAD file)
 * register a task with a label; a thin progress bar at the bottom of the screen
 * shows while any task is active. Tasks are reference-counted by id so concurrent
 * work shows a single bar and clears only when the last finishes.
 */
import { create } from 'zustand';

let _seq = 0;

interface BusyState {
  tasks: Record<number, string>;
  begin: (label?: string) => number;
  end: (id: number) => void;
  run: <T>(label: string, fn: () => T | Promise<T>) => Promise<T>;
}

export const useBusyStore = create<BusyState>((set, get) => ({
  tasks: {}, // id -> label

  /** Begin a task; returns an id to pass to end(). */
  begin(label = 'Working…') {
    const id = ++_seq;
    set((s) => ({ tasks: { ...s.tasks, [id]: label } }));
    return id;
  },
  end(id) {
    set((s) => {
      if (!(id in s.tasks)) return s;
      const next = { ...s.tasks };
      delete next[id];
      return { tasks: next };
    });
  },

  /** Run an async/sync fn while showing the bar. Yields a frame first so the bar
   *  paints before heavy synchronous work blocks the thread. */
  async run(label, fn) {
    const id = get().begin(label);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      return await fn();
    } finally {
      get().end(id);
    }
  },
}));

/** Convenience: is anything busy + the most recent label. */
export function busySnapshot(state: BusyState) {
  const ids = Object.keys(state.tasks);
  return { active: ids.length > 0, label: ids.length ? state.tasks[ids[ids.length - 1] as any] : '' };
}