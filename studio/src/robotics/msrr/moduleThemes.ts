/**
 * moduleThemes.ts — which kind of module the sandbox is modelling.
 *
 * Two themes, switchable at runtime, because two different real hardware designs
 * are in play and they disagree about the single most basic question: how much of
 * the lattice does one module occupy?
 *
 *   mod1 — one module is one cube. The classic MSRR abstraction, and what the
 *          reconfiguration planner in moves.ts/planner.ts is built on. Every
 *          sliding/pivoting move, every connectivity check, every stability check
 *          assumes it.
 *
 *   mod2 — TETROBOT try8. A bendable 7-joint chain (modulink.ts) that spans about four
 *          cubes fully extended and folds down to one. How many cubes it claims
 *          is computed from its joint pose (occupancy.ts), not declared.
 *
 * The LATTICE IS CUBIC IN BOTH. Nothing about the grid changes when you switch —
 * cubes stay cubes, the same size, in the same places. What changes is what an
 * occupied cube means and how many of them one module accounts for.
 *
 * WHAT IS AND IS NOT WIRED UP
 * Both themes model, render and report correctly. The reconfiguration PLANNER
 * still works in mod1 terms for both: it treats each occupied cube as one movable
 * unit. For mod2 that is an approximation — a real MODULINK plan has to move a
 * multi-cube body and re-pose its joints, which is a different and larger search
 * than the cube planner does. `plannerIsExact` says which theme the planner is
 * actually correct for, and the UI surfaces that rather than hiding it.
 */
import {
  MODULE_CHAIN_LENGTH, RODS_PER_MODULE, ROD_ORDER,
  HEMISPHERE_RADIUS, SIDE_CONNECTOR_RADIAL_OFFSET,
  SPINE_SIDE_SEPARATION, REQUIRED_DOME_CLEARANCE, JOINT_NAMES,
} from './modulink';
import {
  type PoseSummary, poseLibrary, cubeRange, MODULINK_CUBE_SIZE, DEFAULT_POSE_ID,
} from './occupancy';

export type ModuleThemeId = 'mod1' | 'mod2';

export const DEFAULT_MODULE_THEME: ModuleThemeId = 'mod1';

export interface ModuleTheme {
  id: ModuleThemeId;
  label: string;
  /** one-line identity for the tab strip */
  summary: string;
  /** the longer explanation shown in the theme picker */
  detail: string;
  /** true when one module is exactly one cube, whatever it is doing */
  singleCube: boolean;
  /** [min, max] cubes one module can claim */
  cubeRange: [number, number];
  /** short human phrasing of that range */
  cellsPerModuleSummary: string;
  /** poses a module can hold; a single rigid entry for single-cube themes */
  poses: PoseSummary[];
  /** whether moves.ts/planner.ts are exactly correct for this theme */
  plannerIsExact: boolean;
  /** DOF per module */
  dof: number;
  /** notable physical constraints worth surfacing in the UI */
  constraints: string[];
}

const MOD1: ModuleTheme = {
  id: 'mod1',
  label: 'mod1 — cube',
  summary: 'One module, one cube',
  detail:
    'The classic MSRR lattice abstraction: an identical module fills exactly one cube '
    + 'and connects face-to-face to its neighbours. This is what the sliding-cube and '
    + 'pivoting-cube move models are defined on, and what the reconfiguration planner '
    + 'is exactly correct for.',
  singleCube: true,
  cubeRange: [1, 1],
  cellsPerModuleSummary: 'always 1 cube per module',
  poses: [{
    id: 'rigid',
    label: 'Rigid',
    hint: 'A cube module has no internal pose — it fills its cube and that is all.',
    angles: [0, 0, 0, 0, 0, 0, 0],
    cubes: 1,
    span: 1,
    sweptCells: [[0, 0, 0]],
    sweptCount: 1,
  }],
  plannerIsExact: true,
  dof: 0,
  constraints: [
    'Connections are face-to-face only — cubes touching at an edge or corner are not connected.',
  ],
};

function buildMod2(): ModuleTheme {
  const poses = poseLibrary();
  const [min, max] = cubeRange();
  return {
    id: 'mod2',
    label: 'mod2 — TETROBOT try8',
    summary: `Bendable 7-joint chain, worth ${min}–${max} cubes depending on pose`,
    detail:
      `A serial chain of ${RODS_PER_MODULE} joints in the fixed order ${JOINT_NAMES.join('·')} `
      + `(${ROD_ORDER.join('·')}), with a spine between each pair of bends. Connectors A and B sit at the `
      + 'chain ends and two side receivers ride each spine, on opposite faces — six connectors in all. '
      + `Fully extended the chain reaches across ${max} cubes; bending spends `
      + `reach on turning instead of travelling, so a folded module is worth as few as ${min}. `
      + 'Those counts come from running the real kinematics, not from a constant.',
    singleCube: false,
    cubeRange: [min, max],
    cellsPerModuleSummary: `${min}–${max} cubes per module, set by its joint pose`,
    poses,
    plannerIsExact: false,
    dof: RODS_PER_MODULE,
    constraints: [
      `All four side receivers (two per spine, on opposite faces) may carry a weld at once. The two on one `
        + `spine sit ${SPINE_SIDE_SEPARATION.toFixed(3)} apart, back to back — closer than the `
        + `${REQUIRED_DOME_CLEARANCE.toFixed(3)} two pads need, which is fine on opposite faces of one body.`,
      `Connector pad radius ${HEMISPHERE_RADIUS.toFixed(3)}, side receiver offset from the spine axis ${SIDE_CONNECTOR_RADIAL_OFFSET.toFixed(3)}.`,
      'TWIST joints (T1, T2, T3) turn ±180° about the chain axis; BEND joints (B1..B4) pitch ±90°; the end locks ±45°.',
      `Straight A→B length is ${MODULE_CHAIN_LENGTH.toFixed(3)}, so one cube is ${MODULINK_CUBE_SIZE.toFixed(3)}.`,
    ],
  };
}

let mod2Cache: ModuleTheme | null = null;

export function getModuleTheme(id: ModuleThemeId): ModuleTheme {
  if (id === 'mod1') return MOD1;
  if (!mod2Cache) mod2Cache = buildMod2();
  return mod2Cache;
}

export const MODULE_THEME_IDS: readonly ModuleThemeId[] = Object.freeze(['mod1', 'mod2'] as ModuleThemeId[]);

export const allModuleThemes = (): ModuleTheme[] => MODULE_THEME_IDS.map(getModuleTheme);

/** Default pose id for a theme — rigid for mod1, straight for mod2. */
export const defaultPoseFor = (id: ModuleThemeId): string =>
  (id === 'mod1' ? 'rigid' : DEFAULT_POSE_ID);

/**
 * How many real modules a structure of `cubeCount` cubes represents under a theme.
 * Exact for mod1. For mod2 it is an ESTIMATE — the true answer depends on which
 * pose each module is actually holding, which is why it is reported as a range.
 */
export function moduleCountEstimate(id: ModuleThemeId, cubeCount: number): {
  exact: boolean; min: number; max: number; text: string;
} {
  const theme = getModuleTheme(id);
  if (theme.singleCube) {
    return { exact: true, min: cubeCount, max: cubeCount, text: `${cubeCount} modules` };
  }
  const [minCubes, maxCubes] = theme.cubeRange;
  const min = Math.ceil(cubeCount / maxCubes);
  const max = Math.ceil(cubeCount / minCubes);
  return {
    exact: false,
    min,
    max,
    text: min === max ? `~${min} modules` : `~${min}–${max} modules, depending on poses`,
  };
}
