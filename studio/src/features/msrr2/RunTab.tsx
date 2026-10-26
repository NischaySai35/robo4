/**
 * Run tab (M7) — execute the current plan in DRY_RUN.
 *
 * Every step is compiled to the module ESPs' calls (shown, not sent). Failures can be
 * induced on chosen steps or drawn from the measured success rates; after a failure the
 * executor replans from the robot's TRUE state (in a worker) and carries on.
 */
import { useRef, useState } from 'react';
import { useV2Store } from '@/state/msrrV2Store';
import { executeDryRun, type ExecEvent, type ExecResult, LOCK_OPEN_DEG, LOCK_TURN_DEG } from '@/robotics/msrr2/executor';
import type { Plan } from '@/robotics/msrr2/planner';
import type { Config } from '@/robotics/msrr2/model';
import { Section, Row } from '@/features/msrr/MsrrPanel';

function replanInWorker(from: Config, plan: Plan, onMsg: (m: string) => void): Promise<Plan> {
  return new Promise((resolve) => {
    const w = new Worker(new URL('../../robotics/msrr2/planWorker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { kind: string; msg?: string; plan?: Plan };
      if (d.kind === 'progress') onMsg(d.msg!);
      if (d.kind === 'done') { w.terminate(); resolve(d.plan!); }
    };
    w.postMessage({ kind: 'plan', current: from, target: plan.target, maxExpansions: 6 });
  });
}

export function RunTab() {
  const config = useV2Store((s) => s.config);
  const plan = useV2Store((s) => s.plan);
  const show = useV2Store((s) => s.show);
  const pushLog = useV2Store((s) => s.pushLog);
  const [induce, setInduce] = useState('2');
  const [random, setRandom] = useState(false);
  const [seed, setSeed] = useState(1);
  const [events, setEvents] = useState<ExecEvent[]>([]);
  const [result, setResult] = useState<ExecResult | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const startRef = useRef<Config | null>(null);

  const run = async () => {
    if (!plan?.ok) return;
    setRunning(true); setEvents([]); setResult(null); setStatus('');
    startRef.current = config;
    const idx = induce.split(/[ ,]+/).filter(Boolean).map((x) => Number(x) - 1).filter((x) => x >= 0);
    const r = await executeDryRun(config, plan, {
      induce: idx, randomFailures: random, seed,
      replan: (from) => { setStatus('replanning from the true state…'); return replanInWorker(from, plan, (m) => setStatus(`replanning: ${m}`)); },
      onEvent: (e) => { setEvents((x) => [...x, e]); show(e.trueState, true); },
    });
    setResult(r); setRunning(false); setStatus('');
    pushLog(r.ok ? `dry run reached ${plan.target.name}: ${r.events.length} steps executed, ${r.replans} replan(s)` : `dry run stopped: ${r.why}`);
  };

  if (!plan?.ok) return <Section title="Run"><p className="msrr-note">Make or load a plan in the Plan tab first.</p></Section>;

  return (
    <>
      <Section title="Dry run (nothing is sent to the robot)" info={
        <p className="msrr-note">Each step is compiled to the module ESPs' /api/batch calls with nominal angles (180 = straight; each ESP adds its own manual-home offsets). Lock rotors: {LOCK_OPEN_DEG}° = home (open); locking turns ±{LOCK_TURN_DEG}° (End A one way, End B the other; end↔end: both ends together).</p>
      }>
        <p className="msrr-note dim">Plan: {plan.steps.length} steps to {plan.target.name}, {(plan.totalP * 100).toFixed(1)}% expected.</p>
        <Row label="Fail step(s) #"><input className="msrr-select" data-testid="run-induce" value={induce} onChange={(e) => setInduce(e.target.value)} placeholder="e.g. 2, 5" /></Row>
        <Row label="Random failures"><input type="checkbox" checked={random} onChange={(e) => setRandom(e.target.checked)} /> <span className="msrr-note dim">at each step's measured failure rate</span></Row>
        <Row label="Seed"><input className="msrr-select" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} /></Row>
        <div className="msrr-row-btns">
          <button className="msrr-btn primary" data-testid="run-dry" disabled={running} onClick={run}>{running ? 'Running…' : 'Dry run'}</button>
          {startRef.current && !running && <button className="msrr-btn ghost" onClick={() => show(startRef.current!, true)}>Show start</button>}
        </div>
        {status && <p className="msrr-note dim">{status}</p>}
      </Section>

      {(events.length > 0 || result) && (
        <Section title={result ? (result.ok ? `Reached ${plan.target.name} — ${result.replans} replan(s)` : `Stopped: ${result.why}`) : 'Running…'}>
          <ol style={{ paddingLeft: 18, margin: '6px 0' }} data-testid="run-events">
            {events.map((e, i) => (
              <li key={i} style={{ fontSize: 12, marginBottom: 4, color: e.outcome === 'failed' ? '#d14b4b' : undefined }}>
                <span style={{ cursor: 'pointer' }} onClick={() => { setOpen(open === i ? null : i); show(e.trueState, true); }}>
                  {e.planNo > 0 && <span className="msrr-chip warn">plan {e.planNo + 1}</span>} <b>{e.step.verb}</b> — {e.step.label} · <b>{e.outcome === 'ok' ? 'OK' : 'FAILED'}</b>
                </span>
                {e.outcome === 'failed' && <div className="msrr-note">{e.note}</div>}
                {open === i && <pre className="msrr-note dim" style={{ whiteSpace: 'pre-wrap', fontSize: 10 }}>{e.calls.map((c) => `${c.why}: GET ${c.url}`).join('\n') || '(no controller calls)'}</pre>}
              </li>
            ))}
          </ol>
        </Section>
      )}
    </>
  );
}
