import { create } from 'zustand';

// Reactive flags for enabling/disabling the Undo/Redo controls. The actual
// snapshot stacks live in SimCanvas (it owns serialize/loadScene).
interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  setFlags: (canUndo: boolean, canRedo: boolean) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  canUndo: false,
  canRedo: false,
  setFlags: (canUndo, canRedo) => set({ canUndo, canRedo }),
}));
