/**
 * animationStore — multi-clip keyframe animation of joint values (Phase 9, studio).
 *
 * The document holds several named CLIPS (ani1, ani2 …); one is active and edited at a
 * time. Each clip is per-joint tracks of { t, value } keyframes + its own duration.
 * Playback/scrubbing is NON-DESTRUCTIVE (sampled joint values rendered via FK, the
 * model doc is untouched — same as the physics preview). You can play a single clip
 * (loops) or play the whole SEQUENCE in order. `fps` + `snap` quantise keyframe times.
 *
 * Back-compat: the active clip's `duration`/`tracks` are mirrored at the top level so
 * the viewport tick + older callers keep working unchanged. exportClip/loadClip round-
 * trip the full multi-clip structure (and still read the old single-clip format).
 */
import { create } from 'zustand';

export interface Keyframe { t: number; value: number }
export type Tracks = Record<string, Keyframe[]>;
export interface ClipData { id: string; name: string; duration: number; tracks: Tracks }
export interface Clip { duration: number; tracks: Tracks } // legacy single-clip shape

interface AnimationState {
  clips: ClipData[];
  activeClipId: string;
  fps: number;
  snap: boolean;
  sequence: boolean;          // playing the whole sequence (vs a single looping clip)
  // mirror of the active clip + transport state
  duration: number;
  playhead: number;
  playing: boolean;
  preview: boolean;
  tracks: Tracks;

  // clip management
  addClip: () => void;
  deleteClip: (id: string) => void;
  renameClip: (id: string, name: string) => void;
  selectClip: (id: string) => void;
  reorderClip: (id: string, dir: -1 | 1) => void;

  // editing the active clip
  setDuration: (duration: number) => void;
  setFps: (fps: number) => void;
  toggleSnap: () => void;
  addKeyframe: (values: Record<string, number>) => void;
  keyTimes: () => number[];
  deleteKeyAt: (t: number) => void;
  clear: () => void;

  // transport
  setPlayhead: (playhead: number) => void;
  play: () => void;
  playAll: () => void;
  pause: () => void;
  stop: () => void;
  advance: (dt: number) => void;
  sample: (t: number) => Record<string, number>;

  // persistence
  exportClip: () => any;
  loadClip: (data: any) => void;
}

const smooth = (x: number) => x * x * (3 - 2 * x);
const uid = () => `clip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function sampleTrack(keys: Keyframe[] | undefined, t: number): number | undefined {
  if (!keys || keys.length === 0) return undefined;
  if (t <= keys[0].t) return keys[0].value;
  if (t >= keys[keys.length - 1].t) return keys[keys.length - 1].value;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return a.value + (b.value - a.value) * smooth(u);
    }
  }
  return keys[keys.length - 1].value;
}

const newClip = (name: string, duration = 30): ClipData => ({ id: uid(), name, duration, tracks: {} });

export const useAnimationStore = create<AnimationState>((set, get) => {
  const first = newClip('ani1');
  /** Write the live (top-level) tracks+duration back into the active clip entry. */
  const syncActive = (s: AnimationState): ClipData[] =>
    s.clips.map((c) => (c.id === s.activeClipId ? { ...c, duration: s.duration, tracks: s.tracks } : c));

  return {
    clips: [first],
    activeClipId: first.id,
    fps: 30,
    snap: true,
    sequence: false,
    duration: 30,
    playhead: 0,
    playing: false,
    preview: false,
    tracks: {},

    addClip: () => set((s) => {
      const clips = syncActive(s);
      const c = newClip(`ani${clips.length + 1}`, s.duration);
      return { clips: [...clips, c], activeClipId: c.id, tracks: {}, duration: c.duration, playhead: 0, playing: false, preview: false };
    }),

    deleteClip: (id) => set((s) => {
      if (s.clips.length <= 1) return {};
      const clips = syncActive(s).filter((c) => c.id !== id);
      const active = clips.find((c) => c.id === s.activeClipId) ?? clips[0];
      return { clips, activeClipId: active.id, tracks: active.tracks, duration: active.duration, playhead: 0, playing: false, preview: false };
    }),

    renameClip: (id, name) => set((s) => ({ clips: syncActive(s).map((c) => (c.id === id ? { ...c, name } : c)) })),

    selectClip: (id) => set((s) => {
      const clips = syncActive(s);
      const c = clips.find((x) => x.id === id);
      if (!c) return {};
      return { clips, activeClipId: id, tracks: c.tracks, duration: c.duration, playhead: 0, playing: false, preview: false };
    }),

    reorderClip: (id, dir) => set((s) => {
      const clips = syncActive(s);
      const i = clips.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= clips.length) return {};
      const next = [...clips];
      [next[i], next[j]] = [next[j], next[i]];
      return { clips: next };
    }),

    setDuration: (duration) => set({ duration: Math.max(0.1, duration) }),
    setFps: (fps) => set({ fps: Math.max(1, Math.min(120, Math.round(fps))) }),
    toggleSnap: () => set((s) => ({ snap: !s.snap })),

    addKeyframe: (values) => set((s) => {
      const t = s.snap ? Math.round(s.playhead * s.fps) / s.fps : s.playhead;
      const tracks = { ...s.tracks };
      for (const [jid, value] of Object.entries(values)) {
        const keys = (tracks[jid] ? [...tracks[jid]] : []).filter((k) => Math.abs(k.t - t) > 1e-4);
        keys.push({ t, value });
        keys.sort((a, b) => a.t - b.t);
        tracks[jid] = keys;
      }
      return { tracks };
    }),

    keyTimes: () => {
      const ts = new Set<number>();
      for (const keys of Object.values(get().tracks)) for (const k of keys) ts.add(Math.round(k.t * 1000) / 1000);
      return [...ts].sort((a, b) => a - b);
    },

    deleteKeyAt: (t) => set((s) => {
      const tracks: Tracks = {};
      for (const [jid, keys] of Object.entries(s.tracks)) tracks[jid] = keys.filter((k) => Math.abs(k.t - t) > 1e-3);
      return { tracks };
    }),

    clear: () => set({ tracks: {}, playhead: 0, playing: false, preview: false }),

    setPlayhead: (playhead) => set((s) => {
      let t = Math.max(0, Math.min(s.duration, playhead));
      if (s.snap) t = Math.round(t * s.fps) / s.fps;
      return { playhead: t, preview: true };
    }),
    play: () => set({ playing: true, preview: true, sequence: false }),
    playAll: () => set((s) => {
      // jump to the first clip, then play through the sequence
      const clips = syncActive(s);
      const c = clips[0];
      return { clips, activeClipId: c.id, tracks: c.tracks, duration: c.duration, playhead: 0, playing: true, preview: true, sequence: true };
    }),
    pause: () => set({ playing: false }),
    stop: () => set({ playing: false, preview: false, playhead: 0, sequence: false }),

    advance: (dt) => set((s) => {
      if (!s.playing) return {};
      let t = s.playhead + dt;
      if (t <= s.duration) return { playhead: t };
      if (!s.sequence) { t -= s.duration; return { playhead: t }; } // single clip loops
      // sequence: move to the next clip, or stop at the end
      const clips = syncActive(s);
      const i = clips.findIndex((c) => c.id === s.activeClipId);
      const next = clips[i + 1];
      if (!next) return { playing: false, sequence: false, playhead: s.duration };
      return { clips, activeClipId: next.id, tracks: next.tracks, duration: next.duration, playhead: t - s.duration };
    }),

    sample: (t) => {
      const out: Record<string, number> = {};
      for (const [jid, keys] of Object.entries(get().tracks)) {
        const v = sampleTrack(keys, t);
        if (v !== undefined) out[jid] = v;
      }
      return out;
    },

    exportClip: () => {
      const s = get();
      return { version: 2, fps: s.fps, activeClipId: s.activeClipId, clips: syncActive(s) };
    },
    loadClip: (data) => set(() => {
      // new multi-clip format
      if (data && Array.isArray(data.clips) && data.clips.length) {
        const clips: ClipData[] = data.clips;
        const active = clips.find((c) => c.id === data.activeClipId) ?? clips[0];
        return { clips, activeClipId: active.id, fps: data.fps ?? 30, tracks: active.tracks, duration: active.duration, playhead: 0, playing: false, preview: false, sequence: false };
      }
      // legacy single-clip { duration, tracks }
      const c = newClip('ani1', data?.duration ?? 60);
      c.tracks = data?.tracks ?? {};
      return { clips: [c], activeClipId: c.id, fps: 30, tracks: c.tracks, duration: c.duration, playhead: 0, playing: false, preview: false, sequence: false };
    }),
  };
});
