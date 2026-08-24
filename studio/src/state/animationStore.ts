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

// ── Clip Groups ──────────────────────────────────────────────────────────────
// A group is an ordered sequence of clips with per-entry delays.
export interface ClipGroupEntry { clipId: string; delayBefore: number; }
export interface ClipGroup { id: string; name: string; entries: ClipGroupEntry[]; }

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

  // clip groups
  groups: ClipGroup[];
  playingGroupId: string | null;
  playingGroupEntryIdx: number;
  groupDelayCountdown: number; // seconds remaining in inter-clip delay

  // clip management
  addClip: () => void;
  deleteClip: (id: string) => void;
  renameClip: (id: string, name: string) => void;
  selectClip: (id: string) => void;
  reorderClip: (id: string, dir: -1 | 1) => void;
  moveClipToIndex: (id: string, toIdx: number) => void;

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

  // Connection (snap/unlock) keyframes: per clip → per joint → step keys of {t, on}.
  // Lets a snap joint attach/detach at keyed times during the animation. Joints are
  // CONNECTED by default (before their first key), so keying only marks the changes.
  connectionsByClip: Record<string, Record<string, { t: number; on: boolean }[]>>;
  addConnectionKey: (jointId: string, on: boolean) => void;
  sampleConnections: (t: number) => Record<string, boolean>;

  // Spin (motor) keyframes: per clip → per joint → step keys of {t, dir} where dir is
  // -1 (CCW) / 0 (stopped) / 1 (CW). During playback a joint with dir≠0 rotates
  // continuously from the key time at its meta.spinRpm speed. Stopped by default.
  spinByClip: Record<string, Record<string, { t: number; dir: number }[]>>;
  addSpinKey: (jointId: string, dir: number) => void;
  sampleSpins: (t: number) => Record<string, { dir: number; since: number }>;

  // Grounded-base keyframes (foot-plant): per clip → step keys of {t, bodyId}. Playback
  // roots FK at the keyed body for each segment, so switching the base mid-clip changes
  // which body stays planted (like planting one foot then the other).
  baseByClip: Record<string, { t: number; bodyId: string | null }[]>;
  addBaseKey: (bodyId: string | null) => void;
  sampleBase: (t: number) => string | null;

  // group management
  addGroup: () => void;
  deleteGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  addClipToGroup: (groupId: string, clipId: string) => void;
  removeClipFromGroup: (groupId: string, entryIdx: number) => void;
  setGroupEntryDelay: (groupId: string, entryIdx: number, delay: number) => void;
  reorderGroupEntry: (groupId: string, from: number, to: number) => void;
  playGroup: (groupId: string) => void;

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

const newClip  = (name: string, duration = 30): ClipData => ({ id: uid(), name, duration, tracks: {} });
const newGroup = (name: string): ClipGroup => ({ id: uid(), name, entries: [] });

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
    groups: [],
    playingGroupId: null,
    playingGroupEntryIdx: 0,
    groupDelayCountdown: 0,

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

    moveClipToIndex: (id, toIdx) => set((s) => {
      const clips = syncActive(s);
      const from = clips.findIndex((c) => c.id === id);
      if (from < 0) return {};
      const next = [...clips];
      const [m] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(next.length, toIdx)), 0, m);
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
      // Also write back into the active clip so its stored key count updates live
      // (was only synced on add/select/delete → the clip row showed "empty").
      const clips = s.clips.map((c) => (c.id === s.activeClipId ? { ...c, tracks } : c));
      return { tracks, clips };
    }),

    keyTimes: () => {
      const ts = new Set<number>();
      for (const keys of Object.values(get().tracks)) for (const k of keys) ts.add(Math.round(k.t * 1000) / 1000);
      return [...ts].sort((a, b) => a - b);
    },

    deleteKeyAt: (t) => set((s) => {
      const tracks: Tracks = {};
      for (const [jid, keys] of Object.entries(s.tracks)) tracks[jid] = keys.filter((k) => Math.abs(k.t - t) > 1e-3);
      const clips = s.clips.map((c) => (c.id === s.activeClipId ? { ...c, tracks } : c));
      return { tracks, clips };
    }),

    clear: () => set((s) => ({
      tracks: {}, playhead: 0, playing: false, preview: false,
      clips: s.clips.map((c) => (c.id === s.activeClipId ? { ...c, tracks: {} } : c)),
    })),

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

      // ── Group playback with inter-clip delays ─────────────────────────────
      if (s.playingGroupId) {
        // Consume delay countdown first
        if (s.groupDelayCountdown > 0) {
          const rem = s.groupDelayCountdown - dt;
          if (rem > 0) return { groupDelayCountdown: rem };
          dt = -rem; // overflow dt into clip playback
        }

        let t = s.playhead + dt;
        if (t <= s.duration) return { playhead: t, groupDelayCountdown: 0 };

        // Current clip finished — advance to next group entry
        const clips = syncActive(s);
        const group = s.groups.find((g) => g.id === s.playingGroupId);
        if (!group) return { playing: false, playingGroupId: null };
        const nextIdx = s.playingGroupEntryIdx + 1;
        if (nextIdx >= group.entries.length) {
          return { playing: false, playingGroupId: null, groupDelayCountdown: 0 };
        }
        const nextEntry = group.entries[nextIdx];
        const nextClip  = clips.find((c) => c.id === nextEntry.clipId);
        if (!nextClip) return { playing: false, playingGroupId: null };
        return {
          clips,
          activeClipId: nextClip.id,
          tracks: nextClip.tracks,
          duration: nextClip.duration,
          playhead: Math.max(0, t - s.duration),
          playingGroupEntryIdx: nextIdx,
          groupDelayCountdown: nextEntry.delayBefore,
        };
      }

      // ── Normal / sequence playback ────────────────────────────────────────
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

    connectionsByClip: {},

    addConnectionKey: (jointId, on) => set((s) => {
      const t = s.snap ? Math.round(s.playhead * s.fps) / s.fps : s.playhead;
      const forClip = { ...(s.connectionsByClip[s.activeClipId] ?? {}) };
      const keys = (forClip[jointId] ? [...forClip[jointId]] : []).filter((k) => Math.abs(k.t - t) > 1e-4);
      keys.push({ t, on });
      keys.sort((a, b) => a.t - b.t);
      forClip[jointId] = keys;
      return { connectionsByClip: { ...s.connectionsByClip, [s.activeClipId]: forClip } };
    }),

    sampleConnections: (t) => {
      const forClip = get().connectionsByClip[get().activeClipId] ?? {};
      const out: Record<string, boolean> = {};
      for (const [jid, keys] of Object.entries(forClip)) {
        let on = true; // connected by default (before the first key)
        for (const k of keys) { if (k.t <= t + 1e-6) on = k.on; else break; }
        out[jid] = on;
      }
      return out;
    },

    spinByClip: {},

    addSpinKey: (jointId, dir) => set((s) => {
      const t = s.snap ? Math.round(s.playhead * s.fps) / s.fps : s.playhead;
      const forClip = { ...(s.spinByClip[s.activeClipId] ?? {}) };
      const keys = (forClip[jointId] ? [...forClip[jointId]] : []).filter((k) => Math.abs(k.t - t) > 1e-4);
      keys.push({ t, dir });
      keys.sort((a, b) => a.t - b.t);
      forClip[jointId] = keys;
      return { spinByClip: { ...s.spinByClip, [s.activeClipId]: forClip } };
    }),

    sampleSpins: (t) => {
      const forClip = get().spinByClip[get().activeClipId] ?? {};
      const out: Record<string, { dir: number; since: number }> = {};
      for (const [jid, keys] of Object.entries(forClip)) {
        let dir = 0, since = 0;
        for (const k of keys) { if (k.t <= t + 1e-6) { dir = k.dir; since = k.t; } else break; }
        out[jid] = { dir, since };
      }
      return out;
    },

    baseByClip: {},

    addBaseKey: (bodyId) => set((s) => {
      const t = s.snap ? Math.round(s.playhead * s.fps) / s.fps : s.playhead;
      const keys = (s.baseByClip[s.activeClipId] ? [...s.baseByClip[s.activeClipId]] : []).filter((k) => Math.abs(k.t - t) > 1e-4);
      keys.push({ t, bodyId });
      keys.sort((a, b) => a.t - b.t);
      return { baseByClip: { ...s.baseByClip, [s.activeClipId]: keys } };
    }),

    sampleBase: (t) => {
      const keys = get().baseByClip[get().activeClipId];
      if (!keys || !keys.length) return null;
      let base: string | null = null;
      for (const k of keys) { if (k.t <= t + 1e-6) base = k.bodyId; else break; }
      return base;
    },

    // ── group management ───────────────────────────────────────────────────────
    addGroup: () => set((s) => {
      const g = newGroup(`Group ${s.groups.length + 1}`);
      return { groups: [...s.groups, g] };
    }),

    deleteGroup: (id) => set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      playingGroupId: s.playingGroupId === id ? null : s.playingGroupId,
    })),

    renameGroup: (id, name) => set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)),
    })),

    addClipToGroup: (groupId, clipId) => set((s) => ({
      groups: s.groups.map((g) =>
        g.id === groupId
          ? { ...g, entries: [...g.entries, { clipId, delayBefore: 0 }] }
          : g,
      ),
    })),

    removeClipFromGroup: (groupId, entryIdx) => set((s) => ({
      groups: s.groups.map((g) =>
        g.id === groupId
          ? { ...g, entries: g.entries.filter((_, i) => i !== entryIdx) }
          : g,
      ),
    })),

    setGroupEntryDelay: (groupId, entryIdx, delay) => set((s) => ({
      groups: s.groups.map((g) =>
        g.id === groupId
          ? { ...g, entries: g.entries.map((e, i) => i === entryIdx ? { ...e, delayBefore: Math.max(0, delay) } : e) }
          : g,
      ),
    })),

    reorderGroupEntry: (groupId, from, to) => set((s) => ({
      groups: s.groups.map((g) => {
        if (g.id !== groupId) return g;
        const entries = [...g.entries];
        const [moved] = entries.splice(from, 1);
        entries.splice(to, 0, moved);
        return { ...g, entries };
      }),
    })),

    playGroup: (groupId) => set((s) => {
      const group = s.groups.find((g) => g.id === groupId);
      if (!group || group.entries.length === 0) return {};
      const clips = syncActive(s);
      const firstEntry = group.entries[0];
      const firstClip  = clips.find((c) => c.id === firstEntry.clipId);
      if (!firstClip) return {};
      return {
        clips,
        playing: true,
        preview: true,
        playhead: 0,
        sequence: false,
        playingGroupId: groupId,
        playingGroupEntryIdx: 0,
        groupDelayCountdown: firstEntry.delayBefore,
        activeClipId: firstClip.id,
        tracks: firstClip.tracks,
        duration: firstClip.duration,
      };
    }),

    exportClip: () => {
      const s = get();
      return { version: 3, fps: s.fps, activeClipId: s.activeClipId, clips: syncActive(s), groups: s.groups, connectionsByClip: s.connectionsByClip, baseByClip: s.baseByClip, spinByClip: s.spinByClip };
    },
    loadClip: (data) => set(() => {
      // v3 multi-clip + groups format
      if (data && Array.isArray(data.clips) && data.clips.length) {
        const clips: ClipData[] = data.clips;
        const active = clips.find((c: ClipData) => c.id === data.activeClipId) ?? clips[0];
        return {
          clips, activeClipId: active.id, fps: data.fps ?? 30,
          tracks: active.tracks, duration: active.duration,
          playhead: 0, playing: false, preview: false, sequence: false,
          groups: Array.isArray(data.groups) ? data.groups : [],
          connectionsByClip: (data.connectionsByClip && typeof data.connectionsByClip === 'object') ? data.connectionsByClip : {},
          baseByClip: (data.baseByClip && typeof data.baseByClip === 'object') ? data.baseByClip : {},
          spinByClip: (data.spinByClip && typeof data.spinByClip === 'object') ? data.spinByClip : {},
          playingGroupId: null, playingGroupEntryIdx: 0, groupDelayCountdown: 0,
        };
      }
      // legacy single-clip { duration, tracks }
      const c = newClip('ani1', data?.duration ?? 60);
      c.tracks = data?.tracks ?? {};
      return {
        clips: [c], activeClipId: c.id, fps: 30, tracks: c.tracks, duration: c.duration,
        playhead: 0, playing: false, preview: false, sequence: false,
        groups: [], connectionsByClip: {}, baseByClip: {}, spinByClip: {}, playingGroupId: null, playingGroupEntryIdx: 0, groupDelayCountdown: 0,
      };
    }),
  };
});
