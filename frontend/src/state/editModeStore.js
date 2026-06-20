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

export const useEditModeStore = create((set) => ({
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
