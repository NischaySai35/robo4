/**
 * editorStore — precision/editing preferences (Phase 3): units, gizmo snapping,
 * and the measurement tool's state. Separate from selection so it persists across
 * selections and tool changes.
 */
import { create } from 'zustand';

export const useEditorStore = create((set, get) => ({
  units: 'mm', // 'm' | 'cm' | 'mm' — display unit (model base unit is metres)
  setUnits: (units) => set({ units }),

  snap: { enabled: false, translate: 0.25, rotateDeg: 15, scale: 0.1 },
  setSnap: (patch) => set({ snap: { ...get().snap, ...patch } }),

  measureMode: false,
  setMeasureMode: (measureMode) => set({ measureMode }),
  toggleMeasure: () => set((s) => ({ measureMode: !s.measureMode })),

  measureResult: null, // { distance (metres), a:[x,y,z], b:[x,y,z] }
  setMeasureResult: (measureResult) => set({ measureResult }),

  simRunning: false, // live physics (gravity) preview
  setSimRunning: (simRunning) => set({ simRunning }),
  toggleSim: () => set((s) => ({ simRunning: !s.simRunning })),

  // Gravity preview controls. `gravityEnabled` is a simple on/off; `gravity` is
  // the magnitude in m/s² (Earth = 9.81) and is freely editable. When disabled,
  // the sim still runs but bodies float (zero-g) so you can preview contacts/joints.
  gravityEnabled: true,
  gravity: 9.81,
  setGravityEnabled: (gravityEnabled) => set({ gravityEnabled }),
  toggleGravity: () => set((s) => ({ gravityEnabled: !s.gravityEnabled })),
  setGravity: (gravity) => set({ gravity: Number.isFinite(gravity) ? gravity : 0 }),

  showAnalysis: false, // load heatmap + center-of-mass overlay
  toggleAnalysis: () => set((s) => ({ showAnalysis: !s.showAnalysis })),
}));

// Unit conversion (model base = metres).
export const UNIT_FACTOR = { m: 1, cm: 100, mm: 1000 };

/** Format a length in metres for display in the given unit. */
export function formatLen(metres, units = 'm') {
  const v = (metres ?? 0) * (UNIT_FACTOR[units] ?? 1);
  return `${v.toFixed(units === 'm' ? 3 : 1)} ${units}`;
}
