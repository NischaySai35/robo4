/**
 * editModeStore — Blender-style mesh Edit Mode state.
 *
 * Edit Mode operates on ONE selected body at a time. While active, the viewport
 * shows the body's vertices/edges/faces as pickable overlays and a transform gizmo
 * moves the current sub-selection. Geometry edits are baked into the body's
 * `visual.geometry.editMesh = { positions, indices }` via the command bus, so they
 * are undoable and saved with the project.
 */
import { create } from 'zustand';

export type SelectMode = 'vertex' | 'edge' | 'face';
export interface EditStats { count: number; area: number; length: number; point: number[] | null }
// selection meaning depends on selectMode: vertex→number[], edge→[i,j][], face→number[].
// Kept loose (the viewport narrows per mode); a precise union would force casts in
// every imperative mesh op for no real safety gain.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EditSelection = any[];

interface EditModeState {
  active: boolean;
  bodyId: string | null;
  selectMode: SelectMode;
  wireframe: boolean;
  selection: EditSelection;
  stats: EditStats;
  opAmount: number;
  setOpAmount: (opAmount: number) => void;
  enter: (bodyId: string) => void;
  exit: () => void;
  setSelectMode: (selectMode: SelectMode) => void;
  toggleWireframe: () => void;
  setSelection: (selection: EditSelection) => void;
  setStats: (stats: EditStats) => void;
}

export const useEditModeStore = create<EditModeState>((set) => ({
  active: false,
  bodyId: null,
  selectMode: 'vertex',   // 'vertex' | 'edge' | 'face'
  wireframe: false,
  // Current sub-selection (meaning depends on selectMode):
  //   vertex → [vertexIndex…]   edge → [[i,j]…]   face → [triIndex…]
  selection: [],
  // Live readouts shown in the Edit panel.
  stats: { count: 0, area: 0, length: 0, point: null },
  // Amount used by inset / shrink-fatten (model units).
  opAmount: 0.1,
  setOpAmount: (opAmount) => set({ opAmount: Number.isFinite(opAmount) ? opAmount : 0 }),

  enter: (bodyId) => set({ active: true, bodyId, selection: [], stats: { count: 0, area: 0, length: 0, point: null } }),
  exit: () => set({ active: false, bodyId: null, selection: [], wireframe: false }),
  setSelectMode: (selectMode) => set({ selectMode, selection: [], stats: { count: 0, area: 0, length: 0, point: null } }),
  toggleWireframe: () => set((s) => ({ wireframe: !s.wireframe })),
  setSelection: (selection) => set({ selection }),
  setStats: (stats) => set({ stats }),
}));
