/**
 * busyStore — global "something heavy is running" channel.
 *
 * Usage:
 *   await busyStore.run('Importing…', async (sig) => {
 *     const result = await heavyWork();
 *     if (sig.aborted) return;   // user cancelled — skip committing
 *     dispatch(result);
 *   });
 *
 * The cancel button calls cancel(), which sets aborted=true on the signal.
 * Heavy synchronous work (OCCT WASM) will still run to completion on the
 * main thread, but the result is silently discarded.
 */
import { create } from 'zustand';

let _seq = 0;

export interface BusyCancelSignal { aborted: boolean }

interface BusyState {
  tasks: Record<number, string>;
  _signal: BusyCancelSignal;
  begin: (label?: string) => number;
  end: (id: number) => void;
  run: <T>(label: string, fn: (sig: BusyCancelSignal) => T | Promise<T>) => Promise<T | undefined>;
  cancel: () => void;
}

export const useBusyStore = create<BusyState>((set, get) => ({
  tasks: {},
  _signal: { aborted: false },

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

  /** Run fn while showing the busy bar. Yields one frame so the bar paints first. */
  async run(label, fn) {
    const sig: BusyCancelSignal = { aborted: false };
    set({ _signal: sig });
    const id = get().begin(label);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      return await fn(sig);
    } finally {
      get().end(id);
    }
  },

  cancel() {
    get()._signal.aborted = true;
    set({ tasks: {} });
  },
}));

export function busySnapshot(state: BusyState) {
  const ids = Object.keys(state.tasks);
  return { active: ids.length > 0, label: ids.length ? state.tasks[ids[ids.length - 1] as any] : '' };
}
