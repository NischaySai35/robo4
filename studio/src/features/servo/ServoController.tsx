import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react';
import type { CSSProperties } from 'react';
import type { Document } from '@/core/model/index';
import { useIntegrationStore } from '@/state/integrationStore';
import { useThemeStore } from '@/state/themeStore';
import { useModelStore } from '@/state/modelStore';
import { useEspNodesStore } from '@/state/espNodesStore';
import { servoRouting, sendServoCmd, sendServoBatch, estopAllNodes, callAllNodes } from './servoLink';
import TorqueSwitch from '@/components/torque/TorqueSwitch';
import './ServoController.css';

// ── Dynamic servo definitions (derived from the simulator's joints) ────────────
//
// The servo grid is NOT hardcoded: it mirrors the joints the user builds on the
// Simulator page (modelStore `doc.joints`). One card per movable joint. The
// joint's *type* decides the control flavour:
//   continuous → 'twist'  (full 0–360° spin, CW/CCW/WAVE buttons)
//   revolute   → 'bend'   (limited range, derived from the joint's limit)
//   prismatic  → 'linear' (slider-style; treated like bend for the angle gauge)
//   fixed / others → skipped (no actuator)
// Each joint's physical ST3215 id comes from `meta.servoId` (set in the Hardware
// panel, "Auto 1…N"); we fall back to positional index when unassigned.

const RAD2DEG = 180 / Math.PI;

// Distinct colours cycled across however many joints exist.
const COLOR_CYCLE = [
  '#f59e0b', '#6ee7ff', '#a78bfa', '#fb923c', '#34d399',
  '#f43f5e', '#38bdf8', '#c084fc', '#facc15', '#4ade80',
];

function jointKind(type: any) {
  switch (type) {
    case 'continuous': return 'twist';
    case 'prismatic':  return 'linear';
    case 'revolute':   return 'bend';
    default:           return 'bend';
  }
}

// Map a joint's radian limits → servo-degree gauge bounds (0 rad → 180° centre).
function gaugeBounds(kind: any, limit: any) {
  if (kind === 'twist') return { lo: 0, hi: 360 };
  const lower = limit?.lower ?? -Math.PI;
  const upper = limit?.upper ??  Math.PI;
  let lo = Math.max(0, Math.min(360, 180 + lower * RAD2DEG));
  let hi = Math.max(0, Math.min(360, 180 + upper * RAD2DEG));
  if (hi <= lo + 1) { lo = 80; hi = 280; } // degenerate → sensible default
  return { lo, hi };
}

/** Build the dynamic servo defs from the model document's joints.
 *  MULTI-ESP: `id` is the jointId (unique across all boards) and is the state key +
 *  routing key; `servoId` is the LOCAL 1..7 id on that joint's module ESP (repeats
 *  across boards). `moduleId` is the component the servo's board drives. */
function servoDefsFromDoc(doc?: Document | null) {
  const joints = Object.values(doc?.joints ?? {}).filter((j) => j.type !== 'fixed');
  const seqByModule = new Map<string | null, number>();
  return joints.map((j, i) => {
    const kind = jointKind(j.type);
    const { lo, hi } = gaugeBounds(kind, j.limit);
    const moduleId = (j.componentId
      ?? doc?.bodies[j.parentBodyId!]?.componentId
      ?? doc?.bodies[j.childBodyId!]?.componentId
      ?? null);
    const seq = (seqByModule.get(moduleId) ?? 0) + 1;
    seqByModule.set(moduleId, seq);
    const assigned = Number(j.meta?.servoId);
    const servoId = Number.isFinite(assigned) && assigned > 0 ? assigned : seq;
    return {
      id: j.id,          // unique key (jointId) — state + command routing
      jointId: j.id,
      servoId,           // local id on the module ESP (for display + firmware)
      moduleId,
      moduleName: (moduleId && doc?.components?.[moduleId]?.name) || 'Unassigned',
      label: `J${i + 1}`,
      name: (j.name ?? `Joint ${i + 1}`).toUpperCase(),
      type: kind,
      jointType: j.type,
      motorType: (j.meta?.motorType as string) || '',
      color: COLOR_CYCLE[i % COLOR_CYCLE.length],
      lo, hi,
    };
  });
}

const MAX_HISTORY  = 120;   // telemetry is polled continuously by the espPoll engine
const TEMP_WARN    = 55;
const SERVO_MA_MAX = 2000;
const TOTAL_MA_MAX = 8000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: any, d = 1) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return Number(v).toFixed(d);
}

function pushH(arr: any, val: any) {
  const next = [...arr, val];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

function totalCurrentmA(defs: any, servos: any) {
  return defs.reduce((sum: any, d: any) => sum + (servos[d.id]?.currentmA ?? 0), 0);
}

function hottestServo(defs: any, servos: any) {
  let best = null, bestT = -Infinity;
  for (const d of defs) {
    const t = servos[d.id]?.tempC;
    if (t != null && t > bestT) { bestT = t; best = d.label; }
  }
  return best ? `${best} (${bestT}°C)` : '—';
}

function onlineCount(defs: any, servos: any) {
  return defs.filter((d: any) => servos[d.id]?.connected).length;
}

function computeAlerts(defs: any, servos: any, totalMA: any) {
  const out: any[] = [];
  for (const def of defs) {
    const sv = servos[def.id];
    if (!sv) continue;
    if (sv.tempC != null && sv.tempC > TEMP_WARN)
      out.push({ id: `temp-${def.id}`, kind: 'warn', msg: `${def.label} — ${sv.tempC}°C (thermal warning > ${TEMP_WARN}°C)` });
    if (sv.currentmA != null && sv.currentmA > SERVO_MA_MAX)
      out.push({ id: `cur-${def.id}`, kind: 'warn', msg: `${def.label} — ${sv.currentmA.toFixed(0)} mA (high load > ${SERVO_MA_MAX} mA)` });
  }
  if (totalMA > TOTAL_MA_MAX)
    out.push({ id: 'total-cur', kind: 'bad', msg: `System draw ${(totalMA / 1000).toFixed(1)} A — near power limit` });
  return out;
}

// ── MiniChart ─────────────────────────────────────────────────────────────────

function MiniChart({ values, color }: any) {
  const rawId = useId();
  const uid = 'scg' + rawId.replace(/[^a-zA-Z0-9]/g, '');

  if (!values || values.length < 2) {
    return (
      <div style={{ height: 66, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-dim)', fontSize: 11 }}>
        no data
      </div>
    );
  }

  const W = 280, H = 66;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const mapY = (v: any) => H - 5 - ((v - min) / range) * (H - 10);

  const pts = values.map((v: any, i: any) =>
    `${((i / (values.length - 1)) * W).toFixed(1)},${mapY(v).toFixed(1)}`
  );
  const ptsStr = pts.join(' ');
  const areaStr = `0,${H} ${ptsStr} ${W},${H}`;
  const [lx, ly] = pts[pts.length - 1].split(',').map(Number);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.38} />
          <stop offset="100%" stopColor={color} stopOpacity={0}    />
        </linearGradient>
      </defs>
      <polygon points={areaStr} fill={`url(#${uid})`} />
      <polyline points={ptsStr} fill="none" stroke={color} strokeWidth={1.8}
        style={{ filter: `drop-shadow(0 0 3px ${color}99)` }} />
      <circle cx={lx} cy={ly} r={3} fill={color}
        style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
    </svg>
  );
}

// ── AngleGauge — top semi-circle ─────────────────────────────────────────────
// Geometry: circle centre at bottom of SVG so only the upper arc is visible.
//   lo  → 9 o'clock  (clock 270°, x=pad,       y=cy)
//   180 → 12 o'clock (clock   0°, x=cx,         y=cy-R)
//   hi  → 3 o'clock  (clock  90°, x=W-pad,      y=cy)
//
// Track:  full CCW arc (sweep=0) from 9→12→3 o'clock  (goes UPWARD through top)
// Fill:   CCW arc from left endpoint UPWARD to current position
//         → always renders going upward, never downward

function AngleGauge({ current, target, color, size = 100, lo = 0, hi = 360, onDrag }: any) {
  const W  = size;
  const cx = W / 2;
  const R  = cx - 7;
  const cy = 6 + R;              // circle centre near TOP of SVG → arc curves DOWNWARD (bowl ∪)
  const H  = cy + 12;    // just enough height for the bottom of the bowl

  const svgRef   = useRef<any>(null);
  const dragging = useRef(false);
  const lastCmd  = useRef(0);

  // clock angle (0=12-o'clock, CW+) → SVG x,y
  const toXY = (clk: any, r: any) => {
    const rad = (clk + 90) * (Math.PI / 180);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  // servo → clock:  lo → 270° (left)   180 → 180° (bottom)   hi → 90° (right)
  const s2c = (v: any) => (270 - (1-(v - lo) / (hi - lo)) * 180) % 360;

  const [lx, ly] = toXY(270, R);   // left  = lo endpoint   (top-left)
  const [rx, ry] = toXY(90,  R);   // right = hi endpoint   (top-right)
  const [bx, by] = toXY(0, R);   // bottom = 180° neutral (deepest point)

  // Track: CW (sweep=1) from left → BOTTOM → right = bowl ∪
  const trackD = `M ${lx.toFixed(2)} ${ly.toFixed(2)} A ${R} ${R} 0 0 0 ${rx.toFixed(2)} ${ry.toFixed(2)}`;

  const curClock = current != null ? s2c(Math.max(lo, Math.min(hi, current))) : null;
  const [ex, ey]  = curClock != null ? toXY(curClock, R) : [null, null];
  const tgtClock  = target  != null ? s2c(Math.max(lo, Math.min(hi, target)))  : null;
  const [tx, ty]  = tgtClock != null ? toXY(tgtClock, R) : [null, null];

  // Fill: CW (sweep=1) from left endpoint DOWNWARD to current.
  // Max span is 180° so large-arc is always 0.
  let fillD: any = null;
  if (current != null && curClock != null && current > lo + 0.5) {
    fillD = `M ${lx.toFixed(2)} ${ly.toFixed(2)} A ${R} ${R} 0 0 0 ${ex!.toFixed(2)} ${ey!.toFixed(2)}`;
  }

  // Drag: pointer → servo degrees
  const angleFromPointer = useCallback((e: any) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left - cx;
    const py = e.clientY - rect.top  - cy;

    // Get clock angle: 0 at top, 90 at right, 180 at bottom, 270 at left
    let θ = (Math.atan2(px, -py) * 180 / Math.PI + 360) % 360;

    // Handle dead zone (lower half hemisphere below the arch)
    if (θ > 90 && θ < 270) {
      return θ > 180 ? lo : hi; // Snaps safely to left or right bounds
    }

    // Convert upper arch clock angle back to linear scale [270 -> 0 -> 90]
    let normClock = θ >= 270 ? θ - 270 : θ + 90;
    return Math.max(lo, Math.min(hi, lo + (normClock / 180) * (hi - lo)));
  }, [cx, cy, lo, hi]);

  const handlePointerDown = useCallback((e: any) => {
    if (!onDrag) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    const v = angleFromPointer(e);
    if (v != null) { lastCmd.current = Date.now(); onDrag(v); }
  }, [onDrag, angleFromPointer]);

  const handlePointerMove = useCallback((e: any) => {
    if (!dragging.current || !onDrag) return;
    const now = Date.now();
    if (now - lastCmd.current < 60) return;
    lastCmd.current = now;
    const v = angleFromPointer(e);
    if (v != null) onDrag(v);
  }, [onDrag, angleFromPointer]);

  const handlePointerUp = useCallback(() => { dragging.current = false; }, []);

  const interactive = !!onDrag;
  // Label sits in the upper centre, inside the bowl opening
  const labelY = cy - R * 0.28;

  return (
    <svg
      ref={svgRef}
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ flexShrink: 0, overflow: 'visible',
               cursor: interactive ? 'crosshair' : 'default', touchAction: 'none' }}
      onPointerDown={interactive ? handlePointerDown : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerUp={interactive  ? handlePointerUp   : undefined}
    >
      {interactive && <rect x={0} y={0} width={W} height={H} fill="transparent" />}

      {/* gray track — full bowl ∪ */}
      <path d={trackD} fill="none" stroke="#dde6f0" strokeWidth={7} strokeLinecap="round" />

      {/* colored fill — CW from left endpoint downward to current */}
      {fillD && (
        <path d={fillD} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}88)` }} />
      )}

      {/* neutral tick at bottom (180°) */}
      <line x1={(bx - 4).toFixed(2)} y1={by.toFixed(2)}
            x2={(bx + 4).toFixed(2)} y2={by.toFixed(2)}
            stroke="#b8c8dc" strokeWidth={2.5} strokeLinecap="round" />

      {/* target ring */}
      {tgtClock != null && (
        <circle cx={tx!.toFixed(2)} cy={ty!.toFixed(2)} r={4}
          fill="rgba(255,255,255,0.9)" stroke={color} strokeWidth={2} />
      )}

      {/* current handle dot */}
      {curClock != null && (() => {
        const [dx, dy] = toXY(curClock, R);
        return (
          <circle cx={dx.toFixed(2)} cy={dy.toFixed(2)} r={interactive ? 7 : 5}
            fill={color} stroke="white" strokeWidth={2.5}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        );
      })()}

      {/* value — inside bowl opening at the top */}
      <text x={cx} y={labelY} textAnchor="middle" dominantBaseline="middle"
        fill={current != null ? color : '#bbc8d8'}
        fontSize={W * 0.22} fontWeight="800" fontFamily="'Courier New', monospace">
        {current != null ? Math.round(current) : '—'}
      </text>
      <text x={cx} y={labelY + W * 0.155} textAnchor="middle"
        fill="#8aa0be" fontSize={W * 0.115} fontFamily="inherit" fontWeight="600">
        DEG
      </text>
    </svg>
  );
}

// ── AlertBanner ───────────────────────────────────────────────────────────────

function AlertBanner({ alerts, onDismiss }: any) {
  if (alerts.length === 0) return null;
  return (
    <div className="sc-alerts">
      {alerts.map((a: any) => (
        <div key={a.id} className={`sc-alert sc-alert-${a.kind}`}>
          <span className="sc-alert-icon">{a.kind === 'bad' ? '🔴' : '🟡'}</span>
          <span className="sc-alert-msg">{a.msg}</span>
          <Button variant="ghost" size="icon-xs" onClick={() => onDismiss(a.id)}>×</Button>
        </div>
      ))}
    </div>
  );
}

// ── ServoCard ─────────────────────────────────────────────────────────────────

function ServoCard({ def, data, onCmd }: any) {
  const [angle, setAngle] = useState('180');
  const [speed, setSpeed] = useState(10);
  const [acc, setAcc]     = useState(20);
  // All cards share one dark-yellow accent (brighter in dark theme). Charts/SVG
  // need a concrete colour, so it's derived from the theme rather than a CSS var.
  const theme = useThemeStore(s => s.theme);
  const c   = theme === 'dark' ? '#f0c040' : '#e0a200';
  const off = theme === 'dark' ? '#5b6478' : '#9aa3b5';

  const isOnline  = data?.connected ?? false;
  const moving    = data?.moving    ?? false;
  const torqueOn  = data?.torque    ?? false;
  const modeTxt   = data?.mode      ?? '—';

  const lo = def.lo ?? (def.type === 'twist' ? 0   : 80);
  const hi = def.hi ?? (def.type === 'twist' ? 360 : 280);

  const go   = () => onCmd(def.id, 'pos', { angle, speed, acc });
  const home = () => { setAngle('180'); onCmd(def.id, 'pos', { angle: 180, speed, acc }); };

  // When servo is offline treat all sensor values as null (show —)
  const live = (v: any) => isOnline ? v : null;
  // Raw integer fields that use -1 as sentinel → also treat as null
  const rawLive = (v: any) => (isOnline && v != null && v >= 0) ? v : null;

  const STATS = [
    ['Angle',   live(data?.currentAngle),        '°',    2],
    ['Target',  live(data?.targetAngle),          '°',    2],
    ['Speed',   rawLive(data?.speed),             'raw',  0],
    ['Pos',     rawLive(data?.rawPos),            '0-4k', 0],
    ['Load',    rawLive(data?.loadAbs),           'abs',  0],
    ['Current', live(data?.currentmA),            'mA',   1],
    ['Voltage', live(data?.voltageV),             'V',    1],
    ['Temp',    live(data?.tempC),                '°C',   0],
  ];

  const gaugeTarget = modeTxt === 'Position' ? live(data?.targetAngle) : null;

  return (
    <div className="sc-card" style={{ '--sc-accent': c } as CSSProperties}>
      {/* Header */}
      <div className="sc-card-head">
        <div className="sc-card-head-inner">
          <AngleGauge
            current={live(data?.currentAngle)}
            target={gaugeTarget}
            color={c}
            lo={lo} hi={hi}
            onDrag={(deg: any) => onCmd(def.id, 'pos', { angle: deg.toFixed(1), speed, acc })}
          />
          <div className="sc-card-info">
            <div className="sc-card-title">
              <span className="sc-joint-mono"
                style={{ background: `${c}18`, border: `1px solid ${c}55`, color: c }}>
                {def.label}
              </span>
              <span className="sc-card-name" style={{ color: c }}>{def.name}</span>
              <span className="sc-card-type">{def.type}</span>
            </div>
            <div className="sc-badges">
              <span className={`sc-badge ${isOnline ? 'sc-badge-ok' : 'sc-badge-bad'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
              <span className={`sc-badge ${moving ? 'sc-badge-warn' : ''}`}>
                {moving ? 'MOVING' : 'IDLE'}
              </span>
              <span className={`sc-badge ${torqueOn ? 'sc-badge-ok' : 'sc-badge-warn'}`}>
                {torqueOn ? 'TRQ ✓' : 'TRQ ✗'}
              </span>
              <span className="sc-badge">{modeTxt}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sc-card-body">
        {/* Controls */}
        <div className="sc-controls">
          <div className="sc-field">
            <label>Current (°)</label>
            <span className="sc-angle-input" style={{ color: live(data?.currentAngle) != null ? c : off, cursor: 'default' }}>
              {live(data?.currentAngle) != null ? fmt(live(data?.currentAngle), 1) : '—'}
            </span>
          </div>
          <div className="sc-field">
            <label>Target (°)</label>
            <input type="number" className="sc-angle-input" min="0" max="360" step="0.1"
              value={angle} onChange={e => setAngle(e.target.value)}
              style={{ color: c }} />
          </div>
          <div className="sc-field">
            <label>Speed &nbsp;
              <span className="sc-slider-val" style={{ color: c }}>{speed}</span>
            </label>
            <input type="range" className="sc-slider" min="1" max="10" value={speed}
              onChange={e => setSpeed(Number(e.target.value))} style={{ '--sc-accent': c } as CSSProperties} />
          </div>
          <div className="sc-field">
            <label>Accel &nbsp;
              <span className="sc-slider-val" style={{ color: c }}>{acc}</span>
            </label>
            <input type="range" className="sc-slider" min="1" max="100" value={acc}
              onChange={e => setAcc(Number(e.target.value))} style={{ '--sc-accent': c } as CSSProperties} />
          </div>
        </div>

        {/* Buttons */}
        <div className="sc-btns">
          <Button size="sm" onClick={go}>GO</Button>
          {def.type === 'twist' && <>
            <Button variant="outline" size="sm" onClick={() => onCmd(def.id, 'cw')}>CW</Button>
            <Button variant="outline" size="sm" onClick={() => onCmd(def.id, 'ccw')}>CCW</Button>
            <Button variant="outline" size="sm" onClick={() => onCmd(def.id, 'wave')}>WAVE</Button>
          </>}
          <Button variant="destructive" size="sm" onClick={() => onCmd(def.id, 'stop')}>
            ■ STOP
          </Button>
          <Button variant="outline" size="sm" onClick={home}>180°</Button>
          <Button variant="outline" size="sm" onClick={() => onCmd(def.id, 'torqueToggle')}>
            {torqueOn ? '⟲ T.OFF' : '⟲ T.ON'}
          </Button>
        </div>

        {/* Stats */}
        <div className="sc-stats">
          {STATS.map(([k, v, u, d]) => (
            <div key={k} className="sc-stat">
              <div className="sc-stat-k">{k}</div>
              <div className="sc-stat-v"
                style={{ color: v != null ? c : off }}>
                {v != null ? fmt(v, d) : '—'}
              </div>
              <div className="sc-stat-u">{u}</div>
            </div>
          ))}
        </div>

        {/* Graphs */}
        <div className="sc-graphs">
          <div className="sc-graph-box">
            <div className="sc-graph-hdr">
              <span>CURRENT</span>
              <span className="sc-graph-val" style={{ color: c }}>
                {data?.currentmA != null ? `${fmt(data.currentmA, 1)} mA` : '—'}
              </span>
            </div>
            <MiniChart values={data?.history?.current ?? []} color={c} />
          </div>
          <div className="sc-graph-box">
            <div className="sc-graph-hdr">
              <span>LOAD ABS</span>
              <span className="sc-graph-val" style={{ color: c }}>
                {data?.loadAbs != null ? String(data.loadAbs) : '—'}
              </span>
            </div>
            <MiniChart values={data?.history?.load ?? []} color={c} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GroupControl ──────────────────────────────────────────────────────────────

function GroupControl({ defs, servos, online, onEstop, onHome }: any) {

  return (
    <div className="sc-group-strip">
      {/* Each board's own saved home (set on ESP-TTL with "Set current as home"), not a blind 180°. */}
      <Button size="xs" title="Every servo goes to its saved home position" onClick={onHome}>
        Home all
      </Button>
      {/* an emergency stop stays solid red, never a faint button */}
      <Button size="xs" className="tw:bg-destructive tw:text-white tw:hover:bg-destructive/85 tw:font-bold"
        onClick={onEstop}>
        ⚡ E-STOP
      </Button>
      <TorqueSwitch size="xs" online={online} onSet={on => void callAllNodes(`/api/torque?on=${on ? 1 : 0}`)}
        torque={defs.filter((d: any) => servos[d.id]?.connected).map((d: any) => !!servos[d.id]?.torque)} />
    </div>
  );
}

// ── Board pill ────────────────────────────────────────────────────────────────
/** One module board: click to change its address, × to remove it. Saved, and polled at once (espPoll reads the list every round). */
function NodePill({ nd, canRemove }: any) {
  const updateNode = useEspNodesStore(s => s.updateNode);
  const removeNode = useEspNodesStore(s => s.removeNode);
  const [edit, setEdit] = useState<string | null>(null);
  const commit = () => { if (edit != null && edit.trim() && edit.trim() !== nd.url) updateNode(nd.id, { url: edit.trim() }); setEdit(null); };
  return (
    <div className="sc-node-pill" title={`${nd.url}${nd.componentId ? '' : ' · not linked to a module yet'} · click to change the address`}>
      <span className={`sc-dot ${nd.connected ? 'ok' : 'bad'}`} />
      {edit != null ? (
        <Input size="xs" className="tw:w-[150px]" autoFocus value={edit} spellCheck={false}
               onChange={e => setEdit(e.target.value)} onBlur={commit}
               onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEdit(null); }} />
      ) : (
        <button className="sc-node-name" onClick={() => setEdit(nd.url)}>
          {nd.name}{nd.latencyMs != null ? ` · ${nd.latencyMs}ms` : ''}
        </button>
      )}
      {canRemove && (
        <button className="sc-node-del" aria-label={`Remove ${nd.name}`} title={`Remove ${nd.name}`}
                onClick={() => { if (confirm(`Remove ${nd.name} (${nd.url})?`)) removeNode(nd.id); }}>×</button>
      )}
    </div>
  );
}

// ── Debug Log ─────────────────────────────────────────────────────────────────

const SRC_COLORS = {
  SIM:  '#f59e0b',
  USER: '#0077dd',
  ESP:  '#009944',
  POLL: '#6366f1',
  OFF:  '#f97316',
  ERR:  '#dc2626',
  SYS:  'var(--text-dim)',
};

const LEVEL_COLORS = {
  ok:     '#009944',
  error:  '#dc2626',
  warn:   '#d97706',
  info:   '#0077dd',
  cmd:    '#6366f1',
  queued: '#8b5cf6',
  offline:'#f97316',
};

function DebugLog({ log, onClear }: any) {
  const bottomRef = useRef<any>(null);
  useEffect(() => {
    const el = bottomRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <div className="sc-log">
      <div className="sc-log-hdr">
        <span>Debug Log</span>
        <span style={{ display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 10 }}>
            {log.length} entries · real-time
          </span>
          <Button variant="outline" size="xs" onClick={onClear} title="Clear the log">
            CLR
          </Button>
        </span>
      </div>
      <div className="sc-log-body" style={{ maxHeight: 220 }}>
        {log.length === 0 && (
          <div style={{ padding: '10px 0', color: 'var(--text-dim)', fontSize: 11 }}>
            no activity — connect to ESP32 and drag arm or press buttons
          </div>
        )}
        {log.map((e: any, i: any) => (
          <div key={e.id ?? i} className="sc-log-entry">
            <span className="sc-log-time">{e.time}</span>
            <span className="sc-log-src" style={{ color: SRC_COLORS[e.src as keyof typeof SRC_COLORS] ?? 'var(--text-dim)' }}>
              [{e.src ?? '?'}]
            </span>
            <span style={{ color: LEVEL_COLORS[(e.level ?? e.kind) as keyof typeof LEVEL_COLORS] ?? 'var(--text-dim)', flex: 1 }}>
              {e.msg}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Main ServoController ───────────────────────────────────────────────────────

export default function ServoController() {
  // ── Dynamic servo defs (mirror the simulator's joints) ─────────────────────
  const doc  = useModelStore(s => s.doc);
  const defs = useMemo(() => servoDefsFromDoc(doc), [doc]);
  const motorSummary = useMemo(() => {
    if (defs.length === 0) return 'Smart Servo';
    const counts: Record<string, number> = {};
    for (const d of defs) {
      const mt = d.motorType || 'Servo';
      counts[mt] = (counts[mt] || 0) + 1;
    }
    return Object.entries(counts).map(([t, n]) => `${n} × ${t}`).join(' · ');
  }, [defs]);
  // Keep a ref so the (stable) poll callback can read the latest defs without
  // being re-created on every joint edit.
  const defsRef = useRef(defs);
  useEffect(() => { defsRef.current = defs; }, [defs]);

  // ── Integration store (logs + sim relay) ──────────────────────────────────
  const pushCtrlLog   = useIntegrationStore(s => s.pushCtrlLog);
  const clearCtrlLog  = useIntegrationStore(s => s.clearCtrlLog);
  const ctrlLog       = useIntegrationStore(s => s.ctrlLog);
  const pendingAngles = useIntegrationStore(s => s.pendingAngles);
  const consumeAngles = useIntegrationStore(s => s.consumeAngles);
  const markSent      = useIntegrationStore(s => s.markSent);
  const simSent       = useIntegrationStore(s => s.simSent);
  const simFailed     = useIntegrationStore(s => s.simFailed);
  const simOffline    = useIntegrationStore(s => s.simOffline);

  // ── Multi-ESP node registry (each module = its own ESP32-C3) ───────────────
  // The espPoll engine keeps EVERY board polled; here we just read the results.
  const nodes = useEspNodesStore(s => s.nodes);
  const addNode = useEspNodesStore(s => s.addNode);

  const [alerts, setAlerts] = useState<any[]>([]);
  const dismissRef = useRef(new Set());
  const histRef = useRef<Record<string, { current: number[]; load: number[] }>>({});

  const nodeById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const routing  = useMemo(() => servoRouting(doc), [doc, nodes]);

  // Per-JOINT live data, assembled from each joint's module ESP telemetry. Local
  // servo ids repeat across boards, so each joint is looked up by (node → localId).
  const servos = useMemo(() => {
    const out: Record<string, any> = {};
    for (const def of defs) {
      const r = routing.get(def.id);
      const node = r?.nodeId ? nodeById.get(r.nodeId) : undefined;
      const sv = (node?.telemetry as any)?.servos?.find((s: any) => s.id === r?.localId);
      out[def.id] = { ...(sv ?? {}), _node: node, history: histRef.current[def.id] ?? { current: [], load: [] } };
    }
    return out;
  }, [defs, routing, nodeById]);
  const servosRef = useRef(servos);
  useEffect(() => { servosRef.current = servos; }, [servos]);

  // Accumulate per-joint history + recompute alerts whenever any board's telemetry updates.
  useEffect(() => {
    for (const def of defs) {
      const r = routing.get(def.id);
      const node = r?.nodeId ? nodeById.get(r.nodeId) : undefined;
      const sv = (node?.telemetry as any)?.servos?.find((s: any) => s.id === r?.localId);
      if (!sv) continue;
      const h = histRef.current[def.id] ?? (histRef.current[def.id] = { current: [], load: [] });
      if (sv.currentmA != null) h.current = pushH(h.current, sv.currentmA);
      if (sv.loadAbs != null) h.load = pushH(h.load, sv.loadAbs);
    }
    const flat: Record<string, any> = {};
    for (const def of defs) flat[def.id] = servosRef.current[def.id];
    const totalMA = Object.values(flat).reduce((s: number, sv: any) => s + (sv?.currentmA ?? 0), 0);
    setAlerts(computeAlerts(defs, flat, totalMA).filter(a => !dismissRef.current.has(a.id)));
  }, [nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const connectedNodes = nodes.filter(n => n.connected).length;

  // ── Commands (routed per module ESP by servoLink) ─────────────────────────
  const sendCmd = useCallback(async (jointId: any, cmd: any, extra: any = {}, src = 'USER') => {
    // Smooth ease-in/out for position commands >= 2° (acc scales down with distance).
    if (cmd === 'pos' && extra.angle != null) {
      const currentAngle = servosRef.current[jointId]?.currentAngle;
      if (currentAngle != null) {
        const dist = Math.abs(Number(extra.angle) - currentAngle);
        if (dist >= 2) extra = { ...extra, acc: Math.max(6, Math.round(40 / (1 + dist / 15))) };
      }
    }
    const label = defsRef.current.find(d => d.id === jointId)?.label ?? jointId;
    const desc  = `${label} → ${cmd}${extra.angle !== undefined ? ` ${Number(extra.angle).toFixed(1)}°` : ''}`;
    pushCtrlLog('cmd', src, desc);
    const { ok, detail } = await sendServoCmd(doc, jointId, cmd, extra);
    pushCtrlLog(ok ? 'ok' : 'error', ok ? 'ESP' : 'ERR', `${desc} — ${detail}`);
  }, [pushCtrlLog, doc]);

  const estopAll = useCallback(async () => {
    pushCtrlLog('error', 'SYS', '⚡ EMERGENCY STOP ALL — killing torque on every board');
    await estopAllNodes();
    pushCtrlLog('ok', 'ESP', `E-STOP sent to ${nodes.length} board(s)`);
  }, [pushCtrlLog, nodes.length]);

  // ── Consume pending angles from the sim stream (legacy servo-id keyed) ──────
  useEffect(() => {
    if (!pendingAngles) return;
    const angles = pendingAngles;
    consumeAngles();

    const summary = Object.entries(angles)
      .map(([id, d]) => `${defsRef.current.find((x) => x.id === id)?.name ?? id}→${Number(d).toFixed(1)}°`)
      .join(' ');
    pushCtrlLog('queued', 'SIM', `Received from the sim: ${summary}`);

    if (connectedNodes === 0) {
      pushCtrlLog('offline', 'OFF', 'Cannot relay — no ESP board online');
      simOffline(summary);
      return;
    }

    // keyed by joint id already (SimTransmitPanel): batch per module ESP
    const byJoint: Record<string, number> = { ...(angles as Record<string, number>) };
    sendServoBatch(doc, byJoint, { speed: 5, acc: 20 }).then((r) => {
      if (r.errors.length) { pushCtrlLog('error', 'ERR', `Batch: ${r.errors.join('; ')}`); simFailed(summary); }
      else { pushCtrlLog('ok', 'ESP', `Batch OK — ${r.sent} servo(s) across ${r.nodes} board(s)`); simSent(summary); markSent(angles); }
    });
  }, [pendingAngles]); // eslint-disable-line react-hooks/exhaustive-deps

  const homeAll = useCallback(async () => {
    pushCtrlLog('cmd', 'USER', 'Home all — every servo to its saved home');
    const r = await callAllNodes('/api/home/manual');
    if (r.errors.length) pushCtrlLog('error', 'ERR', `Home: ${r.errors.join('; ')}`);
    else pushCtrlLog('ok', 'ESP', `Home sent to ${r.ok} board(s)`);
  }, [pushCtrlLog]);

  const dismissAlert = useCallback((id: any) => {
    dismissRef.current.add(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalCurrent = useMemo(() => totalCurrentmA(defs, servos), [defs, servos]);
  const hottest      = useMemo(() => hottestServo(defs, servos),   [defs, servos]);
  const onlineCnt    = useMemo(() => onlineCount(defs, servos),    [defs, servos]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="sc-page" data-ui="a">
      <div className="sc-wrap">

        {/* ── Top bar ── */}
        <div className="sc-topbar">
          <div className="sc-brand">
            <p className="sc-brand-title">TETROBOT Servo Controller</p>
            <p className="sc-brand-sub">
              {motorSummary} · mirrors simulator joints · Real-time telemetry
            </p>
          </div>
          <div className="sc-topbar-space" />
          {/* Per-board status — each module's ESP32-C3 is polled continuously. */}
          <div className="sc-nodes-strip">
            {nodes.map((nd) => <NodePill key={nd.id} nd={nd} canRemove={nodes.length > 1} />)}
            <Button variant="outline" size="xs" onClick={() => addNode()} title="Add another module board">+ Board</Button>
          </div>
          <div className="sc-topbar-sep" />
          <div className="sc-pill">
            <span className={`sc-dot ${connectedNodes === nodes.length && nodes.length > 0 ? 'ok' : connectedNodes > 0 ? 'warn' : 'bad'}`} />
            {connectedNodes}/{nodes.length} boards
          </div>
          <div className="sc-pill">
            <span className={`sc-dot ${defs.length > 0 && onlineCnt === defs.length ? 'ok' : onlineCnt > 0 ? 'warn' : 'bad'}`} />
            {onlineCnt} / {defs.length} servos
          </div>
          <button className="sc-estop" onClick={estopAll}>⚡ E-STOP ALL</button>
        </div>

        {/* ── Alerts ── */}
        <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

        {/* ── Live status bar (sticky, always visible) ── */}
        <div className="sc-livestrip">
          <span className="sc-ls-label">SERVOS</span>
          {defs.map(def => {
            const sv   = servos[def.id];
            const isOn = sv?.connected ?? false;
            const ang  = sv?.currentAngle != null && isOn ? Math.round(sv.currentAngle) + '°' : '—';
            const mA   = sv?.currentmA    != null && isOn ? Math.round(sv.currentmA)    + 'mA' : '';
            return (
              <div key={def.id} className="sc-ls-servo">
                <span className="sc-ls-dot"
                  style={{ background: isOn ? def.color : '#888',
                           boxShadow: isOn ? `0 0 7px ${def.color}` : 'none' }} />
                <span className="sc-ls-id" style={{ color: def.color }}>{def.label}</span>
                <span className="sc-ls-ang">{ang}</span>
                {mA && <span className="sc-ls-ma">{mA}</span>}
              </div>
            );
          })}
          <div className="sc-ls-sep" />
          <div className="sc-ls-stat">
            <span className="sc-ls-k">DRAW</span>
            <span className="sc-ls-v"
              style={{ color: totalCurrent > TOTAL_MA_MAX ? 'var(--danger)' : 'var(--accent)' }}>
              {totalCurrent.toFixed(1)} <span className="sc-ls-unit">mA</span>
            </span>
          </div>
          <div className="sc-ls-stat">
            <span className="sc-ls-k">HOT</span>
            <span className="sc-ls-v">{hottest}</span>
          </div>
          <div className="sc-ls-sep" />
          <div className="sc-ls-stat">
            <span className="sc-ls-k">BOARDS</span>
            <span className="sc-ls-v">{connectedNodes}/{nodes.length} online</span>
          </div>
        </div>

        {/* ── Group control ── */}
        <GroupControl defs={defs} servos={servos} online={connectedNodes > 0} onEstop={estopAll} onHome={homeAll} />

        {/* ── Servo grid ── */}
        {defs.length === 0 ? (
          <div className="sc-empty">
            <p className="sc-empty-title">No joints yet</p>
            <p className="sc-empty-sub">
              Go to the <strong>Simulator</strong> page and create joints (Build → Create joint).
              Each movable joint shows up here as a servo — revolute joints get a limited dial,
              continuous joints get a full-rotation dial with spin controls.
            </p>
          </div>
        ) : (
          <div className="sc-grid">
            {defs.map(def => (
              <ServoCard key={def.jointId ?? def.id} def={def} data={servos[def.id]} onCmd={sendCmd} />
            ))}
          </div>
        )}

        {/* ── Debug log ── */}
        <DebugLog log={ctrlLog} onClear={clearCtrlLog} />

      </div>
    </div>
  );
}