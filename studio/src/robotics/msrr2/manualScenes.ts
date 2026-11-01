/**
 * manualScenes.ts — starting setups for the MANUAL tab (real physics, driven by hand): any number of modules, any kind of
 * start. Each connected group is assembled by the normal assembler (one source of truth for the module geometry); free groups
 * are then set side by side on the floor.
 */
import { type Config, type Edge, type ModuleId, STRAIGHT, CONFIG } from './model';
import { toSimScene, type SimScene } from './simScene';
import { LIBRARY } from './library';

export type ManualPreset = 'chain' | 'lying' | 'standing' | 'stand_tested' | 'end_end_tested' | 'stand_lying' | 'stand_chain' | `lib:${string}`;

export const MANUAL_PRESETS: { id: ManualPreset; label: string; floor: boolean }[] = [
  { id: 'chain', label: 'all end to end, lying (no floor connectors)', floor: false },
  { id: 'lying', label: 'all separate, lying side by side (no floor connectors)', floor: false },
  { id: 'standing', label: 'all standing, each in a floor connector', floor: true },
  { id: 'end_end_tested', label: 'end to end: M1 standing, M2 lying with End B up (M1.B into M2.B locked 3/3 with the judge)', floor: true },
  { id: 'stand_tested', label: '2 standing at a tested placement (M1.B into M2.S1B locked 4/4 with the judge)', floor: true },
  { id: 'stand_lying', label: 'M1 standing in a floor connector, the others lying free next to it', floor: true },
  { id: 'stand_chain', label: 'M1 standing in a floor connector, the others end to end on top', floor: true },
];

const ids = (n: number): ModuleId[] => Array.from({ length: n }, (_, i) => `M${i + 1}`);
const straight = (ms: ModuleId[]) => Object.fromEntries(ms.map((m) => [m, { ...STRAIGHT }]));
const chainEdges = (ms: ModuleId[]): Edge[] => ms.slice(1).map((m, i) => ({ a: { module: ms[i], port: 'B' as const }, b: { module: m, port: 'A' as const }, slot: 0, locked: true }));
const floorEdge = (floor: string, m: ModuleId): Edge => ({ a: { floor }, b: { module: m, port: 'A' as const }, slot: 0, locked: true });

/** put a separately assembled group next to the others: shift it sideways (Studio z) */
function merge(parts: SimScene[], dz = 0.3): SimScene {
  const out: SimScene = { ...parts[0], modules: [], locks: [] };
  parts.forEach((p, i) => {
    out.modules.push(...p.modules.map((m) => ({ ...m, base: { ...m.base, p: [m.base.p[0], m.base.p[1], m.base.p[2] + (i ? dz * i : 0)] } })));
    out.locks.push(...p.locks);
  });
  return out;
}

/** 31 Oct: the placement grow/shape_search proved for a side dock (shapes_v1[2]: R at spot 15 yaw 225, W1 at spot 29, W1.B -> R.S1B
 * 6/6 robots), converted by sim (PhysWorld round trip 0.0 mm). From the 'standing' preset (25 cm apart on a line) every side dock is at
 * the edge of reach (twist 150-157 deg, 2-7 mm short) and Connect locked 1/4. */
const TESTED_2 = {"modules": [{"id": "M1", "base": {"p": [0.2, 0.0063, -0.2], "q": [0.6532817, -0.2705986, 0.2705987, 0.6532808]}, "rad": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]}, {"id": "M2", "base": {"p": [-0.1, 0.0063, 0.1], "q": [0.2705977, -0.6532814, 0.653282, 0.2705972]}, "rad": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]}], "anchors": [{"id": "F1", "x": -0.1, "z": 0.1, "yawDeg": 45.0}, {"id": "F0", "x": 0.2, "z": -0.2, "yawDeg": 45.0}], "locks": [{"a": {"floor": "F0"}, "b": {"module": "M1", "port": "A"}}, {"a": {"floor": "F1"}, "b": {"module": "M2", "port": "A"}}]};

/** 1 Nov: end<->end that locks: M2 lies on the floor with B4 85 deg, End B pointing up (floor-supported, ~5x stiffer than a
 * standing partner), its tip 0.24 m from M1's floor receiver. Needs the STL pad pockets and the printed fit in phys_world. */
const TESTED_EE = {"modules": [{"id": "M1", "base": {"p": [0.0, 0.006212, 1e-06], "q": [0.7071615, -1.36e-05, -1.35e-05, 0.7070521]}, "rad": [0.0, 0.00011, 0.0, -0.0, 0.0, 0.0, -0.0]}, {"id": "M2", "base": {"p": [-0.689745, 0.037363, -0.207853], "q": [0.0021077, -0.7070802, 0.0013719, 0.7071289]}, "rad": [-1e-05, -0.00036, -0.00487, 1e-05, -0.00745, 1.48337, 0.0]}], "anchors": [{"id": "F0", "x": 0, "z": 0, "yawDeg": 0}, {"id": "F1", "x": 0.25, "z": 0, "yawDeg": 0}, {"id": "F2", "x": 0.5, "z": 0, "yawDeg": 0}, {"id": "F3", "x": 0.75, "z": 0, "yawDeg": 0}], "locks": [{"a": {"floor": "F0"}, "b": {"module": "M1", "port": "A"}}]};

export function manualScene(n: number, preset: ManualPreset): SimScene {
  const ms = ids(n);
  const lying = (m: ModuleId) => toSimScene({ modules: [m], unused: [], edges: [], pose: straight([m]) } as Config);
  let sc: SimScene;
  if (preset === 'chain') sc = toSimScene({ modules: ms, unused: [], edges: chainEdges(ms), pose: straight(ms) });
  else if (preset === 'lying') sc = merge(ms.map(lying));
  else if (preset === 'end_end_tested') sc = structuredClone(TESTED_EE) as SimScene;
  else if (preset === 'stand_tested') sc = structuredClone(TESTED_2) as SimScene;
  else if (preset === 'standing') sc = toSimScene({ modules: ms, unused: [], edges: ms.map((m, i) => floorEdge(CONFIG.floorAnchors[i % CONFIG.floorAnchors.length].id, m)), pose: straight(ms) });
  else if (preset === 'stand_lying') sc = merge([toSimScene({ modules: [ms[0]], unused: [], edges: [floorEdge('F0', ms[0])], pose: straight([ms[0]]) }), ...ms.slice(1).map(lying)], 0.25);
  else if (preset === 'stand_chain') sc = toSimScene({ modules: ms, unused: [], edges: [floorEdge('F0', ms[0]), ...chainEdges(ms)], pose: straight(ms) });
  else {
    const e = LIBRARY.find((x) => x.id === preset.slice(4))!;
    sc = toSimScene({ modules: ids(e.nModules), unused: [], edges: e.topology, pose: e.pose, baseFrame: e.baseFrame } as Config);
  }
  const usesFloor = sc.locks.some((l) => 'floor' in l.a);
  return { ...sc, anchors: usesFloor ? sc.anchors : [] };          // no floor connectors at all unless the start stands in one
}

/** the library shapes that have exactly n modules (start from any of them too) */
export const libraryStarts = (n: number) => LIBRARY.filter((e) => e.nModules === n).map((e) => ({ id: `lib:${e.id}` as ManualPreset, label: `library: ${e.name}` }));
