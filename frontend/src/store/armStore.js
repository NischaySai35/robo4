import { create } from 'zustand';

// ── Arm constants ────────────────────────────────────────────────────────────
export const NUM_RODS = 4;
export const NUM_JOINTS = 3;
export const NUM_NODES = 5; // 4 rods → 5 connection points
export const ROD_LENGTH = 1.6;
export const ROD_RADIUS = 0.07;
export const JOINT_RADIUS = 0.13;
export const ENDCAP_SIZE = 0.22;
export const JOINT_LIMIT = Math.PI * (100 / 180); // ±100°
export const DEFAULT_ROOT = 1; // rod index 1 = second rod (middle-ish)

// Initial node positions — horizontal mode, arm along X, root rod centered
export function getRestPositions(mode, rootIdx = DEFAULT_ROOT) {
  const L = ROD_LENGTH;
  // Root rod occupies segment rootIdx: from node[rootIdx] to node[rootIdx+1]
  // Center root rod at origin
  const rootCenter = (rootIdx + 0.5) * L;
  if (mode === 'horizontal') {
    return Array.from({ length: NUM_NODES }, (_, i) => ({
      x: i * L - rootCenter,
      y: 0,
      z: 0,
    }));
  } else {
    // vertical: arm along -Y. Position so bottom node (node 4) sits above ground (y=-3.2)
    const yBottom = -2.6;
    const yTop = yBottom + (NUM_NODES - 1) * L; // = -2.6 + 6.4 = 3.8
    return Array.from({ length: NUM_NODES }, (_, i) => ({
      x: 0,
      y: yTop - i * L,
      z: 0,
    }));
  }
}

const initialMode = 'horizontal';
const initialNodes = getRestPositions(initialMode, DEFAULT_ROOT);

const makeJoint = () => ({ angle: 0, velocity: 0, acceleration: 0, limitHit: false });

export const useArmStore = create((set, get) => ({
  // ── Configuration ──
  rootRodIndex: DEFAULT_ROOT,
  mode: initialMode,
  jointLimit: JOINT_LIMIT,

  // ── Node positions (world-space) — the single source of truth for geometry ──
  nodePositions: initialNodes.map(p => ({ ...p })),

  // ── Joint telemetry ──
  joints: Array.from({ length: NUM_JOINTS }, makeJoint),

  // ── Interaction ──
  isDragging: false,
  dragNodeIndex: null,    // which FABRIK node index is being dragged
  draggedObjectId: null,  // 'rod-0', 'joint-1', 'endcap-left', etc.

  // ── Status ──
  status: 'idle', // 'idle' | 'solving' | 'limit_hit'

  // ── End effector (farther free tip from root) ──
  endEffectorPosition: { x: 0, y: 0, z: 0 },
  reachPercent: 0,

  // ── Mode transition lock ──
  transitioning: false,

  // ── Home ──
  pendingHome: false,

  // ── Actions ──
  setRootRod: (idx) => {
    if (idx === get().rootRodIndex) return;
    set({ rootRodIndex: idx });
  },

  setMode: (mode) => {
    if (mode === get().mode || get().transitioning) return;
    set({ transitioning: true, mode });
    // Reset to rest positions for new mode (animation handled in Three.js layer)
    const restNodes = getRestPositions(mode, get().rootRodIndex);
    set({ nodePositions: restNodes });
    setTimeout(() => set({ transitioning: false }), 800);
  },

  setNodePositions: (positions) => set({ nodePositions: positions }),

  setJointTelemetry: (joints) => set({ joints }),

  setDragging: (isDragging, dragNodeIndex = null, draggedObjectId = null) =>
    set({ isDragging, dragNodeIndex, draggedObjectId }),

  setStatus: (status) => set({ status }),

  updateEndEffector: (position, reachPercent) =>
    set({ endEffectorPosition: position, reachPercent }),

  homeArm: () => set({ pendingHome: true }),
  clearPendingHome: () => set({ pendingHome: false }),

  updateJointLimitHit: (jointIdx, hit) =>
    set(state => {
      const joints = state.joints.map((j, i) =>
        i === jointIdx ? { ...j, limitHit: hit } : j
      );
      return { joints };
    }),
}));
