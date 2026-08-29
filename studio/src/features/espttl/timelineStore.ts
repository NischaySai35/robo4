/**
 * timelineStore — the pose-sequence timeline for the ESP-TTL Animation tab.
 *
 * A "frame" is one pose: an angle per servo id, plus optional per-frame overrides for
 * speed and for the dwell before the NEXT frame. Everything lives here on the laptop —
 * the ESP32 never stores a sequence, it only ever receives "go to these angles now".
 *
 * Undo/redo is a plain snapshot stack. Frames are small (a dozen numbers), sequences are
 * short, and a snapshot per edit is far easier to reason about than a command log — the
 * usual argument against snapshots (memory) simply does not apply at this size.
 */
import { create } from 'zustand';

export interface Frame {
  id: string;
  name: string;
  /** servo id -> angle in degrees */
  pose: Record<number, number>;
  /** 1..10, or null to follow the global speed */
  speed: number | null;
  /** dwell in ms before moving on, or null to follow the global delay */
  delayMs: number | null;
}

export interface TimelineFile {
  format: 'tetrobot.timeline';
  version: 1;
  savedAt: string;
  globalSpeed: number;
  globalDelayMs: number;
  sine: boolean;
  frames: Frame[];
}

interface TimelineState {
  frames: Frame[];
  selectedId: string | null;
  globalSpeed: number;      // 1..10, the servo-level speed cap
  globalDelayMs: number;    // default dwell between frames
  sine: boolean;            // ease in/out instead of a straight run
  loop: boolean;
  playing: boolean;
  playIdx: number;          // which frame is currently being played into
  past: Frame[][];
  future: Frame[][];

  addFrame: (pose: Record<number, number>, name?: string) => void;
  insertAfter: (id: string, pose: Record<number, number>) => void;
  duplicate: (id: string) => void;
  deleteFrame: (id: string) => void;
  moveFrame: (from: number, to: number) => void;
  updateFrame: (id: string, patch: Partial<Omit<Frame, 'id'>>) => void;
  setJoint: (id: string, servoId: number, angle: number) => void;
  removeJoint: (id: string, servoId: number) => void;
  select: (id: string | null) => void;
  clearAll: () => void;

  setGlobalSpeed: (n: number) => void;
  setGlobalDelay: (ms: number) => void;
  setSine: (on: boolean) => void;
  setLoop: (on: boolean) => void;
  setPlaying: (on: boolean) => void;
  setPlayIdx: (i: number) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  exportJson: () => string;
  importJson: (text: string) => { ok: boolean; error?: string; count?: number };
}

const LS_KEY = 'robo4:esptt:timeline';
const uid = () => 'f' + Math.random().toString(36).slice(2, 9);
const MAX_HISTORY = 60;

function persist(s: Pick<TimelineState, 'frames' | 'globalSpeed' | 'globalDelayMs' | 'sine'>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      frames: s.frames, globalSpeed: s.globalSpeed,
      globalDelayMs: s.globalDelayMs, sine: s.sine,
    }));
  } catch { /* quota — the timeline is still usable, it just will not survive a reload */ }
}

function load(): Pick<TimelineState, 'frames' | 'globalSpeed' | 'globalDelayMs' | 'sine'> {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (raw && Array.isArray(raw.frames)) {
      return {
        frames: raw.frames,
        globalSpeed: raw.globalSpeed ?? 5,
        globalDelayMs: raw.globalDelayMs ?? 2000,
        sine: !!raw.sine,
      };
    }
  } catch { /* ignore */ }
  return { frames: [], globalSpeed: 5, globalDelayMs: 2000, sine: true };
}

export const useTimelineStore = create<TimelineState>((set, get) => {
  const init = load();

  /** Snapshot the frame list before a change, so undo has something to go back to. */
  const commit = (next: Frame[], keepFuture = false) => {
    const { frames, past } = get();
    const nextPast = [...past, frames].slice(-MAX_HISTORY);
    set({ frames: next, past: nextPast, future: keepFuture ? get().future : [] });
    persist({ ...get(), frames: next });
  };

  return {
    frames: init.frames,
    selectedId: null,
    globalSpeed: init.globalSpeed,
    globalDelayMs: init.globalDelayMs,
    sine: init.sine,
    loop: false,
    playing: false,
    playIdx: -1,
    past: [],
    future: [],

    addFrame: (pose, name) => {
      const f: Frame = {
        id: uid(),
        name: name || `Frame ${get().frames.length + 1}`,
        pose: { ...pose }, speed: null, delayMs: null,
      };
      commit([...get().frames, f]);
      set({ selectedId: f.id });
    },

    insertAfter: (id, pose) => {
      const frames = get().frames;
      const i = frames.findIndex(f => f.id === id);
      const f: Frame = { id: uid(), name: `Frame ${frames.length + 1}`, pose: { ...pose }, speed: null, delayMs: null };
      const next = [...frames];
      next.splice(i < 0 ? frames.length : i + 1, 0, f);
      commit(next);
      set({ selectedId: f.id });
    },

    duplicate: (id) => {
      const frames = get().frames;
      const i = frames.findIndex(f => f.id === id);
      if (i < 0) return;
      const src = frames[i];
      const copy: Frame = { ...src, id: uid(), name: src.name + ' copy', pose: { ...src.pose } };
      const next = [...frames];
      next.splice(i + 1, 0, copy);
      commit(next);
      set({ selectedId: copy.id });
    },

    deleteFrame: (id) => {
      const next = get().frames.filter(f => f.id !== id);
      commit(next);
      if (get().selectedId === id) set({ selectedId: null });
    },

    moveFrame: (from, to) => {
      const frames = [...get().frames];
      if (from < 0 || from >= frames.length || to < 0 || to >= frames.length || from === to) return;
      const [f] = frames.splice(from, 1);
      frames.splice(to, 0, f);
      commit(frames);
    },

    updateFrame: (id, patch) => {
      commit(get().frames.map(f => (f.id === id ? { ...f, ...patch } : f)));
    },

    setJoint: (id, servoId, angle) => {
      commit(get().frames.map(f =>
        f.id === id ? { ...f, pose: { ...f.pose, [servoId]: angle } } : f));
    },

    removeJoint: (id, servoId) => {
      commit(get().frames.map(f => {
        if (f.id !== id) return f;
        const pose = { ...f.pose };
        delete pose[servoId];
        return { ...f, pose };
      }));
    },

    select: (selectedId) => set({ selectedId }),

    clearAll: () => { commit([]); set({ selectedId: null }); },

    setGlobalSpeed: (n) => { set({ globalSpeed: Math.min(10, Math.max(1, n)) }); persist(get()); },
    setGlobalDelay: (ms) => { set({ globalDelayMs: Math.max(0, ms) }); persist(get()); },
    setSine: (sine) => { set({ sine }); persist(get()); },
    setLoop: (loop) => set({ loop }),
    setPlaying: (playing) => set({ playing }),
    setPlayIdx: (playIdx) => set({ playIdx }),

    undo: () => {
      const { past, frames, future } = get();
      if (!past.length) return;
      const prev = past[past.length - 1];
      set({ frames: prev, past: past.slice(0, -1), future: [frames, ...future].slice(0, MAX_HISTORY) });
      persist({ ...get(), frames: prev });
    },

    redo: () => {
      const { future, frames, past } = get();
      if (!future.length) return;
      const next = future[0];
      set({ frames: next, future: future.slice(1), past: [...past, frames].slice(-MAX_HISTORY) });
      persist({ ...get(), frames: next });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    exportJson: () => {
      const s = get();
      const file: TimelineFile = {
        format: 'tetrobot.timeline',
        version: 1,
        savedAt: new Date().toISOString(),
        globalSpeed: s.globalSpeed,
        globalDelayMs: s.globalDelayMs,
        sine: s.sine,
        frames: s.frames,
      };
      return JSON.stringify(file, null, 2);
    },

    importJson: (text) => {
      let raw: any;
      try { raw = JSON.parse(text); }
      catch (e: any) { return { ok: false, error: 'not valid JSON: ' + (e?.message || e) }; }

      // Accept both a full export and a bare array of frames — a .txt someone hand-edited
      // is a normal thing to feed back in, and rejecting it on a formality helps nobody.
      const arr: any[] = Array.isArray(raw) ? raw : raw?.frames;
      if (!Array.isArray(arr)) return { ok: false, error: 'no "frames" array found' };

      const frames: Frame[] = [];
      for (const f of arr) {
        if (!f || typeof f !== 'object' || !f.pose || typeof f.pose !== 'object') continue;
        const pose: Record<number, number> = {};
        for (const k of Object.keys(f.pose)) {
          const id = Number(k), deg = Number(f.pose[k]);
          if (Number.isFinite(id) && Number.isFinite(deg)) pose[id] = deg;
        }
        frames.push({
          id: uid(),
          name: typeof f.name === 'string' ? f.name : `Frame ${frames.length + 1}`,
          pose,
          speed: Number.isFinite(f.speed) ? Math.min(10, Math.max(1, Number(f.speed))) : null,
          delayMs: Number.isFinite(f.delayMs) ? Math.max(0, Number(f.delayMs)) : null,
        });
      }
      if (!frames.length) return { ok: false, error: 'file contained no usable frames' };

      commit(frames);
      if (!Array.isArray(raw)) {
        if (Number.isFinite(raw.globalSpeed)) set({ globalSpeed: raw.globalSpeed });
        if (Number.isFinite(raw.globalDelayMs)) set({ globalDelayMs: raw.globalDelayMs });
        if (typeof raw.sine === 'boolean') set({ sine: raw.sine });
      }
      set({ selectedId: null });
      persist(get());
      return { ok: true, count: frames.length };
    },
  };
});
