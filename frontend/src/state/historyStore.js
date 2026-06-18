import { create } from 'zustand';

// Reactive flags for enabling/disabling the Undo/Redo controls. The actual
// snapshot stacks live in SimCanvas (it owns serialize/loadScene).
export const useHistoryStore = create((set) => ({
  canUndo: false,
  canRedo: false,
  setFlags: (canUndo, canRedo) => set({ canUndo, canRedo }),
}));
