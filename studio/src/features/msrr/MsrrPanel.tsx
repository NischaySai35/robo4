/**
 * MsrrPanel — the control surface for the MSRR Experiments page.
 *
 * TABS
 *   BUILD     — shape library, cube budget, the fit from diagram to real modules
 *   TEXT      — text to shape: offline rule parser, Ollama, or Anthropic
 *   DRAW      — line/stroke input on a 2D pad, voxelised into a chain
 *   TRANSFORM — plan and play the robot walking itself into the target shape
 *   BRIDGE    — mirror into the shared 3D scene, materialize into the document
 *
 * The order is the workflow: get a shape, build it into modules, set a target,
 * transform, then take it out of the sandbox.
 *
 * TWO RULES ABOUT THE SURFACE ITSELF
 *
 * 1. ONE ACTION IS ALWAYS IN REACH. Whatever you are looking at, the next real
 *    thing to do is a single big button pinned under the tabs (`ActionBar`) —
 *    Build, then Set target, then Transform, then Play. It is a flex sibling of
 *    the scrolling body, so it never scrolls away and never needs position:
 *    sticky. Actions used to be buried at the bottom of whichever section owned
 *    them, which meant scrolling to find the one thing you came here to press.
 *
 * 2. EXPLANATIONS ARE OPT-IN. This page has a lot to explain — it models real
 *    hardware with real constraints — but explaining it all at once, always,
 *    turned the panel into an essay with controls hidden in it. Every
 *    explanation now lives behind the small `ⓘ` on its section header, closed by
 *    default. Nothing was deleted; it is one click away instead of unavoidable.
 *    If you are adding a paragraph here, it goes in an `info` prop, not the body.
 *
 * There is ONE kind of module: MODULINK (robotics/msrr/modulink.ts). The page
 * used to offer a second "one module = one cube" abstraction and switch between
 * them; that choice is gone and the cube reading with it. The cubes on screen
 * are a shape DIAGRAM, and Build is what turns the diagram into modules.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import './MsrrPanel.css';
import { useMsrrStore, DEFAULT_CELL_SIZE } from '@/state/msrrStore';
import { ComposeTab } from './ComposeTab';
import { useMsrrDrawStore } from './drawStore';
import {
  type Cell, cellsOf, isConnected, occupiedNeighbors, groundCenter, key,
} from '@/robotics/msrr/lattice';
import { SHAPES, buildShape, type ShapeId } from '@/robotics/msrr/shapes';
import { shapeQuality, type ShapeQuality } from '@/robotics/msrr/shapeQuality';
import { stabilitySummary } from '@/robotics/msrr/stability';
import { requestShape, availableBackends, type AiBackend } from '@/robotics/msrr/aiShape';
import { buildFromStrokes, type Point3 } from '@/robotics/msrr/strokeToShape';
import { getModuleTheme, moduleCountEstimate } from '@/robotics/msrr/moduleThemes';
import { type ReachSummary, reachSummary } from '@/robotics/msrr/chainMoves';
import { describeTransformMove, mobilityReport } from '@/robotics/msrr/transform';
import { startMirror, stopMirror, materializeCurrent } from './bridgeActions';
import { decodeShape, downloadShape, pickShapeFile } from './shapeFile';

type Tab = 'build' | 'text' | 'draw' | 'compose' | 'transform' | 'bridge';

const TABS: { id: Tab; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'text', label: 'Text / AI' },
  { id: 'draw', label: 'Draw' },
  { id: 'compose', label: 'By hand' },
  { id: 'transform', label: 'Transform' },
  { id: 'bridge', label: 'Bridge' },
];

export default function MsrrPanel() {
  const tab = useMsrrStore((s) => s.tab);
  const setTab = useMsrrStore((s) => s.setTab);

  return (
    <div className="msrr-panel">
      <div className="msrr-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`msrr-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ActionBar />
      <StructureBar />

      <div className="msrr-body">
        {tab === 'build' && <BuildTab />}
        {tab === 'text' && <TextTab />}
        {tab === 'draw' && <DrawTab />}
        {tab === 'compose' && <ComposeTab />}
        {tab === 'transform' && <TransformTab />}
        {tab === 'bridge' && <BridgeTab />}
      </div>

      <LogStrip />
    </div>
  );
}

// ── the one action that is always in reach ───────────────────────────────────

/**
 * The next real thing to do, as one big button that never scrolls away.
 *
 * WHY THIS EXISTS. The page has a genuine order to it — shape, build, target,
 * transform, play — but every action used to live at the bottom of whichever
 * section owned it, on whichever tab owned that section. Building meant
 * scrolling past the theme picker, the pose library and three paragraphs;
 * transforming meant knowing it was on a differently-named tab. The work was
 * findable, not reachable.
 *
 * So the state machine below reads the store and answers one question: given
 * where you actually are, what is the single next thing? It is deliberately
 * ONE button. Offering four equally-weighted choices is what a section does;
 * the point of this bar is that it has already decided.
 *
 * It also NAVIGATES, not just executes. "Set target" cannot be done by a single
 * store call — you have to pick a shape — so instead of greying out and leaving
 * you to hunt, it moves you to the tab holding that control. A step you cannot
 * do yet still tells you where it lives.
 */
interface NextAction {
  label: string;
  hint: string;
  run: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** small buttons beside the primary — the escape hatches for this state */
  side?: { label: string; run: () => void; danger?: boolean }[];
}

function ActionBar() {
  // Subscribed FIELD BY FIELD, deliberately. The bare useMsrrStore() hook
  // subscribes to the whole store, and `tick` writes transformT every animation
  // frame — so a whole-store subscription would re-render this bar sixty times a
  // second for the entire length of a playback. None of these fields change at
  // frame rate; transformStep only moves when a step completes.
  const count = useMsrrStore((st) => st.config.occ.size);
  const built = useMsrrStore((st) => st.built);
  const building = useMsrrStore((st) => st.building);
  const targetLen = useMsrrStore((st) => st.target.length);
  const tr = useMsrrStore((st) => st.transform);
  const transforming = useMsrrStore((st) => st.transforming);
  const transformStep = useMsrrStore((st) => st.transformStep);
  const transformPlaying = useMsrrStore((st) => st.transformPlaying);

  // Actions are stable references on the store, so reaching for them at click
  // time costs nothing and adds no subscription.
  const act = useMsrrStore.getState;

  const next = ((): NextAction => {
    // Nothing drawn yet. The button becomes a shortcut to the fastest way to
    // get a shape rather than a dead grey rectangle.
    if (!count) {
      return {
        label: 'Pick a shape',
        hint: 'shape library, or draw one',
        run: () => act().setTab('build'),
      };
    }

    if (building) return { label: 'Building…', hint: 'fitting modules to the cubes', run: () => {}, busy: true };

    // Cubes exist but no robot. This is the big one.
    if (!built) {
      return {
        label: `Build ${count} cubes`,
        hint: 'fit real modules to the shape',
        run: () => { act().setTab('build'); act().build(); },
        side: [{ label: 'Clear', run: () => act().clearConfig(), danger: true }],
      };
    }

    if (!targetLen) {
      return {
        label: 'Set a target',
        hint: 'the shape to become',
        run: () => act().setTab('build'),
        side: [
          { label: 'Rebuild', run: () => act().build() },
          { label: 'Clear build', run: () => act().clearBuild(), danger: true },
        ],
      };
    }

    if (transforming) {
      return { label: 'Planning route…', hint: 'searching legal module moves', run: () => {}, busy: true };
    }

    if (!tr) {
      return {
        label: 'Transform',
        hint: `walk into the ${targetLen}-cube target`,
        run: () => { act().setTab('transform'); act().planTransformation(); },
        side: [{ label: 'Clear target', run: () => act().clearTarget(), danger: true }],
      };
    }

    if (!tr.moves.length) {
      return {
        label: 'Transform again',
        hint: 'no legal moves from here',
        run: () => { act().setTab('transform'); act().planTransformation(); },
        side: [{ label: 'Clear', run: () => act().clearTransformation(), danger: true }],
      };
    }

    const done = transformStep >= tr.moves.length;
    return {
      label: transformPlaying ? 'Pause' : done ? 'Replay' : `Play ${tr.moves.length} steps`,
      hint: transformPlaying ? `step ${transformStep} of ${tr.moves.length}` : 'watch it walk',
      run: () => {
        act().setTab('transform');
        if (act().transformPlaying) act().pauseTransform(); else act().playTransform();
      },
      side: [
        { label: 'Rewind', run: () => act().rewindTransform() },
        { label: 'Clear', run: () => act().clearTransformation(), danger: true },
      ],
    };
  })();

  return (
    <div className="msrr-actionbar">
      <div className="msrr-action-main">
        <button
          className={`msrr-action-primary ${next.busy ? 'busy' : ''}`}
          disabled={next.disabled || next.busy}
          onClick={next.run}
        >
          {next.label}
        </button>
        <span className="msrr-action-hint">{next.hint}</span>
      </div>
      {next.side && next.side.length > 0 && (
        <div className="msrr-action-side">
          {next.side.map((b) => (
            <button key={b.label} className={`msrr-btn small ${b.danger ? 'danger' : ''}`} onClick={b.run}>
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── always-visible structure readout ──────────────────────────────────────────

/**
 * The diagnostics that decide whether anything else on this page will work:
 * cube count, one-piece-ness, branch junctions, and whether it stands up.
 * Above the body because every tab depends on them.
 *
 * Every chip carries its explanation as a tooltip rather than a paragraph — a
 * number you can hover beats a sentence you have to scroll past.
 */
function StructureBar() {
  const config = useMsrrStore((s) => s.config);
  const stability = useMsrrStore((s) => s.stability);
  const target = useMsrrStore((s) => s.target);
  const built = useMsrrStore((s) => s.built);

  const { count, connected, junctions } = useMemo(() => {
    const cells = cellsOf(config);
    let j = 0;
    for (const c of cells) if (occupiedNeighbors(config, c).length >= 3) j++;
    return { count: cells.length, connected: isConnected(config), junctions: j };
  }, [config]);

  return (
    <div className="msrr-statbar">
      <span className="msrr-chip"><b>{count}</b> cubes</span>
      <span className={`msrr-chip ${connected ? 'ok' : 'bad'}`}>
        {connected ? 'one piece' : 'disconnected'}
      </span>
      <span className={`msrr-chip ${junctions ? 'warn' : 'ok'}`} title="Cells with 3+ connections. Roadmap section 1: all self-collision comes from branching.">
        {junctions} junction{junctions === 1 ? '' : 's'}
      </span>
      <span className={`msrr-chip ${stability.ok ? 'ok' : 'bad'}`} title={stabilitySummary(stability)}>
        {stability.ok ? 'stands' : !stability.grounded ? 'floating' : 'tips over'}
      </span>
      {target.length > 0 && (
        <span className={`msrr-chip ${target.length === count ? 'ok' : 'warn'}`}>
          target {target.length}
        </span>
      )}
      {built ? (
        <span className="msrr-chip ok" title="Real modules fitted to the diagram by Build.">
          <b>{built.modules.length}</b> modules
        </span>
      ) : (
        <span className="msrr-chip" title={getModuleTheme('mod2').cellsPerModuleSummary}>
          {moduleCountEstimate('mod2', count).text}
        </span>
      )}
    </div>
  );
}

// ── BUILD ─────────────────────────────────────────────────────────────────────

function BuildTab() {
  const config = useMsrrStore((s) => s.config);
  const setConfigCells = useMsrrStore((s) => s.setConfigCells);
  const setTarget = useMsrrStore((s) => s.setTarget);
  const clearConfig = useMsrrStore((s) => s.clearConfig);
  const clearTarget = useMsrrStore((s) => s.clearTarget);
  const swapWithTarget = useMsrrStore((s) => s.swapWithTarget);
  const target = useMsrrStore((s) => s.target);
  const undo = useMsrrStore((s) => s.undo);
  const redo = useMsrrStore((s) => s.redo);
  const canUndo = useMsrrStore((s) => s.canUndo);
  const canRedo = useMsrrStore((s) => s.canRedo);
  const resetAll = useMsrrStore((s) => s.resetAll);
  const pushLog = useMsrrStore((s) => s.pushLog);
  const built = useMsrrStore((s) => s.built);

  const count = config.occ.size;
  const [budget, setBudget] = useState(count || 12);
  const [scale, setScale] = useState(1);

  useEffect(() => { if (count) setBudget(count); }, [count]);

  const apply = (id: ShapeId) => setConfigCells(buildShape(id, Math.max(1, budget), scale));
  const applyTarget = (id: ShapeId) => setTarget(buildShape(id, Math.max(1, budget), scale));

  // Saving and loading the DIAGRAM, not the build — see shapeFile.ts for why the
  // modules are deliberately left out.
  const exportShape = () => {
    const cells = cellsOf(config);
    downloadShape(cells, target);
    pushLog(`exported ${cells.length} cubes${target.length ? ` and a ${target.length}-cube target` : ''} as JSON`);
  };

  const importShape = async () => {
    const picked = await pickShapeFile();
    if (!picked) return;
    const r = decodeShape(picked.text);
    if (r.error) { pushLog(`could not load ${picked.name}: ${r.error}`); return; }
    setConfigCells(r.cells);
    if (r.target.length) setTarget(r.target); else clearTarget();
    for (const w of r.warnings) pushLog(`${picked.name}: ${w}`);
    pushLog(`loaded ${r.cells.length} cubes from ${picked.name}`
      + `${r.target.length ? ` (plus a ${r.target.length}-cube target)` : ''} — press Build to fit modules`);
  };

  const resetSandbox = () => {
    resetAll();
    useMsrrDrawStore.getState().clearStrokes();
    if (useMsrrStore.getState().mirror) { stopMirror(); useMsrrStore.getState().setMirror(false); }
    pushLog('sandbox reset: structure, target, plan, draw pad and log all cleared');
  };

  // A target only means something once real modules exist to walk toward it —
  // the transform moves MODULES, not the diagram's cubes.
  const targetLocked = !built;

  return (
    <>
      <Step index={1} title="Shape" info={
        <>
          <p className="msrr-note">
            A reference diagram of what the robot should look like — not modules yet,
            just cubes. Pick one from the library, draw it (Draw tab), describe it
            (Text/AI tab), or edit by hand: click the ground or a cube face to add one,
            drag to extrude a run, right-click a cube to delete it (a cube holding the
            shape together refuses to delete).
          </p>
          <p className="msrr-note">
            ⚠ marks a shape with a cube walled in on all six sides — invisible, and
            spends a module on nothing. Everything else a module can reach directly now
            (a hub uses up to six connectors: two chain ends plus all four sides).
          </p>
        </>
      }>
        <Row label={`Cubes: ${budget}`}>
          <input type="range" min={1} max={120} value={budget}
                 onChange={(e) => setBudget(+e.target.value)} />
        </Row>
        <Row label={`Shape scale: ${scale.toFixed(2)}x`}>
          <input type="range" min={0.5} max={3} step={0.05} value={scale}
                 onChange={(e) => setScale(+e.target.value)} />
        </Row>
        <div className="msrr-shape-grid">
          {SHAPES.map((s) => {
            const q = shapeQualityAt(s.id, budget, scale);
            return (
              <button key={s.id}
                      className={`msrr-btn ${q.buildable ? '' : 'warn-outline'}`}
                      title={q.buildable ? q.summary : `⚠ ${q.summary}`}
                      onClick={() => apply(s.id)}>
                {s.label}{q.buildable ? '' : ' ⚠'}
              </button>
            );
          })}
        </div>
        <ShapeQualityNote />
        <div className="msrr-row-btns">
          <button className="msrr-btn" disabled={!canUndo} onClick={undo} title="Undo the last manual edit">
            ↶ Undo
          </button>
          <button className="msrr-btn" disabled={!canRedo} onClick={redo} title="Redo">
            ↷ Redo
          </button>
          <button className="msrr-btn" disabled={!count} onClick={exportShape}
                  title="Save these cubes as a .json file, so the same shape can be loaded back without placing it again">
            ⭳ Export
          </button>
          <button className="msrr-btn" onClick={importShape}
                  title="Load a shape from a .json file. Replaces the cubes on screen; the build is cleared so it can be re-fitted.">
            ⭱ Import
          </button>
          <button className="msrr-btn danger" disabled={!count} onClick={clearConfig}>
            Clear cubes
          </button>
        </div>
      </Step>

      <Step index={2} title="Build" locked={!count}
            lockedReason="Place at least one cube in step 1 first.">
        <BuildSection />
      </Step>

      <Step index={3} title="Target" locked={targetLocked}
            lockedReason="Build the robot in step 2 first — a target only means something once real modules exist to walk toward it."
            info={
              <p className="msrr-note">
                Stores a shape as what the robot should transform INTO. It does not change
                what is on screen now — the Transform tab runs the walk.
              </p>
            }>
        <div className="msrr-shape-grid">
          {SHAPES.map((s) => (
            <button key={s.id} className="msrr-btn ghost" disabled={targetLocked}
                    onClick={() => applyTarget(s.id)}>{s.label}</button>
          ))}
        </div>
        <div className="msrr-row-btns">
          <button className="msrr-btn" disabled={targetLocked} onClick={() => setTarget(cellsOf(config))}>
            Use current shape as target
          </button>
          <button className="msrr-btn" disabled={targetLocked || !target.length} onClick={swapWithTarget}>
            Swap shape ⇄ target
          </button>
          <button className="msrr-btn ghost" onClick={clearTarget} disabled={!target.length}>
            Clear target
          </button>
        </div>

      </Step>

      <ModulinkSection />

      <Section title="Reset" info={
        <p className="msrr-note">
          Wipes the current structure, target, plan, draw pad and log back to an empty
          sandbox. Stops the live mirror first if it is running. Cannot be undone.
        </p>
      }>
        <div className="msrr-row-btns">
          <button className="msrr-btn danger" onClick={resetSandbox}>Reset entire sandbox</button>
        </div>
      </Section>
    </>
  );
}

/**
 * Buildability of a library shape at the budget/scale currently selected —
 * memoised because the shape grid asks for all eighteen on every render, and
 * the answer only changes when those two sliders do. buildShape is cheap
 * (no fitting), so this is a small cache rather than a real optimisation.
 */
const shapeQualityCache = new Map<string, ShapeQuality>();
function shapeQualityAt(id: ShapeId, budget: number, scale: number): ShapeQuality {
  const k = `${id}|${budget}|${scale}`;
  const hit = shapeQualityCache.get(k);
  if (hit) return hit;
  const q = shapeQuality(buildShape(id, Math.max(1, budget), scale));
  shapeQualityCache.set(k, q);
  return q;
}

/**
 * What is wrong with the shape currently on screen, in the terms that decide
 * whether Build can make one connected robot out of it. Silent when the shape
 * is fine, so it only ever appears when it has something to say.
 */
function ShapeQualityNote() {
  const config = useMsrrStore((s) => s.config);
  const q = useMemo(() => shapeQuality(cellsOf(config)), [config]);
  if (!config.occ.size || (q.buildable && q.issues.length === 0)) return null;

  return (
    <div className={`msrr-note ${q.buildable ? 'warn' : 'bad'}`}>
      <b>{q.buildable ? 'Shape warning.' : 'This shape cannot build as one robot.'}</b>{' '}
      {q.summary}
      <ul className="msrr-constraints">
        {q.issues.map((i, n) => <li key={n}>{i.detail}</li>)}
      </ul>
      {!q.buildable && (
        <>These are hardware limits, not planner limits: a module has two chain ends
        plus four side faces, and only two OPPOSITE side faces can weld at once.
        Build will still run and will report honestly what it could not attach.</>
      )}
    </div>
  );
}

/**
 * Top-of-tab progress readout: four fixed stops, each either done, next-up, or
 * not-yet-applicable. Purely informational — nothing here gates anything itself,
 * the Step wrapper below does that; this is just "where am I".
 */
/**
 * A numbered section that can lock itself with a plain-English reason instead
 * of just greying out a button somewhere inside it. Locking is advisory, not a
 * hard gate on the store — the goal is telling you WHY something isn't useful
 * yet, not preventing every possible click order.
 */
function Step({ index, title, info, locked, lockedReason, children }: {
  index: number; title: string; info?: React.ReactNode;
  locked?: boolean; lockedReason?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`msrr-section msrr-step ${locked ? 'locked' : ''}`}>
      <h3 className="msrr-section-title">
        <span className="msrr-step-index">{index}</span>
        <span className="msrr-title-text">{title}</span>
        {info && !locked && (
          <button
            className={`msrr-info ${open ? 'open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title={open ? 'Hide the explanation' : 'What is this?'}
          >
            i
          </button>
        )}
      </h3>
      {info && open && !locked && <div className="msrr-info-body">{info}</div>}
      {locked ? (
        <p className="msrr-note warn">🔒 {lockedReason}</p>
      ) : children}
    </section>
  );
}

// ── TEXT / AI ─────────────────────────────────────────────────────────────────

function TextTab() {
  const config = useMsrrStore((s) => s.config);
  const setTarget = useMsrrStore((s) => s.setTarget);
  const setConfigCells = useMsrrStore((s) => s.setConfigCells);
  const pushLog = useMsrrStore((s) => s.pushLog);

  const [text, setText] = useState('become a car');
  const [backend, setBackend] = useState<AiBackend>('auto');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ note: string; raw: string; source: string; cells: Cell[] } | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [budgetOverride, setBudgetOverride] = useState<number | null>(null);

  const backends = useMemo(() => availableBackends(), []);
  const count = budgetOverride ?? Math.max(1, config.occ.size);

  const generate = async (as: 'target' | 'current') => {
    setBusy(true);
    try {
      const r = await requestShape(text, count, backend);
      setResult(r);
      if (!r.cells.length) { pushLog(r.note); return; }
      if (as === 'target') setTarget(r.cells);
      else setConfigCells(r.cells);
      pushLog(`${as === 'target' ? 'target' : 'structure'} from ${r.source}: ${r.note}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section title="Describe the shape" info={
        <>
          <p className="msrr-note">
            The model is asked for one thing only: which lattice cells the shape occupies.
            It is never asked how to get there — that is the planner's job, because a plan
            has to be certified connected and collision-free and a language model cannot
            certify anything. Whatever comes back is validated: malformed cells dropped,
            duplicates removed, disconnected pieces discarded down to the largest
            component, then resized to your exact cube count and grounded. If the repairs
            kick in, the result note says so.
          </p>
          <p className="msrr-note">
            The "Rules only" backend is the honest A/B baseline — keyword matching with no
            model at all. Worth checking how often the LLM actually beats it.
          </p>
        </>
      }>
        <textarea
          className="msrr-textarea"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="become a car / make a tall tower / a small chair with 18 modules"
        />
        <Row label="Backend">
          <select className="msrr-select" value={backend} onChange={(e) => setBackend(e.target.value as AiBackend)}>
            <option value="auto">Auto (local first, then cloud, then rules)</option>
            <option value="ollama" disabled={!backends.ollama}>
              Ollama (local){backends.ollama ? '' : ' — not reachable'}
            </option>
            <option value="anthropic" disabled={!backends.anthropic}>
              Anthropic API{backends.anthropic ? '' : ' — no key configured'}
            </option>
            <option value="rules">Rules only (offline baseline)</option>
          </select>
        </Row>
        <Row label={`Cubes: ${count}`}>
          <input type="range" min={4} max={120} value={count}
                 onChange={(e) => setBudgetOverride(+e.target.value)} />
        </Row>
        <div className="msrr-row-btns">
          <button className="msrr-btn primary" disabled={busy || !text.trim()} onClick={() => generate('target')}>
            {busy ? 'Thinking…' : 'Generate → target'}
          </button>
          <button className="msrr-btn" disabled={busy || !text.trim()} onClick={() => generate('current')}>
            Generate → current
          </button>
        </div>
      </Section>

      {result && (
        <Section title={`Result (${result.source})`}>
          <p className="msrr-note">{result.note}</p>
          {result.raw && (
            <>
              <button className="msrr-btn ghost small" onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? 'Hide' : 'Show'} raw model output
              </button>
              {showRaw && <pre className="msrr-pre">{result.raw}</pre>}
            </>
          )}
        </Section>
      )}

    </>
  );
}

// ── DRAW ──────────────────────────────────────────────────────────────────────

const PAD = 21; // pad is PAD x PAD lattice cells

/**
 * A 2D drawing pad. Clicking places polyline vertices; the polyline is voxelised
 * with a supercover walk so the resulting chain is face-connected (a plain
 * Bresenham line steps diagonally, and diagonal neighbours do not mate).
 */
function DrawTab() {
  const strokes = useMsrrDrawStore((s) => s.strokes);
  const current = useMsrrDrawStore((s) => s.current);
  const thickness = useMsrrDrawStore((s) => s.thickness);
  const layer = useMsrrDrawStore((s) => s.layer);
  const draw = useMsrrDrawStore;

  const setConfigCells = useMsrrStore((s) => s.setConfigCells);
  const setTarget = useMsrrStore((s) => s.setTarget);
  const pushLog = useMsrrStore((s) => s.pushLog);

  const [plane, setPlane] = useState<'xz' | 'xy'>('xy');
  const [autoClear, setAutoClear] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);

  /** Pad pixel -> lattice point on the chosen plane at the chosen layer. */
  const toCell = (ev: React.MouseEvent): Point3 => {
    const svg = svgRef.current as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const gx = Math.round(((ev.clientX - r.left) / r.width) * PAD - PAD / 2);
    const gy = Math.round(((ev.clientY - r.top) / r.height) * PAD - PAD / 2);
    // SVG y grows downward; the lattice's does not.
    return plane === 'xy' ? [gx, -gy, layer] : [gx, layer, gy];
  };

  const onClick = (ev: React.MouseEvent) => {
    const p = toCell(ev);
    if (!current.length) draw.getState().beginStroke(p);
    else draw.getState().extendStroke(p);
  };

  const build = () => buildFromStrokes(
    current.length >= 2 ? [...strokes, current] : strokes,
    { thickness, ground: true },
  );

  const preview = useMemo(build, [strokes, current, thickness]);

  const commit = (as: 'current' | 'target') => {
    const r = build();
    if (!r.cells.length) { pushLog('nothing drawn yet'); return; }
    const cells = groundCenter(r.cells);
    if (as === 'current') setConfigCells(cells);
    else setTarget(cells);
    pushLog(`drawn structure → ${as}: ${r.note}`);
    if (autoClear) draw.getState().clearStrokes();
  };

  // Pad coordinates for rendering: lattice point -> svg unit square.
  const px = (p: Point3) => {
    const a = plane === 'xy' ? p[0] : p[0];
    const b = plane === 'xy' ? -p[1] : p[2];
    return [(a + PAD / 2) / PAD * 100, (b + PAD / 2) / PAD * 100];
  };

  const allStrokes = current.length ? [...strokes, current] : strokes;

  return (
    <>
      <Section title="Stroke pad" info={
        <p className="msrr-note">
          Click to place points; each click extends the current line. Finish a stroke to
          start a separate one. A single unbranched stroke can never self-collide at any
          length — it is the safest structure source in the app.
        </p>
      }>
        <div className="msrr-row-btns">
          <button className={`msrr-btn small ${plane === 'xy' ? 'primary' : ''}`} onClick={() => setPlane('xy')}>
            Front (X/Y)
          </button>
          <button className={`msrr-btn small ${plane === 'xz' ? 'primary' : ''}`} onClick={() => setPlane('xz')}>
            Top (X/Z)
          </button>
        </div>

        <svg ref={svgRef} className="msrr-pad" viewBox="0 0 100 100" onClick={onClick}>
          {Array.from({ length: PAD + 1 }, (_, i) => (
            <g key={i}>
              <line x1={(i / PAD) * 100} y1="0" x2={(i / PAD) * 100} y2="100" className="msrr-pad-grid" />
              <line x1="0" y1={(i / PAD) * 100} x2="100" y2={(i / PAD) * 100} className="msrr-pad-grid" />
            </g>
          ))}
          {/* voxelised preview — what you will actually get, not what you drew */}
          {preview.cells.map((c) => {
            const [x, y] = px(plane === 'xy' ? [c[0], c[1], 0] : [c[0], 0, c[2]]);
            return <rect key={key(c)} x={x - 50 / PAD} y={y - 50 / PAD}
                         width={100 / PAD} height={100 / PAD} className="msrr-pad-cell" />;
          })}
          {allStrokes.map((s, si) => (
            <polyline key={si} className="msrr-pad-line"
                      points={s.map((p) => px(p).join(',')).join(' ')} />
          ))}
          {allStrokes.flatMap((s, si) => s.map((p, pi) => {
            const [x, y] = px(p);
            return <circle key={`${si}-${pi}`} cx={x} cy={y} r="1.2" className="msrr-pad-dot" />;
          }))}
        </svg>

        <Row label={`Thickness: ${thickness} cell${thickness === 1 ? '' : 's'}`}>
          <input type="range" min={0} max={3} value={thickness}
                 onChange={(e) => draw.getState().setThickness(+e.target.value)} />
        </Row>
        <Row label={`Depth layer: ${layer}`}>
          <input type="range" min={0} max={10} value={layer}
                 onChange={(e) => draw.getState().setLayer(+e.target.value)} />
        </Row>

        <p className="msrr-note">{preview.note}</p>
        <div className="msrr-row-btns">
          <button className="msrr-btn" onClick={() => draw.getState().undoPoint()} disabled={!current.length}>
            Delete last point
          </button>
          <button className="msrr-btn" onClick={() => draw.getState().endStroke()} disabled={current.length < 2}>
            Finish stroke
          </button>
          <button className="msrr-btn ghost" onClick={() => draw.getState().undoStroke()} disabled={!strokes.length}>
            Undo stroke
          </button>
          <button className="msrr-btn danger" onClick={() => draw.getState().clearStrokes()}
                  disabled={!strokes.length && !current.length}>
            Clear pad
          </button>
        </div>
        <Toggle label="Clear pad automatically after use"
                hint="Starts a fresh pad every time you commit to current/target, instead of leaving the drawn strokes sitting there."
                value={autoClear} onChange={setAutoClear} />
        <div className="msrr-row-btns">
          <button className="msrr-btn primary" disabled={!preview.cells.length} onClick={() => commit('target')}>
            Use as target
          </button>
          <button className="msrr-btn" disabled={!preview.cells.length} onClick={() => commit('current')}>
            Use as current
          </button>
        </div>
      </Section>
    </>
  );
}

// ── PLAN ──────────────────────────────────────────────────────────────────────

/**
 * The Transform tab. The robot walking itself into the target shape IS the
 * reconfiguration story now, so the tab is just that one section.
 *
 * This used to be "Plan", and it hosted a second planner that slid rigid cubes
 * around the lattice — correct for the old one-module-is-one-cube reading, and
 * meaningless once a module is a multi-cube bendable chain. That planner's code
 * (moves.ts, planner.ts, executor.ts) is still on disk and still tested; nothing
 * in the UI reaches it.
 */
function TransformTab() {
  return <TransformSection />;
}

/**
 * Live readout while the beam search is running: a progress bar toward target
 * coverage, which module it is examining right now, and the running counters
 * (round / states expanded / time left in its budget). Exists because the
 * search genuinely takes seconds of real CPU work — real IK solves, not a
 * fake delay — and a spinner with no numbers behind it reads as "frozen", not
 * "thinking". Every field here comes straight from a SearchProgress snapshot
 * fired by the search itself as it runs, not simulated for effect.
 */
function SearchProgressReadout({ progress }: { progress: import('@/robotics/msrr/transform').SearchProgress | null }) {
  if (!progress) {
    return (
      <p className="msrr-note dim">Fitting the target shape and measuring mobility…</p>
    );
  }
  const pct = progress.targetCubes > 0 ? Math.round((progress.coverage / progress.targetCubes) * 100) : 0;
  const timePct = Math.min(100, Math.round((progress.elapsedMs / progress.budgetMs) * 100));

  return (
    <div className="msrr-progress">
      <div className="msrr-progress-bar" title={`${progress.coverage} of ${progress.targetCubes} target cubes covered by the best route found so far`}>
        <div className="msrr-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="msrr-note">
        Best route so far covers <b>{progress.coverage}</b> of <b>{progress.targetCubes}</b> target
        cubes ({pct}%).{' '}
        {progress.moduleId
          ? <>Examining <b>{progress.moduleId}</b> ({progress.moduleIndex + 1} of {progress.moduleCount} modules in this state)</>
          : <>Ranking round {progress.round}'s candidate states</>}
        .
      </p>
      <p className="msrr-note dim">
        round {progress.round} · {progress.expansions} state(s) expanded · beam holds {progress.beamSize} ·
        {' '}{(progress.elapsedMs / 1000).toFixed(1)}s of {(progress.budgetMs / 1000).toFixed(0)}s budget ({timePct}%)
      </p>
    </div>
  );
}

/**
 * The built robot walks itself into the target shape, hand over hand: a module
 * keeps one end welded, folds, swings its free end onto another module's
 * connector, welds there, and only then lets the old end go.
 */
function TransformSection() {
  const built = useMsrrStore((s) => s.built);
  const target = useMsrrStore((s) => s.target);
  const tr = useMsrrStore((s) => s.transform);
  const busy = useMsrrStore((s) => s.transforming);
  const step = useMsrrStore((s) => s.transformStep);
  const plan = useMsrrStore((s) => s.planTransformation);
  const clear = useMsrrStore((s) => s.clearTransformation);
  const setStep = useMsrrStore((s) => s.setTransformStep);
  const playing = useMsrrStore((s) => s.transformPlaying);
  const speed = useMsrrStore((s) => s.transformSpeed);
  const play = useMsrrStore((s) => s.playTransform);
  const pause = useMsrrStore((s) => s.pauseTransform);
  const rewind = useMsrrStore((s) => s.rewindTransform);
  const setSpeed = useMsrrStore((s) => s.setTransformSpeed);
  const progress = useMsrrStore((s) => s.transformProgress);

  const mobility = useMemo(() => (built ? mobilityReport(built) : null), [built]);

  return (
    <Section title="Transform" info={
      <>
        <p className="msrr-note">
          The robot walks itself into the target shape. A module keeps one end welded,
          folds, swings its free end onto another module's connector, welds there, and
          only then lets the old end go — so it never comes apart and never teleports.
        </p>
        <p className="msrr-note">
          <b>Mobility.</b> A module can only relocate by landing its free end exactly on
          an existing connector, facing back at it, with its body clearing everything
          else. In a tightly packed robot there are very few such places — which is why
          a plan can come back short, or empty, without anything being broken.
        </p>
      </>
    }>
      {!built && <p className="msrr-note bad">Build the robot first (Build tab).</p>}
      {!target.length && <p className="msrr-note bad">No target shape stored. Set one from the shape library.</p>}

      {mobility && (
        <div className="msrr-result">
          <div className={`msrr-chip ${mobility.total ? 'ok' : 'bad'}`} title={mobility.summary}>
            {mobility.total} moves available
          </div>
          <div className={`msrr-chip ${mobility.frozen ? 'warn' : 'ok'}`}
               title="Modules holding two halves of the robot together. They cannot let go at all — releasing would split it.">
            {mobility.frozen} frozen
          </div>
        </div>
      )}

      <div className="msrr-row-btns">
        <button className="msrr-btn primary" disabled={busy || !built || !target.length} onClick={plan}>
          {busy ? 'Searching for a route…' : 'Plan transformation'}
        </button>
        {tr && <button className="msrr-btn ghost" onClick={clear}>Clear</button>}
      </div>
      {busy && <SearchProgressReadout progress={progress} />}

      {tr && (
        <>
          <div className="msrr-result">
            <div className={`msrr-chip ${tr.complete ? 'ok' : 'warn'}`}>
              {tr.complete ? 'reaches the shape' : 'partial'}
            </div>
            <div className="msrr-chip">{tr.moves.length} steps</div>
            <div className="msrr-chip">{tr.covered}/{tr.targetCubes} target cubes</div>
            {tr.added.length > 0 && (
              <div className="msrr-chip warn" title={tr.added.join(', ')}>
                +{tr.added.length} added
              </div>
            )}
            {tr.removed.length > 0 && (
              <div className="msrr-chip warn" title={tr.removed.join(', ')}>
                −{tr.removed.length} removed
              </div>
            )}
          </div>
          {(tr.added.length > 0 || tr.removed.length > 0) && (
            <p className="msrr-note dim"
               title={'The target needs a different module count than the robot has, so the plan '
                 + 'reconciled it directly - see the log for which modules. Added modules are placed, '
                 + 'not walked there: this is a hardware-inventory change, not a gait.'}>
              Module count reconciled to match the target.
            </p>
          )}

          {tr.moves.length > 0 ? (
            <>
              <div className="msrr-row-btns">
                <button className="msrr-btn primary" onClick={playing ? pause : play}>
                  {playing ? 'Pause' : step >= tr.moves.length ? 'Replay' : 'Play'}
                </button>
                <button className="msrr-btn" onClick={() => setStep(step - 1)} disabled={step <= 0}>
                  ◀ step
                </button>
                <button className="msrr-btn" onClick={() => setStep(step + 1)} disabled={step >= tr.moves.length}>
                  step ▶
                </button>
                <button className="msrr-btn ghost" onClick={rewind}>Rewind</button>
              </div>
              <Row label={`Speed: ${speed.toFixed(2)}x`}>
                <input type="range" min={0.1} max={3} step={0.1} value={speed}
                       onChange={(e) => setSpeed(+e.target.value)} />
              </Row>
              <Row label={`Step ${step} of ${tr.moves.length}`}>
                <input type="range" min={0} max={tr.moves.length} value={step}
                       onChange={(e) => setStep(+e.target.value)} />
              </Row>
              <div className="msrr-moves">
                {tr.moves.map((mv, i) => (
                  <div key={i}
                       className={`msrr-move ${i < step ? 'done' : ''} ${i === step - 1 ? 'active' : ''}`}
                       onClick={() => setStep(i + 1)}>
                    {describeTransformMove(mv)}
                  </div>
                ))}
              </div>
            </>
          ) : tr.added.length === 0 && tr.removed.length === 0 ? (
            <p className="msrr-note warn"
               title={'Nothing the modules can legally do gets them onto more of the target shape from '
                 + 'here - see the mobility figures above. This is a real answer about this pair of '
                 + 'shapes, not a planner that gave up.'}>
              No steps possible from here.
            </p>
          ) : (
            <p className="msrr-note">
              {tr.complete ? 'Shape complete - no walking needed.' : 'Some target cubes are still uncovered - see the log.'}
            </p>
          )}
        </>
      )}
    </Section>
  );
}

// ── BRIDGE ────────────────────────────────────────────────────────────────────

function BridgeTab() {
  const mirror = useMsrrStore((s) => s.mirror);
  const setMirror = useMsrrStore((s) => s.setMirror);
  const cellSize = useMsrrStore((s) => s.cellSize);
  const setCellSize = useMsrrStore((s) => s.setCellSize);
  const config = useMsrrStore((s) => s.config);
  const pushLog = useMsrrStore((s) => s.pushLog);
  const [busy, setBusy] = useState(false);

  const toggleMirror = async () => {
    setBusy(true);
    try {
      if (mirror) { stopMirror(); setMirror(false); pushLog('mirror stopped, mirrored modules removed'); }
      else {
        const n = startMirror();
        setMirror(true);
        pushLog(`mirroring ${n} real modules into the shared scene`);
      }
    } finally { setBusy(false); }
  };

  return (
    <>
      <Section title="Live mirror" info={
        <>
          <p className="msrr-note">
            Places one instance of the project's default module per occupied cell in the
            shared 3D scene. Switch to the Editor page to watch the real geometry.
          </p>
          <p className="msrr-note warn">
            Mirrored modules are placed rigidly at cell poses. Their internal joints are
            not solved and no connector mating or loop closure is run — this shows you the
            structure at real scale with real geometry, it does not certify that the
            connectors mate.
          </p>
        </>
      }>
        <Row label={`Cube size: ${cellSize.toFixed(3)} m`}>
          <input type="range" min={0.05} max={1} step={0.005} value={cellSize}
                 onChange={(e) => setCellSize(+e.target.value)} />
        </Row>
        <div className="msrr-row-btns">
          <button className={`msrr-btn ${mirror ? 'danger' : 'primary'}`} disabled={busy} onClick={toggleMirror}>
            {mirror ? 'Stop mirroring' : `Mirror ${config.occ.size} modules to scene`}
          </button>
          <button className="msrr-btn ghost" onClick={() => setCellSize(DEFAULT_CELL_SIZE)}>Reset scale</button>
        </div>
      </Section>

      <Section title="Materialize" info={
        <p className="msrr-note">
          A one-shot snapshot: adds the current structure to the project document as real,
          editable modules through the command bus — undoable like any other edit, and it
          survives leaving this page.
        </p>
      }>
        <div className="msrr-row-btns">
          <button className="msrr-btn" disabled={!config.occ.size} onClick={() => {
            const n = materializeCurrent();
            pushLog(`materialized ${n} modules into the project document`);
          }}>
            Materialize {config.occ.size} modules into the document
          </button>
        </div>
      </Section>


    </>
  );
}

// ── log ───────────────────────────────────────────────────────────────────────

function LogStrip() {
  const log = useMsrrStore((s) => s.log);
  const clearLog = useMsrrStore((s) => s.clearLog);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log]);

  return (
    <div className="msrr-log">
      <div className="msrr-log-head">
        <span>Log</span>
        <button className="msrr-btn ghost small" onClick={clearLog} disabled={!log.length}>Clear</button>
      </div>
      <div className="msrr-log-body" ref={ref}>
        {log.length === 0
          ? <div className="msrr-log-line dim">Planner output and tool notes appear here.</div>
          : log.map((l, i) => <div key={i} className="msrr-log-line">{l}</div>)}
      </div>
    </div>
  );
}

// ── BUILD: shape diagram -> real modules ──────────────────────────────────────

/**
 * The step that turns the cube diagram into an actual robot. This is the piece
 * that makes the cubes mean something: they are a shape, and Build works out
 * which modules go where to realise it.
 */
function BuildSection() {
  const config = useMsrrStore((s) => s.config);
  const built = useMsrrStore((s) => s.built);
  const building = useMsrrStore((s) => s.building);
  const reveal = useMsrrStore((s) => s.buildReveal);
  const build = useMsrrStore((s) => s.build);
  const clearBuild = useMsrrStore((s) => s.clearBuild);
  const setReveal = useMsrrStore((s) => s.setBuildReveal);

  const cubes = config.occ.size;

  return (
    <>
      <div className="msrr-row-btns">
        <button className="msrr-btn primary" disabled={building || !cubes} onClick={build}>
          {building ? 'Fitting modules…' : built ? 'Rebuild' : `Build ${cubes} cubes`}
        </button>
        {built && <button className="msrr-btn ghost" onClick={clearBuild}>Clear build</button>}
      </div>

      {built && (
        <>
          <div className="msrr-result">
            <div className="msrr-chip ok">{built.modules.length} modules</div>
            <div className="msrr-chip">{cubes} cubes</div>
            <div className={`msrr-chip ${built.uncovered.length ? 'warn' : 'ok'}`}>
              {built.uncovered.length ? `${built.uncovered.length} cubes uncovered` : 'shape fully covered'}
            </div>
            {built.junctionsTotal > 0 && (
              <div className={`msrr-chip ${built.junctionsAligned === built.junctionsTotal ? 'ok' : 'warn'}`}
                   title="A module's four side connectors all ride the midpoint of its big spine rod, so a branch point wants that midpoint ON it — then the other arms have somewhere to weld. This counts how many of the shape's junctions actually got one.">
              {built.junctionsAligned}/{built.junctionsTotal} junctions on a spine
              </div>
            )}
            {built.cornersTotal > 0 && (
              <div className={`msrr-chip ${built.cornersAligned === built.cornersTotal ? 'ok' : 'warn'}`}
                   title="Where the shape turns, a module's own bend joint should land on that exact cube, turning the same way. This counts how many of the shape's corners got one.">
                {built.cornersAligned}/{built.cornersTotal} corners on a bend
              </div>
            )}
            {built.runs > 1 && <div className="msrr-chip warn">{built.runs} separate chains</div>}
            {built.touchingChains > 0 && (
              <div className="msrr-chip warn"
                   title="A wide shape needs more parallel attachment points than one module's 4 directions can weld together. These chains are placed flush against the rest, collision-checked, but not electrically joined there.">
                {built.touchingChains} chain(s) touching, not locked
              </div>
            )}
            <div className={`msrr-chip ${built.spatiallyOnePiece ? 'ok' : 'bad'}`}
                 title="Every module's body is at least face-adjacent to another's — one physical object, whether or not every pair is formally welded.">
              {built.spatiallyOnePiece ? 'one physical piece' : 'physically separate pieces'}
            </div>
          </div>

          <Row label={`Assembled: ${reveal} of ${built.modules.length} modules`}>
            <input type="range" min={0} max={built.modules.length} value={reveal}
                   title="Drag to watch them go on one at a time, in the order they would actually be assembled — each module welds onto the one before it."
                   onChange={(e) => setReveal(+e.target.value)} />
          </Row>

          <div className="msrr-moves">
            {built.modules.map((m, i) => (
              <div key={m.id}
                   className={`msrr-move ${i < reveal ? 'done' : ''} ${i === reveal - 1 ? 'active' : ''}`}
                   onClick={() => setReveal(i + 1)}>
                {m.id}: ({m.anchorCell.join(',')}) → ({m.endCell.join(',')}) · reach {m.reach} · {m.pose.bendPoseId}
                {m.weldedTo ? ` · welds to ${m.weldedTo}` : ' · chain root'}
              </div>
            ))}
          </div>

          {built.uncovered.length > 0 && (
            <p className="msrr-note warn"
               title="The fit can wall itself into a pocket it can no longer reach. Widening or straightening those parts of the shape usually clears it.">
              {built.uncovered.length} cube(s) have no module on them.
            </p>
          )}
        </>
      )}
    </>
  );
}

// ── module theme ──────────────────────────────────────────────────────────────

/**
 * What a MODULINK actually is, and what the hardware will not let it do —
 * folded away because it is reference material, not a control.
 *
 * This replaced a module-THEME picker. The page used to offer a second
 * abstraction where one module was exactly one cube, and made you choose;
 * everything downstream then had to branch on that choice and apologise for
 * whichever half did not apply. There is one kind of module now, so there is
 * nothing to pick — only something to look up.
 */
function ModulinkSection() {
  const [showPoses, setShowPoses] = useState(false);
  const theme = getModuleTheme('mod2');

  return (
    <Section title="MODULINK" info={
      <>
        <p className="msrr-note">{theme.detail}</p>
        <ul className="msrr-constraints">
          {theme.constraints.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </>
    }>
      <div className="msrr-row-btns">
        <button className="msrr-btn small ghost" onClick={() => setShowPoses((v) => !v)}>
          {showPoses ? 'Hide' : 'Show'} poses ({theme.poses.length})
        </button>
      </div>
      {showPoses && (
        <div className="msrr-poses">
          {theme.poses.map((pose) => (
            <div key={pose.id} className="msrr-pose" title={pose.hint}>
              <span className="msrr-pose-label">{pose.label}</span>
              <span className="msrr-pose-cubes">{pose.cubes} cube{pose.cubes === 1 ? '' : 's'}</span>
              <span className="msrr-pose-hint">
                reach {pose.span.toFixed(2)} · body clips {pose.sweptCount}
              </span>
            </div>
          ))}
        </div>
      )}
      <ReachTableSection />
    </Section>
  );
}

/**
 * The mod2 move set: every place a free end can land, given the module is
 * anchored by its other end. Computed once on demand (a joint-space sweep takes
 * about half a second) and cached, behind a rAF so the "computing" state paints
 * instead of the panel freezing.
 */
function ReachTableSection() {
  const pushLog = useMsrrStore((s) => s.pushLog);
  const [summary, setSummary] = useState<ReachSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const compute = () => {
    setBusy(true);
    requestAnimationFrame(() => {
      const t0 = performance.now();
      const s = reachSummary();
      setSummary(s);
      setBusy(false);
      pushLog(
        `mod2 move set: ${s.targetCount} landing spots from ${s.poseCount} poses, `
        + `reach ${s.reachRange[0]}–${s.reachRange[1]} cubes, built in ${(performance.now() - t0).toFixed(0)}ms`,
      );
    });
  };

  return (
    <>
      {!summary ? (
        <div className="msrr-row-btns">
          <button className="msrr-btn small" disabled={busy} onClick={compute}
                  title={'Anchored by one end, a module folds and swings its free end onto a target '
                    + 'connector, then releases the old anchor. The move set is every place that free '
                    + 'end can land — enumerated ahead of time, so a plan can never contain a reach '
                    + 'the arm turns out not to have.'}>
            {busy ? 'Sweeping joint space…' : 'Compute move set'}
          </button>
        </div>
      ) : (
        <>
          <div className="msrr-result">
            <div className="msrr-chip ok">{summary.targetCount} landing spots</div>
            <div className="msrr-chip">{summary.poseCount} poses</div>
            <div className="msrr-chip">reach {summary.reachRange[0]}–{summary.reachRange[1]} cubes</div>
            <div className="msrr-chip" title="Worst distance between a pose's true kinematic endpoint and the lattice point it was snapped to. Poses further off than the tolerance are discarded, not rounded.">
              worst snap {summary.worstSnap.toFixed(3)} cubes
            </div>
          </div>
          <div className="msrr-poses">
            {summary.byReach.map((r) => (
              <div key={r.reach} className="msrr-pose">
                <span className="msrr-pose-label">reach {r.reach}</span>
                <span className="msrr-pose-cubes">{r.targets}</span>
                <span className="msrr-pose-hint">landing spot{r.targets === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ── small shared bits ─────────────────────────────────────────────────────────

/**
 * A titled block of controls, with its explanation folded away behind the ⓘ on
 * the header.
 *
 * The `info` prop is where every paragraph on this page belongs. Closed by
 * default and remembered per section only for as long as the section is
 * mounted — the default state you meet the panel in is always "controls, no
 * prose", because that is the state you are in ninety-nine visits out of a
 * hundred. Passing no `info` simply renders no ⓘ.
 */
export function Section({ title, info, children }: {
  title: string; info?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="msrr-section">
      <h3 className="msrr-section-title">
        <span className="msrr-title-text">{title}</span>
        {info && (
          <button
            className={`msrr-info ${open ? 'open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title={open ? 'Hide the explanation' : 'What is this?'}
          >
            i
          </button>
        )}
      </h3>
      {info && open && <div className="msrr-info-body">{info}</div>}
      {children}
    </section>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="msrr-field">
      <span className="msrr-field-label">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="msrr-toggle" title={hint}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
