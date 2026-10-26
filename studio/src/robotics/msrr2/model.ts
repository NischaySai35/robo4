/**
 * model.ts — the shared language of the v2 transformation planner.
 *
 * Every layer (state, verbs, shapes, planner, intent, executor) speaks ONLY these
 * types. See docs/TRANSFORM_PLANNER_V2_PROMPT.md §3.
 *
 * A shape is TOPOLOGY (which ports are locked to which) + POSE (every joint angle)
 * + BEHAVIOUR (what it does), never a cube silhouette.
 */
import plannerConfig from './plannerConfig.json';

/** A/B = the two ENDS (they have lock rotors). S* = the four passive spine receivers. */
export type PortId = 'A' | 'B' | 'S1A' | 'S1B' | 'S2A' | 'S2B';
export const PORTS: readonly PortId[] = ['A', 'B', 'S1A', 'S1B', 'S2A', 'S2B'];
export const isEndPort = (p: PortId) => p === 'A' || p === 'B';

export type ModuleId = string;
export type FloorAnchorId = string;

export type PortRef = { module: ModuleId; port: PortId };
export type FloorRef = { floor: FloorAnchorId };
export const isFloorRef = (r: PortRef | FloorRef): r is FloorRef => 'floor' in r;

/** One physical lock. At least one side must be an END port; side↔side is invalid; end↔floor is valid. */
export interface Edge {
  a: PortRef | FloorRef;
  b: PortRef;
  /** which of the four keyed lock orientations (90° apart) */
  slot: 0 | 1 | 2 | 3;
  locked: boolean;
}

export const JOINTS = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3'] as const;
export type JointName = typeof JOINTS[number];
/** Joint angles in degrees, NOMINAL convention: 180 = straight (the ESP adds horn offsets). */
export type ModulePose = Record<JointName, number>;
export type Pose = Record<ModuleId, ModulePose>;

export const STRAIGHT: ModulePose = { T1: 180, B1: 180, B2: 180, T2: 180, B3: 180, B4: 180, T3: 180 };
export const isBend = (j: JointName) => j[0] === 'B';

/** Where the robot is in the world when nothing anchors it to the floor. */
export interface BaseFrame {
  /** module whose frame is given (defaults to the first module) */
  module?: ModuleId;
  /** that module's base frame (connector A at the origin, +Z = A's outward normal), metres, Y up */
  worldPose?: { p: [number, number, number]; q: [number, number, number, number] };
  /** the base module's end A is rigidly HELD (a test fixture / another robot's grip) */
  held?: boolean;
  /** let the structure settle onto the floor (lowest point touches y = 0); default true unless held */
  dropToFloor?: boolean;
}

export interface Config {
  modules: ModuleId[];
  /** modules parked and left out of the shape */
  unused: ModuleId[];
  edges: Edge[];
  pose: Pose;
  baseFrame?: BaseFrame;
}

/** A fixed floor connector (receiver) with known coordinates. */
export interface FloorAnchor {
  id: FloorAnchorId;
  /** metres on the floor plane (x, z); the receiver face is at y = 0 */
  x: number;
  z: number;
  yawDeg: number;
}

/** The closed capability-tag list (extend only on purpose). */
export const CAPABILITY_TAGS = [
  'moves_on_floor', 'max_speed_mm_s', 'ground_contacts', 'cog_height_mm', 'stands_upright',
  'holds_load_kg', 'flat_top_area_cm2', 'reach_mm', 'has_free_end', 'stable_on_tilt_deg',
  'encloses', 'spans_gap_mm', 'height_mm',
] as const;
export type CapabilityTag = typeof CAPABILITY_TAGS[number];

export interface TagValue { value: number | boolean; measuredBy: 'static' | 'sim'; runs?: number }

export interface Margins {
  maxTorquePct: number; cogMarginMm: number; minJointMarginDeg: number;
  /** how far the real (sagged) robot sits from the drawn pose, worst point (mm) */
  sagMm?: number;
  /** free-standing: the push at the top that tips it over (N); 999 = held by an anchor */
  tipPushN?: number;
}

export interface ShapeEntry {
  id: string;
  name: string;
  nModules: number;
  /** canonical topology (module ids M1..Mn) */
  topology: Edge[];
  pose: Pose;
  baseFrame?: BaseFrame;
  behaviour?: string;
  tags: Partial<Record<CapabilityTag, TagValue>>;
  margins: Margins;
  /** how this entry came to exist */
  source?: 'seed' | 'generator' | 'llm';
  /** the requirement the pose was optimised for (re-used to re-solve the pose for other module labels) */
  spec?: Partial<Record<CapabilityTag, { min?: number; max?: number; is?: boolean; weight?: number }>>;
  notes?: string;
  /** MuJoCo hold test (verify_service check_static): real contacts, servo limits, PLA flex */
  sim?: { ok: boolean; driftMm: number; maxTorquePct: number; reasons: string[] };
}

export type VerbKind = 'dock' | 'undock' | 'peel' | 'walk_step' | 'lock' | 'unlock' | 'pose_move';

/** Measured verb reliability/time, from plannerConfig.json (update from C:\TETROBOT\logs). */
export interface VerbStats { successP: number; durationS: number; note?: string }

export interface PhysicalLimits {
  bendDeg: number; bendPlanMarginPct: number; twistDeg: number; lockDeg: number;
  stallTorqueNm: number; torqueBudgetPct: number; cogMarginMm: number;
  maxJointDegS: number; goInMmS: number; peelTiltDeg: number; peelLiftMm: number;
}

export const CONFIG = plannerConfig as unknown as {
  limits: PhysicalLimits;
  verbs: Record<string, VerbStats>;
  lambdaPerSecond: number;
  floorAnchors: FloorAnchor[];
  compliance: {
    servoKpNmPerRad: number; backlashBendDeg: number; backlashTwistDeg: number;
    flexBendPerpNmPerRad: number; flexBendInPlaneNmPerRad: number; flexTwistPerpNmPerRad: number; flexMaxDeg: number;
    receiverTiltNmPerRad: number; receiverTiltMaxDeg: number; receiverTwistNmPerRad: number; receiverTwistMaxDeg: number;
  };
  robustness: { minTipPushN: number; touchN: number };
};

/** The bend limit the planner may use: ±90° minus the 2% margin = ±88.2°. */
export const PLAN_BEND_DEG = CONFIG.limits.bendDeg * (1 - CONFIG.limits.bendPlanMarginPct / 100);
/** Continuous torque budget, N·m (≤ 70% of stall). */
export const TORQUE_BUDGET_NM = CONFIG.limits.stallTorqueNm * CONFIG.limits.torqueBudgetPct / 100;

export const deg2rad = (d: number) => (d * Math.PI) / 180;
/** nominal degrees (180 = straight) -> model radians (0 = straight) */
export const poseToRad = (p: ModulePose): number[] => JOINTS.map((j) => deg2rad(p[j] - 180));
export const radToPose = (r: number[]): ModulePose =>
  Object.fromEntries(JOINTS.map((j, i) => [j, 180 + (r[i] * 180) / Math.PI])) as ModulePose;

export const cloneConfig = (c: Config): Config => JSON.parse(JSON.stringify(c));
