/**
 * Plan tab (M4) — plan from the CURRENT robot to a target shape and play the plan.
 *
 * Planning runs in a Web Worker (it can take minutes). The plan is a list of physical
 * verbs, each with its measured success probability and time; the total success is
 * their product. Risky steps (below 90% or within 10% of a limit) are red.
 */
import { useEffect, useRef, useState } from 'react';
import { useV2Store, PRESETS } from '@/state/msrrV2Store';
import { LIBRARY } from '@/robotics/msrr2/library';
import { DEMO_PLANS } from '@/robotics/msrr2/library/demoPlans';
import type { Plan } from '@/robotics/msrr2/planner';
import type { ShapeEntry, Config } from '@/robotics/msrr2/model';
import { Section, Row } from '@/features/msrr/MsrrPanel';
import { MarginChips } from './V2Panel';
import { toSimPlan, VERIFY_URL } from '@/robotics/msrr2/simScene';

export function PlanTab() {
  const config = useV2Store((s) => s.config);
  const setConfig = useV2Store((s) => s.setConfig);
  const plan = useV2Store((s) => s.plan);
  const setPlan = useV2Store((s) => s.setPlan);
  const planning = useV2Store((s) => s.planning);
  const setPlanning = useV2Store((s) => s.setPlanning);
  const pushLog = useV2Store((s) => s.pushLog);
  const playStep = useV2Store((s) => s.playStep);
  const playing = useV2Store((s) => s.playing);
  const play = useV2Store((s) => s.play);
  const pause = useV2Store((s) => s.pause);
  const seek = useV2Store((s) => s.seek);
  const speed = useV2Store((s) => s.playSpeed);
  const setSpeed = useV2Store((s) => s.setPlaySpeed);

  const nActive = config.modules.filter((m) => !config.unused.includes(m)).length;
  const targets = [...DEMO_PLANS.map((d) => d.target), ...LIBRARY].filter((e, i, a) => a.findIndex((x) => x.id === e.id) === i && e.nModules === nActive);
  const targetId = useV2Store((s) => s.planTargetId);
  const setTargetId = useV2Store((s) => s.setPlanTargetId);
  const target: ShapeEntry | undefined = targets.find((t) => t.id === targetId) ?? targets[0];
  const [progress, setProgress] = useState<string[]>([]);
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => () => workerRef.current?.terminate(), []);

  const run = () => {
    if (!target) return;
    workerRef.current?.terminate();
    const w = new Worker(new URL('../../robotics/msrr2/planWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;
    setPlanning(true); setProgress([]); setPlan(null);
    const t0 = performance.now();
    w.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { kind: string; msg?: string; plan?: Plan };
      if (d.kind === 'progress') setProgress((p) => [...p, d.msg!].slice(-12));
      if (d.kind === 'done') {
        setPlanning(false); setPlan(d.plan!);
        pushLog(d.plan!.ok
          ? `plan to ${target.name}: ${d.plan!.steps.length} steps, ${(d.plan!.totalP * 100).toFixed(1)}% total success, ${d.plan!.totalS.toFixed(0)} s (planned in ${((performance.now() - t0) / 1000).toFixed(0)} s)`
          : `no plan to ${target.name}: ${d.plan!.why[d.plan!.why.length - 1]}`);
        w.terminate();
      }
    };
    w.postMessage({ kind: 'plan', current: config, target, maxExpansions: 6 });
  };

  const [rehearsal, setRehearsal] = useState<Record<string, any> | null>(null);
  const [rehearsing, setRehearsing] = useState(false);
  const [nRobots, setNRobots] = useState(128);
  const rehearse = async () => {
    if (!plan?.ok) return;
    setRehearsing(true); setRehearsal(null);
    try {
      const res = await fetch(`${VERIFY_URL}/rehearse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...toSimPlan(config, plan), n_robots: nRobots, seed: 1 }) });
      const j = await res.json();
      setRehearsal(j);
      pushLog(j.error ? `rehearsal error: ${j.error}` : `MuJoCo rehearsal: ${j.complete}/${j.n_robots} robots finished the plan (${(j.physics_success * 100).toFixed(1)}%), expected with docking ${(j.expected_success * 100).toFixed(1)}%, ${j.seconds} s`);
    } catch {
      setRehearsal({ error: `the verify service is not running — start it with:  py -3.12 C:\TETROBOT\sim\verify_service.py` });
    }
    setRehearsing(false);
  };

  const loadDemo = (i: number) => {
    const d = DEMO_PLANS[i];
    setConfig(d.start as Config);
    setPlan(d.plan as Plan);
    pushLog(`loaded demo plan: ${d.title}`);
  };

  return (
    <>
      {DEMO_PLANS.length > 0 && (
        <Section title="Ready-made plans (computed by the planner)">
          {DEMO_PLANS.map((d, i) => (
            <div key={i} className="msrr-row-btns" style={{ alignItems: 'center' }}>
              <button className="msrr-btn small" data-testid={`demo-${i}`} onClick={() => loadDemo(i)}>Load</button>
              <span className="msrr-note">{d.title} — {(d.plan.totalP * 100).toFixed(1)}%, {d.plan.steps.length} steps</span>
            </div>
          ))}
        </Section>
      )}

      <Section title="Plan from the current robot" info={
        <>
          <p className="msrr-note">The planner moves locks hand over hand: bend (every intermediate pose checked), dock a free end, then peel an old lock off — the robot is one statically-checked piece at every instant. Docking onto a floor receiver is the measured walk step.</p>
          <p className="msrr-note">Cost = −log(success) + λ·time, so the cheapest plan is the most reliable. Success rates come from plannerConfig.json (measured in C:\TETROBOT): end→side 82%, end↔end 75% (unmeasured), air dock 35%, floor dock 97.5%.</p>
        </>
      }>
        <p className="msrr-note dim">Robot now: {nActive} module(s), {config.edges.length} lock(s). Change it in the Robot or Shapes tab.</p>
        <Row label="Start from">
          <select className="msrr-select" value="" onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value); if (p) setConfig(p.config); }}>
            <option value="">— keep the current robot —</option>
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Row>
        <Row label="Target">
          <select className="msrr-select" data-testid="plan-target" value={target?.id ?? ''} onChange={(e) => setTargetId(e.target.value)}>
            {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Row>
        <div className="msrr-row-btns">
          <button className="msrr-btn primary" data-testid="plan-run" disabled={planning || !target} onClick={run}>{planning ? 'Planning…' : 'Plan'}</button>
          {planning && <button className="msrr-btn danger" onClick={() => { workerRef.current?.terminate(); setPlanning(false); }}>Stop</button>}
        </div>
        {planning && <pre className="msrr-note dim" style={{ whiteSpace: 'pre-wrap', fontSize: 10 }}>{progress.join('\n')}</pre>}
      </Section>

      {plan && (
        <Section title={plan.ok ? `Plan to ${plan.target.name}` : 'No plan'}>
          {plan.ok ? (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0' }} data-testid="plan-summary">
                <span className={`msrr-chip ${plan.totalP >= 0.8 ? 'ok' : plan.totalP >= 0.5 ? 'warn' : 'bad'}`}>total success <b>{(plan.totalP * 100).toFixed(1)}%</b></span>
                <span className="msrr-chip">steps <b>{plan.steps.length}</b></span>
                <span className="msrr-chip">time <b>{plan.totalS.toFixed(0)} s</b></span>
              </div>
              <div className="msrr-row-btns">
                <button className="msrr-btn primary" data-testid="plan-play" onClick={playing ? pause : play}>{playing ? 'Pause' : playStep >= plan.steps.length ? 'Replay' : 'Play'}</button>
                <button className="msrr-btn" onClick={() => seek(playStep - 1)}>◀</button>
                <button className="msrr-btn" onClick={() => seek(playStep + 1)}>▶</button>
                <button className="msrr-btn ghost" onClick={() => seek(0)}>Rewind</button>
              </div>
              <Row label={`Speed ${speed.toFixed(1)}x`}><input type="range" min={0.25} max={4} step={0.25} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></Row>
              <ol style={{ paddingLeft: 18, margin: '6px 0' }}>
                {plan.steps.map((s, i) => (
                  <li key={i} onClick={() => seek(i + 1)} style={{ cursor: 'pointer', fontSize: 12, marginBottom: 4, color: s.risky ? '#d14b4b' : undefined, fontWeight: i === playStep ? 700 : 400 }}>
                    <b>{s.verb}</b> — {s.label}
                    <span className="msrr-note dim"> · {(s.successP * 100).toFixed(1)}% · {s.durationS.toFixed(0)} s{s.note ? ` · ${s.note}` : ''}</span>
                    <MarginChips m={s.margins} />
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <ul className="msrr-notes">{plan.why.slice(-6).map((w, i) => <li key={i} className="msrr-note">{w}</li>)}</ul>
          )}
        </Section>
      )}

      {plan?.ok && (
        <Section title="Rehearse in MuJoCo (real contact + servo limits)" info={
          <p className="msrr-note">Runs the plan on many randomized robots (mass ±8%, servo gain ±20% and stall 85–100%, friction ×0.7–1.4, PLA flex and backlash, floor tilt ≤ 1.5°) in the TETROBOT MuJoCo model. Locks are weld constraints switched on at dock and off at peel. The docking controller itself is not re-run: dock success multiplies in the measured rates.</p>
        }>
          <Row label={`Robots ${nRobots}`}><input type="range" min={8} max={256} step={8} value={nRobots} onChange={(e) => setNRobots(Number(e.target.value))} /></Row>
          <div className="msrr-row-btns">
            <button className="msrr-btn" data-testid="plan-rehearse" disabled={rehearsing} onClick={rehearse}>{rehearsing ? 'Rehearsing…' : 'Rehearse in MuJoCo'}</button>
          </div>
          {rehearsal?.error && <p className="msrr-note" style={{ color: '#d14b4b' }}>{rehearsal.error}</p>}
          {rehearsal && !rehearsal.error && (
            <div data-testid="rehearsal">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0' }}>
                <span className={`msrr-chip ${rehearsal.physics_success >= 0.9 ? 'ok' : rehearsal.physics_success >= 0.5 ? 'warn' : 'bad'}`}>physics <b>{rehearsal.complete}/{rehearsal.n_robots}</b></span>
                <span className="msrr-chip">with docking <b>{(rehearsal.expected_success * 100).toFixed(1)}%</b></span>
                <span className="msrr-chip">{rehearsal.seconds} s</span>
              </div>
              <ol style={{ paddingLeft: 18, margin: '6px 0' }}>
                {rehearsal.steps.map((s: any, i: number) => (
                  <li key={i} style={{ fontSize: 11, color: s.physics_success < 0.9 ? '#d14b4b' : undefined }}>
                    {s.verb}: {s.passed}/{s.robots} · torque peak {s.torque_peak_pct}% · off-track ≤ {s.track_mm_max} mm{s.dock_err_mm_mean ? ` · dock err ${s.dock_err_mm_mean} mm` : ''}
                    {Object.entries(s.failures ?? {}).map(([w, n]) => <div key={w} className="msrr-note dim">{String(n)}× {w}</div>)}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Section>
      )}
    </>
  );
}
