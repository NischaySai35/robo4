/**
 * selectionStore — what's currently selected in the model editor.
 * Decoupled from the model itself so selection survives doc edits.
 */
import { create } from 'zustand';

export const useSelectionStore = create((set) => ({
  selectedId: null,   // entity id (body or joint)
  kind: null,         // 'body' | 'joint' | null
  gizmoMode: 'translate', // 'translate' | 'rotate' | 'scale'

  select: (id, kind = 'body') => set({ selectedId: id, kind }),
  clear: () => set({ selectedId: null, kind: null }),
  setGizmoMode: (gizmoMode) => set({ gizmoMode }),
}));
