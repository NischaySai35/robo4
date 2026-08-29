/**
 * MsrrPanel — the control surface for the MSRR Experiments page.
 *
 * TABS
 *   BUILD  — shape library, module budget, live structure diagnostics
 *   TEXT   — text to structure: offline rule parser, Ollama, or Anthropic
 *   DRAW   — line/stroke input on a 2D pad, voxelised into a chain
 *   PLAN   — move model, strategy, constraints; runs the reconfiguration planner
 *   RUN    — playback of the plan, move by move, with the move list as a log
 *   BRIDGE — mirror into the shared 3D scene, materialize into the document,
 *            export the plan as a hardware command stream
 *
 * The order is the workflow: get a structure, get a target, plan the transform,
 * watch it, then take it out of the sandbox.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import './MsrrPanel.css';
import { useMsrrStore, configAtStep, DEFAULT_CELL_SIZE } from '@/state/msrrStore';
import { useMsrrDrawStore } from './drawStore';
import {
  type Cell, cellsOf, isConnected, occupiedNeighbors, groundCenter, fitToCount, key,
} from '@/robotics/msrr/lattice';
import { SHAPES, buildShape, type ShapeId } from '@/robotics/msrr/shapes';
import { describeMove, verifyPlan } from '@/robotics/msrr/moves';
import { stabilitySummary } from '@/robotics/msrr/stability';
import { requestShape, availableBackends, type AiBackend } from '@/robotics/msrr/aiShape';
import { buildFromStrokes, type Point3 } from '@/robotics/msrr/strokeToShape';
import {
  type ModuleThemeId, allModuleThemes, getModuleTheme, moduleCountEstimate,
} from '@/robotics/msrr/moduleThemes';
import { type ReachSummary, reachSummary } from '@/robotics/msrr/chainMoves';
import { describeTransformMove, mobilityReport } from '@/robotics/msrr/transform';
import { startMirror, stopMirror, materializeCurrent, exportPlanJson } from './bridgeActions';

type Tab = 'build' | 'text' | 'draw' | 'plan' | 'run' | 'bridge';

const TABS: { id: Tab; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'text', label: 'Text / AI' },
  { id: 'draw', label: 'Draw' },
  { id: 'plan', label: 'Plan' },
  { id: 'run', label: 'Run' },
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

      <StructureBar />

      <div className="msrr-body">
        {tab === 'build' && <BuildTab />}
        {tab === 'text' && <TextTab />}
        {tab === 'draw' && <DrawTab />}
        {tab === 'plan' && <PlanTab />}
        {tab === 'run' && <RunTab />}
        {tab === 'bridge' && <BridgeTab />}
      </div>

      <LogStrip />
    </div>
  );
}

// ── always-visible structure readout ──────────────────────────────────────────

/**
 * The diagnostics that decide whether anything else on this page will work:
 * module count, one-piece-ness, branch junctions, and whether it stands up.
 * Kept above the tabs because every tab depends on them.
 */
function StructureBar() {
  const config = useMsrrStore((s) => s.config);
  const stability = useMsrrStore((s) => s.stability);
  const target = useMsrrStore((s) => s.target);
  const moduleTheme = useMsrrStore((s) => s.moduleTheme);

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
      <span className={`msrr-chip ${moduleTheme === 'mod2' ? 'warn' : ''}`}
            title={getModuleTheme(moduleTheme).cellsPerModuleSummary}>
        {moduleCountEstimate(moduleTheme, count).text}
      </span>
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
  const moduleTheme = useMsrrStore((s) => s.moduleTheme);

  const count = config.occ.size;
  const [budget, setBudget] = useState(count || 12);
  const [scale, setScale] = useState(1);

  useEffect(() => { if (count) setBudget(count); }, [count]);

  const apply = (id: ShapeId) => setConfigCells(buildShape(id, Math.max(1, budget), scale));
  const applyTarget = (id: ShapeId) => setTarget(buildShape(id, Math.max(1, budget), scale));

  const resetSandbox = () => {
    resetAll();
    useMsrrDrawStore.getState().clearStrokes();
    if (useMsrrStore.getState().mirror) { stopMirror(); useMsrrStore.getState().setMirror(false); }
    pushLog('sandbox reset: structure, target, plan, draw pad and log all cleared');
  };

  // mod2 needs Build before a target means anything (the transform walks real
  // modules, not cubes); mod1 has no build step, so target is always available.
  const needsBuildForTarget = moduleTheme === 'mod2';
  const targetLocked = needsBuildForTarget && !built;

  return (
    <>
      <ModuleThemePicker />

      <WorkflowStepper
        step1Done={count > 0}
        step2Applicable={moduleTheme === 'mod2'}
        step2Done={!!built}
        step3Done={target.length > 0}
      />

      <Step index={1} title="Shape — place the cubes">
        <p className="msrr-note">
          A reference diagram of what the robot should look like — not modules
          yet, just cubes. Pick one from the library, draw it (Draw tab), describe
          it (Text/AI tab), or edit by hand: click a cube face to add one, drag off
          a face to extrude a run, right-click a cube to delete it (a cube holding
          the shape together refuses to delete).
        </p>
        <Row label={`Cubes: ${budget}`}>
          <input type="range" min={1} max={120} value={budget}
                 onChange={(e) => setBudget(+e.target.value)} />
        </Row>
        <Row label={`Shape scale: ${scale.toFixed(2)}x`}>
          <input type="range" min={0.5} max={3} step={0.05} value={scale}
                 onChange={(e) => setScale(+e.target.value)} />
        </Row>
        <div className="msrr-shape-grid">
          {SHAPES.map((s) => (
            <button key={s.id} className="msrr-btn" onClick={() => apply(s.id)}>{s.label}</button>
          ))}
        </div>
        <div className="msrr-row-btns">
          <button className="msrr-btn" disabled={!canUndo} onClick={undo} title="Undo the last manual edit">
            ↶ Undo
          </button>
          <button className="msrr-btn" disabled={!canRedo} onClick={redo} title="Redo">
            ↷ Redo
          </button>
          <button className="msrr-btn danger" disabled={!count} onClick={clearConfig}>
            Clear cubes
          </button>
        </div>
      </Step>

      {moduleTheme === 'mod2' && (
        <Step index={2} title="Build — fit real modules to the shape" locked={!count}
              lockedReason="Place at least one cube in step 1 first.">
          <BuildSection />
        </Step>
      )}

      <Step index={moduleTheme === 'mod2' ? 3 : 2} title="Target — what to become"
            locked={targetLocked}
            lockedReason="Build the robot in step 2 first — the target only means something once real modules exist to walk toward it.">
        <p className="msrr-note">
          Stores a shape as what the robot should transform INTO. It does not
          change what is on screen now — go to the <b>Plan</b> tab to run the walk.
        </p>
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
        {target.length > 0 && (
          <p className={`msrr-note ${target.length === count ? '' : 'warn'}`}>
            Target holds <b>{target.length}</b> cubes
            {target.length === count ? '' : `, current shape has ${count}`}.
          </p>
        )}
      </Step>

      <Section title="Reset">
        <p className="msrr-note">
          Wipes the current structure, target, plan, draw pad and log back to an
          empty sandbox. Stops the live mirror first if it is running. Cannot be undone.
        </p>
        <div className="msrr-row-btns">
          <button className="msrr-btn danger" onClick={resetSandbox}>Reset entire sandbox</button>
        </div>
      </Section>
    </>
  );
}

/**
 * Top-of-tab progress readout: four fixed stops, each either done, next-up, or
 * not-yet-applicable. Purely informational — nothing here gates anything itself,
 * the Step wrapper below does that; this is just "where am I".
 */
function WorkflowStepper({ step1Done, step2Applicable, step2Done, step3Done }: {
  step1Done: boolean; step2Applicable: boolean; step2Done: boolean; step3Done: boolean;
}) {
  const stops = [
    { label: 'Shape', done: step1Done },
    ...(step2Applicable ? [{ label: 'Build', done: step2Done }] : []),
    { label: 'Target', done: step3Done },
    { label: 'Transform', done: false, hint: 'Run on the Plan tab' },
  ];
  return (
    <div className="msrr-stepper">
      {stops.map((s, i) => (
        <div key={s.label} className={`msrr-stepper-stop ${s.done ? 'done' : ''}`} title={s.hint}>
          <span className="msrr-stepper-dot">{s.done ? '✓' : i + 1}</span>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A numbered section that can lock itself with a plain-English reason instead
 * of just greying out a button somewhere inside it. Locking is advisory, not a
 * hard gate on the store — the goal is telling you WHY something isn't useful
 * yet, not preventing every possible click order.
 */
function Step({ index, title, locked, lockedReason, children }: {
  index: number; title: string; locked?: boolean; lockedReason?: string; children: React.ReactNode;
}) {
  return (
    <section className={`msrr-section msrr-step ${locked ? 'locked' : ''}`}>
      <h3 className="msrr-section-title">
        <span className="msrr-step-index">{index}</span> {title}
      </h3>
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
      <Section title="Describe the shape">
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

      <Section title="How this works">
        <p className="msrr-note">
          The model is asked for one thing only: which lattice cells the target shape
          occupies. It is never asked how to get there — that is the planner's job,
          because a plan has to be certified connected and collision-free and a
          language model cannot certify anything. Whatever comes back is validated:
          non-integer or malformed cells dropped, duplicates removed, disconnected
          pieces discarded down to the largest component, then resized to your exact
          module count and grounded. If the repairs kick in, the result note says so.
        </p>
        <p className="msrr-note">
          The "Rules only" backend is the honest A/B baseline — keyword matching with
          no model at all. Worth checking how often the LLM actually beats it.
        </p>
      </Section>
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
      <Section title="Stroke pad">
        <p className="msrr-note">
          Click to place points; each click extends the current line. Finish a stroke
          to start a separate one. A single unbranched stroke can never self-collide
          at any length — it is the safest structure source in the app.
        </p>
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

function PlanTab() {
  const options = useMsrrStore((s) => s.options);
  const setOptions = useMsrrStore((s) => s.setOptions);
  const runPlan = useMsrrStore((s) => s.runPlan);
  const clearPlan = useMsrrStore((s) => s.clearPlan);
  const planning = useMsrrStore((s) => s.planning);
  const plan = useMsrrStore((s) => s.plan);
  const config = useMsrrStore((s) => s.config);
  const target = useMsrrStore((s) => s.target);
  const setTarget = useMsrrStore((s) => s.setTarget);
  const setTab = useMsrrStore((s) => s.setTab);
  const pushLog = useMsrrStore((s) => s.pushLog);
  const moduleTheme = useMsrrStore((s) => s.moduleTheme);

  const count = config.occ.size;
  const mismatch = target.length > 0 && target.length !== count;

  const verify = () => {
    if (!plan) return;
    const r = verifyPlan(config, plan.moves, options.model);
    pushLog(r.ok
      ? `verified: all ${plan.moves.length} moves legal, structure connected throughout`
      : `VERIFY FAILED at ${r.failedAt + 1}: ${r.reason}`);
  };

  if (moduleTheme === 'mod2') {
    // Under mod2 the cubes on screen are a reference diagram, not modules — the
    // mod1 planner below treats every cube as an independently movable rigid
    // block, which has no meaning here and would animate the reference cubes
    // instead of the real chain. Show only the planner that actually applies.
    return <TransformSection />;
  }

  return (
    <>
      <Section title="Move model">
        <p className="msrr-note">
          What one module is physically allowed to do. Everything downstream — every
          plan, every animation, every command you would send to hardware — is
          defined by this choice.
        </p>
        <div className="msrr-row-btns">
          <button className={`msrr-btn ${options.model === 'pivoting' ? 'primary' : ''}`}
                  onClick={() => setOptions({ model: 'pivoting' })}>
            Pivoting cube
          </button>
          <button className={`msrr-btn ${options.model === 'sliding' ? 'primary' : ''}`}
                  onClick={() => setOptions({ model: 'sliding' })}>
            Sliding cube
          </button>
        </div>
        <p className="msrr-note">
          {options.model === 'pivoting'
            ? 'Rotates 90° over a shared edge onto adjacent support, or 180° around a convex corner / into a concave one. The whole swept volume must be clear, not just the destination. Closer to what a rotating-joint module actually does.'
            : 'Translates one cell along a substrate of neighbours, or wraps a convex corner. Most literature coverage and proven universal algorithms — but nothing on your modules actually slides.'}
        </p>
      </Section>

      <Section title="Strategy">
        <div className="msrr-row-btns">
          <button className={`msrr-btn ${options.strategy === 'decompose' ? 'primary' : ''}`}
                  onClick={() => setOptions({ strategy: 'decompose' })}>
            Max-commonality
          </button>
          <button className={`msrr-btn ${options.strategy === 'astar' ? 'primary' : ''}`}
                  onClick={() => setOptions({ strategy: 'astar' })}>
            A* (optimal, tiny only)
          </button>
        </div>
        <p className="msrr-note">
          {options.strategy === 'decompose'
            ? 'Aligns the target for maximum overlap, leaves every already-correct module alone, then routes surplus modules one at a time by BFS over the legal-move graph. Scales; not optimal; says so when it gets stuck.'
            : 'Searches whole configurations for the shortest possible move sequence. Optimal for this move model, and impractical past roughly 10 modules — use it to measure how far off optimal the fast strategy is on a small case.'}
        </p>
        <Toggle label="Require static stability at every step"
                hint="Rejects any intermediate state that is ungrounded or whose centre of mass leaves the support polygon. Slower, and can make a reachable target unreachable — which is itself useful information."
                value={options.requireStability}
                onChange={(v) => setOptions({ requireStability: v })} />
        <Toggle label="Auto-align target for maximum overlap"
                hint="Translates the target onto the current shape so the largest number of modules are already in the right place. The single biggest speedup available."
                value={options.autoAlign}
                onChange={(v) => setOptions({ autoAlign: v })} />
        <Row label={`Move ceiling: ${options.maxMoves}`}>
          <input type="range" min={50} max={5000} step={50} value={options.maxMoves}
                 onChange={(e) => setOptions({ maxMoves: +e.target.value })} />
        </Row>
      </Section>

      <Section title="Run">
        {!target.length && <p className="msrr-note bad">No target set. Pick one in Build, Text, or Draw.</p>}
        {mismatch && (
          <p className="msrr-note bad">
            Target wants {target.length} modules, you have {count}.
            <button className="msrr-btn ghost small"
                    onClick={() => setTarget(groundCenter(fitToCount(target, count)))}>
              Resize target to {count}
            </button>
          </p>
        )}
        <div className="msrr-row-btns">
          <button className="msrr-btn primary" disabled={planning || !target.length || mismatch} onClick={runPlan}>
            {planning ? 'Planning…' : 'Plan reconfiguration'}
          </button>
          {plan && <button className="msrr-btn" onClick={verify}>Verify plan</button>}
          {plan && plan.moves.length > 0 && (
            <button className="msrr-btn" onClick={() => setTab('run')}>Go to playback →</button>
          )}
          {plan && <button className="msrr-btn danger" onClick={clearPlan}>Clear plan</button>}
        </div>

        {plan && (
          <div className="msrr-result">
            <div className={`msrr-chip ${plan.complete ? 'ok' : 'warn'}`}>
              {plan.complete ? 'complete' : `partial — ${plan.remaining} cell(s) unfilled`}
            </div>
            <div className="msrr-chip">{plan.moves.length} moves</div>
            <div className="msrr-chip">{plan.ms.toFixed(0)} ms</div>
            <div className="msrr-chip">{plan.expansions} states</div>
          </div>
        )}
      </Section>
    </>
  );
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
      <p className="msrr-note">
        Starting the search — fitting the target shape and measuring mobility
        before the first move is even considered.
      </p>
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
 * mod2 transformation: the built robot walks itself into the target shape, hand
 * over hand. Distinct from the mod1 planner below it, which slides rigid cubes.
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
  const moduleTheme = useMsrrStore((s) => s.moduleTheme);
  const progress = useMsrrStore((s) => s.transformProgress);

  const mobility = useMemo(() => (built ? mobilityReport(built) : null), [built]);

  if (moduleTheme !== 'mod2') return null;

  return (
    <Section title="Transform (mod2)">
      <p className="msrr-note">
        The robot walks itself into the target shape. A module keeps one end
        welded, folds, swings its free end onto another module's connector, welds
        there, and only then lets the old end go — so it never comes apart and
        never teleports.
      </p>

      {!built && <p className="msrr-note bad">Build the robot first (Build tab).</p>}
      {!target.length && <p className="msrr-note bad">No target shape stored. Set one from the shape library.</p>}

      {mobility && (
        <>
          <div className="msrr-result">
            <div className={`msrr-chip ${mobility.total ? 'ok' : 'bad'}`}>
              {mobility.total} moves available
            </div>
            <div className={`msrr-chip ${mobility.frozen ? 'warn' : 'ok'}`}>
              {mobility.frozen} module(s) frozen
            </div>
          </div>
          <p className="msrr-note">
            <b>Mobility.</b> {mobility.summary} A module can only relocate by landing
            its free end exactly on an existing connector, facing back at it, with
            its body clearing everything else. In a tightly packed robot there are
            very few such places — which is why a transformation plan can come back
            short, or empty, without anything being broken.
          </p>
        </>
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
            <p className="msrr-note">
              The target needs a different module count than the robot has, so the plan{' '}
              {tr.added.length > 0 && <>added {tr.added.length} module{tr.added.length === 1 ? '' : 's'} it didn't have</>}
              {tr.added.length > 0 && tr.removed.length > 0 && ' and '}
              {tr.removed.length > 0 && <>removed {tr.removed.length} surplus module{tr.removed.length === 1 ? '' : 's'}</>}
              {' '}to match exactly — see the log for which ones. Added modules are placed directly, not
              walked there; this is a hardware-inventory change, not a gait.
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
              <p className="msrr-note">
                The module in flight is highlighted and bends across to its new grip —
                it holds on with one end the whole way and only lets the other go once
                the new weld is made.
              </p>
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
            <p className="msrr-note warn">
              No steps. Nothing the modules can legally do gets them onto more of the
              target shape from here — see the mobility figures above. This is a real
              answer about this pair of shapes, not a planner that gave up.
            </p>
          ) : (
            <p className="msrr-note">
              No walking was needed or possible — the module count was reconciled
              directly (see above). {tr.complete ? 'The shape is complete.' : 'Some target cubes still aren\'t covered even after that — see the log.'}
            </p>
          )}
        </>
      )}
    </Section>
  );
}

// ── RUN ───────────────────────────────────────────────────────────────────────

function RunTab() {
  const plan = useMsrrStore((s) => s.plan);
  const playing = useMsrrStore((s) => s.playing);
  const playback = useMsrrStore((s) => s.playback);
  const opts = useMsrrStore((s) => s.playbackOpts);
  const setOpts = useMsrrStore((s) => s.setPlaybackOpts);
  const play = useMsrrStore((s) => s.play);
  const pause = useMsrrStore((s) => s.pause);
  const rewind = useMsrrStore((s) => s.rewind);
  const seek = useMsrrStore((s) => s.seek);
  const commitPlan = useMsrrStore((s) => s.commitPlan);
  const clearPlan = useMsrrStore((s) => s.clearPlan);
  const config = useMsrrStore((s) => s.config);
  const moduleTheme = useMsrrStore((s) => s.moduleTheme);
  const setTab = useMsrrStore((s) => s.setTab);

  const listRef = useRef<HTMLDivElement | null>(null);

  // Keep the active move in view while it plays, without stealing focus.
  useEffect(() => {
    const el = listRef.current?.querySelector('.msrr-move.active') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [playback.index]);

  if (moduleTheme === 'mod2') {
    // This tab only plays the mod1 cube-slide plan. mod2's transformation
    // playback (real modules walking, hand over hand) lives inline on the Plan
    // tab next to its own controls — there is nothing for this tab to show.
    return (
      <Section title="Playback">
        <p className="msrr-note">
          This tab plays the mod1 cube-slide plan, which does not apply under the
          mod2 module theme you are using — cubes are a reference diagram here,
          not modules, so there is nothing to play here.
        </p>
        <button className="msrr-btn primary" onClick={() => setTab('plan')}>
          Go to Plan → mod2 transform playback
        </button>
      </Section>
    );
  }

  if (!plan || !plan.moves.length) {
    return (
      <Section title="Playback">
        <p className="msrr-note">No plan yet. Set a target and run the planner on the Plan tab.</p>
      </Section>
    );
  }

  const atStep = configAtStep(config, plan.moves, playback.index);
  const remaining = plan.moves.length - playback.index - 1;

  return (
    <>
      <Section title="Playback">
        <div className="msrr-row-btns">
          <button className="msrr-btn primary" onClick={playing ? pause : play}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button className="msrr-btn" onClick={() => seek(playback.index - 1)}>◀ step</button>
          <button className="msrr-btn" onClick={() => seek(playback.index + 1)}>step ▶</button>
          <button className="msrr-btn ghost" onClick={rewind}>Rewind</button>
        </div>
        <Row label={`Move ${playback.index + 1} of ${plan.moves.length} · ${remaining} left`}>
          <input type="range" min={0} max={plan.moves.length - 1} value={playback.index}
                 onChange={(e) => seek(+e.target.value)} />
        </Row>
        <Row label={`Speed: ${opts.speed.toFixed(2)}x`}>
          <input type="range" min={0.1} max={5} step={0.1} value={opts.speed}
                 onChange={(e) => setOpts({ speed: +e.target.value })} />
        </Row>
        <Toggle label="Loop" hint="Restart from the beginning when the plan finishes."
                value={opts.loop} onChange={(v) => setOpts({ loop: v })} />
        <div className="msrr-row-btns">
          <button className="msrr-btn" onClick={commitPlan}>
            Commit result as current structure
          </button>
          <button className="msrr-btn danger" onClick={clearPlan}>
            Delete this plan
          </button>
        </div>
        <p className="msrr-note">
          {atStep.occ.size} modules placed · this is the state after move {playback.index}.
          Nothing teleports: each module travels its real swept path, and pivots carry
          the module's orientation with them.
        </p>
      </Section>

      <Section title="Move list">
        <p className="msrr-note">
          This list is both the animation script and the command stream you would
          send to hardware. There is deliberately only one of them.
        </p>
        <div className="msrr-moves" ref={listRef}>
          {plan.moves.map((m, i) => (
            <div key={i}
                 className={`msrr-move ${i === playback.index ? 'active' : ''} ${i < playback.index ? 'done' : ''}`}
                 onClick={() => seek(i)}>
              {describeMove(m, i)}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ── BRIDGE ────────────────────────────────────────────────────────────────────

function BridgeTab() {
  const mirror = useMsrrStore((s) => s.mirror);
  const setMirror = useMsrrStore((s) => s.setMirror);
  const cellSize = useMsrrStore((s) => s.cellSize);
  const setCellSize = useMsrrStore((s) => s.setCellSize);
  const config = useMsrrStore((s) => s.config);
  const plan = useMsrrStore((s) => s.plan);
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
      <Section title="Live mirror">
        <p className="msrr-note">
          Places one instance of the project's default module per occupied cell in the
          shared 3D scene, driven by this same plan. Switch to the Editor page while a
          plan is playing to watch the real geometry do it.
        </p>
        <p className="msrr-note warn">
          Mirrored modules are placed rigidly at cell poses. Their internal joints are
          not solved and no connector mating or loop closure is run — this shows you
          the plan at real scale with real geometry, it does not certify that the
          connectors mate.
        </p>
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

      <Section title="Materialize">
        <p className="msrr-note">
          A one-shot snapshot: adds the current structure to the project document as
          real, editable modules through the command bus — undoable like any other
          edit, and it survives leaving this page.
        </p>
        <div className="msrr-row-btns">
          <button className="msrr-btn" disabled={!config.occ.size} onClick={() => {
            const n = materializeCurrent();
            pushLog(`materialized ${n} modules into the project document`);
          }}>
            Materialize {config.occ.size} modules into the document
          </button>
        </div>
      </Section>

      <Section title="Export the plan">
        <p className="msrr-note">
          The move list as JSON: module id, from, to, kind, anchor, swept path, and
          pivot geometry per step. This is what an L1 coordinator would consume to
          drive real modules.
        </p>
        <div className="msrr-row-btns">
          <button className="msrr-btn" disabled={!plan || !plan.moves.length}
                  onClick={() => { exportPlanJson(); pushLog('plan exported as JSON'); }}>
            Download plan JSON
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
  const moduleTheme = useMsrrStore((s) => s.moduleTheme);

  const cubes = config.occ.size;

  return (
    <>
      <p className="msrr-note">
        <b>Build</b> works out which real modules realise the shape from step 1:
        where each one sits, how it folds, and which connector welds to which. A
        module is not a cube — straight it bridges four cubes, folded it bridges
        fewer — so the module count is an <i>output</i> of Build, never something
        you set.
      </p>

      <div className="msrr-row-btns">
        <button className="msrr-btn primary" disabled={building || !cubes} onClick={build}>
          {building ? 'Fitting modules…' : `Build modules into these ${cubes} cubes`}
        </button>
        {built && <button className="msrr-btn ghost" onClick={clearBuild}>Clear build</button>}
      </div>

      {moduleTheme === 'mod1' && (
        <p className="msrr-note warn">
          Heads up: the module theme is set to <b>mod1 — cube</b>, where one module
          is defined to be one cube. Build fits MODULINK chains, so switch the theme
          to mod2 for the numbers below to describe the robot you are actually making.
        </p>
      )}

      {built && (
        <>
          <div className="msrr-result">
            <div className="msrr-chip ok">{built.modules.length} modules</div>
            <div className="msrr-chip">{cubes} cubes</div>
            <div className={`msrr-chip ${built.uncovered.length ? 'warn' : 'ok'}`}>
              {built.uncovered.length ? `${built.uncovered.length} cubes uncovered` : 'shape fully covered'}
            </div>
            {built.runs > 1 && <div className="msrr-chip warn">{built.runs} separate chains</div>}
          </div>

          <Row label={`Assembled: ${reveal} of ${built.modules.length} modules`}>
            <input type="range" min={0} max={built.modules.length} value={reveal}
                   onChange={(e) => setReveal(+e.target.value)} />
          </Row>
          <p className="msrr-note">
            Drag to watch them go on one at a time, in the order they would actually
            be assembled — each module welds onto the one before it.
          </p>

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
            <p className="msrr-note warn">
              {built.uncovered.length} cube(s) have no module on them. The fit walks
              greedily and can wall itself into a pocket it can no longer reach.
              Widening or straightening those parts of the shape usually clears it.
            </p>
          )}
        </>
      )}
    </>
  );
}

// ── module theme ──────────────────────────────────────────────────────────────

/**
 * Which kind of module the sandbox is modelling. The lattice is cubic either way
 * — what changes is how many cubes one real module accounts for, and mod2's
 * answer depends on how each module is folded.
 */
function ModuleThemePicker() {
  const moduleTheme = useMsrrStore((s) => s.moduleTheme);
  const setModuleTheme = useMsrrStore((s) => s.setModuleTheme);
  const config = useMsrrStore((s) => s.config);
  const [showPoses, setShowPoses] = useState(false);

  const themes = useMemo(() => allModuleThemes(), []);
  const theme = getModuleTheme(moduleTheme);
  const estimate = moduleCountEstimate(moduleTheme, config.occ.size);

  return (
    <Section title="Module theme">
      <div className="msrr-row-btns">
        {themes.map((t) => (
          <button key={t.id}
                  className={`msrr-btn ${moduleTheme === t.id ? 'primary' : ''}`}
                  title={t.summary}
                  onClick={() => setModuleTheme(t.id as ModuleThemeId)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="msrr-note">{theme.detail}</p>
      <p className="msrr-note">
        <b>{config.occ.size} cubes</b> is {estimate.text}
        {estimate.exact ? '' : ' — the exact count depends on how each module is folded'}.
      </p>

      {!theme.singleCube && (
        <>
          <button className="msrr-btn ghost small" onClick={() => setShowPoses((v) => !v)}>
            {showPoses ? 'Hide' : 'Show'} pose library ({theme.poses.length})
          </button>
          {showPoses && (
            <div className="msrr-poses">
              {theme.poses.map((p) => (
                <div key={p.id} className="msrr-pose" title={p.hint}>
                  <span className="msrr-pose-label">{p.label}</span>
                  <span className="msrr-pose-cubes">{p.cubes} cube{p.cubes === 1 ? '' : 's'}</span>
                  <span className="msrr-pose-hint">
                    reach {p.span.toFixed(2)} · body clips {p.sweptCount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {theme.constraints.length > 0 && (
        <ul className="msrr-constraints">
          {theme.constraints.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      )}

      {!theme.singleCube && <ReachTableSection />}

      {!theme.plannerIsExact && (
        <p className="msrr-note warn">
          The reconfiguration planner still treats each occupied cube as one movable
          unit, which is exactly right for mod1 but only an approximation for this
          theme: a real {theme.label} plan has to carry a multi-cube body and re-pose
          its joints as it goes. The move set below is the piece that planner will be
          built on; the search itself is not written yet.
        </p>
      )}
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
      <p className="msrr-note">
        <b>Move set.</b> Anchored by one end, a module folds and swings its free end
        onto a target connector — then releases the old anchor. So the move set is
        the answer to "where can the free end land". It is enumerated ahead of time
        rather than solved per move, so a plan can never contain a reach the arm
        turns out not to have.
      </p>
      {!summary ? (
        <div className="msrr-row-btns">
          <button className="msrr-btn" disabled={busy} onClick={compute}>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="msrr-section">
      <h3 className="msrr-section-title">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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
