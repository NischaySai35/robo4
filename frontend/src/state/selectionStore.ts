/**
 * selectionStore — what's currently selected in the model editor.
 * Decoupled from the model itself so selection survives doc edits.
 *
 * Two-stage interaction for bodies: the first click on a body selects it
 * (highlight + Properties), but the transform gizmo stays hidden. Clicking the
 * already-selected body again — or pressing Move/Rotate/Scale — reveals the gizmo
 * (`showGizmo`). This keeps the viewport uncluttered until you actually want to
 * transform something.
 */
import { create } from 'zustand';

export type SelectionKind = 'body' | 'joint' | null;
export type GizmoMode = 'translate' | 'rotate' | 'scale';
interface SelectionState {
  selectedId: string | null;
  kind: SelectionKind;
  gizmoMode: GizmoMode;
  showGizmo: boolean;
  select: (id: string | null, kind?: SelectionKind) => void;
  clear: () => void;
  revealGizmo: () => void;
  setGizmoMode: (gizmoMode: GizmoMode) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedId: null,   // entity id (body or joint)
  kind: null,         // 'body' | 'joint' | null
  gizmoMode: 'translate', // 'translate' | 'rotate' | 'scale'
  showGizmo: false,   // is the transform gizmo revealed for the current selection?

  // Selecting a (different) entity highlights it but does not reveal the gizmo.
  select: (id, kind = 'body') => set((s) =>
    (s.selectedId === id && s.kind === kind) ? s : { selectedId: id, kind, showGizmo: false }),
  clear: () => set({ selectedId: null, kind: null, showGizmo: false }),
  revealGizmo: () => set({ showGizmo: true }),
  setGizmoMode: (gizmoMode) => set({ gizmoMode, showGizmo: true }),
}));
