/**
 * voiceStore — settings + status for spoken feedback. Persisted per machine, so the
 * choice survives restarts and is independent for every person running the app.
 */
import { create } from 'zustand';

export type VoiceEngine = 'none' | 'system' | 'piper';
export type VoiceModelStatus = 'unknown' | 'missing' | 'downloading' | 'ready' | 'error';

const LS = 'robo4:voice';

interface Saved { enabled: boolean; volume: number; battery: boolean }

function load(): Saved {
  try {
    const j = JSON.parse(localStorage.getItem(LS) || 'null');
    if (j) return { enabled: j.enabled !== false, volume: Number(j.volume ?? 1), battery: j.battery !== false };
  } catch { /* ignore */ }
  return { enabled: true, volume: 1, battery: true };
}

interface VoiceState extends Saved {
  /** Which engine is speaking right now (Ryan neural voice, or the OS voice as fallback). */
  engine: VoiceEngine;
  model: VoiceModelStatus;
  /** 0..1 while the voice model downloads. */
  progress: number;
  error: string | null;
  set: (p: Partial<Saved>) => void;
  _status: (p: Partial<Pick<VoiceState, 'engine' | 'model' | 'progress' | 'error'>>) => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  ...load(),
  engine: 'none',
  model: 'unknown',
  progress: 0,
  error: null,
  set: (p) => {
    set(p);
    const { enabled, volume, battery } = get();
    try { localStorage.setItem(LS, JSON.stringify({ enabled, volume, battery })); } catch { /* ignore */ }
  },
  _status: (p) => set(p),
}));
