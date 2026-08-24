/**
 * dragWarningStore — a transient, auto-clearing message for drag-time feedback (e.g. "can't
 * drag below the floor"). Separate from editorStore/docStore because it's purely ephemeral
 * UI feedback, not a persisted preference or document state.
 */
import { create } from 'zustand';

interface DragWarningState {
  message: string | null;
  setMessage: (msg: string) => void;
  clear: () => void;
}

let _clearTimer: ReturnType<typeof setTimeout> | null = null;

export const useDragWarningStore = create<DragWarningState>((set) => ({
  message: null,
  setMessage: (msg) => {
    set({ message: msg });
    if (_clearTimer) clearTimeout(_clearTimer);
    _clearTimer = setTimeout(() => { useDragWarningStore.setState({ message: null }); _clearTimer = null; }, 900);
  },
  clear: () => {
    if (_clearTimer) { clearTimeout(_clearTimer); _clearTimer = null; }
    set({ message: null });
  },
}));
