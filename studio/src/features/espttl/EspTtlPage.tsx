/**
 * EspTtlPage — the laptop-side console for a module's ESP32-C3.
 *
 * Everything the board's own web page can do, done from here instead: live control,
 * servo discovery and renumbering, magnets, config, Wi-Fi, firmware upload, log — plus
 * the pose timeline, which only exists here because it needs memory the board does not
 * have. The board stays a thin executor; the thinking is on this side of the wire.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  useEspTtlStore, startTtlPoll, stopTtlPoll, ttlTry, ttlGet, ttlUrl,
  type TtlTab, type TtlServo,
} from '@/state/espTtlStore';
import AnimationTab from './AnimationTab';
import './EspTtl.css';

const TABS: { id: TtlTab; label: string }[] = [
  { id: 'control',   label: 'Control' },
  { id: 'animation', label: 'Animation' },
  { id: 'tools',     label: 'Servo tools' },
  { id: 'magnets',   label: 'Magnets' },
  { id: 'config',    label: 'Config' },
  { id: 'wifi',      label: 'Wi-Fi' },
  { id: 'ota',       label: 'Firmware' },
  { id: 'log',       label: 'Log' },
];

export default function EspTtlPage() {
  const { url, tab, tel, online, latencyMs, lastError, setUrl, setTab } = useEspTtlStore();
  const [draftUrl, setDraftUrl] = useState(url);

  // Poll only while this page is mounted — the board serves one client at a time and has
  // no spare attention for a console nobody is looking at.
  useEffect(() => { const stop = startTtlPoll(); return () => { stop(); stopTtlPoll(); }; }, []);
  useEffect(() => { setDraftUrl(url); }, [url]);

  return (
    <div className="ettl">
      <header className="ettl-head">
        <span className="ettl-title">ESP-TTL</span>
        <span className={`ettl-dot ${online ? 'on' : 'off'}`} />
        <span className="ettl-dim">{online ? 'connected' : (lastError || 'offline')}</span>
        <input
          className="ettl-url" value={draftUrl}
          onChange={e => setDraftUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') setUrl(draftUrl); }}
          onBlur={() => draftUrl !== url && setUrl(draftUrl)}
          spellCheck={false}
        />
        {tel && <>
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
        <button className="ettl-btn danger big"
                onClick={() => ttlTry('/api/command?servo=all&cmd=estop')}>E-STOP</button>
      </header>

      <nav className="ettl-tabs">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'sel' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      <div className="ettl-body">
        {tab === 'control'   && <ControlTab />}
        {tab === 'animation' && <AnimationTab />}
        {tab === 'tools'     && <ToolsTab />}
        {tab === 'magnets'   && <MagnetsTab />}
        {tab === 'config'    && <ConfigTab />}
        {tab === 'wifi'      && <WifiTab />}
        {tab === 'ota'       && <OtaTab />}
        {tab === 'log'       && <LogTab />}
      </div>
    </div>
  );
}

/** Shared: run a call and surface the outcome in a small status line. */
function useSay() {
  const [msg, setMsg] = useState('');
  const say = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(x => (x === m ? '' : x)), 4000); };
  const call = async (path: string, label: string) => {
    const r = await ttlTry(path);
    say(r.ok ? `${label} ok` : `${label} failed: ${r.error}`);
    return r;
  };
  return { msg, say, call };
}

// ── Control ───────────────────────────────────────────────────────────────────
function ControlTab() {
  const tel = useEspTtlStore(s => s.tel);
  const { msg, call } = useSay();
  const [speed, setSpeed] = useState(5);
  const [acc, setAcc]     = useState(20);
  const [band, setBand] = useState('0.1');

  const servos = tel?.servos ?? [];
  const deadband = (tel as any)?.deadbandDeg ?? 2.46;
  const move = (s: TtlServo, deg: number) => {
    void ttlTry(`/api/command?servo=${s.id}&cmd=pos&angle=${deg}&speed=${speed}&acc=${acc}`);
  };

  return (
    <div>
      <div className="ettl-card">
        <h4>All joints</h4>
        <div className="ettl-row">
          <label className="ettl-lbl">speed<input type="number" min={1} max={10} value={speed}
                 onChange={e => setSpeed(+e.target.value)} style={{ width: 60 }} /></label>
          <label className="ettl-lbl">acc<input type="number" min={1} max={100} value={acc}
                 onChange={e => setAcc(+e.target.value)} style={{ width: 60 }} /></label>
          <span className="ettl-sep" />
          <button className="ettl-btn" onClick={() => call('/api/torque?on=1', 'torque on')}>Torque ON</button>
          <button className="ettl-btn" onClick={() => call('/api/torque?on=0', 'torque off')}>Torque OFF (limp)</button>
          <button className="ettl-btn" onClick={() => call('/api/home', 'home 180')}>Home → 180°</button>
          <button className="ettl-btn accent" onClick={() => call('/api/home/manual', 'manual home')}>Manual home</button>
          <button className="ettl-btn" onClick={() => call('/api/home/set', 'set home')}>Set current as home</button>
          <button className="ettl-btn" onClick={() => call('/api/servo/tune', 're-tune')}>Re-tune hold</button>
        </div>
        <div className="ettl-row">
          <label className="ettl-lbl" title="Error smaller than this is ignored by the servo — it stops correcting inside the band">
            hold freedom ±
            <input type="number" min={0} max={17} step={0.1} value={band}
                   onChange={e => setBand(e.target.value)} style={{ width: 70 }} />°
          </label>
          <button className="ettl-btn accent" onClick={async () => {
            const r = await call(`/api/servo/deadband?deg=${band}`, 'hold freedom');
            if (r.ok && r.data?.deg) setBand(String(r.data.deg));
          }}>Apply to all servos</button>
          <span className="ettl-dim">
            now ±{deadband}° · tighter holds more precisely but can hunt and heat; wider lets the joint sag
          </span>
        </div>
      </div>

      <div className="ettl-card">
        <h4>Servos</h4>
        <div className="ettl-wrap">
          <table className="ettl-table">
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
                    <button className="ettl-btn tiny" onClick={() => call(`/api/servo/home?id=${s.id}&to180=1`, '180')}>180</button>
                    <button className="ettl-btn tiny" onClick={() => call(`/api/servo/home?id=${s.id}`, 'home')}>
                      home {s.home != null ? `${(+s.home).toFixed(0)}°` : ''}
                    </button>
                    <button className="ettl-btn tiny" onClick={() => call(`/api/home/set?id=${s.id}`, 'set home')}>set</button>
                    <button className="ettl-btn tiny" onClick={() => call(`/api/identify?id=${s.id}`, 'identify')}>identify</button>
                    <button className="ettl-btn tiny danger" onClick={() => call(`/api/command?servo=${s.id}&cmd=stop`, 'stop')}>stop</button>
                  </td>
                </tr>
              ))}
              {!servos.length && <tr><td colSpan={11} className="l ettl-dim">no servos — run a scan in Servo tools</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {msg && <div className="ettl-toast">{msg}</div>}
    </div>
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
      <button className="ettl-btn step" onClick={() => step(-1)} title="one degree down">−</button>
      <input className="ettl-slider" type="range" min={s.min} max={s.max} step={0.5}
             value={shown}
             onPointerDown={() => { setDraft(live); setDragging(true); }}
             onChange={e => { setDraft(+e.target.value); setDragging(true); }}
             onMouseUp={e => release(+(e.target as HTMLInputElement).value)}
             onTouchEnd={e => release(+(e.target as HTMLInputElement).value)}
             onBlur={() => setDragging(false)} />
      <button className="ettl-btn step" onClick={() => step(1)} title="one degree up">+</button>
      <input className="ettl-num" type="number" step={0.5} min={s.min} max={s.max}
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
    const r = await ttlTry(`/api/scan?from=1&to=253&adopt=${adopt ? 1 : 0}`);
    if (!r.ok) { setScanning(false); say('scan refused: ' + r.error); return; }
    const poll = async () => {
      try {
        const d = await ttlGet('/api/scan/status');
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
    const r = await ttlTry(`/api/servo/setid?from=${from}&to=${to}${dup ? '&force=1' : ''}`);
    say(r.ok && r.data?.ok ? `wrote ${from} → ${to}` : `failed: ${r.data?.error || r.error}`);
    setFound([]); setOldId(''); setManual(false);   // stale by definition — detect again
  };

  const one = found.length === 1;

  return (
    <div>
      <div className="ettl-card">
        <h4>Detect servos on the bus</h4>
        <div className="ettl-row">
          <button className="ettl-btn accent" onClick={() => detect(false)} disabled={scanning}>
            {scanning ? `Detecting… id ${at}/253` : 'Detect (read-only)'}
          </button>
          <button className="ettl-btn" onClick={() => detect(true)} disabled={scanning}
                  title="Scan and adopt the result as the board's servo list">Scan &amp; adopt</button>
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
            <button className="ettl-btn" style={{ marginLeft: 10 }} onClick={() => { setManual(true); setOldId(String(found[0].id)); }}>
              Continue anyway
            </button>
          </div>
        )}
      </div>

      <div className="ettl-card">
        <h4>Change a servo ID</h4>
        <div className="ettl-row">
          <label className="ettl-lbl">current ID
            <input value={oldId} onChange={e => setOldId(e.target.value)}
                   disabled={!(one || manual)} style={{ width: 70 }} placeholder="—" />
          </label>
          <label className="ettl-lbl">new ID
            <input type="number" min={1} max={253} value={newId}
                   onChange={e => setNewId(e.target.value)}
                   disabled={!(one || manual)} style={{ width: 70 }} />
          </label>
          <button className="ettl-btn accent" onClick={writeId} disabled={!(one || manual) || !oldId}>Send</button>
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
          <label className="ettl-lbl">id<input id="calid" defaultValue="1" style={{ width: 60 }} /></label>
          <button className="ettl-btn" onClick={() => call(
            `/api/servo/center?id=${(document.getElementById('calid') as HTMLInputElement)?.value}`, 'centre')}>
            Set current position = centre
          </button>
          <button className="ettl-btn" onClick={() => call(
            `/api/identify?id=${(document.getElementById('calid') as HTMLInputElement)?.value}`, 'identify')}>
            Identify (wiggle)
          </button>
        </div>
      </div>

      <div className="ettl-card">
        <h4>Raw register peek / poke</h4>
        <div className="ettl-row">
          <label className="ettl-lbl">id<input value={reg.id} onChange={e => setReg({ ...reg, id: e.target.value })} style={{ width: 55 }} /></label>
          <label className="ettl-lbl">addr<input value={reg.addr} onChange={e => setReg({ ...reg, addr: e.target.value })} style={{ width: 60 }} /></label>
          <label className="ettl-lbl">width
            <select value={reg.len} onChange={e => setReg({ ...reg, len: e.target.value })}>
              <option value="1">byte</option><option value="2">word</option>
            </select>
          </label>
          <button className="ettl-btn" onClick={async () => {
            const r = await ttlTry(`/api/servo/read?id=${reg.id}&addr=${reg.addr}&len=${reg.len}`);
            setRegOut(JSON.stringify(r.data ?? r.error, null, 1));
          }}>Read</button>
          <label className="ettl-lbl">value<input value={reg.val} onChange={e => setReg({ ...reg, val: e.target.value })} style={{ width: 70 }} /></label>
          <label className="ettl-toggle">
            <input type="checkbox" checked={reg.unlock} onChange={e => setReg({ ...reg, unlock: e.target.checked })} />
            <span />unlock EPROM
          </label>
          <button className="ettl-btn danger" onClick={async () => {
            const r = await ttlTry(`/api/servo/write?id=${reg.id}&addr=${reg.addr}&len=${reg.len}&val=${reg.val}&unlock=${reg.unlock ? 1 : 0}`);
            setRegOut(JSON.stringify(r.data ?? r.error, null, 1));
          }}>Write</button>
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

// ── Magnets ───────────────────────────────────────────────────────────────────
function MagnetsTab() {
  const tel = useEspTtlStore(s => s.tel);
  const { msg, call } = useSay();
  return (
    <div className="ettl-card">
      <h4>Electromagnets (DRV8833)</h4>
      {(tel?.magnets ?? []).map(m => (
        <div className="ettl-row" key={m.ch}>
          <span className="ettl-lbl">ch {m.ch}</span>
          <input type="range" min={0} max={100} value={m.pct}
                 onChange={e => void ttlTry(`/api/magnet?ch=${m.ch}&pct=${e.target.value}`)} />
          <b style={{ width: 46 }}>{m.pct}%</b>
          <button className="ettl-btn" onClick={() => call(`/api/magnet?ch=${m.ch}&pct=100`, 'grab')}>grab 100</button>
          <button className="ettl-btn" onClick={() => call(`/api/magnet?ch=${m.ch}&pct=40`, 'hold')}>hold 40</button>
          <button className="ettl-btn danger" onClick={() => call(`/api/magnet?ch=${m.ch}&pct=0`, 'release')}>release</button>
          <span className="ettl-dim">last cmd {(m.ageMs / 1000).toFixed(1)}s ago</span>
        </div>
      ))}
      <div className="ettl-row">
        <button className="ettl-btn danger" onClick={() => call('/api/magnet?all=1&pct=0', 'release all')}>Release all</button>
      </div>
      {msg && <div className="ettl-toast">{msg}</div>}
    </div>
  );
}

// ── Config ────────────────────────────────────────────────────────────────────
function ConfigTab() {
  const { msg, say, call } = useSay();
  const [cfg, setCfg] = useState<any>(null);
  const load = async () => { const r = await ttlTry('/api/config'); if (r.ok) setCfg(r.data); else say(r.error!); };
  useEffect(() => { void load(); }, []);

  if (!cfg) return <div className="ettl-card"><h4>Config</h4><div className="ettl-dim">loading…</div></div>;

  const save = async () => {
    const rows = (cfg.servos || []).map((s: any) => `${s.id}:${s.label}:${s.min}:${s.max}`).join('|');
    const q = `/api/config/set?host=${encodeURIComponent(cfg.host)}&baud=${cfg.baud}`
            + `&hold=${cfg.magSafeHold}&servos=${encodeURIComponent(rows)}`;
    const r = await ttlTry(q);
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
          <label className="ettl-lbl">mDNS host<input value={cfg.host} onChange={e => setCfg({ ...cfg, host: e.target.value })} style={{ width: 120 }} /></label>
          <label className="ettl-lbl">bus baud<input type="number" value={cfg.baud} onChange={e => setCfg({ ...cfg, baud: +e.target.value })} style={{ width: 110 }} /></label>
          <label className="ettl-lbl">magnet safe hold %<input type="number" value={cfg.magSafeHold} onChange={e => setCfg({ ...cfg, magSafeHold: +e.target.value })} style={{ width: 70 }} /></label>
        </div>
      </div>
      <div className="ettl-card">
        <h4>Servo table</h4>
        <table className="ettl-table">
          <thead><tr><th>id</th><th className="l">label</th><th>min°</th><th>max°</th><th /></tr></thead>
          <tbody>
            {(cfg.servos || []).map((s: any, i: number) => (
              <tr key={i}>
                <td><input type="number" value={s.id} onChange={e => patch(i, 'id', +e.target.value)} style={{ width: 60 }} /></td>
                <td className="l"><input value={s.label} onChange={e => patch(i, 'label', e.target.value)} style={{ width: 90 }} /></td>
                <td><input type="number" value={s.min} onChange={e => patch(i, 'min', +e.target.value)} style={{ width: 70 }} /></td>
                <td><input type="number" value={s.max} onChange={e => patch(i, 'max', +e.target.value)} style={{ width: 70 }} /></td>
                <td><button className="ettl-btn tiny danger"
                    onClick={() => setCfg({ ...cfg, servos: cfg.servos.filter((_: any, k: number) => k !== i) })}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ettl-row">
          <button className="ettl-btn" onClick={() => setCfg({ ...cfg, servos: [...cfg.servos, { id: 1, label: 'J?', min: 0, max: 360 }] })}>+ add</button>
          <button className="ettl-btn accent" onClick={save}>Save to board (NVS)</button>
          <button className="ettl-btn" onClick={() => call('/api/reboot', 'reboot')}>Reboot board</button>
        </div>
      </div>
      {msg && <div className="ettl-toast">{msg}</div>}
    </div>
  );
}

// ── Wi-Fi ─────────────────────────────────────────────────────────────────────
function WifiTab() {
  const { msg, say, call } = useSay();
  const [w, setW] = useState<any>(null);
  const [nets, setNets] = useState<any[] | null>(null);
  const [pw, setPw] = useState<Record<number, string>>({});
  const [ssid, setSsid] = useState<Record<number, string>>({});
  const load = async () => { const r = await ttlTry('/api/wifi'); if (r.ok) { setW(r.data); setSsid({ ...(r.data.slots || []).reduce((o: any, s: string, i: number) => (o[i] = s, o), {}) }); } };
  useEffect(() => { void load(); }, []);

  return (
    <div>
      <div className="ettl-card">
        <h4>Saved networks</h4>
        {(w?.slots ?? ['', '', '']).map((_: string, i: number) => (
          <div className="ettl-row" key={i}>
            <span className="ettl-lbl">slot {i}</span>
            <input value={ssid[i] ?? ''} placeholder="ssid" onChange={e => setSsid({ ...ssid, [i]: e.target.value })} style={{ width: 170 }} />
            <input type="password" placeholder="password (blank = keep)" value={pw[i] ?? ''}
                   onChange={e => setPw({ ...pw, [i]: e.target.value })} style={{ width: 190 }} />
            <button className="ettl-btn accent" onClick={async () => {
              await call(`/api/wifi/set?slot=${i}&ssid=${encodeURIComponent(ssid[i] || '')}&pass=${encodeURIComponent(pw[i] || '')}`, 'saved');
              setPw({ ...pw, [i]: '' }); void load();
            }}>Save</button>
            <button className="ettl-btn danger" onClick={async () => {
              await call(`/api/wifi/set?slot=${i}&ssid=&pass=&force=1`, 'cleared'); void load();
            }}>Clear</button>
          </div>
        ))}
        <div className="ettl-row">
          <button className="ettl-btn" onClick={() => call('/api/wifi/reconnect', 'reconnect')}>Reconnect now</button>
          <span className="ettl-dim">{w ? `${w.drops} drops · AP ${w.apUp ? 'up' : 'down'} (${w.apName})` : ''}</span>
        </div>
      </div>
      <div className="ettl-card">
        <h4>Nearby networks</h4>
        <div className="ettl-row">
          <button className="ettl-btn" onClick={async () => {
            setNets(null); const r = await ttlTry('/api/wifi/scan', 15000);
            if (r.ok) setNets(r.data.nets); else say('scan failed: ' + r.error);
          }}>Scan</button>
        </div>
        {nets && (
          <table className="ettl-table">
            <thead><tr><th className="l">ssid</th><th>rssi</th><th>ch</th><th /></tr></thead>
            <tbody>{nets.map((n, i) => (
              <tr key={i}><td className="l">{n.ssid}</td><td>{n.rssi}</td><td>{n.ch}</td>
                <td><button className="ettl-btn tiny" onClick={() => setSsid({ ...ssid, 0: n.ssid })}>use in slot 0</button></td></tr>
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
  const tel = useEspTtlStore(s => s.tel);
  const [pct, setPct] = useState(0);
  const [stat, setStat] = useState('idle');
  const [err, setErr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { setStat('pick a .bin first'); return; }
    const fd = new FormData(); fd.append('f', f, f.name);
    const x = new XMLHttpRequest();
    x.open('POST', `${ttlUrl()}/api/ota?size=${f.size}`);
    setErr(false);
    x.upload.onprogress = e => {
      const p = (e.loaded / e.total) * 100;
      setPct(p);
      setStat(p >= 100 ? 'sent 100% — board is verifying…' : `${p.toFixed(0)}% (${(e.loaded / 1024) | 0}/${(e.total / 1024) | 0} kB)`);
    };
    x.onload = () => {
      if (x.status === 200) setStat('written OK — board is rebooting');
      else { setErr(true); setStat(`FAILED (${x.status}): ${x.responseText}`); }
    };
    x.onerror = () => { setErr(true); setStat('connection dropped mid-upload'); };
    x.send(fd);
  };

  const space = tel?.otaSpace ?? 0;
  return (
    <div className="ettl-card">
      <h4>Firmware update</h4>
      <div className={`ettl-${space > 0 ? 'ok' : 'warn'}line`}>
        {space > 0
          ? `OTA ready — free partition ${(space / 1048576).toFixed(2)} MB`
          : 'No OTA partition on this board — wireless upload will fail. Re-flash over USB with a "with OTA" partition scheme.'}
      </div>
      <div className="ettl-row">
        <input type="file" accept=".bin" ref={fileRef} />
        <button className="ettl-btn accent" onClick={upload} disabled={space === 0}>Upload &amp; reboot</button>
      </div>
      <div className="ettl-bar"><i style={{ width: `${pct}%` }} /></div>
      <div className={err ? 'ettl-warnline' : 'ettl-dim'}>{stat}</div>
      <p className="ettl-hint">
        A weak link is the usual cause of a failed upload — the board verifies the image and
        refuses to boot a damaged one, so a failure costs nothing but the attempt.
      </p>
    </div>
  );
}

// ── Log ───────────────────────────────────────────────────────────────────────
function LogTab() {
  const [txt, setTxt] = useState('');
  const [auto, setAuto] = useState(true);
  const load = async () => {
    try { setTxt(await ttlGet<string>('/api/log', 8000)); } catch (e: any) { setTxt('could not read log: ' + e.message); }
  };
  useEffect(() => {
    void load();
    if (!auto) return;
    const t = window.setInterval(load, 2000);
    return () => window.clearInterval(t);
  }, [auto]);

  return (
    <div className="ettl-card">
      <h4>Device log</h4>
      <div className="ettl-row">
        <button className="ettl-btn" onClick={load}>Refresh</button>
        <label className="ettl-toggle"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /><span />auto</label>
      </div>
      <pre className="ettl-pre tall">{txt || '—'}</pre>
    </div>
  );
}
