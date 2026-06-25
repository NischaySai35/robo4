import { create } from 'zustand';

export type TMode = 'translate' | 'rotate' | 'scale';
export type TAxis = 'x' | 'y' | 'z' | null;

interface TransformHudState {
  visible: boolean;
  mode: TMode | null;
  axis: TAxis;
  local: boolean;
  buffer: string;
  live: number | null;
  beginDrag: (m: TMode) => void;
  endDrag: () => void;
  setAxis: (a: TAxis, local?: boolean) => void;
  appendChar: (c: string) => void;
  backspace: () => void;
  clearBuffer: () => void;
  setLive: (v: number | null) => void;
  hide: () => void;
}

export const useTransformHudStore = create<TransformHudState>((set) => ({
  visible: false,
  mode: null,
  axis: null,
  local: false,
  buffer: '',
  live: null,
  beginDrag: (mode) => set({ visible: true, mode, axis: null, local: false, buffer: '', live: null }),
  endDrag: () => set({ visible: false, live: null, buffer: '', axis: null }),
  setAxis: (axis, local = false) => set({ axis, local, buffer: '' }),
  appendChar: (c) => set((s) => ({ buffer: s.buffer + c })),
  backspace: () => set((s) => ({ buffer: s.buffer.slice(0, -1) })),
  clearBuffer: () => set({ buffer: '' }),
  setLive: (live) => set({ live }),
  hide: () => set({ visible: false, live: null, buffer: '', axis: null }),
}));
