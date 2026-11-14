/**
 * EspTtlPage — the Studio's console for the module boards (ESP32-C3). The boards only send data and take commands.
 *
 * The module strip on top lists every module (found by the radio gateway, or typed in); the per-module tabs (Control,
 * Servo tools, Config, Wi-Fi, Log) show the one picked. Animation works on ALL online modules at once. Live control,
 * servo discovery and renumbering, config, Wi-Fi, firmware upload, log — plus
 * the pose timeline, which only exists here because it needs memory the board does not
 * have. The board stays a thin executor; the thinking is on this side of the wire.
 */
import { Input, NativeSelect } from '@/components/ui/input';
import { TabBar } from '@/components/ui/tab-bar';
import { Button } from '@/components/ui/button';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { speak } from '@/features/voice/speech';
import {
  useEspTtlStore, startTtlPoll, stopTtlPoll, ttlTry, ttlUrl, ttlTryAll, ttlTargets, TtlScope, useTtlScope, nodeLabel, nodeModule,
  type TtlTab, type TtlServo,
} from '@/state/espTtlStore';
import { GATEWAY_URL } from '@/state/espNodesStore';
import AnimationTab from './AnimationTab';
import MiniTimeline from './MiniTimeline';
import TorqueSwitch from './TorqueSwitch';
import WalkTab from './WalkTab';
import ModuleStrip, { sortedNodes } from '@/features/servo/ModuleStrip';
import { useEspNodesStore, type EspNode } from '@/state/espNodesStore';
import SpeedCap from './SpeedCap';
import { estopAllNodes } from '@/features/servo/servoLink';
import './EspTtl.css';

const TABS: { id: TtlTab; label: string }[] = [
  { id: 'control',   label: 'Control' },
  { id: 'animation', label: 'Animation' },
  { id: 'walk',      label: 'Walk (brain)' },
  { id: 'tools',     label: 'Servo tools' },
  { id: 'config',    label: 'Config' },
  { id: 'wifi',      label: 'Wi-Fi' },
  { id: 'ota',       label: 'Firmware' },
  { id: 'log',       label: 'Log' },
];

export default function EspTtlPage() {
  const { tab, tel, online, latencyMs, lastError, focus, toggleFocus, setTab } = useEspTtlStore();
  const nodes = useEspNodesStore(s => s.nodes);
  const focused = focus ? nodes.find(n => n.id === focus) : null;

  // Show the modules while this page is open. The shared reader (espPoll) does the asking and the finding.
  useEffect(() => { const stop = startTtlPoll(); return () => { stop(); stopTtlPoll(); }; }, []);

  return (
    <div className="ettl" data-ui="a">
      <header className="ettl-head">
        <span className="ettl-title">ESP-TTL</span>
        {/* default = ALL modules; click one = only that one, click it again = all (Nischay 12 Nov) */}
        <ModuleStrip selectedId={focus} onSelect={toggleFocus} />
        <span className="ettl-chip" data-testid="ttl-target"
              title="Click a module to send only to it; click it again to go back to all modules">
          {focused ? `sending to ${nodeLabel(focused)} only` : `sending to all ${new Set(nodes.map(nodeModule)).size} modules`}
        </span>
        <SpeedCap />
        {focused && <>
        <span className={`ettl-dot ${online ? 'on' : 'off'}`} />
        <span className="ettl-dim">{online ? 'connected' : (lastError || 'offline')}</span>
        </>}
        {focused && tel && <>
          <span className="ettl-chip">fw {tel.fw}</span>
          <span className="ettl-chip">{tel.wifi.hostname}.local · {tel.wifi.ip}</span>
          <span className="ettl-chip">{tel.wifi.rssi} dBm</span>
          <span className="ettl-chip">{Math.round(tel.heap / 1024)}k heap</span>
          <span className="ettl-chip">{latencyMs} ms</span>
          <span className="ettl-chip">{tel.servos.length} servos</span>
          {(tel as any).deadbandDeg != null &&
            <span className="ettl-chip" title="servo deadband — error smaller than this is ignored by the servo">
              ±{(tel as any).deadbandDeg}° band</span>}
        </>}
        <span style={{ flex: 1 }} />
        <Button size="lg" className="tw:bg-destructive tw:text-white tw:hover:bg-destructive/85 tw:font-bold"
                title="every module, not just the one shown" onClick={() => void estopAllNodes()}>E-STOP ALL</Button>
      </header>

      <TabBar value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t.id, label: t.label }))} />

      <div className="ettl-body">
        {tab === 'control'   && <ControlTab />}
        {tab === 'animation' && <AnimationTab />}
        {tab === 'walk'      && <WalkTab />}
        {tab === 'tools'     && <PerModule>{() => <ToolsTab />}</PerModule>}
        {tab === 'config'    && <PerModule>{() => <ConfigTab />}</PerModule>}
        {tab === 'wifi'      && <PerModule>{() => <WifiTab />}</PerModule>}
        {tab === 'ota'       && <OtaTab />}
        {tab === 'log'       && <LogTab />}
      </div>
    </div>
  );
}

/** Shared: run a call and surface the outcome in a small status line. */
/** Inside a module's own section (PerModule) a button goes to THAT module; elsewhere to every target module (all by default,
 *  or the one picked at the top), asking first if one of them is offline. */
function useSay() {
  const scope = useContext(TtlScope);
  const [msg, setMsg] = useState('');
  const say = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(x => (x === m ? '' : x)), 4000); };
  const call = async (path: string, label: string) => {
    const r = scope ? await ttlTry(path, 6000, scope.url) : await ttlTryAll(path);
    if (r.error === 'cancelled') return r;
    say(r.ok ? `${label} ok` : `${label} failed: ${r.error}`);
    return r;
  };
  return { msg, say, call };
}

/** One section per target module (all modules, or the one picked at the top), each with that module's own data and calls. */
function PerModule({ children }: { children: () => React.ReactNode }) {
  useEspTtlStore(s => s.focus);                  // redraw when the selection changes
  useEspNodesStore(s => s.nodes);                // and when a module comes / goes
  const ts = ttlTargets();
  if (!ts.length) return <div className="ettl-card ettl-dim">No module yet - add one with + Board.</div>;
  return <>{ts.map(n => (
    <TtlScope.Provider key={n.id} value={n}>
      <div className="ettl-modhead" data-testid={`ttl-mod-${nodeModule(n)}`}>
        <span className={`ettl-dot ${n.connected ? 'on' : 'off'}`} /> <b>{nodeLabel(n)}</b>
        <span className="ettl-dim"> {n.connected ? `online${n.latencyMs != null ? ` · ${n.latencyMs} ms` : ''}` : 'offline'}</span>
      </div>
      {children()}
    </TtlScope.Provider>
  ))}</>;
}

function readNum(key: string, dflt: number) {
  try { const v = Number(localStorage.getItem(key)); return Number.isFinite(v) && v > 0 ? v : dflt; } catch { return dflt; }
}

// ── Control ───────────────────────────────────────────────────────────────────
function ControlTab() {
  const { msg, say, call } = useSay();
  // Remembered: the tab used to forget them on every tab switch and quietly move at 5 / 20 again.
  const [speed, setSpeed] = useState(() => readNum('robo4:esptt:speed', 5));
  const [acc, setAcc]     = useState(() => readNum('robo4:esptt:acc', 20));
  useEffect(() => { try { localStorage.setItem('robo4:esptt:speed', String(speed)); localStorage.setItem('robo4:esptt:acc', String(acc)); } catch { /* private window */ } }, [speed, acc]);
  const [band, setBand] = useState('0.1');
  const deadband = (useEspTtlStore(s => s.tel) as any)?.deadbandDeg ?? 2.46;

  return (
    <div>
      <div className="ettl-card">
        <h4>All joints</h4>
        <div className="ettl-row">
          <label className="ettl-lbl">speed<Input size="xs" className="tw:w-auto" type="number" min={1} max={10} value={speed}
                 onChange={e => setSpeed(+e.target.value)} style={{ width: 60 }} /></label>
          <label className="ettl-lbl">acc<Input size="xs" className="tw:w-auto" type="number" min={1} max={100} value={acc}
                 onChange={e => setAcc(+e.target.value)} style={{ width: 60 }} /></label>
          <span className="ettl-sep" />
          <TorqueSwitch say={say} all />
          <span className="ettl-sep" />
          <Button variant="outline" size="sm" onClick={() => call('/api/home', 'home 180')}>Home → 180°</Button>
          <Button size="sm" onClick={() => call('/api/home/manual', 'manual home')}>Manual home</Button>
          <Button variant="outline" size="sm" onClick={() => { if (confirm('Overwrite the home positions saved on the board with the current pose? The old homes are lost.')) call('/api/home/set', 'set home'); }}>Set current as home</Button>
          <Button variant="outline" size="sm" onClick={() => call('/api/servo/tune', 're-tune')}>Re-tune hold</Button>
        </div>
        <div className="ettl-row">
          <label className="ettl-lbl" title="Error smaller than this is ignored by the servo — it stops correcting inside the band">
            hold freedom ±
            <Input size="xs" className="tw:w-auto" type="number" min={0} max={17} step={0.1} value={band}
                   onChange={e => setBand(e.target.value)} style={{ width: 70 }} />°
          </label>
          <Button size="sm" onClick={async () => {
            const r = await call(`/api/servo/deadband?deg=${band}`, 'hold freedom');
            if (r.ok && r.data?.deg) setBand(String(r.data.deg));
          }}>Apply to all servos</Button>
          <span className="ettl-dim">
            now ±{deadband}° · tighter holds more precisely but can hunt and heat; wider lets the joint sag
          </span>
        </div>
      </div>

      <MiniTimeline say={say} />

      <PerModule>{() => <ServoTable speed={speed} acc={acc} />}</PerModule>
      {msg && <div className="ettl-toast">{msg}</div>}
    </div>
  );
}

/** One module's servo table (inside PerModule): its own telemetry, its own calls. */
function ServoTable({ speed, acc }: { speed: number; acc: number }) {
  const sc = useTtlScope();
  const { msg, call } = useSay();
  const servos = sc.tel?.servos ?? [];
  const deadband = (sc.tel as any)?.deadbandDeg ?? 2.46;
  const move = (s: TtlServo, deg: number) => { void sc.tryp(`/api/command?servo=${s.id}&cmd=pos&angle=${deg}&speed=${speed}&acc=${acc}`); };
  return (
    <>
      <div className="ettl-card">
        <h4>Servos</h4>
        <div className="ettl-wrap">
          {/* Fixed column widths: live numbers changing width must never move the sliders. */}
          <table className="ettl-table ettl-servos">
            <colgroup>
              <col className="c-id" /><col className="c-label" /><col className="c-num" /><col className="c-num" /><col className="c-num" />
              <col /><col className="c-sm" /><col className="c-sm" /><col className="c-sm" /><col className="c-sm" /><col className="c-mode" /><col className="c-act" />
            </colgroup>
            <thead><tr>
              <th className="l">id</th><th className="l">label</th><th>angle</th><th>target</th><th title="actual − target · positive = pushed past it, negative = sagging below it">err°</th>
              <th className="grow">set</th>
              <th>load</th><th>mA</th><th>V</th><th>°C</th><th>mode</th><th className="l">actions</th>
            </tr></thead>
            <tbody>
              {servos.map(s => (
                <tr key={s.id}>
                  <td className="l">{s.id}</td>
                  <td className="l">{s.label}</td>
                  <td style={{ color: s.connected ? (s.moving ? 'var(--accent)' : 'var(--text)') : 'var(--danger)' }}>
                    {s.currentAngle?.toFixed(1) ?? '—'}
                  </td>
                  <td>{s.targetAngle?.toFixed(1) ?? '—'}</td>
                  <td style={{ color: errColor(s, deadband) }}>{errOf(s)}</td>
                  <td className="grow">
                    <AngleCell s={s} onCommit={v => move(s, v)} />
                  </td>
                  <td>{s.loadAbs}</td>
                  <td>{s.currentmA ?? '—'}</td>
                  <td>{s.voltageV ?? '—'}</td>
                  <td style={{ color: (s.tempC ?? 0) > 55 ? 'var(--danger)' : undefined }}>{s.tempC ?? '—'}</td>
                  <td>{s.mode}{s.torque ? '' : ' /off'}</td>
                  <td className="l">
                    <Button variant="outline" size="xs" onClick={() => call(`/api/servo/home?id=${s.id}&to180=1`, '180')}>180</Button>
                    <Button variant="outline" size="xs" onClick={() => call(`/api/servo/home?id=${s.id}`, 'home')}>
                      home {s.home != null ? `${(+s.home).toFixed(0)}°` : ''}
                    </Button>
                    <Button variant="outline" size="xs" onClick={() => call(`/api/home/set?id=${s.id}`, 'set home')}>set</Button>
                    <Button variant="outline" size="xs" onClick={() => call(`/api/identify?id=${s.id}`, 'identify')}>identify</Button>
                    <Button variant="destructive" size="xs" onClick={() => call(`/api/command?servo=${s.id}&cmd=stop`, 'stop')}>stop</Button>
                  </td>
                </tr>
              ))}
              {!servos.length && <tr><td colSpan={11} className="l ettl-dim">no servos — run a scan in Servo tools</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {msg && <div className="ettl-toast">{msg}</div>}
    </>
  );
}

/**
 * Holding error, signed as (actual - target): negative means the joint is sitting BELOW
 * where it was told, which is what gravity droop looks like; positive means it has been
 * pushed past. The sign is the useful part — magnitude alone cannot tell you which way a
 * joint is losing.
 */
function errOf(s: TtlServo) {
  if (s.currentAngle == null || s.targetAngle == null) return '—';
  const e = s.currentAngle - s.targetAngle;
  return (e > 0 ? '+' : e < 0 ? '−' : '') + Math.abs(e).toFixed(2);
}
/* Coloured against the servos' ACTUAL deadband, reported by the board — inside the band the
   servo is not even trying, so that is "fine", not "close". A hardcoded threshold here would
   go wrong the moment the deadband is retuned. */
function errColor(s: TtlServo, deadband: number) {
  if (s.currentAngle == null || s.targetAngle == null) return 'var(--text-dim)';
  if (!s.torque) return 'var(--text-dim)';          // a limp joint is not trying to hold
  const e = Math.abs(s.targetAngle - s.currentAngle);
  if (e <= deadband) return 'var(--success, #3fb950)';
  return e <= deadband * 2 ? '#d29922' : 'var(--danger)';
}

/**
 * One joint's control: slider, whole-degree steppers, and a typed box.
 *
 * The displayed value follows the BOARD, not a local copy. An earlier version kept a
 * "draft" per servo that was written on every interaction and never cleared, so once you
 * touched a joint its slider froze at whatever you last set — even after the firmware
 * clamped the command to the joint's limits, or the servo failed to get there. The control
 * then disagreed with the angle column right next to it.
 *
 * So a local value exists only while you are actually holding the slider or typing in the
 * box. The moment you let go, it goes back to mirroring the board: the commanded target
 * while the joint is holding, or the live angle while it is limp and being posed by hand.
 */
function AngleCell(props: { s: TtlServo; onCommit: (v: number) => void }) {
  const { s } = props;
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState(0);
  const [typed, setTyped] = useState<string | null>(null);

  // While limp the joint is being moved by hand, so the live angle is the truth. While
  // holding, what it was TOLD is the truth — that is what the slider represents.
  const live = (s.torque ? (s.targetAngle ?? s.currentAngle) : s.currentAngle) ?? 180;
  const shown = dragging ? draft : live;

  const clamp = (v: number) => Math.min(s.max, Math.max(s.min, v));

  const step = (dir: 1 | -1) => {
    // Snap to the next whole degree rather than adding 1.0 to a fractional angle.
    props.onCommit(clamp(dir > 0 ? Math.floor(live) + 1 : Math.ceil(live) - 1));
  };

  const commitTyped = () => {
    if (typed === null) return;
    const v = parseFloat(typed);
    setTyped(null);
    if (Number.isFinite(v)) props.onCommit(clamp(v));
  };

  const release = (v: number) => { setDragging(false); props.onCommit(clamp(v)); };

  return (
    <div className="ettl-angle">
      <Button variant="outline" size="sm" onClick={() => step(-1)} title="one degree down">−</Button>
      <input className="ettl-slider" type="range" min={s.min} max={s.max} step={0.5}
             value={shown}
             onPointerDown={() => { setDraft(live); setDragging(true); }}
             onChange={e => { setDraft(+e.target.value); setDragging(true); }}
             onMouseUp={e => release(+(e.target as HTMLInputElement).value)}
             onTouchEnd={e => release(+(e.target as HTMLInputElement).value)}
             onBlur={() => setDragging(false)} />
      <Button variant="outline" size="sm" onClick={() => step(1)} title="one degree up">+</Button>
      <Input size="xs" className="tw:w-[78px] tw:flex-none tw:text-right tw:tabular-nums" type="number" step={0.5} min={s.min} max={s.max}
             value={typed ?? shown.toFixed(1)}
             onChange={e => setTyped(e.target.value)}
             onKeyDown={e => { if (e.key === 'Enter') { commitTyped(); (e.target as HTMLInputElement).blur(); } }}
             onBlur={commitTyped}
             title="type an angle and press Enter" />
      <span className="ettl-dim">°</span>
    </div>
  );
}

// ── Servo tools ───────────────────────────────────────────────────────────────
function ToolsTab() {
  const { msg, say, call } = useSay();
  const sc = useTtlScope();
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<any[]>([]);
  const [at, setAt] = useState(0);
  const [manual, setManual] = useState(false);
  const [oldId, setOldId] = useState('');
  const [newId, setNewId] = useState('2');
  const [reg, setReg] = useState({ id: '1', addr: '56', len: '2', val: '0', unlock: false });
  const [regOut, setRegOut] = useState('');

  const detect = async (adopt: boolean) => {
    setScanning(true); setFound([]); setManual(false); setOldId('');
    const r = await sc.tryp(`/api/scan?from=1&to=253&adopt=${adopt ? 1 : 0}`);
    if (!r.ok) { setScanning(false); say('scan refused: ' + r.error); return; }
    const poll = async () => {
      try {
        const d = await sc.get('/api/scan/status');
        setFound(d.found || []); setAt(d.at || 0);
        if (d.active) { window.setTimeout(poll, 200); return; }
        setScanning(false);
        const f = d.found || [];
        say(f.length ? `${f.length} servo(s): ${f.map((x: any) => x.id).join(', ')}` : 'nothing answered');
        if (f.length === 1) setOldId(String(f[0].id));
      } catch { window.setTimeout(poll, 600); }
    };
    window.setTimeout(poll, 250);
  };

  const writeId = async () => {
    const from = +oldId, to = +newId;
    if (!(from >= 1 && from <= 253) || !(to >= 1 && to <= 253)) { say('IDs must be 1..253'); return; }
    const dup = found.some(f => f.id === to);
    if (dup && !confirm(`ID ${to} is ALREADY on this bus.\n\nGoing ahead leaves two servos sharing it, and no scan can tell them apart.\n\nReally continue?`)) return;
    if (!confirm(`Change servo ${from} to ID ${to}?`)) return;
    const r = await sc.tryp(`/api/servo/setid?from=${from}&to=${to}${dup ? '&force=1' : ''}`);
    say(r.ok && r.data?.ok ? `wrote ${from} → ${to}` : `failed: ${r.data?.error || r.error}`);
    setFound([]); setOldId(''); setManual(false);   // stale by definition — detect again
  };

  const one = found.length === 1;

  return (
    <div>
      <div className="ettl-card">
        <h4>Detect servos on the bus</h4>
        <div className="ettl-row">
          <Button size="sm" onClick={() => detect(false)} disabled={scanning}>
            {scanning ? `Detecting… id ${at}/253` : 'Detect (read-only)'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => detect(true)} disabled={scanning}
                  title="Scan and adopt the result as the board's servo list">Scan &amp; adopt</Button>
          <span className="ettl-sep" />
          <div className="ettl-leds">
            {scanning && <span className="ettl-led busy"><i />scanning</span>}
            {!scanning && found.length === 0 && <span className="ettl-led"><i />idle</span>}
            {found.map(f => <span key={f.id} className={`ettl-led ${one ? 'ok' : 'warn'}`}><i />id {f.id}</span>)}
          </div>
        </div>
        {found.length > 1 && !manual && (
          <div className="ettl-warn">
            {found.length} servos answered. The write is addressed to one ID, so it is safe when
            IDs are unique — press Continue to type the old and new ID yourself.
            <Button variant="outline" size="sm" style={{ marginLeft: 10 }} onClick={() => { setManual(true); setOldId(String(found[0].id)); }}>
              Continue anyway
            </Button>
          </div>
        )}
      </div>

      <div className="ettl-card">
        <h4>Change a servo ID</h4>
        <div className="ettl-row">
          <label className="ettl-lbl">current ID
            <Input size="xs" className="tw:w-auto" value={oldId} onChange={e => setOldId(e.target.value)}
                   disabled={!(one || manual)} style={{ width: 70 }} placeholder="—" />
          </label>
          <label className="ettl-lbl">new ID
            <Input size="xs" className="tw:w-auto" type="number" min={1} max={253} value={newId}
                   onChange={e => setNewId(e.target.value)}
                   disabled={!(one || manual)} style={{ width: 70 }} />
          </label>
          <Button size="sm" onClick={writeId} disabled={!(one || manual) || !oldId}>Send</Button>
        </div>
        <p className="ettl-hint">
          Detect first — Send unlocks only after it. A single servo fills the old ID in for you;
          with several, press Continue anyway. The firmware refuses an ID it never saw, and warns
          before creating a duplicate.
        </p>
      </div>

      <div className="ettl-card">
        <h4>Calibration</h4>
        <div className="ettl-row">
          <label className="ettl-lbl">id<Input size="xs" className="tw:w-auto" id="calid" defaultValue="1" style={{ width: 60 }} /></label>
          <Button variant="outline" size="sm" onClick={() => call(
            `/api/servo/center?id=${(document.getElementById('calid') as HTMLInputElement)?.value}`, 'centre')}>
            Set current position = centre
          </Button>
          <Button variant="outline" size="sm" onClick={() => call(
            `/api/identify?id=${(document.getElementById('calid') as HTMLInputElement)?.value}`, 'identify')}>
            Identify (wiggle)
          </Button>
        </div>
      </div>

      <div className="ettl-card">
        <h4>Raw register peek / poke</h4>
        <div className="ettl-row">
          <label className="ettl-lbl">id<Input size="xs" className="tw:w-auto" value={reg.id} onChange={e => setReg({ ...reg, id: e.target.value })} style={{ width: 55 }} /></label>
          <label className="ettl-lbl">addr<Input size="xs" className="tw:w-auto" value={reg.addr} onChange={e => setReg({ ...reg, addr: e.target.value })} style={{ width: 60 }} /></label>
          <label className="ettl-lbl">width
            <NativeSelect size="xs" className="tw:w-auto" value={reg.len} onChange={e => setReg({ ...reg, len: e.target.value })}>
              <option value="1">byte</option><option value="2">word</option>
            </NativeSelect>
          </label>
          <Button variant="outline" size="sm" onClick={async () => {
            const r = await sc.tryp(`/api/servo/read?id=${reg.id}&addr=${reg.addr}&len=${reg.len}`);
            setRegOut(JSON.stringify(r.data ?? r.error, null, 1));
          }}>Read</Button>
          <label className="ettl-lbl">value<Input size="xs" className="tw:w-auto" value={reg.val} onChange={e => setReg({ ...reg, val: e.target.value })} style={{ width: 70 }} /></label>
          <label className="ettl-toggle">
            <input type="checkbox" checked={reg.unlock} onChange={e => setReg({ ...reg, unlock: e.target.checked })} />
            <span />unlock EPROM
          </label>
          <Button variant="destructive" size="sm" onClick={async () => {
            const r = await sc.tryp(`/api/servo/write?id=${reg.id}&addr=${reg.addr}&len=${reg.len}&val=${reg.val}&unlock=${reg.unlock ? 1 : 0}`);
            setRegOut(JSON.stringify(r.data ?? r.error, null, 1));
          }}>Write</Button>
        </div>
        <pre className="ettl-pre">{regOut || '—'}</pre>
        <p className="ettl-hint">
          ST3215 map: 5=ID 6=baud 9/10=min-angle 11/12=max-angle 31/32=offset 33=mode 40=torque-enable
          55=lock 56/57=position 62/63=load 69=voltage. Any test you can express as a register write
          needs no re-flash.
        </p>
      </div>
      {msg && <div className="ettl-toast">{msg}</div>}
    </div>
  );
}

// ── Config ────────────────────────────────────────────────────────────────────
function ConfigTab() {
  const { msg, say, call } = useSay();
  const sc = useTtlScope();
  const [cfg, setCfg] = useState<any>(null);
  const load = async () => { const r = await sc.tryp('/api/config'); if (r.ok) setCfg(r.data); else say(r.error!); };
  useEffect(() => { void load(); }, []);

  if (!cfg) return <div className="ettl-card"><h4>Config</h4><div className="ettl-dim">loading…</div></div>;

  const save = async () => {
    const rows = (cfg.servos || []).map((s: any) => `${s.id}:${s.label}:${s.min}:${s.max}`).join('|');
    const q = `/api/config/set?host=${encodeURIComponent(cfg.host)}&baud=${cfg.baud}`
            + `&servos=${encodeURIComponent(rows)}`;
    const r = await sc.tryp(q);
    say(r.ok ? 'config saved to the board' : 'save failed: ' + r.error);
    void load();
  };
  const patch = (i: number, k: string, v: any) => {
    const servos = [...cfg.servos]; servos[i] = { ...servos[i], [k]: v }; setCfg({ ...cfg, servos });
  };

  return (
    <div>
      <div className="ettl-card">
        <h4>Identity &amp; bus</h4>
        <div className="ettl-row">
          <label className="ettl-lbl">mDNS host<Input size="xs" className="tw:w-auto" value={cfg.host} onChange={e => setCfg({ ...cfg, host: e.target.value })} style={{ width: 120 }} /></label>
          <label className="ettl-lbl">bus baud<Input size="xs" className="tw:w-auto" type="number" value={cfg.baud} onChange={e => setCfg({ ...cfg, baud: +e.target.value })} style={{ width: 110 }} /></label>

        </div>
      </div>
      <div className="ettl-card">
        <h4>Servo table</h4>
        <table className="ettl-table">
          <thead><tr><th>id</th><th className="l">label</th><th>min°</th><th>max°</th><th /></tr></thead>
          <tbody>
            {(cfg.servos || []).map((s: any, i: number) => (
              <tr key={i}>
                <td><Input size="xs" className="tw:w-auto" type="number" value={s.id} onChange={e => patch(i, 'id', +e.target.value)} style={{ width: 60 }} /></td>
                <td className="l"><Input size="xs" className="tw:w-auto" value={s.label} onChange={e => patch(i, 'label', e.target.value)} style={{ width: 90 }} /></td>
                <td><Input size="xs" className="tw:w-auto" type="number" value={s.min} onChange={e => patch(i, 'min', +e.target.value)} style={{ width: 70 }} /></td>
                <td><Input size="xs" className="tw:w-auto" type="number" value={s.max} onChange={e => patch(i, 'max', +e.target.value)} style={{ width: 70 }} /></td>
                <td><Button variant="destructive" size="xs"
                    onClick={() => setCfg({ ...cfg, servos: cfg.servos.filter((_: any, k: number) => k !== i) })}>✕</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ettl-row">
          <Button variant="outline" size="sm" onClick={() => setCfg({ ...cfg, servos: [...cfg.servos, { id: 1, label: 'J?', min: 0, max: 360 }] })}>+ add</Button>
          <Button size="sm" onClick={save}>Save to board (NVS)</Button>
          <Button variant="outline" size="sm" onClick={() => call('/api/reboot', 'reboot')}>Reboot board</Button>
        </div>
      </div>
      {msg && <div className="ettl-toast">{msg}</div>}
    </div>
  );
}

// ── Wi-Fi ─────────────────────────────────────────────────────────────────────
function WifiTab() {
  const { msg, say, call } = useSay();
  const sc = useTtlScope();
  const [w, setW] = useState<any>(null);
  const [nets, setNets] = useState<any[] | null>(null);
  const [pw, setPw] = useState<Record<number, string>>({});
  const [ssid, setSsid] = useState<Record<number, string>>({});
  const load = async () => { const r = await sc.tryp('/api/wifi'); if (r.ok) { setW(r.data); setSsid({ ...(r.data.slots || []).reduce((o: any, s: string, i: number) => (o[i] = s, o), {}) }); } };
  useEffect(() => { void load(); }, []);

  return (
    <div>
      <div className="ettl-card">
        <h4>Saved networks</h4>
        {(w?.slots ?? ['', '', '']).map((_: string, i: number) => (
          <div className="ettl-row" key={i}>
            <span className="ettl-lbl">slot {i}</span>
            <Input size="xs" className="tw:w-auto" value={ssid[i] ?? ''} placeholder="ssid" onChange={e => setSsid({ ...ssid, [i]: e.target.value })} style={{ width: 170 }} />
            <Input size="xs" className="tw:w-auto" type="password" placeholder="password (blank = keep)" value={pw[i] ?? ''}
                   onChange={e => setPw({ ...pw, [i]: e.target.value })} style={{ width: 190 }} />
            <Button size="sm" onClick={async () => {
              await call(`/api/wifi/set?slot=${i}&ssid=${encodeURIComponent(ssid[i] || '')}&pass=${encodeURIComponent(pw[i] || '')}`, 'saved');
              setPw({ ...pw, [i]: '' }); void load();
            }}>Save</Button>
            <Button variant="destructive" size="sm" onClick={async () => {
              await call(`/api/wifi/set?slot=${i}&ssid=&pass=&force=1`, 'cleared'); void load();
            }}>Clear</Button>
          </div>
        ))}
        <div className="ettl-row">
          <Button variant="outline" size="sm" onClick={() => call('/api/wifi/reconnect', 'reconnect')}>Reconnect now</Button>
          <span className="ettl-dim">{w ? `${w.drops} drops · AP ${w.apUp ? 'up' : 'down'} (${w.apName})` : ''}</span>
        </div>
      </div>
      <div className="ettl-card">
        <h4>Nearby networks</h4>
        <div className="ettl-row">
          <Button variant="outline" size="sm" onClick={async () => {
            setNets(null); const r = await sc.tryp('/api/wifi/scan', 15000);
            if (r.ok) setNets(r.data.nets); else say('scan failed: ' + r.error);
          }}>Scan</Button>
        </div>
        {nets && (
          <table className="ettl-table">
            <thead><tr><th className="l">ssid</th><th>rssi</th><th>ch</th><th /></tr></thead>
            <tbody>{nets.map((n, i) => (
              <tr key={i}><td className="l">{n.ssid}</td><td>{n.rssi}</td><td>{n.ch}</td>
                <td><Button variant="outline" size="xs" onClick={() => setSsid({ ...ssid, 0: n.ssid })}>use in slot 0</Button></td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {msg && <div className="ettl-toast">{msg}</div>}
    </div>
  );
}

// ── Firmware ──────────────────────────────────────────────────────────────────
function OtaTab() {
  const nodes = sortedNodes(useEspNodesStore(s => s.nodes));
  const [pick, setPick] = useState<Set<string>>(() => new Set(ttlTargets().filter(n => n.connected).map(n => n.id)));
  const [rows, setRows] = useState<Record<string, { pct: number; stat: string; err: boolean }>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const row = (id: string, r: { pct: number; stat: string; err: boolean }) => setRows(x => ({ ...x, [id]: r }));
  const space = (n: EspNode) => (n.telemetry as any)?.otaSpace ?? 0;

  /** One module: POST the file, report progress. Resolves when the board answered (or the link dropped). */
  const uploadOne = (n: EspNode, f: File) => new Promise<boolean>(resolve => {
    const fd = new FormData(); fd.append('f', f, f.name);
    const x = new XMLHttpRequest();
    x.open('POST', `${n.url.replace(/\/+$/, '')}/api/ota?size=${f.size}`);
    x.upload.onprogress = e => {
      const p = (e.loaded / e.total) * 100;
      row(n.id, { pct: p, err: false, stat: p >= 100 ? 'sent 100% — board is verifying…' : `${p.toFixed(0)}% (${(e.loaded / 1024) | 0}/${(e.total / 1024) | 0} kB)` });
    };
    x.onload = () => {
      const ok = x.status === 200;
      row(n.id, { pct: 100, err: !ok, stat: ok ? 'written OK — board is rebooting' : `FAILED (${x.status}): ${x.responseText}` });
      resolve(ok);
    };
    x.onerror = () => { row(n.id, { pct: 0, err: true, stat: 'connection dropped mid-upload' }); resolve(false); };
    x.send(fd);
  });

  // One module after another, never all at once: the radio and the Wi-Fi carry one big upload well, several badly,
  // and a module that fails does not stop the others.
  const upload = async () => {
    const f = fileRef.current?.files?.[0];
    const todo = nodes.filter(n => pick.has(n.id));
    if (!f || !todo.length) return;
    setBusy(true);
    speak(`Uploading firmware to ${todo.length} module${todo.length === 1 ? '' : 's'}`, { key: 'ota-start', cooldownMs: 0 });
    let ok = 0;
    for (const n of todo) { row(n.id, { pct: 0, err: false, stat: 'waiting…' }); }
    for (const n of todo) { if (await uploadOne(n, f)) ok++; }
    setBusy(false);
    speak(ok === todo.length ? 'Firmware uploaded. Modules are rebooting' : `Firmware failed on ${todo.length - ok} module${todo.length - ok === 1 ? '' : 's'}`,
          { key: ok === todo.length ? 'ota-done' : 'ota-fail', cooldownMs: 0 });
  };

  return (
    <div className="ettl-card">
      <h4>Firmware update</h4>
      <div className="ettl-row">
        <input type="file" accept=".bin" ref={fileRef} />
        <Button size="sm" onClick={upload} disabled={busy || !pick.size}>
          {busy ? 'Uploading…' : `Upload & reboot ${pick.size} module${pick.size === 1 ? '' : 's'}`}
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => setPick(new Set(nodes.filter(n => n.connected && space(n) > 0).map(n => n.id)))}>all online</Button>
      </div>
      <table className="ettl-table">
        <tbody>
          {nodes.map(n => {
            const r = rows[n.id], sp = space(n);
            return (
              <tr key={n.id}>
                <td className="l"><label className="ettl-lbl">
                  <input type="checkbox" checked={pick.has(n.id)} disabled={busy}
                         onChange={e => setPick(p => { const q = new Set(p); if (e.target.checked) q.add(n.id); else q.delete(n.id); return q; })} />
                  {n.name}</label></td>
                <td className="ettl-dim">{!n.connected ? 'offline' : sp > 0 ? `fw ${(n.telemetry as any)?.fw ?? '?'} · OTA ${(sp / 1048576).toFixed(2)} MB free` : 'no OTA partition — re-flash over USB'}</td>
                <td className="grow"><div className="ettl-bar"><i style={{ width: `${r?.pct ?? 0}%` }} /></div></td>
                <td className={r?.err ? 'ettl-warnline' : 'ettl-dim'}>{r?.stat ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="ettl-hint">
        Modules update one after another. A weak link is the usual cause of a failed upload — the board verifies the
        image and refuses to boot a damaged one, so a failure costs nothing but the attempt.
      </p>
    </div>
  );
}

// ── Log ───────────────────────────────────────────────────────────────────────
// Every module's log AND the master's (the radio bridge's events) in one list, kept on this computer (Nischay 12 Nov: "all
// logs of all things, even previous ones"). A module's own log restarts empty when it restarts; here each new line is appended
// to that module's history with the time it arrived, and a restart is marked. The top selection filters (default: all).
// REUSE-CHECKED: log|history|_events -> the old Log tab (one module, replaced each refresh) and the bridge's /_events
// (in memory, lost on its restart); nothing kept lines. This keeps them.
type LogLine = { t: number; src: string; text: string };
const LOG_KEY = 'robo4:esptt:logs', LOG_MAX = 4000;
const UP = /^\[\s*(\d+)\]/;
const loadLogs = (): LogLine[] => { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; } };
const saveLogs = (l: LogLine[]) => { try { localStorage.setItem(LOG_KEY, JSON.stringify(l.slice(-LOG_MAX))); } catch { /* full or private */ } };

// ONE collector (Nischay 12 Nov: "reuse, don't ask the modules again"): the bridge already keeps every module's log, the
// master's events and the laptop's lines in rotating files (master.local, gos/master_site.py). This tab reads those instead of
// asking each module for /api/log every 3 s. The Studio's own online/offline lines (espPoll) are merged from this browser.
const MASTER_SITE = 'http://127.0.5.1';
async function collectLogs(): Promise<LogLine[]> {
  const local = loadLogs().filter(l => l.src === 'laptop');
  try {
    const r = await fetch(`${MASTER_SITE}/api/logs?src=all&limit=3000`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const j = await r.json();
    const kept: LogLine[] = (j.lines ?? []).map((l: any) => ({ t: Date.parse(String(l.t).replace(' ', 'T')) || Date.now(), src: l.src, text: l.text }));
    return [...kept, ...local].sort((a, b) => a.t - b.t).slice(-LOG_MAX);
  } catch {
    return local;                                    // bridge not running: only this computer's own lines
  }
}

/** important lines stand out (Nischay 12 Nov): connected / online in bold green, disconnected / offline in bold amber, errors in bold red */
function logKind(t: string): 'up' | 'down' | 'warn' | '' {
  const x = t.toLowerCase();
  if (/red light:|error|failed|e-stop|stuck/.test(x)) return 'warn';
  if (/offline|not heard|disconnected|lost|link cut|restarted|quiet for|stopped talking|no answer by radio|switched off|no connection/.test(x)) return 'down';
  if (/online|connected|linked|heard over esp-now|answers again|answers by radio again|talking to me again|talking again|back to the radio/.test(x)) return 'up';
  return '';
}

function LogTab() {
  const [lines, setLines] = useState<LogLine[]>(loadLogs);
  const [auto, setAuto] = useState(true);
  const [master, setMaster] = useState(true);
  const focus = useEspTtlStore(s => s.focus);
  useEspNodesStore(s => s.nodes.length);
  const load = async () => setLines(await collectLogs());
  useEffect(() => {
    void load();
    if (!auto) return;
    const t = window.setInterval(load, 3000);
    return () => window.clearInterval(t);
  }, [auto, focus]);
  const want = new Set(ttlTargets().map(nodeLabel));
  const shown = lines.filter(l => (l.src === 'master' || l.src === 'laptop' ? master : want.has(l.src) || (l.src === 'laptop' && true)));
  const pre = useRef<HTMLPreElement>(null);
  useEffect(() => { const el = pre.current; if (el) el.scrollTop = el.scrollHeight; }, [shown.length]);
  return (
    <div className="ettl-card">
      <h4>Logs · {focus ? [...want].join(', ') : 'all modules'}{master ? ' + master' : ''}</h4>
      <div className="ettl-row">
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
        <label className="ettl-toggle"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /><span />auto</label>
        <label className="ettl-toggle"><input type="checkbox" checked={master} onChange={e => setMaster(e.target.checked)} /><span />master + laptop</label>
        <span className="ettl-dim">{shown.length} lines kept on this computer · pick a module at the top to see only it</span>
        <span style={{ flex: 1 }} />
        <Button variant="outline" size="sm" onClick={() => { if (confirm('Delete every kept log line on this computer?')) { saveLogs([]); setLines([]); } }}>Clear kept logs</Button>
      </div>
      <pre ref={pre} className="ettl-pre tall" data-testid="ttl-log">{shown.length ? shown.map((l, i) => {
        const k = logKind(l.text);
        return <div key={i} className={k ? `ettl-log-${k}` : undefined}>{`${new Date(l.t).toLocaleTimeString()}  ${l.src.padEnd(6)} ${l.text}`}</div>;
      }) : '—'}</pre>
    </div>
  );
}
