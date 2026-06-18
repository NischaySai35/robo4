/**
 * animationStore — keyframe animation of joint values over a timeline (Phase 9).
 *
 * A clip holds per-joint tracks of { t, value } keyframes. Playback/scrubbing is
 * NON-DESTRUCTIVE: it produces sampled joint values that the viewport renders via
 * FK without mutating the model document (same pattern as the physics preview).
 * "Preview" is on while playing or scrubbing; turning it off restores the model
 * pose.
 */
import { create } from 'zustand';

const smooth = (x) => x * x * (3 - 2 * x); // ease in-out

function sampleTrack(keys, t) {
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

export const useAnimationStore = create((set, get) => ({
  duration: 4,           // seconds
  playhead: 0,
  playing: false,
  preview: false,        // render the animated pose (playing or scrubbing)
  tracks: {},            // jointId -> sorted [{ t, value }]

  setDuration: (duration) => set({ duration: Math.max(0.1, duration) }),

  /** Snapshot the given joint values as keyframes at the current playhead. */
  addKeyframe: (values) => set((s) => {
    const t = s.playhead;
    const tracks = { ...s.tracks };
    for (const [jid, value] of Object.entries(values)) {
      const keys = (tracks[jid] ? [...tracks[jid]] : []).filter((k) => Math.abs(k.t - t) > 1e-4);
      keys.push({ t, value });
      keys.sort((a, b) => a.t - b.t);
      tracks[jid] = keys;
    }
    return { tracks };
  }),

  /** All distinct keyframe times across tracks (sorted). */
  keyTimes: () => {
    const ts = new Set();
    for (const keys of Object.values(get().tracks)) for (const k of keys) ts.add(Math.round(k.t * 1000) / 1000);
    return [...ts].sort((a, b) => a - b);
  },

  deleteKeyAt: (t) => set((s) => {
    const tracks = {};
    for (const [jid, keys] of Object.entries(s.tracks)) tracks[jid] = keys.filter((k) => Math.abs(k.t - t) > 1e-3);
    return { tracks };
  }),

  clear: () => set({ tracks: {}, playhead: 0, playing: false, preview: false }),

  setPlayhead: (playhead) => set({ playhead: Math.max(0, Math.min(get().duration, playhead)), preview: true }),
  play: () => set({ playing: true, preview: true }),
  pause: () => set({ playing: false }),
  stop: () => set({ playing: false, preview: false, playhead: 0 }),

  /** Advance during playback (called each frame by the viewport). */
  advance: (dt) => set((s) => {
    if (!s.playing) return {};
    let t = s.playhead + dt;
    if (t > s.duration) t -= s.duration; // loop
    return { playhead: t };
  }),

  /** Sample all tracks at time t → { jointId: value }. */
  sample: (t) => {
    const out = {};
    for (const [jid, keys] of Object.entries(get().tracks)) {
      const v = sampleTrack(keys, t);
      if (v !== undefined) out[jid] = v;
    }
    return out;
  },

  /** For persistence. */
  exportClip: () => ({ duration: get().duration, tracks: get().tracks }),
  loadClip: (clip) => set({
    duration: clip?.duration ?? 4,
    tracks: clip?.tracks ?? {},
    playhead: 0, playing: false, preview: false,
  }),
}));
