/**
 * manualScenes.ts — starting setups for the MANUAL tab (real physics, driven by hand): any number of modules, any kind of
 * start. Each connected group is assembled by the normal assembler (one source of truth for the module geometry); free groups
 * are then set side by side on the floor.
 */
import { type Config, type Edge, type ModuleId, STRAIGHT, CONFIG } from './model';
import { toSimScene, type SimScene } from './simScene';
import { LIBRARY } from './library';

export type ManualPreset = 'chain' | 'lying' | 'standing' | 'stand_lying' | 'stand_chain' | `lib:${string}`;

export const MANUAL_PRESETS: { id: ManualPreset; label: string; floor: boolean }[] = [
  { id: 'chain', label: 'all end to end, lying (no floor connectors)', floor: false },
  { id: 'lying', label: 'all separate, lying side by side (no floor connectors)', floor: false },
  { id: 'standing', label: 'all standing, each in a floor connector', floor: true },
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

export function manualScene(n: number, preset: ManualPreset): SimScene {
  const ms = ids(n);
  const lying = (m: ModuleId) => toSimScene({ modules: [m], unused: [], edges: [], pose: straight([m]) } as Config);
  let sc: SimScene;
  if (preset === 'chain') sc = toSimScene({ modules: ms, unused: [], edges: chainEdges(ms), pose: straight(ms) });
  else if (preset === 'lying') sc = merge(ms.map(lying));
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
