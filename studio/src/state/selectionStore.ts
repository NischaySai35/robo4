/**
 * selectionStore — what's currently selected in the model editor.
 * Decoupled from the model itself so selection survives doc edits.
 *
 * Two-stage interaction for bodies: the first click on a body selects it
 * (highlight + Properties), but the transform gizmo stays hidden. Clicking the
 * already-selected body again — or pressing Move/Rotate/Scale — reveals the gizmo
 * (`showGizmo`). This keeps the viewport uncluttered until you actually want to
 * transform something.
 *
 * Multi-selection (Blender-style): `ids` holds every selected entity; `selectedId`
 * is the *active* one (last clicked) used by single-target UI like the Inspector.
 * All selected entities share the same `kind`. `pivotMode` controls where a
 * multi-body transform pivots — median of the group, the active body, or each
 * body around its own origin (individual).
 */
import { create } from 'zustand';

// A connector's selectedId is the composite string `${bodyId}::${connectorId}`
// (connectors aren't top-level doc entities, just entries in body.meta.connectors).
export type SelectionKind = 'body' | 'joint' | 'connector' | null;
export type GizmoMode = 'translate' | 'rotate' | 'scale';
export type PivotMode = 'median' | 'individual' | 'active';
export interface VpCtxMenu { x: number; y: number; bodyId: string; page: string }

interface SelectionState {
  selectedId: string | null;          // active entity id (body or joint)
  ids: string[];                       // every selected entity (same kind), active last
  kind: SelectionKind;
  gizmoMode: GizmoMode;
  showGizmo: boolean;
  pivotMode: PivotMode;
  hoveredBodyId: string | null;        // body currently hovered in 3D viewport
  vpCtxMenu: VpCtxMenu | null;         // viewport right-click context menu
  select: (id: string | null, kind?: SelectionKind) => void;
  toggle: (id: string, kind?: SelectionKind) => void;   // ctrl-click: add/remove from set
  selectMany: (ids: string[], kind?: SelectionKind) => void; // shift-range / select-all
  clear: () => void;
  revealGizmo: () => void;
  hideGizmo: () => void;
  setGizmoMode: (gizmoMode: GizmoMode) => void;
  setPivotMode: (pivotMode: PivotMode) => void;
  setHoveredBodyId: (id: string | null) => void;
  setVpCtxMenu: (m: VpCtxMenu | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedId: null,
  ids: [],
  kind: null,
  gizmoMode: 'translate',
  showGizmo: false,
  pivotMode: 'median',
  hoveredBodyId: null,
  vpCtxMenu: null,

  // Selecting a (different) entity highlights it but does not reveal the gizmo.
  // Replaces any multi-selection with a single active entity.
  select: (id, kind = 'body') => set((s) =>
    (s.selectedId === id && s.kind === kind && s.ids.length === 1)
      ? s
      : { selectedId: id, ids: id ? [id] : [], kind, showGizmo: false }),

  // Ctrl-click: add the entity to the set, or remove it if already present.
  // Switching kind starts a fresh single selection.
  toggle: (id, kind = 'body') => set((s) => {
    if (s.kind && s.kind !== kind) return { selectedId: id, ids: [id], kind, showGizmo: false };
    const has = s.ids.includes(id);
    const ids = has ? s.ids.filter((x) => x !== id) : [...s.ids, id];
    const selectedId = has ? (ids[ids.length - 1] ?? null) : id;
    return { selectedId, ids, kind: ids.length ? kind : null, showGizmo: false };
  }),

  // Shift-range or select-all: replace the set, keeping the last id active.
  selectMany: (ids, kind = 'body') => set(() => ({
    selectedId: ids[ids.length - 1] ?? null,
    ids: [...ids],
    kind: ids.length ? kind : null,
    showGizmo: false,
  })),

  clear: () => set({ selectedId: null, ids: [], kind: null, showGizmo: false }),
  revealGizmo: () => set({ showGizmo: true }),
  hideGizmo: () => set({ showGizmo: false }),
  setGizmoMode: (gizmoMode) => set({ gizmoMode, showGizmo: true }),
  setPivotMode: (pivotMode) => set({ pivotMode }),
  setHoveredBodyId: (hoveredBodyId) => set({ hoveredBodyId }),
  setVpCtxMenu: (vpCtxMenu) => set({ vpCtxMenu }),
}));
