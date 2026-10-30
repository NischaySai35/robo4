/**
 * V2Panel — the MSRR page's Transformation Planner v2 (docs/TRANSFORM_PLANNER_V2_PROMPT.md).
 *
 * Tabs:
 *   Robot   the robot as it is now: modules, locks, joint angles, and the static Check
 *   Shapes  the shape library (topology + pose + measured tags) and the generator
 *   Plan    target ranking and the verb plan from the current robot to a target
 *   Ask     words -> capability tags (LLM) -> targets
 *   Run     execute a plan (DRY_RUN) with replanning
 *   Manual  drive the robot by hand in live real physics (joints, lock / unlock, connect two connectors)
 */
import { useState } from 'react';
import { useV2Store, PRESETS, type V2Tab } from '@/state/msrrV2Store';
import {
  type Edge, type PortId, type ModulePose, JOINTS, PORTS, PLAN_BEND_DEG, CONFIG, isBend,
} from '@/robotics/msrr2/model';
import { edgeProblem } from '@/robotics/msrr2/rules';
import { toSimScene, VERIFY_URL } from '@/robotics/msrr2/simScene';
import { jointTolerance, type JointRange } from '@/robotics/msrr2/tolerance';
import { Section, Row } from '@/features/msrr/MsrrPanel';
import { ShapesTab } from './ShapesTab';
import { PlanTab } from './PlanTab';
import { AskTab } from './AskTab';
import { RunTab } from './RunTab';
import { ManualTab } from './ManualTab';
import type { PhysRun } from './physicsView';

const TABS: { id: V2Tab; label: string }[] = [
  { id: 'robot', label: 'Robot' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'plan', label: 'Plan' },
  { id: 'ask', label: 'Ask' },
  { id: 'run', label: 'Run' },
  { id: 'manual', label: 'Manual' },
];

export default function V2Panel() {
  const tab = useV2Store((s) => s.tab);
  const setTab = useV2Store((s) => s.setTab);
  return (
    <>
      <div className="msrr-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`msrr-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <GravityBar />
      <div className="msrr-body">
        {tab === 'robot' && <RobotTab />}
        {tab === 'shapes' && <ShapesTab />}
        {tab === 'plan' && <PlanTab />}
        {tab === 'ask' && <AskTab />}
        {tab === 'run' && <RunTab />}
        {tab === 'manual' && <ManualTab />}
      </div>
      <V2Log />
    </>
  );
}

function V2Log() {
  const log = useV2Store((s) => s.log);
  return (
    <div className="msrr-log" style={{ maxHeight: 140, overflow: 'auto', fontFamily: 'monospace', fontSize: 11, padding: '6px 10px', borderTop: '1px solid #2a2f36' }}>
      {log.slice(-40).map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

// ── Robot tab (M1) ────────────────────────────────────────────────────────────

export function MarginChips({ m, ok }: { m: { maxTorquePct: number; cogMarginMm: number; minJointMarginDeg: number; sagMm?: number; tipPushN?: number }; ok?: boolean }) {
  const t = m.maxTorquePct, c = m.cogMarginMm, j = m.minJointMarginDeg;
  return (
    <div className="msrr-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
      {ok !== undefined && <span className={`msrr-chip ${ok ? 'ok' : 'bad'}`}><b>{ok ? 'PASS' : 'FAIL'}</b></span>}
      <span className={`msrr-chip ${t <= CONFIG.limits.torqueBudgetPct ? (t > 50 ? 'warn' : 'ok') : 'bad'}`} title="worst joint gravity torque as % of the ST3215 stall torque (budget 70%)">
        torque <b>{t.toFixed(0)}%</b>
      </span>
      <span className={`msrr-chip ${c >= CONFIG.limits.cogMarginMm ? 'ok' : 'bad'}`} title="how far the centre of gravity is inside the support polygon (needs ≥ 15 mm); 'anchored' = held by a floor receiver">
        CoG <b>{c >= 999 ? 'anchored' : `${c.toFixed(0)} mm`}</b>
      </span>
      <span className={`msrr-chip ${j >= 90 - PLAN_BEND_DEG ? 'ok' : 'bad'}`} title="closest any joint gets to its stop">
        joint margin <b>{j.toFixed(1)}°</b>
      </span>
      {m.sagMm !== undefined && (
        <span className={`msrr-chip ${m.sagMm < 30 ? 'ok' : m.sagMm < 60 ? 'warn' : 'bad'}`} title="how far the real robot sits from the drawn pose under its own weight: servo droop, gear slop, PLA flex, receiver play (measured MuJoCo module)">
          sag <b>{m.sagMm.toFixed(0)} mm</b>
        </span>
      )}
      {m.tipPushN !== undefined && m.tipPushN < 999 && (
        <span className={`msrr-chip ${m.tipPushN >= CONFIG.robustness.minTipPushN ? 'ok' : 'warn'}`} title={`the push at the top that tips it over; below ${CONFIG.robustness.minTipPushN} N (a light touch, estimate) it still stands but is FRAGILE`}>
          {m.tipPushN >= CONFIG.robustness.minTipPushN ? 'tips at' : 'fragile, tips at'} <b>{m.tipPushN.toFixed(1)} N</b>
        </span>
      )}
    </div>
  );
}

function RobotTab() {
  const config = useV2Store((s) => s.config);
  const setConfig = useV2Store((s) => s.setConfig);
  const setJoint = useV2Store((s) => s.setJoint);
  const report = useV2Store((s) => s.report);
  const check = useV2Store((s) => s.check);
  const addEdge = useV2Store((s) => s.addEdge);
  const removeEdge = useV2Store((s) => s.removeEdge);
  const [sel, setSel] = useState<string>(config.modules[0] ?? 'M1');
  const [simRes, setSimRes] = useState<Record<string, any> | null>(null);
  const [simBusy, setSimBusy] = useState(false);
  const simCheck = async () => {
    setSimBusy(true); setSimRes(null);
    try {
      const r = await fetch(`${VERIFY_URL}/check_static`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scene: toSimScene(config) }) });
      setSimRes(await r.json());
    } catch { setSimRes({ error: 'the verify service is not running — start it with:  py -3.12 C:\TETROBOT\sim\verify_service.py' }); }
    setSimBusy(false);
  };
  const selected = config.modules.includes(sel) ? sel : config.modules[0];

  const [ea, setEa] = useState<string>('M1.B');
  const [eb, setEb] = useState<string>('M2.A');
  const [slot, setSlot] = useState<0 | 1 | 2 | 3>(0);
  const parseRef = (s: string) => (s.startsWith('floor:') ? { floor: s.slice(6) } : { module: s.split('.')[0], port: s.split('.')[1] as PortId });
  const refOptions = [
    ...config.modules.flatMap((m) => PORTS.map((p) => `${m}.${p}`)),
    ...CONFIG.floorAnchors.map((a) => `floor:${a.id}`),
  ];
  const draft: Edge | null = (() => {
    const a = parseRef(ea), b = parseRef(eb);
    if ('floor' in b) return null;
    return { a, b, slot, locked: true } as Edge;
  })();
  const draftProblem = draft ? edgeProblem(draft) : 'the second side must be a module port';

  const addModule = () => {
    const id = `M${config.modules.length + 1}`;
    setConfig({ ...config, modules: [...config.modules, id], pose: { ...config.pose, [id]: { T1: 180, B1: 180, B2: 180, T2: 180, B3: 180, B4: 180, T3: 180 } } });
  };

  return (
    <>
      <Section title="Robot (current state)" info={
        <>
          <p className="msrr-note">A robot is a lock graph (which port is locked to which) plus every joint angle. Angles are nominal: 180 = straight; the board adds each module's horn offsets.</p>
          <p className="msrr-note">Rules: a lock always has an END (A/B) on at least one side; side↔side is impossible. One lock per port. Bends are planned within ±{PLAN_BEND_DEG.toFixed(1)}°.</p>
        </>
      }>
        <Row label="Load a preset">
          <select className="msrr-select" data-testid="v2-preset" value="" onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value); if (p) setConfig(p.config); }}>
            <option value="">— choose —</option>
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Row>
        <div className="msrr-row-btns">
          <button className="msrr-btn primary" data-testid="v2-check" onClick={check}>Check</button>
          <button className="msrr-btn" data-testid="v2-simcheck" disabled={simBusy} onClick={simCheck}>{simBusy ? 'Simulating…' : 'Check in MuJoCo'}</button>
          <button className="msrr-btn" onClick={addModule}>Add module</button>
        </div>
        {simRes && (
          <div data-testid="v2-simreport" style={{ margin: '4px 0' }}>
            {simRes.error ? <p className="msrr-note bad">{simRes.error}</p> : (
              <>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className={`msrr-chip ${simRes.ok ? 'ok' : 'bad'}`}>MuJoCo <b>{simRes.ok ? 'holds' : 'fails'}</b></span>
                  <span className="msrr-chip">torque <b>{simRes.max_torque_pct}%</b></span>
                  <span className="msrr-chip">sag <b>{simRes.sag_mm} mm</b></span>
                  <span className="msrr-chip">sway <b>{simRes.sway_mm} mm</b></span>
                  <span className="msrr-chip">drift <b>{simRes.drift_mm} mm/s</b></span>
                </div>
                {simRes.reasons?.map((r: string, i: number) => <p key={i} className="msrr-note bad">{r}</p>)}
              </>
            )}
          </div>
        )}
        {report && <ToleranceBlock module={selected} />}
        {report && (
          <div data-testid="v2-report">
            <MarginChips m={report.margins} ok={report.ok} />
            <p className="msrr-note dim">
              held by: {report.supportedBy} · mass {report.totalMassKg.toFixed(3)} kg · floor carries {report.contacts.reduce((a, c) => a + c.force, 0).toFixed(1)} N
            </p>
            <p className="msrr-note dim" data-testid="v2-sag">
              real pose: sags {report.sag.maxMm.toFixed(0)} mm (worst at {report.sag.where}) · PLA brackets at {(report.sag.flexUse * 100).toFixed(0)}% of their 3° ({report.sag.flexWhere})
              {report.sag.receiverTiltDeg > 0 ? ` · receiver tilts ${report.sag.receiverTiltDeg.toFixed(2)}°` : ''}
              {report.touchWorstPct !== undefined ? ` · a ${CONFIG.robustness.touchN} N touch at the top: worst servo ${report.touchWorstPct.toFixed(0)}%` : ''}
            </p>
            {report.warnings.length > 0 && (
              <ul className="msrr-notes">{report.warnings.map((w, i) => <li key={i} className="msrr-note warn">{w}</li>)}</ul>
            )}
            {report.reasons.length > 0 && (
              <ul className="msrr-notes">{report.reasons.slice(0, 6).map((r, i) => <li key={i} className="msrr-note bad">{r}</li>)}</ul>
            )}
            <details>
              <summary className="msrr-note">joint torques</summary>
              <table style={{ fontSize: 11, width: '100%' }}>
                <tbody>
                  {report.torques.map((t, i) => (
                    <tr key={i} style={{ color: t.pct > CONFIG.limits.torqueBudgetPct ? '#d14b4b' : undefined }}>
                      <td>{t.module}</td><td>{t.joint}</td><td>{t.nm.toFixed(2)} N·m</td><td>{t.pct.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        )}
      </Section>

      <Section title="Locks">
        {config.edges.map((e, i) => {
          const p = edgeProblem(e);
          const a = 'floor' in e.a ? `floor ${e.a.floor}` : `${e.a.module}.${e.a.port}`;
          return (
            <div key={i} className="msrr-row-btns" style={{ alignItems: 'center' }}>
              <span className={`msrr-note ${p ? 'bad' : ''}`} style={{ flex: 1 }}>{a} ↔ {e.b.module}.{e.b.port} · slot {e.slot}{p ? ` — ${p}` : ''}</span>
              <button className="msrr-btn small danger" onClick={() => removeEdge(i)}>×</button>
            </div>
          );
        })}
        <Row label="New lock from">
          <select className="msrr-select" value={ea} onChange={(e) => setEa(e.target.value)}>{refOptions.map((o) => <option key={o}>{o}</option>)}</select>
        </Row>
        <Row label="to">
          <select className="msrr-select" value={eb} onChange={(e) => setEb(e.target.value)}>{refOptions.filter((o) => !o.startsWith('floor')).map((o) => <option key={o}>{o}</option>)}</select>
        </Row>
        <Row label={`slot (key orientation): ${slot * 90}°`}>
          <input type="range" min={0} max={3} value={slot} onChange={(e) => setSlot(Number(e.target.value) as 0 | 1 | 2 | 3)} />
        </Row>
        <div className="msrr-row-btns">
          <button className="msrr-btn" disabled={!!draftProblem} title={draftProblem ?? ''} onClick={() => draft && addEdge(draft)}>Add lock</button>
          {draftProblem && <span className="msrr-note bad">{draftProblem}</span>}
        </div>
      </Section>

      <Section title="Joint angles">
        <Row label="Module">
          <select className="msrr-select" value={selected} onChange={(e) => setSel(e.target.value)}>
            {config.modules.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Row>
        {selected && JOINTS.map((j) => {
          const v = config.pose[selected][j as keyof ModulePose];
          const lim = isBend(j) ? PLAN_BEND_DEG : 180;
          return (
            <Row key={j} label={`${j}: ${(v - 180).toFixed(0)}°`}>
              <input type="range" min={180 - lim} max={180 + lim} step={1} value={v}
                onChange={(e) => setJoint(selected, j as keyof ModulePose, Number(e.target.value))} />
            </Row>
          );
        })}
      </Section>
    </>
  );
}

/** How far each joint of one module can move from here while the robot stays physically OK. */
function ToleranceBlock({ module }: { module: string }) {
  const config = useV2Store((s) => s.config);
  const [rows, setRows] = useState<JointRange[] | null>(null);
  return (
    <details data-testid="v2-tolerance" style={{ margin: '4px 0' }} onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) setRows(jointTolerance(config, module)); }}>
      <summary className="msrr-note">what can {module} move from here? (each joint alone, 5° steps)</summary>
      {rows && (
        <table style={{ fontSize: 11, width: '100%' }}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.joint} title={`down to ${r.min}°: ${r.why.min}
up to ${r.max}°: ${r.why.max}`}>
                <td>{r.joint}</td><td>now {r.now.toFixed(0)}°</td>
                <td style={{ color: r.max - r.min < 10 ? '#c03434' : undefined }}>{r.min.toFixed(0)}° … {r.max.toFixed(0)}°</td>
                <td className="msrr-note dim">{r.why.min === 'joint limit' && r.why.max === 'joint limit' ? 'free to its limits' : 'stops: ' + [r.why.min, r.why.max].filter((w) => w !== 'joint limit').map((w) => w.split(' (')[0]).join(' / ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}

/**
 * GRAVITY: the robot on screen runs in real MuJoCo physics (the service's phys_world: real pads, fins and
 * receivers, magnets, ST3215 servos, PLA flex, randomized errors). Nothing is judged by rules here:
 * what you see is what gravity does. "with plan" executes the loaded plan's steps the way the robot would.
 */
/** what the run is doing at time t: a plan step (step, verb), or for a transformation the stage under way / last finished */
function caption(ev: PhysRun['events'], t: number): string {
  const now = ev.filter((e) => e.t <= t).slice(-1)[0];
  if (now?.verb) return ` · step ${(now.step ?? 0) + 1}: ${now.verb}${now.latched === false ? ' — did not seat, no lock' : ''}`;
  const next = ev.find((e) => e.t > t);
  if (next) return ` · now: ${next.label.replace(/ (OK|FAILED)$/, '')}${now ? `  (done: ${now.label})` : ''}`;
  return now ? ` · ${now.label}` : '';
}

function GravityBar() {
  const physics = useV2Store((s) => s.physics);
  const busy = useV2Store((s) => s.physBusy);
  const err = useV2Store((s) => s.physErr);
  const plan = useV2Store((s) => s.plan);
  const random = useV2Store((s) => s.physRandom);
  const seed = useV2Store((s) => s.physSeed);
  const setRandom = useV2Store((s) => s.setPhysRandom);
  const setSeed = useV2Store((s) => s.setPhysSeed);
  const gravity = useV2Store((s) => s.gravity);
  const off = useV2Store((s) => s.gravityOff);
  const ev = physics?.pp.run.events ?? [];
  return (
    <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }} data-testid="gravity-bar">
      <button className={`msrr-btn ${physics ? 'danger' : 'primary'}`} data-testid="gravity" disabled={busy}
        onClick={() => (physics ? off() : gravity(false))}>{busy ? 'Simulating…' : physics ? '■ Stop real physics' : '▶ Real physics (gravity)'}</button>
      {plan?.ok && !physics && <button className="msrr-btn" data-testid="gravity-plan" disabled={busy} onClick={() => gravity(true)} title="run the loaded plan in MuJoCo the way the robot would: the real docking brain does every dock (stand-off, align, straight in, lock)">▶ Real physics: run this plan</button>}
      {physics && <button className="msrr-btn small ghost" onClick={() => useV2Store.setState({ physics: { ...physics, t: 0, playing: true } })}>replay</button>}
      <label className="msrr-note" title="every robot slightly different: PLA flex, backlash, servo strength, masses, friction, magnets, floor tilt (the GPU runs' ranges)">
        <input type="checkbox" checked={random} onChange={(e) => setRandom(e.target.checked)} /> random robot
      </label>
      {random && <input className="msrr-select" type="number" style={{ width: 56 }} value={seed} onChange={(e) => setSeed(Number(e.target.value))} title="which random robot" />}
      {physics && <span className="msrr-note dim" data-testid="phys-caption">{physics.live
        // live: one clock (physics keeps running until you stop it); warn only if the picture falls behind the physics
        ? <>● live · {physics.t.toFixed(0)} s{(physics.pp.run.frames.at(-1)?.t ?? 0) - physics.t > 1.5 ? ' · picture behind the physics' : ''}</>
        // a recording: where the playback is / how long it is
        : <>t {physics.t.toFixed(1)} / {(physics.pp.run.frames.at(-1)?.t ?? 0).toFixed(1)} s</>}{caption(ev, physics.t)}</span>}
      {err && <span className="msrr-note bad">{err}</span>}
    </div>
  );
}
