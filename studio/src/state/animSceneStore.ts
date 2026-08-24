/**
 * animSceneStore — animation-page scene interaction state.
 *
 * Tracks:
 *   • rigidMode    — when ON, clicking a body selects it; clicking it again
 *                    "activates" it (can be dragged freely); a second click deactivates.
 *                    Multiple bodies can be active simultaneously.
 *   • activeBodyIds — set of body ids in the "active" state for rigid-mode dragging.
 *   • globalRotate  — the global-rotate tool state (axis selection + typed angle).
 *   • selectedCompId — which component is currently targeted in the animation explorer.
 */
import { create } from 'zustand';

export interface MateSlot { bodyId: string; connectorId: string; }

interface AnimSceneState {
  rigidMode: boolean;
  activeBodyIds: Set<string>;
  selectedCompId: string | null;

  // Global Rotate tool
  globalRotateActive: boolean;
  globalRotateAxis: 'x' | 'y' | 'z' | null;
  globalRotateAngle: string; // typed buffer, e.g. "90"

  // Assembly mate tool
  mateSlotA: MateSlot | null;
  mateSlotB: MateSlot | null;
  gravityOn: boolean;

  // actions
  toggleRigidMode: () => void;
  toggleBodyActive: (bodyId: string) => void;
  clearActive: () => void;
  setSelectedComp: (compId: string | null) => void;

  toggleGlobalRotate: () => void;
  setGlobalRotateAxis: (axis: 'x' | 'y' | 'z' | null) => void;
  setGlobalRotateAngle: (v: string) => void;
  resetGlobalRotate: () => void;

  setMateSlotA: (slot: MateSlot | null) => void;
  setMateSlotB: (slot: MateSlot | null) => void;
  clearMateSlots: () => void;
  toggleGravity: () => void;
}

export const useAnimSceneStore = create<AnimSceneState>((set) => ({
  rigidMode: false,
  activeBodyIds: new Set(),
  selectedCompId: null,

  globalRotateActive: false,
  globalRotateAxis: null,
  globalRotateAngle: '90',

  mateSlotA: null,
  mateSlotB: null,
  gravityOn: false,

  toggleRigidMode: () => set((s) => ({
    rigidMode: !s.rigidMode,
    activeBodyIds: new Set(), // clear actives when toggling
  })),

  toggleBodyActive: (bodyId) => set((s) => {
    const next = new Set(s.activeBodyIds);
    next.has(bodyId) ? next.delete(bodyId) : next.add(bodyId);
    return { activeBodyIds: next };
  }),

  clearActive: () => set({ activeBodyIds: new Set() }),

  setSelectedComp: (compId) => set({ selectedCompId: compId }),

  toggleGlobalRotate: () => set((s) => ({
    globalRotateActive: !s.globalRotateActive,
    globalRotateAxis: null,
    globalRotateAngle: '90',
  })),

  setGlobalRotateAxis: (axis) => set({ globalRotateAxis: axis }),
  setGlobalRotateAngle: (v) => set({ globalRotateAngle: v }),

  resetGlobalRotate: () => set({
    globalRotateActive: false,
    globalRotateAxis: null,
    globalRotateAngle: '90',
  }),

  setMateSlotA: (slot) => set({ mateSlotA: slot }),
  setMateSlotB: (slot) => set({ mateSlotB: slot }),
  clearMateSlots: () => set({ mateSlotA: null, mateSlotB: null }),
  toggleGravity: () => set((s) => ({ gravityOn: !s.gravityOn })),
}));
