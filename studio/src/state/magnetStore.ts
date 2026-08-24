/**
 * magnetStore — state for the electromagnet locking layer + the multi-ESP node
 * registry (this laptop is the master; each module has its own ESP32-C3 + DRV8833).
 *
 * Magnets have NO feedback (only the ST3215 servos report). So `runtime` here is the
 * COMMANDED state the master computed and sent — not a measurement.
 */
import { create } from 'zustand';

/** Power profile applied when a magnet energizes: grab hard, then drop to a hold level
 *  that's just enough to stay latched (saves current + heat). */
export interface MagnetProfile {
  grabPct: number;  // initial grab power, %  (default 100)
  grabMs: number;   // how long to hold full grab before easing to hold, ms (default 2500)
  holdPct: number;  // steady holding power, % (default 40)
}

export const DEFAULT_PROFILE: MagnetProfile = { grabPct: 100, grabMs: 2500, holdPct: 40 };

/** Per-magnet manual mode. 'auto' = follow the lock joints (energize when locked). */
export type MagnetMode = 'auto' | 'on' | 'off';

/** Live commanded state the engine writes each tick (for the UI meters). */
export interface MagnetRuntime {
  level: number;              // 0..100 commanded PWM %
  phase: 'off' | 'grab' | 'hold';
  since: number;             // performance.now() when the current on-phase began
}

interface MagnetState {
  /** Master switch: when off, the engine computes levels for the UI but sends nothing to hardware. */
  hardwareEnabled: boolean;
  defaultProfile: MagnetProfile;
  /** Per-magnet profile override (falls back to defaultProfile). */
  profiles: Record<string, MagnetProfile>;
  /** Per-magnet manual mode + optional fixed level when mode==='on'. */
  overrides: Record<string, { mode: MagnetMode; level?: number }>;
  /** Engine-written commanded state, keyed by magnetId. */
  runtime: Record<string, MagnetRuntime>;

  setHardwareEnabled: (on: boolean) => void;
  setDefaultProfile: (p: Partial<MagnetProfile>) => void;
  setProfile: (magnetId: string, p: Partial<MagnetProfile>) => void;
  setMode: (magnetId: string, mode: MagnetMode) => void;
  setManualLevel: (magnetId: string, level: number) => void;
  clearOverride: (magnetId: string) => void;
  /** Engine writes the whole runtime map at once (cheap, avoids per-key churn). */
  setRuntime: (runtime: Record<string, MagnetRuntime>) => void;

  /** Effective profile for a magnet (override or default). */
  profileOf: (magnetId: string) => MagnetProfile;
  /** Effective mode for a magnet (override or 'auto'). */
  modeOf: (magnetId: string) => MagnetMode;
}

const clampPct = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export const useMagnetStore = create<MagnetState>((set, get) => ({
  hardwareEnabled: true,
  defaultProfile: { ...DEFAULT_PROFILE },
  profiles: {},
  overrides: {},
  runtime: {},

  setHardwareEnabled: (on) => set({ hardwareEnabled: on }),
  setDefaultProfile: (p) => set((s) => ({ defaultProfile: sanitizeProfile({ ...s.defaultProfile, ...p }) })),
  setProfile: (magnetId, p) => set((s) => ({
    profiles: { ...s.profiles, [magnetId]: sanitizeProfile({ ...(s.profiles[magnetId] ?? s.defaultProfile), ...p }) },
  })),
  setMode: (magnetId, mode) => set((s) => ({
    overrides: { ...s.overrides, [magnetId]: { ...(s.overrides[magnetId] ?? {}), mode } },
  })),
  setManualLevel: (magnetId, level) => set((s) => ({
    overrides: { ...s.overrides, [magnetId]: { mode: s.overrides[magnetId]?.mode ?? 'on', level: clampPct(level) } },
  })),
  clearOverride: (magnetId) => set((s) => {
    const next = { ...s.overrides }; delete next[magnetId];
    return { overrides: next };
  }),
  setRuntime: (runtime) => set({ runtime }),

  profileOf: (magnetId) => get().profiles[magnetId] ?? get().defaultProfile,
  modeOf: (magnetId) => get().overrides[magnetId]?.mode ?? 'auto',
}));

function sanitizeProfile(p: MagnetProfile): MagnetProfile {
  return {
    grabPct: clampPct(p.grabPct),
    grabMs: Math.max(0, Math.min(60000, Math.round(p.grabMs))),
    holdPct: clampPct(p.holdPct),
  };
}
