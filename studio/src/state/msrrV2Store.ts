/**
 * msrrV2Store — state for the MSRR page's Planner v2 (docs/TRANSFORM_PLANNER_V2_PROMPT.md).
 *
 * v2 works on Configs (lock graph + joint angles), not cubes. The viewport draws
 * `view` every frame; everything else updates it through `show()`.
 */
import { create } from 'zustand';
import { type PhysPrepared, type PhysRun, type ReceiverMark, preparePhys, prepareRaw, haveOffsets, physFrame, physDuration, receiverMarks } from '@/features/msrr2/physicsView';
import { CONFIG, isFloorRef } from '@/robotics/msrr2/model';
import { toSimScene, toSimPlan, VERIFY_URL } from '@/robotics/msrr2/simScene';
import { type Config, type Edge, type ModulePose, STRAIGHT, cloneConfig } from '@/robotics/msrr2/model';
import { assemble } from '@/robotics/msrr2/assemble';
import { checkStatic, type StaticReport } from '@/robotics/msrr2/statics';
import type { FittedModule } from '@/robotics/msrr/fitModules';
import { assemblyToFitted, overlayOf, type V2Overlay } from '@/features/msrr2/v2View';
import type { Plan } from '@/robotics/msrr2/planner';
import { JOINTS } from '@/robotics/msrr2/model';

export type V2Mode = 'v2' | 'legacy';
export type V2Tab = 'robot' | 'shapes' | 'plan' | 'ask' | 'run';

const D = (deg: number) => 180 + deg;

/** Ready-made robots for the Robot tab (also the M1 test cases). */
export const PRESETS: { id: string; label: string; config: Config }[] = [
  {
    id: 'lying', label: '1 module lying on the floor',
    config: { modules: ['M1'], unused: [], edges: [], pose: { M1: { ...STRAIGHT } } },
  },
  {
    id: 'standing', label: '1 module standing, End A LOCKED in floor receiver F0',
    config: { modules: ['M1'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }], pose: { M1: { ...STRAIGHT } } },
  },
  {
    id: 'standing_free', label: '1 module standing FREE on its pad (no receiver)',
    config: { modules: ['M1'], unused: [], edges: [], pose: { M1: { ...STRAIGHT } }, baseFrame: { module: 'M1', worldPose: { p: [0.3, 0.0063, 0.15], q: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2] }, dropToFloor: true } },
  },
  {
    id: 'curled', label: '1 module curled, End A LOCKED in floor receiver F0',
    config: { modules: ['M1'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }], pose: { M1: { ...STRAIGHT, B3: D(80), B4: D(80) } } },
  },
  {
    id: 'held', label: '1 module held horizontal at End A by a fixture (static check fails)',
    config: {
      modules: ['M1'], unused: [], edges: [], pose: { M1: { ...STRAIGHT } },
      baseFrame: { held: true, worldPose: { p: [0, 0.4, 0], q: [0, -Math.SQRT1_2, 0, Math.SQRT1_2] } },
    },
  },
  {
    id: 'two_standing', label: '2 modules standing, each LOCKED in a floor receiver (F0, F1)',
    config: {
      modules: ['M1', 'M2'], unused: [],
      edges: [
        { a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true },
        { a: { floor: 'F1' }, b: { module: 'M2', port: 'A' }, slot: 0, locked: true },
      ],
      pose: { M1: { ...STRAIGHT }, M2: { ...STRAIGHT } },
    },
  },
  {
    id: 'snake2', label: '2 modules end to end (snake)',
    config: {
      modules: ['M1', 'M2'], unused: [],
      edges: [{ a: { module: 'M1', port: 'B' }, b: { module: 'M2', port: 'A' }, slot: 0, locked: true }],
      pose: { M1: { ...STRAIGHT }, M2: { ...STRAIGHT } },
    },
  },
];

interface V2State {
  mode: V2Mode;
  setMode: (m: V2Mode) => void;
  tab: V2Tab;
  setTab: (t: V2Tab) => void;
  /** the Plan tab's chosen target (the Ask tab sets it) */
  planTargetId: string;
  setPlanTargetId: (id: string) => void;

  /** the robot as it is now (L0 stand-in until the real state is wired) */
  config: Config;
  setConfig: (c: Config) => void;
  setJoint: (module: string, joint: keyof ModulePose, deg: number) => void;
  addEdge: (e: Edge) => void;
  removeEdge: (i: number) => void;
  selected: string | null;
  select: (m: string | null) => void;

  report: StaticReport | null;
  check: () => StaticReport;

  /** what the viewport draws (may be a plan frame instead of `config`) */
  view: { modules: FittedModule[]; overlay: V2Overlay | null; sig: number };
  show: (c: Config, withOverlay?: boolean) => void;

  /** called by the viewport every frame (animation players hook in here) */
  tick: (dt: number) => void;
  tickers: ((dt: number) => void)[];

  log: string[];
  pushLog: (s: string) => void;

  // ── plan + player (M4) ──
  plan: Plan | null;
  planning: boolean;
  setPlan: (p: Plan | null) => void;
  setPlanning: (b: boolean) => void;
  /** player: which step is playing and how far through it (0..1) */
  playStep: number;
  playT: number;
  playing: boolean;
  playSpeed: number;
  play: () => void;
  pause: () => void;
  seek: (step: number) => void;
  setPlaySpeed: (x: number) => void;

  // ── GRAVITY: the robot in real MuJoCo physics (verify_service /simulate), nothing judged ──
  physics: { pp: PhysPrepared; t: number; playing: boolean; withPlan: boolean; live?: { id: string; fetching: boolean } } | null;
  /** floor receivers drawn in the viewport (and which end is locked in each) */
  receivers: ReceiverMark[];
  physBusy: boolean;
  physErr: string;
  physRandom: boolean;
  physSeed: number;
  setPhysRandom: (b: boolean) => void;
  setPhysSeed: (n: number) => void;
  gravity: (withPlan: boolean) => Promise<void>;
  gravityOff: () => void;
  /** G6: build a searched shape in real physics (the robot's docking brain) and play the recording */
  buildShape: (index: number | Record<string, any>) => Promise<Record<string, any> | null>;
}

/** The robot during a plan: before step i, and part-way (t) through it. */
export function planFrame(start: Config, plan: Plan, step: number, t: number): Config {
  const before = step === 0 ? start : plan.steps[step - 1].expected;
  if (step >= plan.steps.length) return plan.steps[plan.steps.length - 1]?.expected ?? start;
  const s = plan.steps[step];
  if (s.verb !== 'pose_move') return t < 0.5 ? before : s.expected;
  // joint legs: before -> via... -> expected, equal time per leg; locks stay as before
  const pts = [before, ...(s.via ?? []), s.expected];
  const legs = pts.length - 1;
  const x = Math.min(0.9999, Math.max(0, t)) * legs;
  const k = Math.floor(x), u = x - k;
  const a = pts[k], b = pts[k + 1];
  const c = cloneConfig(b);
  c.edges = cloneConfig(before).edges;
  c.baseFrame = before.baseFrame;
  for (const m of c.modules) for (const j of JOINTS) c.pose[m][j] = (a.pose[m]?.[j] ?? 180) + (b.pose[m][j] - (a.pose[m]?.[j] ?? 180)) * u;
  return c;
}

let sig = 0;

export const useV2Store = create<V2State>((set, get) => ({
  mode: 'v2',
  setMode: (m) => set({ mode: m }),
  tab: 'robot',
  setTab: (t) => set({ tab: t }),
  planTargetId: '',
  setPlanTargetId: (id) => set({ planTargetId: id }),

  config: cloneConfig(PRESETS[2].config),
  setConfig: (c) => { set({ config: cloneConfig(c), report: null, physics: null }); get().show(c); },
  setJoint: (module, joint, deg) => {
    const c = cloneConfig(get().config);
    c.pose[module] = { ...c.pose[module], [joint]: deg };
    get().setConfig(c);
  },
  addEdge: (e) => { const c = cloneConfig(get().config); c.edges.push(e); get().setConfig(c); },
  removeEdge: (i) => { const c = cloneConfig(get().config); c.edges.splice(i, 1); get().setConfig(c); },
  selected: null,
  select: (m) => set({ selected: m }),

  report: null,
  check: () => {
    const r = checkStatic(get().config, undefined, { touch: true });
    set({ report: r, view: { modules: assemblyToFitted(r.assembly), overlay: overlayOf(r), sig: ++sig } });
    get().pushLog(r.ok
      ? `check: PASS — torque ${r.margins.maxTorquePct.toFixed(0)}% of stall, CoG margin ${r.margins.cogMarginMm >= 999 ? 'anchored' : `${r.margins.cogMarginMm.toFixed(0)} mm`}, joint margin ${r.margins.minJointMarginDeg.toFixed(1)}°`
      : `check: FAIL — ${r.reasons[0]}`);
    return r;
  },

  view: { modules: [], overlay: null, sig: 0 },
  receivers: [],
  show: (c, withOverlay = false) => {
    const locked = new Map(c.edges.filter((e) => e.locked && isFloorRef(e.a)).map((e) => [(e.a as { floor: string }).floor, `${e.b.module}.${e.b.port}`]));
    set({ receivers: receiverMarks(CONFIG.floorAnchors.map((a) => ({ id: a.id, x: a.x, z: a.z, locked: locked.get(a.id) ?? null }))) });
    if (withOverlay) {
      const r = checkStatic(c);
      set({ view: { modules: assemblyToFitted(r.assembly), overlay: overlayOf(r), sig: ++sig } });
    } else {
      set({ view: { modules: assemblyToFitted(assemble(c)), overlay: null, sig: ++sig } });
    }
  },

  tickers: [],
  tick: (dt) => { for (const t of get().tickers) t(dt); },

  log: [],
  pushLog: (s) => set({ log: [...get().log, s].slice(-200) }),

  plan: null,
  planning: false,
  setPlan: (p) => { set({ plan: p, playStep: 0, playT: 0, playing: false }); if (p) get().show(get().config); },
  setPlanning: (b) => set({ planning: b }),
  playStep: 0, playT: 0, playing: false, playSpeed: 1,
  play: () => { const p = get().plan; if (!p) return; if (get().playStep >= p.steps.length) set({ playStep: 0, playT: 0 }); set({ playing: true }); },
  pause: () => set({ playing: false }),
  seek: (step) => {
    const p = get().plan; if (!p) return;
    const s = Math.max(0, Math.min(p.steps.length, step));
    set({ playStep: s, playT: 0, playing: false });
    get().show(s === 0 ? get().config : p.steps[s - 1].expected, true);
  },
  setPlaySpeed: (x) => set({ playSpeed: x }),

  physics: null, physBusy: false, physErr: '', physRandom: true, physSeed: 1,
  setPhysRandom: (b) => set({ physRandom: b }),
  setPhysSeed: (n) => set({ physSeed: n }),
  gravity: async (withPlan) => {
    const s = get();
    const plan = withPlan && s.plan?.ok ? s.plan : null;
    set({ physBusy: true, physErr: '', playing: false });
    try {
      if (!plan) {
        // LIVE gravity: a physics session that keeps running until "Gravity off" (no fixed clip)
        const st = await (await fetch(`${VERIFY_URL}/session/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scene: toSimScene(s.config), randomize: s.physRandom, seed: s.physSeed }) })).json();
        if (st.error) throw new Error(st.error);
        const run = { ...st, frames: [], events: [], randomized: s.physRandom, seed: s.physSeed, finite: true } as PhysRun;
        const pp = preparePhys(run, assemblyToFitted(assemble(s.config)));
        set({ physics: { pp, t: 0, playing: true, withPlan: false, live: { id: st.id, fetching: false } }, physBusy: false, receivers: receiverMarks(st.receivers) });
        get().pushLog(`gravity ON, live (MuJoCo${s.physRandom ? `, randomized robot #${s.physSeed}` : ', nominal robot'}) — runs until you switch it off`);
        return;
      }
      const body = { ...toSimPlan(s.config, plan), seconds: 2 };
      const res = await fetch(`${VERIFY_URL}/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, randomize: s.physRandom, seed: s.physSeed }) });
      const run = await res.json() as PhysRun & { error?: string };
      if (run.error) throw new Error(run.error);
      const pp = preparePhys(run, assemblyToFitted(assemble(s.config)));
      set({ physics: { pp, t: 0, playing: true, withPlan: !!plan }, physBusy: false, receivers: receiverMarks(run.receivers) });
      get().pushLog(`gravity ON (MuJoCo${s.physRandom ? `, randomized robot #${s.physSeed}` : ', nominal robot'}): ${run.frames.length} frames, ${physDuration(pp).toFixed(1)} s${plan ? `, ${run.events.filter((e) => e.latched === false).length} dock(s) did not latch` : ''}`);
    } catch (e) {
      set({ physBusy: false, physErr: `the physics service is not running — start it with: py -3.12 C:\TETROBOT\sim\verify_service.py (${(e as Error).message})` });
    }
  },
  gravityOff: () => { set({ physics: null }); get().show(get().config); },   // a live session just stops being stepped
  buildShape: async (index) => {
    const s = get();
    set({ physBusy: true, physErr: '', playing: false });
    try {
      const standing = PRESETS.find((p) => p.id === 'standing')!.config;
      if (!haveOffsets()) {            // learn each part's mesh offset once, from a module the Studio can draw itself
        const ref = await fetch(`${VERIFY_URL}/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scene: toSimScene(standing), seconds: 0.5, randomize: false }) });
        preparePhys(await ref.json() as PhysRun, assemblyToFitted(assemble(standing)));
      }
      const res = await fetch(`${VERIFY_URL}/build_shape`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(typeof index === 'number' ? { index } : { shape: index }), seed: s.physSeed, randomize: s.physRandom }) });
      const out = await res.json();
      if (out.error) throw new Error(out.error);
      const pp = prepareRaw(out.run as PhysRun, assemblyToFitted(assemble(standing))[0]);
      set({ physics: { pp, t: 0, playing: true, withPlan: false }, physBusy: false, receivers: receiverMarks((out.run as PhysRun).receivers) });
      get().pushLog(`shape ${typeof index === 'number' ? `#${index}` : '(grown)'} built in physics (robot ${s.physRandom ? `#${s.physSeed}` : 'nominal'}): ${out.locked}/${out.of} docks locked; after 3 s of gravity the ends moved ${out.hold_drift_mm} mm (${out.wall_s} s to compute)`);
      return out;
    } catch (e) {
      set({ physBusy: false, physErr: `physics service: ${(e as Error).message}` });
      return null;
    }
  },
}));

// gravity playback: real time, then hold the last frame
useV2Store.setState((st) => ({ tickers: [...st.tickers, (dt: number) => {
  const s = useV2Store.getState();
  const ph = s.physics;
  if (!ph || !ph.playing) return;
  if (ph.live) {
    const have = ph.pp.run.frames.length ? ph.pp.run.frames[ph.pp.run.frames.length - 1].t : 0;
    if (!ph.live.fetching && have - ph.t < 0.8) {
      const live = ph.live; live.fetching = true;
      fetch(`${VERIFY_URL}/session/step`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: live.id, seconds: 1.0 }) })
        .then((r) => r.json()).then((j) => { if (j.frames) ph.pp.run.frames.push(...j.frames); })
        .catch(() => useV2Store.setState({ physErr: 'live physics stopped (service?)' }))
        .finally(() => { live.fetching = false; });
    }
    const t = Math.min(have, ph.t + dt * s.playSpeed);            // play what physics has computed; it keeps computing
    useV2Store.setState({ physics: { ...ph, t }, view: { modules: physFrame(ph.pp, t), overlay: null, sig: ++sig } });
    return;
  }
  const t = Math.min(physDuration(ph.pp), ph.t + dt * s.playSpeed);
  useV2Store.setState({ physics: { ...ph, t, playing: t < physDuration(ph.pp) }, view: { modules: physFrame(ph.pp, t), overlay: null, sig: ++sig } });
}] }));

// the player: advance through the plan in (scaled) real time
let lastShown = '';
useV2Store.setState((st) => ({ tickers: [...st.tickers, (dt: number) => {
  const s = useV2Store.getState();
  if (!s.playing || !s.plan) return;
  const step = s.plan.steps[s.playStep];
  if (!step) { useV2Store.setState({ playing: false }); return; }
  // pose moves play at 4x real time by default (real joints are slow: ≤ 35 deg/s)
  const dur = step.verb === 'pose_move' ? Math.max(1.2, step.durationS / 4) : 1.2;
  let t = s.playT + (dt * s.playSpeed) / dur;
  let k = s.playStep;
  if (t >= 1) { k += 1; t = 0; }
  useV2Store.setState({ playStep: k, playT: t, playing: k < s.plan.steps.length });
  const frame = planFrame(s.config, s.plan, k, t);
  const key = `${k}:${t.toFixed(3)}`;
  if (key !== lastShown) { lastShown = key; s.show(frame, k >= s.plan.steps.length || t === 0); }
}] }));

// draw the initial robot
useV2Store.getState().show(useV2Store.getState().config);
