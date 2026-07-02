/**
 * editorStore — precision/editing preferences (Phase 3): units, gizmo snapping,
 * and the measurement tool's state. Separate from selection so it persists across
 * selections and tool changes.
 */
import { create } from 'zustand';

export type Units = 'm' | 'cm' | 'mm';
export interface SnapSettings { enabled: boolean; translate: number; rotateDeg: number; scale: number }
/** Legacy single-distance result (kept for compatibility). */
export interface MeasureResult { distance: number; a: number[]; b: number[] }
/** Rich two-entity result from the upgraded MeasureTool. */
export interface MeasureResult2 {
  entityA?: { type: string; point: number[]; bodyId?: string; bodyName?: string };
  entityB?: { type: string; point: number[]; bodyId?: string; bodyName?: string } | null;
  minDist?: number;
  centerDist?: number;
  maxDist?: number;
  live?: boolean;
}

interface EditorState {
  units: Units;
  setUnits: (units: Units) => void;
  snap: SnapSettings;
  setSnap: (patch: Partial<SnapSettings>) => void;
  measureMode: boolean;
  setMeasureMode: (v: boolean) => void;
  toggleMeasure: () => void;
  mateMode: boolean;
  matePick: number;
  toggleMate: () => void;
  setMateMode: (v: boolean) => void;
  setMatePick: (n: number) => void;
  measureResult: MeasureResult | MeasureResult2 | null;
  setMeasureResult: (r: MeasureResult | MeasureResult2 | null) => void;
  simRunning: boolean;
  setSimRunning: (v: boolean) => void;
  toggleSim: () => void;
  gravityEnabled: boolean;
  gravity: number;
  setGravityEnabled: (v: boolean) => void;
  toggleGravity: () => void;
  setGravity: (g: number) => void;
  showAnalysis: boolean;
  toggleAnalysis: () => void;
  showCollision: boolean;
  toggleCollision: () => void;
  ikDrag: boolean;
  toggleIkDrag: () => void;
  fallingBoxes: boolean;
  toggleFallingBoxes: () => void;
  setFallingBoxes: (v: boolean) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  units: 'mm', // 'm' | 'cm' | 'mm' — display unit (model base unit is metres)
  setUnits: (units) => set({ units }),

  snap: { enabled: false, translate: 0.25, rotateDeg: 15, scale: 0.1 },
  setSnap: (patch) => set({ snap: { ...get().snap, ...patch } }),

  measureMode: false,
  setMeasureMode: (measureMode) => set({ measureMode }),
  toggleMeasure: () => set((s) => ({ measureMode: !s.measureMode })),

  // Mate tool (Phase: assembly). Click a face on part A, then a face on part B →
  // part B snaps flush onto A (faces coincident, normals opposed). `matePick` is
  // how many faces have been clicked (0/1) for the live hint.
  mateMode: false,
  matePick: 0,
  toggleMate: () => set((s) => ({ mateMode: !s.mateMode, matePick: 0, measureMode: false })),
  setMateMode: (mateMode) => set({ mateMode, matePick: 0 }),
  setMatePick: (matePick) => set({ matePick }),

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

  showCollision: false,
  toggleCollision: () => set((s) => ({ showCollision: !s.showCollision })),

  // Drag-from-tip inverse kinematics. When on, dragging any body in the viewport
  // pulls it toward the cursor by solving the joint chain from that body up to its
  // root (instead of selecting/moving the single body).
  ikDrag: false,
  toggleIkDrag: () => set((s) => ({ ikDrag: !s.ikDrag })),

  fallingBoxes: false,
  toggleFallingBoxes: () => set((s) => ({ fallingBoxes: !s.fallingBoxes })),
  setFallingBoxes: (fallingBoxes) => set({ fallingBoxes }),
}));

// Unit conversion (model base = metres).
export const UNIT_FACTOR: Record<Units, number> = { m: 1, cm: 100, mm: 1000 };

/** Format a length in metres for display in the given unit. */
export function formatLen(metres: number, units: Units = 'm') {
  const v = (metres ?? 0) * (UNIT_FACTOR[units] ?? 1);
  return `${v.toFixed(units === 'm' ? 3 : 1)} ${units}`;
}