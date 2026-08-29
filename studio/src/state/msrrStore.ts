/**
 * msrrStore — state for the MSRR Experiments page.
 *
 * Deliberately separate from modelStore: the lattice sandbox is an experiment
 * surface, not the project document. Nothing here is autosaved into a .nischay
 * project, nothing here can corrupt the real robot model, and clearing it costs
 * nothing. The one place the two meet is the mirror/materialize bridge, which
 * goes through the command bus like any other edit.
 *
 * Three pieces of state that matter:
 *   config  — where the modules are right now (the truth the viewport draws)
 *   target  — the shape we are trying to become
 *   plan    — the ordered moves from one to the other, plus playback position
 *
 * ONE CELL IS ONE CUBE OF THE LATTICE
 * `config`/`target` hold cube-cell coordinates. Under the mod1 module theme one
 * cube is exactly one module. Under mod2 (MODULINK) a module is a bendable
 * 6-rod chain that spans SEVERAL cubes depending on its pose — see
 * robotics/msrr/moduleThemes.ts and modulink.ts. The lattice itself stays
 * uniformly cubic either way; what changes is how many cubes one module claims.
 */
import { create } from 'zustand';
import {
  type Cell, type Config,
  emptyConfig, configFromCells, cellsOf, key, cloneConfig,
  isConnected, isConnectedWithout, articulationCells,
} from '@/robotics/msrr/lattice';
import { type Move, type MoveModel, applyMove, movesForModule } from '@/robotics/msrr/moves';
import {
  type PlanResult, type Strategy, type PlanOptions,
  DEFAULT_PLAN_OPTIONS, planReconfiguration,
} from '@/robotics/msrr/planner';
import { type StabilityReport, checkStability } from '@/robotics/msrr/stability';
import { type PlaybackState, type PlaybackOptions, DEFAULT_PLAYBACK, advance } from '@/robotics/msrr/executor';
import { type ModuleThemeId, DEFAULT_MODULE_THEME, getModuleTheme } from '@/robotics/msrr/moduleThemes';
import { type FitResult, fitModules } from '@/robotics/msrr/fitModules';
import { type TransformResult, type SearchProgress, planTransform, mobilityReport } from '@/robotics/msrr/transform';

export type MsrrTab = 'build' | 'text' | 'draw' | 'plan' | 'run' | 'bridge';

/** World size of one lattice cube, in metres. */
export const DEFAULT_CELL_SIZE = 0.25;

/** How many past configs the manual-edit undo stack keeps. */
const MAX_HISTORY = 40;

interface MsrrState {
  tab: MsrrTab;
  setTab: (t: MsrrTab) => void;

  // ── structure ──────────────────────────────────────────────────────────────
  config: Config;
  target: Cell[];
  cellSize: number;
  /** cells whose module cannot move this step without splitting the robot */
  locked: Set<string>;
  stability: StabilityReport;

  // ── built modules ──────────────────────────────────────────────────────────
  /**
   * The result of Build: real modules fitted into the cube shape. Null until
   * Build is pressed, and cleared whenever the shape changes — a fit for a shape
   * you have since edited is stale, and showing it would be wrong.
   */
  built: FitResult | null;
  building: boolean;
  /** how many modules of the build are revealed, for one-by-one assembly */
  buildReveal: number;
  build: () => void;
  clearBuild: () => void;
  setBuildReveal: (n: number) => void;

  /** hand-over-hand transformation from the built robot into the target shape */
  transform: TransformResult | null;
  transforming: boolean;
  /** live snapshot of the search while `transforming` is true; null once it lands */
  transformProgress: SearchProgress | null;
  /** how many transformation steps are complete */
  transformStep: number;
  /** progress through the step currently in flight, 0..1 */
  transformT: number;
  transformPlaying: boolean;
  /** seconds one grab-and-release step takes at speed 1 */
  transformSpeed: number;
  planTransformation: () => Promise<void>;
  clearTransformation: () => void;
  setTransformStep: (n: number) => void;
  playTransform: () => void;
  pauseTransform: () => void;
  rewindTransform: () => void;
  setTransformSpeed: (n: number) => void;

  /** which module theme the sandbox is modelling (mod1 cube / mod2 MODULINK) */
  moduleTheme: ModuleThemeId;
  setModuleTheme: (id: ModuleThemeId) => void;
  /** pose id per module, only meaningful for multi-cube themes like mod2 */
  modulePoses: Map<string, string>;
  setModulePose: (moduleId: string, poseId: string) => void;

  setConfig: (c: Config) => void;
  setConfigCells: (cells: Cell[]) => void;
  toggleCell: (cell: Cell) => void;
  addCell: (cell: Cell) => void;
  /** add a whole run of cubes as ONE undo entry — the face-drag extrude */
  addCells: (cells: Cell[]) => void;
  removeCell: (cell: Cell) => void;
  /**
   * Delete a cube only if the rest stays in one piece. Refuses (with a reason)
   * for any cube that is holding the structure together, because a split
   * structure is not a robot — the halves could never command or reach each other.
   */
  removeCellSafe: (cell: Cell) => { ok: boolean; reason: string };
  clearConfig: () => void;
  setTarget: (cells: Cell[]) => void;
  clearTarget: () => void;
  /** swap current and target — handy for playing a transformation backwards */
  swapWithTarget: () => void;
  setCellSize: (n: number) => void;

  // ── manual-edit undo/redo (config only — see file header) ────────────────────
  history: Config[];
  future: Config[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  /** wipe everything back to an empty sandbox: structure, target, plan, log */
  resetAll: () => void;

  // ── planning ───────────────────────────────────────────────────────────────
  options: PlanOptions;
  setOptions: (patch: Partial<PlanOptions>) => void;
  plan: PlanResult | null;
  planning: boolean;
  runPlan: () => void;
  clearPlan: () => void;

  // ── playback ───────────────────────────────────────────────────────────────
  playback: PlaybackState;
  playing: boolean;
  playbackOpts: PlaybackOptions;
  setPlaybackOpts: (patch: Partial<PlaybackOptions>) => void;
  play: () => void;
  pause: () => void;
  rewind: () => void;
  /** advance the clock; called from the page's render loop */
  tick: (dt: number) => void;
  /** jump to the state just after move `index` (-1 = the start state) */
  seek: (index: number) => void;
  /** apply one move and stop — the manual step button */
  stepOnce: () => void;
  /** commit the played-out result as the new current config */
  commitPlan: () => void;

  // ── bridge to the real document ────────────────────────────────────────────
  mirror: boolean;
  setMirror: (on: boolean) => void;

  // ── log ────────────────────────────────────────────────────────────────────
  log: string[];
  pushLog: (line: string) => void;
  clearLog: () => void;
}

/**
 * The config as of a given point in the plan. Recomputed from the start config
 * rather than stored per step: a plan is a few hundred moves at most and each
 * application is a Map copy, so this is cheap and cannot drift out of sync.
 */
export function configAtStep(start: Config, moves: Move[], upToExclusive: number): Config {
  let cur = start;
  for (let i = 0; i < Math.min(upToExclusive, moves.length); i++) cur = applyMove(cur, moves[i]);
  return cur;
}

const derive = (config: Config) => ({
  locked: articulationCells(config),
  stability: checkStability(config),
});

/**
 * A single cube to build from. Deliberately one, not a pre-made structure: every
 * cube after this one gets dragged off a face of an existing cube, so the thing
 * you end up with is one you actually placed.
 */
const seedCells: Cell[] = [[0, 0, 0]];

export const useMsrrStore = create<MsrrState>((set, get) => {
  const seed = configFromCells(seedCells);

  /**
   * The one path every CURRENT-structure mutation goes through: pushes the
   * previous config onto the undo stack (unless told not to — undo/redo
   * themselves move between the stacks rather than growing them) and clears
   * derived planning state.
   */
  const commitConfig = (
    config: Config,
    opts: { recordHistory?: boolean } = {},
  ) => {
    const { recordHistory = true } = opts;
    const cur = get();
    set({
      config,
      history: recordHistory ? [...cur.history, cur.config].slice(-MAX_HISTORY) : cur.history,
      future: recordHistory ? [] : cur.future,
      canUndo: recordHistory ? true : cur.history.length > 0,
      canRedo: recordHistory ? false : cur.future.length > 0,
      ...derive(config),
      // A build describes the shape it was fitted to. Editing the shape makes it
      // stale, so it goes rather than lingering as a wrong answer.
      built: null,
      buildReveal: 0,
      transform: null,
      transformStep: 0,
      transformT: 0,
      transformPlaying: false,
      plan: null,
      playing: false,
    });
  };

  return {
    tab: 'build',
    setTab: (tab) => set({ tab }),

    config: seed,
    target: [],
    cellSize: DEFAULT_CELL_SIZE,
    ...derive(seed),

    built: null,
    building: false,
    buildReveal: 0,

    build: () => {
      const cells = cellsOf(get().config);
      if (!cells.length) { get().pushLog('nothing to build — draw a shape first'); return; }
      set({ building: true });
      // Yielded to the next frame so the "building" state paints before the fit
      // blocks the thread (the reach table is built on first use).
      requestAnimationFrame(() => {
        const result = fitModules(cells);
        set({
          built: result,
          building: false,
          buildReveal: result.modules.length,
          log: [...get().log, ...result.log].slice(-200),
        });
      });
    },
    clearBuild: () => set({
      built: null, buildReveal: 0,
      transform: null, transformStep: 0, transformT: 0, transformPlaying: false,
    }),

    transform: null,
    transforming: false,
    transformStep: 0,
    transformT: 0,
    transformPlaying: false,
    transformSpeed: 1,

    transformProgress: null,

    planTransformation: async () => {
      const { built, target } = get();
      if (!built) { get().pushLog('build the robot first — transformation moves real modules'); return; }
      if (!target.length) { get().pushLog('no target shape set — store one from the shape library first'); return; }
      set({ transforming: true, transformProgress: null });
      const result = await planTransform(built, target, {}, (p) => set({ transformProgress: p }));
      set({
        transform: result,
        transforming: false,
        transformProgress: null,
        transformStep: 0,
        log: [...get().log, ...result.log].slice(-200),
      });
    },
    clearTransformation: () => set({
      transform: null, transformStep: 0, transformT: 0, transformPlaying: false,
    }),
    setTransformStep: (n) => {
      const max = get().transform?.moves.length ?? 0;
      // Scrubbing is a deliberate jump, so it stops playback and lands cleanly
      // between steps rather than part-way through one.
      set({
        transformStep: Math.max(0, Math.min(max, Math.round(n))),
        transformT: 0,
        transformPlaying: false,
      });
    },
    playTransform: () => {
      const t = get().transform;
      if (!t || !t.moves.length) return;
      // Replaying from the end restarts rather than sitting still.
      const atEnd = get().transformStep >= t.moves.length;
      set({
        transformPlaying: true,
        transformStep: atEnd ? 0 : get().transformStep,
        transformT: atEnd ? 0 : get().transformT,
      });
    },
    pauseTransform: () => set({ transformPlaying: false }),
    rewindTransform: () => set({ transformStep: 0, transformT: 0, transformPlaying: false }),
    setTransformSpeed: (n) => set({ transformSpeed: Math.max(0.1, Math.min(5, n)) }),
    setBuildReveal: (n) => {
      const max = get().built?.modules.length ?? 0;
      set({ buildReveal: Math.max(0, Math.min(max, Math.round(n))) });
    },

    moduleTheme: DEFAULT_MODULE_THEME,
    setModuleTheme: (moduleTheme) => {
      // Switching theme reinterprets what an occupied cube MEANS, so any plan
      // built under the old reading is stale. The structure itself is untouched.
      set({ moduleTheme, plan: null, playing: false });
      const t = getModuleTheme(moduleTheme);
      get().pushLog(`module theme → ${t.label}: ${t.cellsPerModuleSummary}`);
    },

    modulePoses: new Map<string, string>(),
    setModulePose: (moduleId, poseId) => {
      const next = new Map(get().modulePoses);
      next.set(moduleId, poseId);
      set({ modulePoses: next, plan: null, playing: false });
    },

    setConfig: (config) => commitConfig(config),
    setConfigCells: (cells) => commitConfig(configFromCells(cells)),

    toggleCell: (cell) => {
      const { config } = get();
      if (config.occ.has(key(cell))) get().removeCell(cell);
      else get().addCell(cell);
    },

    addCell: (cell) => { get().addCells([cell]); },

    addCells: (cells) => {
      const { config } = get();
      if (!cells.length) return;
      const next = cloneConfig(config);
      // Stable numbering: new cubes take the next free index rather than the
      // count, so deleting m3 and adding one does not create a second m3.
      const used = new Set(next.occ.values());
      let n = 0;
      const mintId = () => {
        while (used.has(`m${n}`)) n++;
        const id = `m${n}`;
        used.add(id);
        return id;
      };
      let added = 0;
      for (const c of cells) {
        const k = key(c);
        if (next.occ.has(k)) continue;
        next.occ.set(k, mintId());
        added++;
      }
      if (added) commitConfig(next); // one history entry for the whole run
    },

    removeCellSafe: (cell) => {
      const { config } = get();
      const k = key(cell);
      if (!config.occ.has(k)) return { ok: false, reason: 'nothing there to delete' };
      if (config.occ.size > 1 && !isConnectedWithout(config, cell)) {
        return {
          ok: false,
          reason: `cannot delete (${cell.join(',')}) — it is holding the structure together, `
            + 'removing it would split the robot into two pieces',
        };
      }
      const next = cloneConfig(config);
      next.occ.delete(k);
      commitConfig(next);
      return { ok: true, reason: '' };
    },

    removeCell: (cell) => {
      const { config } = get();
      const k = key(cell);
      if (!config.occ.has(k)) return;
      const next = cloneConfig(config);
      next.occ.delete(k);
      commitConfig(next);
    },

    clearConfig: () => commitConfig(emptyConfig()),

    setTarget: (target) => set({ target, plan: null, playing: false }),
    clearTarget: () => set({ target: [], plan: null, playing: false }),

    swapWithTarget: () => {
      const { config, target } = get();
      if (!target.length) return;
      const cur = cellsOf(config);
      commitConfig(configFromCells(target));
      set({ target: cur });
    },

    setCellSize: (cellSize) => set({ cellSize }),

    history: [],
    future: [],
    canUndo: false,
    canRedo: false,

    undo: () => {
      const cur = get();
      if (!cur.history.length) return;
      const prev = cur.history[cur.history.length - 1];
      const history = cur.history.slice(0, -1);
      const future = [cur.config, ...cur.future].slice(0, MAX_HISTORY);
      set({
        config: prev, history, future,
        canUndo: history.length > 0, canRedo: true,
        ...derive(prev), plan: null, playing: false,
      });
    },
    redo: () => {
      const cur = get();
      if (!cur.future.length) return;
      const next = cur.future[0];
      const future = cur.future.slice(1);
      const history = [...cur.history, cur.config].slice(-MAX_HISTORY);
      set({
        config: next, history, future,
        canUndo: true, canRedo: future.length > 0,
        ...derive(next), plan: null, playing: false,
      });
    },

    resetAll: () => {
      const config = emptyConfig();
      set({
        config, target: [],
        built: null, buildReveal: 0,
        transform: null, transformStep: 0, transformT: 0, transformPlaying: false,
        modulePoses: new Map<string, string>(),
        history: [], future: [], canUndo: false, canRedo: false,
        plan: null, planning: false, playing: false,
        playback: { index: 0, t: 0, done: false },
        log: [],
        ...derive(config),
      });
    },

    options: { ...DEFAULT_PLAN_OPTIONS },
    setOptions: (patch) => set({ options: { ...get().options, ...patch }, plan: null, playing: false }),

    plan: null,
    planning: false,

    runPlan: () => {
      const { config, target, options } = get();
      if (!target.length) { get().pushLog('no target shape set — pick or generate one first'); return; }
      if (!isConnected(config)) { get().pushLog('current structure is in more than one piece — join it before planning'); return; }
      set({ planning: true });
      // Synchronous, but yielded to the next frame so the UI can paint the
      // "planning…" state before a long search blocks the thread.
      requestAnimationFrame(() => {
        const result = planReconfiguration(config, target, options);
        set({
          plan: result,
          planning: false,
          playback: { index: 0, t: 0, done: result.moves.length === 0 },
          playing: false,
        });
        const head = result.complete
          ? `planned ${result.moves.length} moves in ${result.ms.toFixed(0)}ms`
          : `partial plan: ${result.moves.length} moves, ${result.remaining} target cell(s) unfilled`;
        set({ log: [...get().log, head, ...result.log].slice(-200) });
      });
    },

    clearPlan: () => set({ plan: null, playing: false, playback: { index: 0, t: 0, done: false } }),

    playback: { index: 0, t: 0, done: false },
    playing: false,
    playbackOpts: { ...DEFAULT_PLAYBACK },
    setPlaybackOpts: (patch) => set({ playbackOpts: { ...get().playbackOpts, ...patch } }),

    play: () => {
      const { plan } = get();
      if (!plan || !plan.moves.length) return;
      const pb = get().playback;
      set({ playing: true, playback: pb.done ? { index: 0, t: 0, done: false } : pb });
    },
    pause: () => set({ playing: false }),
    rewind: () => set({ playing: false, playback: { index: 0, t: 0, done: false } }),

    tick: (dt) => {
      // mod2 transformation playback: one grab-and-release step at a time, with
      // the module in flight animated across the step rather than snapping.
      const tr = get().transform;
      if (get().transformPlaying && tr && tr.moves.length) {
        const perStep = 0.9 / Math.max(0.1, get().transformSpeed);
        let step = get().transformStep;
        let t = get().transformT + dt / perStep;
        while (t >= 1 && step < tr.moves.length) { t -= 1; step++; }
        if (step >= tr.moves.length) {
          set({ transformStep: tr.moves.length, transformT: 0, transformPlaying: false });
        } else {
          set({ transformStep: step, transformT: t });
        }
      }

      const { playing, plan, playback, playbackOpts } = get();
      if (!playing || !plan) return;
      const next = advance(playback, dt, plan.moves.length, playbackOpts);
      set({ playback: next, playing: !next.done || playbackOpts.loop });
    },

    seek: (index) => {
      const { plan } = get();
      if (!plan) return;
      const i = Math.max(0, Math.min(plan.moves.length - 1, index));
      set({ playing: false, playback: { index: i, t: 0, done: false } });
    },

    stepOnce: () => {
      const { plan, playback } = get();
      if (!plan || !plan.moves.length) return;
      const next = Math.min(plan.moves.length - 1, playback.index + (playback.t >= 1 ? 1 : 0));
      set({ playing: false, playback: { index: next, t: 1, done: next >= plan.moves.length - 1 } });
    },

    commitPlan: () => {
      const { plan, config } = get();
      if (!plan) return;
      const final = configAtStep(config, plan.moves, plan.moves.length);
      commitConfig(final);
      set({
        log: [...get().log, `committed ${plan.moves.length} moves as the new current structure`].slice(-200),
      });
    },

    mirror: false,
    setMirror: (mirror) => set({ mirror }),

    log: [],
    pushLog: (line) => set({ log: [...get().log, line].slice(-200) }),
    clearLog: () => set({ log: [] }),
  };
});

/** Legal moves for one cell under the current model — used by the click-to-move tool. */
export function movesForCell(cell: Cell, model?: MoveModel): Move[] {
  const st = useMsrrStore.getState();
  return movesForModule(st.config, cell, model ?? st.options.model);
}

export type { Strategy, MoveModel };
