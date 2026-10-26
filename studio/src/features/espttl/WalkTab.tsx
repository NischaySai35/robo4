/**
 * WalkTab — connector-to-connector walking, driven by the TETROBOT brain server (D:\robo4\brain\brain_server.py).
 *
 * The Studio stays the ONLY client of the ESP32 (it serves one connection at a time). Every 60 ms this tab:
 *   1. reads /api/telemetry from the board            (real mode)
 *   2. POSTs the servo angles to the brain /api/tick   (the verified sag-aware docking IK + walker run there)
 *   3. forwards the brain's answer to the board /api/batch
 * When the brain needs the judge (you, until the camera exists) the robot simply holds and a question card appears.
 * Sim mode runs the identical loop against the MuJoCo robot so the whole flow can be rehearsed without hardware.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useEspTtlStore, ttlGet, ttlTry, startTtlPoll, stopTtlPoll, type TtlTelemetry } from '@/state/espTtlStore';

type Mode = 'sim' | 'real';
type Rx = { x: number; y: number; yaw: number };
interface Question { stage: 'hover' | 'seat' | 'out'; text: string }
interface TickReply {
  ok: boolean; error?: string | null; frame: number; cmd: Record<string, number> | null; speed: number; acc: number;
  question: Question | null; logs: string[]; done: boolean; result: boolean | null; stage: string;
  joints_deg: number[] | null; locks_deg: number[] | null; mode: Mode;
  sim?: { t: number; tipA: number[]; tipB: number[]; servos: Record<string, number> };
}
interface BrainConfig { servo_id: Record<string, number>; sign: Record<string, number>; home: Record<string, number>; calibrated: boolean; peel_deg: number; dt_ms: number }

const LS = { url: 'robo4:brain:url', rx: 'robo4:walk:rx', opts: 'robo4:walk:opts' };
const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const DEFAULT_RX: Rx[] = [{ x: 0, y: 0, yaw: 0 }, { x: 250, y: 0, yaw: 0 }, { x: 500, y: 0, yaw: 0 }, { x: 750, y: 0, yaw: 0 }];
const DT_MS = 60;
const JOINT_NAMES = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3'];

async function brain<T = any>(base: string, path: string, body?: unknown, timeoutMs = 30000): Promise<T> {
  const res = await fetch(base.replace(/\/+$/, '') + path, body === undefined
    ? { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j) throw new Error(j?.error || `HTTP ${res.status}`);
  return j as T;
}

export default function WalkTab() {
  const online = useEspTtlStore(s => s.online);
  const [url, setUrl] = useState<string>(() => localStorage.getItem(LS.url) || 'http://127.0.0.1:8770');
  const [cfg, setCfg] = useState<BrainConfig | null>(null);
  const [brainOk, setBrainOk] = useState<boolean | null>(null);
  const [rx, setRx] = useState<Rx[]>(() => load(LS.rx, DEFAULT_RX));
  const [opts, setOpts] = useState(() => load(LS.opts, { mode: 'sim' as Mode, tilt: 0, tiltDir: 0, peel: 6, band: 0.2, humanJudgeInSim: false, mirror: false }));
  const [running, setRunning] = useState(false);
  const [reply, setReply] = useState<TickReply | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [corr, setCorr] = useState('');
  const [msg, setMsg] = useState('');
  const stopRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(LS.url, url); }, [url]);
  useEffect(() => { localStorage.setItem(LS.rx, JSON.stringify(rx)); }, [rx]);
  useEffect(() => { localStorage.setItem(LS.opts, JSON.stringify(opts)); }, [opts]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);
  useEffect(() => () => { stopRef.current = true; }, []);
  const say = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(x => (x === m ? '' : x)), 5000); };

  const check = async () => {
    try { await brain(url, '/api/health', undefined, 3000); setCfg(await brain<BrainConfig>(url, '/api/config', undefined, 3000)); setBrainOk(true); }
    catch { setBrainOk(false); setCfg(null); }
  };
  useEffect(() => { void check(); }, [url]);

  // ── the 60 ms loop ────────────────────────────────────────────────────────────
  const run = async () => {
    if (running) return;
    const real = opts.mode === 'real';
    if (real && !online) { say('board offline — connect the ESP32 first (header above)'); return; }
    setLog([]); setReply(null); stopRef.current = false; setRunning(true);
    try {
      if (real) {
        stopTtlPoll();                                                   // this loop owns the board while walking
        const b = await ttlTry(`/api/servo/deadband?deg=${opts.band}`);   // tight hold: the default ±2.46° is ~1 cm at the tip
        setLog(l => [...l, b.ok ? `servo hold freedom set to ±${opts.band}°` : `could not set hold freedom: ${b.error}`]);
      }
      const st = await brain<{ logs: string[] }>(url, '/api/start', {
        mode: opts.mode, receivers: rx.map(r => [r.x, r.y, r.yaw]), floor_tilt_deg: opts.tilt, floor_tilt_dir_deg: opts.tiltDir,
        peel_deg: opts.peel, judge: !real && opts.humanJudgeInSim ? 'human' : 'auto',
      });
      setLog(l => [...l, ...st.logs]);
      while (!stopRef.current) {
        const t0 = performance.now();
        let servos: Record<string, number> = {};
        if (real) {
          const tel = await ttlGet<TtlTelemetry>('/api/telemetry', 1500);
          useEspTtlStore.getState()._apply(tel, Math.round(performance.now() - t0), null);
          for (const s of tel.servos) if (s.currentAngle != null) servos[String(s.id)] = s.currentAngle;
        }
        const r = await brain<TickReply>(url, '/api/tick', { servos });
        setReply(r);
        if (r.logs.length) setLog(l => [...l, ...r.logs].slice(-400));
        if (!r.ok) { say(`brain: ${r.error}`); break; }
        if (r.cmd && (real || opts.mirror)) {
          const q = Object.entries(r.cmd).map(([id, deg]) => `${id}=${deg.toFixed(2)}`).join('&');
          await ttlGet(`/api/batch?${q}&speed=${r.speed}&acc=${r.acc}`, 1500);
        }
        if (r.done) { say(r.result ? 'walk complete' : 'walk stopped — servos hold their last target'); break; }
        const wait = r.question ? 250 : DT_MS - (performance.now() - t0);  // waiting for the judge: the robot holds, poll slowly
        if (wait > 0) await new Promise(res => setTimeout(res, wait));
      }
    } catch (e: any) {
      say(`stopped: ${e?.message || String(e)} — servos hold their last target`);
    } finally {
      setRunning(false);
      if (real) startTtlPoll();
    }
  };

  const stop = async () => { stopRef.current = true; try { await brain(url, '/api/stop', {}); } catch { /* the loop is stopping anyway */ } };
  const estop = async () => { stopRef.current = true; await ttlTry('/api/command?servo=all&cmd=estop'); try { await brain(url, '/api/stop', {}); } catch { /* */ } };
  const answer = async (text: string) => {
    try { await brain(url, '/api/answer', { text }); setCorr(''); } catch (e: any) { say(`answer failed: ${e?.message || e}`); }
  };

  const setR = (i: number, k: keyof Rx, v: number) => setRx(a => a.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const q = reply?.question;

  return (
    <div>
      <div className="ettl-card">
        <h4>Brain</h4>
        <div className="ettl-row">
          <label className="ettl-lbl">brain server
            <input value={url} onChange={e => setUrl(e.target.value)} style={{ width: 210 }} spellCheck={false} /></label>
          <span className={`ettl-dot ${brainOk ? 'on' : 'off'}`} />
          <span className="ettl-dim">{brainOk == null ? 'checking…' : brainOk ? 'connected' : 'not running — start it: python D:\\robo4\\brain\\brain_server.py'}</span>
          <button className="ettl-btn" onClick={() => void check()}>Re-check</button>
        </div>
        {cfg && <div className="ettl-row ettl-dim">
          servo ids {Object.entries(cfg.servo_id).map(([k, v]) => `${k}=${v}`).join(' ')} · {cfg.calibrated ? 'calibrated (robot_config.json)' : 'NOT calibrated — defaults; run brain\\calibrate.py first'}
        </div>}
      </div>

      <div className="ettl-card">
        <h4>Floor connectors <span className="ettl-dim">— measured from connector 0 (End A starts locked there), mm along the X/Y arrows on the board</span></h4>
        <table className="ettl-table">
          <thead><tr><th className="l">#</th><th>x mm</th><th>y mm</th><th>yaw °</th><th /></tr></thead>
          <tbody>
            {rx.map((r, i) => (
              <tr key={i}>
                <td className="l">{i}{i === 0 ? ' (start)' : ''}</td>
                {(['x', 'y', 'yaw'] as const).map(k => (
                  <td key={k}><input type="number" value={r[k]} disabled={i === 0 || running} style={{ width: 80 }}
                                     onChange={e => setR(i, k, +e.target.value)} /></td>))}
                <td>{i > 0 && <button className="ettl-btn tiny danger" disabled={running} onClick={() => setRx(a => a.filter((_, j) => j !== i))}>remove</button>}</td>
              </tr>))}
          </tbody>
        </table>
        <div className="ettl-row">
          <button className="ettl-btn" disabled={running} onClick={() => setRx(a => [...a, { ...a[a.length - 1], x: a[a.length - 1].x + 250 }])}>+ connector</button>
          <button className="ettl-btn" disabled={running} onClick={() => setRx(DEFAULT_RX)}>reset (4 in a row, 250 mm)</button>
        </div>
      </div>

      <div className="ettl-card">
        <h4>Run</h4>
        <div className="ettl-row">
          <label className="ettl-lbl">mode
            <select value={opts.mode} disabled={running} onChange={e => setOpts(o => ({ ...o, mode: e.target.value as Mode }))}>
              <option value="sim">Sim (MuJoCo robot)</option><option value="real">Real robot</option>
            </select></label>
          <label className="ettl-lbl" title="phone level app on the floor next to the module">floor tilt °
            <input type="number" step={0.1} value={opts.tilt} disabled={running} style={{ width: 60 }} onChange={e => setOpts(o => ({ ...o, tilt: +e.target.value }))} /></label>
          <label className="ettl-lbl" title="downhill direction, from the board X arrow, counter-clockwise">toward °
            <input type="number" value={opts.tiltDir} disabled={running} style={{ width: 60 }} onChange={e => setOpts(o => ({ ...o, tiltDir: +e.target.value }))} /></label>
          <label className="ettl-lbl" title="undock tilt: 4° is the smallest that releases flush magnets (sim); 0 = straight, needs magnets 1 mm deeper">peel °
            <input type="number" value={opts.peel} disabled={running} style={{ width: 50 }} onChange={e => setOpts(o => ({ ...o, peel: +e.target.value }))} /></label>
          <label className="ettl-lbl" title="servo deadband while walking (real mode)">hold ±°
            <input type="number" step={0.1} value={opts.band} disabled={running} style={{ width: 55 }} onChange={e => setOpts(o => ({ ...o, band: +e.target.value }))} /></label>
          {opts.mode === 'sim' && <>
            <label className="ettl-lbl"><input type="checkbox" checked={opts.humanJudgeInSim} disabled={running} onChange={e => setOpts(o => ({ ...o, humanJudgeInSim: e.target.checked }))} />I judge (practice)</label>
            <label className="ettl-lbl" title="also send the sim robot's commands to the real board"><input type="checkbox" checked={opts.mirror} disabled={running} onChange={e => setOpts(o => ({ ...o, mirror: e.target.checked }))} />mirror to robot</label>
          </>}
        </div>
        <div className="ettl-row">
          {!running
            ? <button className="ettl-btn accent big" disabled={!brainOk} onClick={() => void run()}>▶ Start walk</button>
            : <button className="ettl-btn big" onClick={() => void stop()}>■ Stop (hold)</button>}
          <button className="ettl-btn danger big" onClick={() => void estop()}>E-STOP</button>
          {reply && <span className="ettl-dim">
            {reply.stage} · frame {reply.frame} ({(reply.frame * DT_MS / 1000).toFixed(1)} s)
            {reply.joints_deg && <> · {JOINT_NAMES.map((n, i) => `${n} ${reply.joints_deg![i].toFixed(0)}°`).join('  ')}</>}
            {reply.locks_deg && <> · locks {reply.locks_deg.map(v => v.toFixed(0)).join('/')}°</>}
          </span>}
        </div>
      </div>

      {q && (
        <div className="ettl-card" style={{ borderColor: 'var(--accent)' }}>
          <h4>Judge — robot is holding</h4>
          <div className="ettl-row">{q.text}</div>
          {q.stage === 'hover' ? (
            <div className="ettl-row">
              <button className="ettl-btn accent big" onClick={() => void answer('')}>✓ Centred &amp; straight</button>
              <input value={corr} onChange={e => setCorr(e.target.value)} placeholder="x+3 y-2 r+2" style={{ width: 160 }}
                     onKeyDown={e => { if (e.key === 'Enter') void answer(corr); }} />
              <button className="ettl-btn" onClick={() => void answer(corr)}>Send correction</button>
            </div>
          ) : (
            <div className="ettl-row">
              <button className="ettl-btn accent big" onClick={() => void answer('y')}>✓ Yes</button>
              <button className="ettl-btn danger big" onClick={() => void answer('n')}>✗ No</button>
            </div>
          )}
        </div>
      )}

      <div className="ettl-card">
        <h4>Log</h4>
        <div ref={logRef} style={{ maxHeight: 260, overflow: 'auto', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
      {msg && <div className="ettl-toast">{msg}</div>}
    </div>
  );
}
