/**
 * msrrV2Store — state for the MSRR page's Planner v2 (docs/TRANSFORM_PLANNER_V2_PROMPT.md).
 *
 * v2 works on Configs (lock graph + joint angles), not cubes. The viewport draws
 * `view` every frame; everything else updates it through `show()`.
 */
import { create } from 'zustand';
import { type PhysPrepared, type PhysRun, type ReceiverMark, preparePhys, prepareRaw, haveOffsets, physFrame, frameIndexAt, physDuration, receiverMarks, receiversIndexAt } from '@/features/msrr2/physicsView';
import { CONFIG, isFloorRef } from '@/robotics/msrr2/model';
import { toSimScene, toSimPlan, physicsFetch } from '@/robotics/msrr2/simScene';
import { type Config, type Edge, type ModulePose, STRAIGHT, cloneConfig } from '@/robotics/msrr2/model';
import { assemble } from '@/robotics/msrr2/assemble';
import { type DockMotion, dockMotion, undockMotion, minJerk } from '@/robotics/msrr2/approach';
import { checkStatic, type StaticReport } from '@/robotics/msrr2/statics';
import type { FittedModule } from '@/robotics/msrr/fitModules';
import { assemblyToFitted, overlayOf, type V2Overlay } from '@/features/msrr2/v2View';
import type { Plan } from '@/robotics/msrr2/planner';
import { JOINTS } from '@/robotics/msrr2/model';

export type V2Mode = 'v2' | 'legacy';

/** a connector as the manual session reports it (Studio metres) */
export interface ManualPort { id: string; kind: 'floor' | 'side' | 'end'; p: number[]; n: number[]; locked: string | null }
export interface ManualState {
  id: string; ports: ManualPort[]; state: Record<string, any> | null;
  /** what it was started with (Reset = the same start again, instantly) */
  start: { scene: Record<string, any>; opts: { seed: number; randomize: boolean; disturb: boolean; judge: string; ideal?: boolean } };
  mode: 'move' | 'lock' | 'connect'; pick: string[]; hover: { id: string; x: number; y: number } | null; err: string;
}
/** 7 Nov (Nischay: six tabs were confusing): three tabs by what you are doing - Live (the running sim + real robot),
 *  Build (a robot set up by hand + Check), Goal (say it -> pick a shape -> plan -> dry run, one flow of steps) */
export type V2Tab = 'live' | 'build' | 'goal';
export type GoalStep = 'ask' | 'shapes' | 'plan' | 'run';
/** the old six tab names still work (scripts, links inside panels): each opens its new home */
type OldTab = 'robot' | 'manual' | GoalStep;

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

export interface TwinState {
  /** still being built in the background: seconds so far */
  starting?: boolean; elapsed?: number; error?: string;
  on: boolean; t: number; behind: number; speed: number; seed: number; last: string; locks: string[]; finite: boolean;
  /** copy = the sim of the real robot; telemetry = the REAL robot (Sync on) rebuilt from its encoders + predicted flex */
  source?: 'copy' | 'telemetry'; modules?: string[];
  /** telemetry: does the board answer now, and for how long it has been quiet (s) */
  contact?: boolean; quiet_s?: number | null;
  feedback?: { mode: string; uses: string[]; err_mm: Record<string, number> } | null;
}

const SPLIT_KEY = 'tetro.msrr.split';
const splitSaved = (): boolean => { try { return localStorage.getItem(SPLIT_KEY) === '1'; } catch { return false; } };

interface V2State {
  mode: V2Mode;
  setMode: (m: V2Mode) => void;
  tab: V2Tab;
  setTab: (t: V2Tab | OldTab) => void;
  /** the Goal tab's open step (one at a time) */
  goalStep: GoalStep;
  setGoalStep: (s: GoalStep) => void;
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
  physics: { pp: PhysPrepared; t: number; playing: boolean; withPlan: boolean; live?: { id: string; fetching: boolean; manual?: boolean } } | null;
  // ── MANUAL tab: a live physics session driven by hand (C:\TETROBOT\sim\manual.py) ──
  manual: ManualState | null;
  /** SPLIT view (Nischay 5 Nov): left the ideal robot, right the REAL robot as the sim expects it - a realistic copy (sag, gear play,
   *  random robot, room) driven by exactly what Sync sends a board (real_sync.Twin). Only while a manual session runs. */
  split: boolean;
  setSplit: (on: boolean) => void;
  twin: { pp: PhysPrepared | null; state: TwinState | null; err: string } | null;
  /** what the right half draws */
  view2: { modules: FittedModule[]; sig: number };
  twinStart: () => Promise<void>;
  manualStart: (scene: Record<string, any>, opts: { seed: number; randomize: boolean; disturb: boolean; judge: string; ideal?: boolean }) => Promise<void>;
  manualCmd: (cmd: Record<string, any>) => Promise<Record<string, any> | null>;
  manualStop: () => void;
  manualSet: (patch: Partial<ManualState>) => void;
  /** a connector clicked in the viewport (connect mode: the second click starts the connect) */
  manualPick: (portId: string) => void;
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
  /** G6: play the recorded shape change (transform.py: shape A -> shape B in real physics) */
  watchTransform: (seed?: number, name?: string) => Promise<Record<string, any> | null>;
}

/** each part's mesh offset, learned once from a module the Studio can draw itself (needed to draw runs of physics-built shapes) */
async function ensureOffsets(standing: Config) {
  if (haveOffsets()) return;
  const ref = await physicsFetch(`/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scene: toSimScene(standing), seconds: 0.5, randomize: false }) });
  preparePhys(await ref.json() as PhysRun, assemblyToFitted(assemble(standing)));
}

/** The robot during a plan: before step i, and part-way (t) through it. */
/** dock / undock steps as the robot really does them (approach.ts), computed once per step */
const MOTION = new WeakMap<object, DockMotion | null>();
function motionOf(plan: Plan, i: number, start: Config): DockMotion | null {
  const s = plan.steps[i];
  if (s.verb !== 'dock' && s.verb !== 'undock') return null;
  if (!MOTION.has(s)) {
    const before = i === 0 ? start : plan.steps[i - 1].expected;
    let m: DockMotion | null = null;
    try { m = s.verb === 'dock' ? dockMotion(before, s.expected) : undockMotion(before, s.expected); } catch { m = null; }
    MOTION.set(s, m);
  }
  return MOTION.get(s) ?? null;
}

/** where step i really leaves the robot: a dock seated, an undock pulled 4 cm straight out, and a bend that leads into
 *  a dock stops at the stand-off in front of the connector (never inside it) */
function stepEnd(start: Config, plan: Plan, i: number): Config {
  if (i < 0) return start;
  const s = plan.steps[i];
  const mo = motionOf(plan, i, start);
  if (mo) return mo.end;
  if (s.verb === 'pose_move' && plan.steps[i + 1]?.verb === 'dock') {
    const nx = motionOf(plan, i + 1, start);
    if (nx?.approachFrom) return nx.approachFrom;
  }
  return s.expected;
}

function lerpConfig(a: Config, b: Config, u: number, edgesFrom: Config, baseFrom: Config): Config {
  const c = cloneConfig(b);
  c.edges = cloneConfig(edgesFrom).edges;
  c.baseFrame = baseFrom.baseFrame;
  for (const m of c.modules) for (const j of JOINTS) c.pose[m][j] = (a.pose[m]?.[j] ?? 180) + (b.pose[m][j] - (a.pose[m]?.[j] ?? 180)) * u;
  return c;
}

export function planFrame(start: Config, plan: Plan, step: number, t: number): Config {
  if (step >= plan.steps.length) return stepEnd(start, plan, plan.steps.length - 1);
  const before = stepEnd(start, plan, step - 1);
  const s = plan.steps[step];
  const tt = Math.min(0.9999, Math.max(0, t));
  const mo = motionOf(plan, step, start);
  if (mo) {
    // phases (stand-off + turn, pause, straight in / out, lock), each with its own S-curve; along a phase the poses are
    // placed by DISTANCE so the end moves at one smooth speed (no stop-start at every keyframe)
    let acc = 0;
    for (let k = 0; k < mo.phases.length; k++) {
      const ph = mo.phases[k];
      if (tt <= acc + ph.share || k === mo.phases.length - 1) {
        const e = minJerk(Math.min(1, Math.max(0, (tt - acc) / ph.share)));
        let i = 0; while (i < ph.at.length - 2 && e > ph.at[i + 1]) i++;
        const u = (e - ph.at[i]) / Math.max(1e-9, ph.at[i + 1] - ph.at[i]);
        const done = k === mo.phases.length - 1 && e >= 0.999;
        return lerpConfig(ph.frames[i], ph.frames[i + 1], Math.min(1, Math.max(0, u)), done ? ph.frames[i + 1] : ph.frames[i], before);
      }
      acc += ph.share;
    }
  }
  if (s.verb !== 'pose_move') return t < 0.5 ? before : s.expected;
  // joint legs: before -> via... -> end, equal time per leg; locks stay as before
  const pts = [before, ...(s.via ?? []), stepEnd(start, plan, step)];
  const legs = pts.length - 1;
  const x = minJerk(tt) * legs * 0.99999;                                 // one S-curve over the whole move: smooth start and stop
  const k = Math.floor(x), u = x - k;
  return lerpConfig(pts[k], pts[k + 1], u, before, before);
}

let sig = 0;

export const useV2Store = create<V2State>((set, get) => ({
  mode: 'v2',
  setMode: (m) => set({ mode: m }),
  tab: 'live',
  setTab: (t) => set(t === 'robot' ? { tab: 'build' } : t === 'manual' ? { tab: 'live' }
    : t === 'live' || t === 'build' || t === 'goal' ? { tab: t } : { tab: 'goal', goalStep: t }),
  goalStep: 'ask',
  setGoalStep: (s) => set({ goalStep: s }),
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
    set({ receivers: receiverMarks(CONFIG.floorAnchors.map((a) => ({ id: a.id, x: a.x, z: a.z, locked: locked.get(a.id) ?? null, yawDeg: a.yawDeg }))) });
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
  manual: null,
  split: splitSaved(),
  twin: null,
  view2: { modules: [], sig: 0 },
  setSplit: (on) => {
    try { localStorage.setItem(SPLIT_KEY, on ? '1' : '0'); } catch { /* per-viewer convenience only */ }
    set({ split: on });
    if (on && get().manual && !get().twin) void get().twinStart();
    if (!on && get().twin) { void get().manualCmd({ kind: 'twin', on: false }); set({ twin: null, view2: { modules: [], sig: ++sig } }); }
  },
  twinStart: async () => {
    const m = get().manual; if (!m) return;
    set({ twin: { pp: null, state: null, err: '' } });
    get().pushLog(`split view: building the REAL copy in the background (random robot #${get().physSeed}, sag + gear play + lock play + room)`);
    const r = await get().manualCmd({ kind: 'twin', on: true, seed: get().physSeed });
    if (!get().split || get().manual?.id !== m.id) return;                        // switched off / another session meanwhile
    if (!r?.ok) set({ twin: { pp: null, state: null, err: r?.error ?? 'physics service not reachable' } });
    // the drawing is prepared when /manual/step brings twin_init (the copy is built in the background, 20-90 s)
  },
  manualStart: async (scene, opts) => {
    const old = get().manual; if (old) physicsFetch(`/manual/cmd`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: old.id, cmd: { kind: 'close' } }) }).catch(() => {});
    set({ physBusy: true, physErr: '', playing: false });
    try {
      await ensureOffsets(PRESETS.find((p) => p.id === 'standing')!.config);
      const st = await (await physicsFetch(`/manual/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scene, ...opts }) })).json();
      if (st.error) throw new Error(st.error);
      const run = { ...st, frames: [], events: [], randomized: opts.randomize, seed: opts.seed, finite: true } as PhysRun;
      const pp = prepareRaw(run, assemblyToFitted(assemble(PRESETS.find((p) => p.id === 'standing')!.config))[0]);
      set({ physics: { pp, t: 0, playing: true, withPlan: false, live: { id: st.id, fetching: false, manual: true } }, physBusy: false, receivers: receiverMarks(st.receivers),
            manual: { id: st.id, ports: st.ports, state: st.state, mode: 'move', pick: [], hover: null, err: '', start: { scene, opts } }, twin: null, view2: { modules: [], sig: ++sig } });
      if (get().split) void get().twinStart();
      get().pushLog(`manual session: ${scene.modules.length} module(s), real physics (${opts.ideal ? 'IDEAL robot: no errors, no randomness, no room' : `${opts.randomize ? `random robot #${opts.seed}` : 'nominal robot'}${opts.disturb ? ', room disturbances on' : ''}`})`);
    } catch (e) {
      set({ physBusy: false, physErr: `the physics service could not start (see data/logs/verify_service_console.log) (${(e as Error).message})` });
    }
  },
  manualCmd: async (cmd) => {
    const m = get().manual; if (!m) return null;
    try {
      const r = await (await physicsFetch(`/manual/cmd`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, cmd }) })).json();
      if (/no such manual session/.test(r.error ?? '') && cmd.kind !== 'close') {          // the service restarted: same start again, then this command
        get().pushLog('the physics service restarted and lost the session - starting the same setup again'); await get().manualStart(m.start.scene, m.start.opts);
        return get().manual ? get().manualCmd(cmd) : null;
      }
      if (r.error) set({ manual: { ...get().manual!, err: r.error } }); else if (get().manual?.err) set({ manual: { ...get().manual!, err: '' } });
      return r;
    } catch { set({ manual: { ...get().manual!, err: 'physics service not reachable' } }); return null; }
  },
  manualStop: () => {
    const m = get().manual;
    if (m) physicsFetch(`/manual/cmd`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, cmd: { kind: 'close' } }) }).catch(() => {});
    set({ manual: null, physics: null, twin: null, view2: { modules: [], sig: ++sig } }); get().show(get().config);
  },
  manualSet: (patch) => { const m = get().manual; if (m) set({ manual: { ...m, ...patch } }); },
  manualPick: (portId) => {
    const m = get().manual; if (!m || m.mode !== 'connect') return;
    const pick = m.pick.includes(portId) ? m.pick.filter((x) => x !== portId) : [...m.pick, portId];
    if (pick.length === 2) {
      set({ manual: { ...m, pick: [] } });
      get().manualCmd({ kind: 'connect', a: pick[0], b: pick[1] });
      get().pushLog(`connect ${pick[0]} + ${pick[1]}: the modules bend into the stand-off, then the docking brain goes in (real physics)`);
    } else set({ manual: { ...m, pick } });
  },
  setPhysRandom: (b) => set({ physRandom: b }),
  setPhysSeed: (n) => set({ physSeed: n }),
  gravity: async (withPlan) => {
    const s = get();
    const plan = withPlan && s.plan?.ok ? s.plan : null;
    set({ physBusy: true, physErr: '', playing: false });
    try {
      if (!plan) {
        // LIVE gravity: a physics session that keeps running until "Gravity off" (no fixed clip)
        const st = await (await physicsFetch(`/session/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scene: toSimScene(s.config), randomize: s.physRandom, seed: s.physSeed }) })).json();
        if (st.error) throw new Error(st.error);
        const run = { ...st, frames: [], events: [], randomized: s.physRandom, seed: s.physSeed, finite: true } as PhysRun;
        const pp = preparePhys(run, assemblyToFitted(assemble(s.config)));
        set({ physics: { pp, t: 0, playing: true, withPlan: false, live: { id: st.id, fetching: false } }, physBusy: false, receivers: receiverMarks(st.receivers) });
        get().pushLog(`gravity ON, live (MuJoCo${s.physRandom ? `, randomized robot #${s.physSeed}` : ', nominal robot'}) — runs until you switch it off`);
        return;
      }
      const body = { ...toSimPlan(s.config, plan), seconds: 2 };
      const res = await physicsFetch(`/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, randomize: s.physRandom, seed: s.physSeed }) });
      const run = await res.json() as PhysRun & { error?: string };
      if (run.error) throw new Error(run.error);
      const pp = preparePhys(run, assemblyToFitted(assemble(s.config)));
      set({ physics: { pp, t: 0, playing: true, withPlan: !!plan }, physBusy: false, receivers: receiverMarks(run.receivers) });
      get().pushLog(`gravity ON (MuJoCo${s.physRandom ? `, randomized robot #${s.physSeed}` : ', nominal robot'}): ${run.frames.length} frames, ${physDuration(pp).toFixed(1)} s${plan ? `, ${run.events.filter((e) => e.latched === false).length} dock(s) did not latch` : ''}`);
    } catch (e) {
      set({ physBusy: false, physErr: `the physics service could not start (see data/logs/verify_service_console.log) (${(e as Error).message})` });
    }
  },
  // a live session just stops being stepped. A MANUAL session is closed outright (7 Nov: this only paused it, so the split
  // view, SPLIT button and frozen robot stayed as if it still ran)
  gravityOff: () => { if (get().manual) { get().manualStop(); return; } set({ physics: null }); get().show(get().config); },
  buildShape: async (index) => {
    const s = get();
    set({ physBusy: true, physErr: '', playing: false });
    try {
      const standing = PRESETS.find((p) => p.id === 'standing')!.config;
      await ensureOffsets(standing);
      const res = await physicsFetch(`/build_shape`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(typeof index === 'number' ? { index } : { shape: index }), seed: s.physSeed, randomize: s.physRandom }) });
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
  watchTransform: async (seed = 1, name = '') => {
    set({ physBusy: true, physErr: '', playing: false });
    try {
      const standing = PRESETS.find((p) => p.id === 'standing')!.config;
      await ensureOffsets(standing);
      const res = await physicsFetch(`/transform?seed=${seed}${name ? `&name=${name}` : ''}`);
      const out = await res.json();
      if (out.error) throw new Error(out.error);
      const run = out.run as PhysRun;
      const pp = prepareRaw(run, assemblyToFitted(assemble(standing))[0]);
      const k = receiversIndexAt(run, 0);
      set({ physics: { pp, t: 0, playing: true, withPlan: false }, physBusy: false, receivers: receiverMarks(k >= 0 ? run.receivers_at![k].receivers : run.receivers) });
      get().pushLog(`shape change ${name || 'A -> B'}, random robot #${seed} (recorded in real physics): ${(out.stages as { stage: string; ok: boolean }[]).map((x) => `${x.stage} ${x.ok ? 'OK' : 'FAILED'}`).join(' · ')}`);
      return out;
    } catch (e) {
      set({ physBusy: false, physErr: `physics service: ${(e as Error).message}` });
      return null;
    }
  },
}));

// gravity playback: real time, then hold the last frame
const rxShown: { run: PhysRun | null; k: number } = { run: null, k: -1 };
const portsShown = { k: -1 };                                                      // which frame's connector dots are on screen      // which receivers_at entry is on screen
useV2Store.setState((st) => ({ tickers: [...st.tickers, (dt: number) => {
  const s = useV2Store.getState();
  const ph = s.physics;
  if (!ph || !ph.playing) return;
  if (ph.live) {
    const have = ph.pp.run.frames.length ? ph.pp.run.frames[ph.pp.run.frames.length - 1].t : 0;
    if (!ph.live.fetching && have - ph.t < 0.8) {
      const live = ph.live; live.fetching = true;
      const url = live.manual ? '/manual/step' : '/session/step';
      physicsFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(live.manual ? { id: live.id, wait: 0.3 } : { id: live.id, seconds: 1.0 }) })
        .then((r) => r.json()).then((j) => {
          if (j.frames?.length && ph.pp.run.frames.length && j.frames[0].t < ph.pp.run.frames[ph.pp.run.frames.length - 1].t - 0.05) {
            ph.pp.run.frames.length = 0; const cur = useV2Store.getState().physics; if (cur) useV2Store.setState({ physics: { ...cur, t: j.frames[0].t } });   // a restored state: time went back
          }
          if (j.frames) ph.pp.run.frames.push(...j.frames);
          const fr = ph.pp.run.frames; if (fr.length > 2000) fr.splice(0, fr.length - 1500);   // a manual session runs for as long as you like
          let tw = useV2Store.getState().twin;
          if (live.manual && tw && !tw.pp && j.twin_init) {                      // the copy is ready: prepare its drawing once
            const run = { bodies: j.twin_init.bodies, frame0: j.twin_init.frame0, frames: [], events: [], fps: ph.pp.run.fps, randomized: true, seed: useV2Store.getState().physSeed, finite: true } as PhysRun;
            tw = { pp: prepareRaw(run, assemblyToFitted(assemble(PRESETS.find((p) => p.id === 'standing')!.config))[0]), state: j.twin ?? null, err: '' };
            useV2Store.setState({ twin: tw });
          }
          if (live.manual && tw && !tw.pp && j.twin) useV2Store.setState({ twin: { ...tw, state: j.twin, err: j.twin.error ?? '' } });   // still building: its seconds so far
          if (live.manual && tw?.pp) {                                                   // the split view's real copy, same clock
            const tf = tw.pp.run.frames;
            if (j.twin_frames?.length && tf.length && j.twin_frames[0].t < tf[tf.length - 1].t - 0.05) tf.length = 0;
            if (j.twin_frames) tf.push(...j.twin_frames);
            if (tf.length > 2000) tf.splice(0, tf.length - 1500);
            if (j.twin) useV2Store.setState({ twin: { ...tw, state: j.twin } });
          }
          if (live.manual && /no such manual session/.test(j.error ?? '')) {
            const m = useV2Store.getState().manual;
            if (m && m.id === live.id) { useV2Store.getState().pushLog('the physics service restarted and lost the session - starting the same setup again'); useV2Store.getState().manualStart(m.start.scene, m.start.opts); }
          }
          if (live.manual && j.state) {
            const m = useV2Store.getState().manual;
            if (m && m.id === live.id) {
              // every new line of what the robot did goes into the log you see (results, failures, why)
              const old: string[] = m.state?.log ?? []; const nu: string[] = j.state.log ?? [];
              const k = old.length ? nu.lastIndexOf(old[old.length - 1]) : -1;
              for (const line of nu.slice(k + 1)) useV2Store.getState().pushLog(line.trim());
              // the dots' positions come from the frame on screen (below), not from 'now': keep them, take the rest (locked, kind)
              const ports = (j.ports ?? m.ports).map((q: ManualPort, i: number) => ({ ...q, p: m.ports[i]?.id === q.id ? m.ports[i].p : q.p }));
              useV2Store.setState({ manual: { ...m, ports, state: j.state } });
            }
          }
        })
        .catch(() => useV2Store.setState({ physErr: 'live physics stopped (service?)' }))
        .finally(() => { live.fetching = false; });
    }
    // smooth: the clock runs at the physics' own pace - slower while the buffer of frames ahead is short - so a sim slower than real
    // time plays as smooth slow motion instead of run-stop bursts (3 Nov: the ideal sim runs ~0.6x, it looked like 2 fps)
    const pace = ph.live.manual ? Math.max(0, Math.min(2, 1 + (have - ph.t - 0.6) / 0.6)) : 1;
    const t = Math.min(have, Math.max(ph.t + dt * s.playSpeed * pace, ph.live.manual ? have - 3 : -Infinity));
    // the connector dots of the frame on screen (2 Nov: taken from 'now' they ran ~0.6 s ahead of the drawn robot, and at the start
    // they fell before it did)
    const man = s.manual, fr = ph.pp.run.frames;
    let dots = {};
    if (ph.live.manual && man && fr.length) {
      const k = frameIndexAt(ph.pp.run, t), x = fr[k].x;
      if (x && x.length === man.ports.length && portsShown.k !== k) { portsShown.k = k; dots = { manual: { ...man, ports: man.ports.map((q, i) => ({ ...q, p: x[i] })) } }; }
    }
    // the right half: the real copy at the SAME moment (the ideal session waits for it, so it is never far behind)
    const tpp = s.split ? s.twin?.pp : null;
    const right = tpp && tpp.run.frames.length ? { view2: { modules: physFrame(tpp, Math.min(t, tpp.run.frames[tpp.run.frames.length - 1].t)), sig: ++sig } } : {};
    useV2Store.setState({ physics: { ...ph, t }, view: { modules: physFrame(ph.pp, t), overlay: null, sig: ++sig }, ...dots, ...right });
    return;
  }
  const t = Math.min(physDuration(ph.pp), ph.t + dt * s.playSpeed);
  const run = ph.pp.run, k = receiversIndexAt(run, t);
  const rx = k >= 0 && (rxShown.run !== run || rxShown.k !== k) ? { receivers: receiverMarks(run.receivers_at![k].receivers) } : {};   // a foot stepped to another receiver
  if (k >= 0) { rxShown.run = run; rxShown.k = k; }
  useV2Store.setState({ ...rx, physics: { ...ph, t, playing: t < physDuration(ph.pp) }, view: { modules: physFrame(ph.pp, t), overlay: null, sig: ++sig } });
}] }));

// the player: advance through the plan in (scaled) real time
let lastShown = '';
useV2Store.setState((st) => ({ tickers: [...st.tickers, (dt: number) => {
  const s = useV2Store.getState();
  if (!s.playing || !s.plan) return;
  const step = s.plan.steps[s.playStep];
  if (!step) { useV2Store.setState({ playing: false }); return; }
  // REAL TIME at speed 1.0x: a step lasts what the plan says it takes on the robot (Nischay, 28 Oct: "5 s step played in ~2.5 s")
  const dur = Math.max(0.5, step.durationS);
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
