import { create } from 'zustand';

export const ROD_LENGTH   = 1.2;   // kept as geometry reference / fallback
export const ROD_RADIUS   = 0.07;
export const JOINT_RADIUS = 0.13;
export const ENDCAP_SIZE  = 0.36;

// Per-rod actual lengths in world units (scale: 0.018 wu/mm)
// Real dims: R2=74.5mm, R3=71.4mm, R4=58.88mm, R5=44.6mm, R6=74.5mm
export const ROD_LENGTHS = {
  R2: 1.341,
  R3: 1.285,
  R4: 1.060,
  R5: 0.803,
  R6: 1.341,
};
export const JOINT_LIMIT  = Math.PI * (100 / 180);

export const ROD_IDS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];

// Chain: R1—J1(twist)—R2—J2(bend)—R3—J3(bend)—R4—J4(twist/wrist)—R5—J5(bend)—R6—J6(twist)—R7
export const JOINT_DEFS = [
  { id: 'J1', label: 'CUBE L',  type: 'twist', bodyA: 'R1', bodyB: 'R2', limit: Math.PI },
  { id: 'J2', label: 'JOINT 1', type: 'bend',  bodyA: 'R2', bodyB: 'R3', limit: JOINT_LIMIT },
  { id: 'J3', label: 'JOINT 2', type: 'bend',  bodyA: 'R3', bodyB: 'R4', limit: JOINT_LIMIT },
  { id: 'J4', label: 'WRIST',   type: 'twist', bodyA: 'R4', bodyB: 'R5', limit: Math.PI },
  { id: 'J5', label: 'JOINT 3', type: 'bend',  bodyA: 'R5', bodyB: 'R6', limit: JOINT_LIMIT },
  { id: 'J6', label: 'CUBE R',  type: 'twist', bodyA: 'R6', bodyB: 'R7', limit: Math.PI },
];

export interface JointTelemetry { angle: number; velocity: number; acceleration: number; limitHit: boolean }
export interface Vec3XYZ { x: number; y: number; z: number }

interface ArmState {
  activeRootId: string;
  rootEngaged: boolean;
  setRootEngaged: (v: boolean) => void;
  jointAngles: number[];
  joints: JointTelemetry[];
  isDragging: boolean;
  status: string;
  endEffectorPosition: Vec3XYZ;
  reachPercent: number;
  pendingHome: boolean;
  mode: string;
  setRootRod: (rodId: string) => void;
  setRootAndAngles: (rodId: string, angles: number[]) => void;
  setJointAngle: (index: number, angle: number) => void;
  setJointTelemetry: (joints: JointTelemetry[]) => void;
  setStatus: (status: string) => void;
  updateEndEffector: (position: Vec3XYZ, reachPercent: number) => void;
  homeArm: () => void;
  clearPendingHome: () => void;
  setMode: (m: string) => void;
  collision: boolean;
  setCollision: (v: boolean) => void;
  setAllAngles: (angles: number[]) => void;
}

const makeJoint = (): JointTelemetry => ({ angle: 0, velocity: 0, acceleration: 0, limitHit: false });

export const useArmStore = create<ArmState>((set, get) => ({
  activeRootId: 'R1',
  // Whether a fixed root is currently engaged. Clicking the active rod again
  // disengages it: the arm keeps its pose but is no longer anchored, and dragging
  // (IK) is disabled until a rod is picked again. Default engaged for a usable arm.
  rootEngaged: true,
  setRootEngaged: (rootEngaged) => set({ rootEngaged }),
  jointAngles: [0, 0, 0, 0, 0, 0],
  joints: Array.from({ length: 6 }, makeJoint),

  isDragging: false,
  status: 'idle',
  endEffectorPosition: { x: 0, y: 0, z: 0 },
  reachPercent: 0,
  pendingHome: false,
  mode: 'horizontal',

  setRootRod: (rodId) => {
    if (rodId === get().activeRootId) return;
    set({ activeRootId: rodId });
  },

  // Atomic: root + angles together so LeftPanel never sees a frame where
  // the new rootId is paired with the old (wrong-sign) jointAngles.
  setRootAndAngles: (rodId, angles) => {
    const clamped = angles.map((a, i) => {
      const lim = JOINT_DEFS[i].limit;
      return Math.max(-lim, Math.min(lim, a));
    });
    set({ activeRootId: rodId, jointAngles: clamped });
  },

  setJointAngle: (index, angle) => {
    const limit = JOINT_DEFS[index].limit;
    const clamped = Math.max(-limit, Math.min(limit, angle));
    const angles = [...get().jointAngles];
    angles[index] = clamped;
    set({ jointAngles: angles });
  },

  setJointTelemetry: (joints) => set({ joints }),
  setStatus:         (status) => set({ status }),
  updateEndEffector: (position, reachPercent) => set({ endEffectorPosition: position, reachPercent }),
  homeArm:           () => set({ pendingHome: true }),
  clearPendingHome:  () => set({ pendingHome: false }),
  setMode:           (m) => set({ mode: m }),

  collision: false,
  setCollision: (v) => set({ collision: v }),

  // Bulk-set all joint angles atomically (used by collision revert)
  setAllAngles: (angles) => {
    const clamped = angles.map((a, i) => {
      const lim = JOINT_DEFS[i].limit;
      return Math.max(-lim, Math.min(lim, a));
    });
    set({ jointAngles: clamped });
  },
}));