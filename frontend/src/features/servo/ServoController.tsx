import { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react';
import type { CSSProperties } from 'react';
import type { Document } from '@/core/model/index';
import { useIntegrationStore } from '@/state/integrationStore';
import { useThemeStore } from '@/state/themeStore';
import { useModelStore } from '@/state/modelStore';
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

/** Build the dynamic servo defs from the model document's joints. */
function servoDefsFromDoc(doc?: Document | null) {
  const joints = Object.values(doc?.joints ?? {}).filter((j) => j.type !== 'fixed');
  return joints.map((j, i) => {
    const kind = jointKind(j.type);
    const { lo, hi } = gaugeBounds(kind, j.limit);
    const assigned = Number(j.meta?.servoId);
    return {
      id: Number.isFinite(assigned) && assigned > 0 ? assigned : i + 1,
      jointId: j.id,
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

// Per-id type + within-type ordinal (twist: 1,2,3…  bend: 1,2,3…), used for the
// header overcurrent label. Recomputed whenever the defs change.
function servoTypeNumMap(defs: any) {
  const map: Record<string, any> = {};
  let t = 0, b = 0;
  for (const d of defs) {
    if (d.type === 'twist') map[d.id] = { type: 'twist', num: ++t };
    else                    map[d.id] = { type: 'bend',  num: ++b };
  }
  return map;
}

const MAX_HISTORY  = 120;
const POLL_MS      = 50;     // full-speed telemetry poll — ONLY runs once the ESP
                            // has answered (see the probe state machine below)
const PROBE_MS         = 300;   // attempt cadence while probing for the ESP
const PROBE_WINDOW_MS  = 5000;  // give up probing after 5s of silence
const MAX_LIVE_FAILS   = 10;    // consecutive live-poll failures (~0.5s) before
                                // declaring the link dead and stopping the loop
const DEFAULT_URL  = 'http://nischaylap.local';
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

function initServoState(defs: any) {
  const s: Record<string, any> = {};
  for (const d of defs) s[d.id] = { history: { current: [], load: [] } };
  return s;
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
          <button className="sc-alert-dismiss" onClick={() => onDismiss(a.id)}>×</button>
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
          <button className="sc-btn sc-btn-primary" onClick={go}>GO</button>
          {def.type === 'twist' && <>
            <button className="sc-btn" onClick={() => onCmd(def.id, 'cw')}>CW</button>
            <button className="sc-btn" onClick={() => onCmd(def.id, 'ccw')}>CCW</button>
            <button className="sc-btn" onClick={() => onCmd(def.id, 'wave')}>WAVE</button>
          </>}
          <button className="sc-btn sc-btn-danger" onClick={() => onCmd(def.id, 'stop')}>
            ■ STOP
          </button>
          <button className="sc-btn" onClick={home}>180°</button>
          <button className="sc-btn" onClick={() => onCmd(def.id, 'torqueToggle')}>
            {torqueOn ? '⟲ T.OFF' : '⟲ T.ON'}
          </button>
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

function GroupControl({ defs, onCmd, onEstop }: any) {
  const all = defs.map((d: any) => d.id);
  const g   = (cmd: any, extra = {}) => all.forEach((id: any) => onCmd(id, cmd, extra));

  return (
    <div className="sc-group-strip">
      <button className="sc-btn sc-btn-sm sc-btn-primary"
        onClick={() => g('pos', { angle: 180, speed: 5, acc: 40 })}>
        Home All
      </button>
      <button className="sc-btn sc-btn-sm sc-btn-danger"
        onClick={onEstop}>
        ⚡ E-STOP
      </button>
      <button className="sc-btn sc-btn-sm"
        onClick={() => g('torqueon')}>
        Torque ON
      </button>
      <button className="sc-btn sc-btn-sm"
        onClick={() => g('torqueoff')}>
        Torque OFF
      </button>
    </div>
  );
}

// ── SequenceRecorder ──────────────────────────────────────────────────────────

function SequenceRecorder({ defs, servos, onCmd }: any) {
  const [frames,   setFrames]   = useState<any[]>([]);
  const [playing,  setPlaying]  = useState(false);
  const [playIdx,  setPlayIdx]  = useState(-1);
  const [playDelay, setPlayDelay] = useState(1500);
  const abortRef = useRef(false);

  const capture = () => {
    const frame = defs.map((d: any) => ({
      id: d.id, label: d.label, angle: servos[d.id]?.currentAngle ?? 180,
    }));
    setFrames(prev => [...prev, frame]);
  };

  const play = async () => {
    if (playing || frames.length === 0) return;
    abortRef.current = false;
    setPlaying(true);
    for (let i = 0; i < frames.length; i++) {
      if (abortRef.current) break;
      setPlayIdx(i);
      for (const { id, angle } of frames[i]) {
        await onCmd(id, 'pos', { angle: Number(angle).toFixed(2), speed: 5, acc: 20 });
      }
      await new Promise(r => setTimeout(r, playDelay));
    }
    setPlayIdx(-1);
    setPlaying(false);
  };

  const stopPlay = () => {
    abortRef.current = true;
    setPlaying(false);
    setPlayIdx(-1);
  };

  const removeFrame = (i: any) => setFrames(prev => prev.filter((_, j) => j !== i));

  const exportSeq = () => {
    const blob = new Blob([JSON.stringify(frames, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: 'robo4_sequence.json',
    });
    a.click();
  };

  const importSeq = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse((ev.target as any).result);
        if (Array.isArray(data)) setFrames(data);
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="sc-seq">
      <div className="sc-seq-hdr">
        <span>⟳ Sequence Recorder</span>
        <span className="sc-seq-count">{frames.length} frame{frames.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="sc-seq-controls">
        <button className="sc-btn sc-btn-sm" onClick={capture}>+ Capture</button>
        {!playing
          ? <button className="sc-btn sc-btn-sm sc-btn-primary" onClick={play}
              disabled={frames.length === 0}>▶ Play</button>
          : <button className="sc-btn sc-btn-sm sc-btn-danger" onClick={stopPlay}>■ Stop</button>
        }
        <button className="sc-btn sc-btn-sm" onClick={exportSeq} disabled={frames.length === 0}>
          ↓ Export
        </button>
        <label className="sc-btn sc-btn-sm sc-import-label">
          ↑ Import
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={importSeq} />
        </label>
        <button className="sc-btn sc-btn-sm sc-btn-danger" onClick={() => setFrames([])}
          disabled={frames.length === 0}>Clear</button>
        <label className="sc-seq-delay-label">
          Delay
          <input className="sc-group-input" type="number" min="200" max="10000" step="100"
            value={playDelay} onChange={e => setPlayDelay(Number(e.target.value))} />
          ms
        </label>
      </div>
      {frames.length > 0 && (
        <div className="sc-seq-frames">
          {frames.map((frame, i) => (
            <div key={i} className={`sc-seq-frame ${playIdx === i ? 'sc-seq-frame-active' : ''}`}>
              <span className="sc-seq-frame-num">#{i + 1}</span>
              {frame.map(({ label, angle }: any) => (
                <span key={label} className="sc-seq-chip">
                  {label} {Math.round(angle)}°
                </span>
              ))}
              <button className="sc-seq-del" onClick={() => removeFrame(i)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PresetPanel ───────────────────────────────────────────────────────────────

function PresetPanel({ defs, servos, onApply }: any) {
  const [presets,   setPresets]   = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('sc_presets') || '[]'); }
    catch { return []; }
  });
  const [nameInput, setNameInput] = useState('');

  const persist = (next: any) => {
    setPresets(next);
    localStorage.setItem('sc_presets', JSON.stringify(next));
  };

  const savePreset = () => {
    const name = nameInput.trim() || `Preset ${presets.length + 1}`;
    const snapshot = defs.map((d: any) => ({
      id: d.id, angle: servos[d.id]?.currentAngle ?? 180,
    }));
    persist([...presets.filter(p => p.name !== name), { name, snapshot }]);
    setNameInput('');
  };

  const deletePreset = (name: any) => persist(presets.filter(p => p.name !== name));

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: 'robo4_presets.json',
    });
    a.click();
  };

  const importPresets = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse((ev.target as any).result);
        if (Array.isArray(data)) persist([...presets, ...data.filter(p => p.name && p.snapshot)]);
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="sc-presets">
      <div className="sc-presets-hdr">
        <span>⭐ Presets</span>
        <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 11 }}>
          snapshots all {defs.length} servo angle{defs.length !== 1 ? 's' : ''}
        </span>
        <div style={{ flex: 1 }} />
        <button className="sc-btn sc-btn-sm" onClick={exportPresets} disabled={presets.length === 0}>
          ↓ Export
        </button>
        <label className="sc-btn sc-btn-sm sc-import-label">
          ↑ Import
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={importPresets} />
        </label>
      </div>
      <div className="sc-preset-row">
        <input className="sc-preset-name-input" placeholder="preset name…"
          value={nameInput} onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && savePreset()} />
        <button className="sc-btn sc-btn-sm" onClick={savePreset}>+ Save</button>
        {presets.map(p => (
          <span key={p.name} className="sc-preset-chip">
            <span onClick={() => onApply(p.snapshot)}>{p.name}</span>
            <span className="sc-preset-del" onClick={() => deletePreset(p.name)}>×</span>
          </span>
        ))}
        {presets.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>no presets yet</span>
        )}
      </div>
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
          <button
            onClick={onClear}
            style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:5,
              padding:'1px 7px', fontSize:10, cursor:'pointer', color:'var(--text-dim)' }}>
            CLR
          </button>
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
  const typeNumMap = useMemo(() => servoTypeNumMap(defs), [defs]);
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
  const typeNumRef = useRef(typeNumMap);
  useEffect(() => { typeNumRef.current = typeNumMap; }, [typeNumMap]);

  // ── Integration store ─────────────────────────────────────────────────────
  const intEspUrl       = useIntegrationStore(s => s.espUrl);
  const pushCtrlLog     = useIntegrationStore(s => s.pushCtrlLog);
  const clearCtrlLog    = useIntegrationStore(s => s.clearCtrlLog);
  const ctrlLog         = useIntegrationStore(s => s.ctrlLog);
  const pendingAngles   = useIntegrationStore(s => s.pendingAngles);
  const consumeAngles   = useIntegrationStore(s => s.consumeAngles);
  const markSent        = useIntegrationStore(s => s.markSent);
  const simSent         = useIntegrationStore(s => s.simSent);
  const simFailed       = useIntegrationStore(s => s.simFailed);
  const simOffline      = useIntegrationStore(s => s.simOffline);
  const setIntConnected      = useIntegrationStore(s => s.setConnected);
  const setIntEspUrl         = useIntegrationStore(s => s.setEspUrl);
  const setServoOnlineCount  = useIntegrationStore(s => s.setServoOnlineCount);
  const setAvgVoltage        = useIntegrationStore(s => s.setAvgVoltage);
  const setTotalCurrentMA    = useIntegrationStore(s => s.setTotalCurrentMA);
  const setOvercurrentServos = useIntegrationStore(s => s.setOvercurrentServos);

  const [espUrl,       setEspUrl]       = useState(intEspUrl);
  const [inputUrl,     setInputUrl]     = useState(intEspUrl);
  const [connected,    setConnected]    = useState(false);
  // Link lifecycle: 'probing' (looking for the ESP, max 5s) → 'live' (full-speed
  // 50ms polling) or 'stopped' (no requests at all until the user hits Connect).
  const [linkState,    setLinkState]    = useState('probing');
  const [probeNonce,   setProbeNonce]   = useState(0); // bump to restart probing
  const [latencyMs,    setLatencyMs]    = useState<any>(null);
  const [lastUpdateStr, setLastUpdateStr] = useState('—');
  const [servos,       setServos]       = useState(() => initServoState(defs));
  const [wifiInfo,     setWifiInfo]     = useState<any>(null);
  const [alerts,       setAlerts]       = useState<any[]>([]);

  const pollRef    = useRef<any>(null);
  const busyRef    = useRef(false);
  const dismissRef = useRef(new Set());
  const connectedRef = useRef(false);
  const espUrlRef    = useRef(espUrl);
  const linkStateRef    = useRef('probing');
  const probeDeadlineRef = useRef(0);
  const failCountRef     = useRef(0);
  useEffect(() => { linkStateRef.current = linkState; }, [linkState]);

  // Keep refs current for use inside async callbacks
  useEffect(() => { connectedRef.current = connected; }, [connected]);
  useEffect(() => { espUrlRef.current    = espUrl;    }, [espUrl]);

  const addLog = useCallback((msg: any, kind = 'cmd', src = 'USER') => {
    pushCtrlLog(kind, src, msg);
  }, [pushCtrlLog]);

  // ── Poll ────────────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (busyRef.current) return connectedRef.current; // skipped, not a failure
    busyRef.current = true;
    const t0 = Date.now();
    try {
      const res  = await fetch(`${espUrl}/api/telemetry`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      const lat  = Date.now() - t0;
      setLatencyMs(lat);

      if (data?.ok) {
        if (!connectedRef.current) {
          pushCtrlLog('ok', 'SYS', `ESP connected — ${espUrl} (${lat}ms)`);
        }
        setConnected(true);
        setIntConnected(true, lat);
        setLastUpdateStr(new Date().toLocaleTimeString());
        if (data.wifi) setWifiInfo(data.wifi);

        // Compute totalMA directly from raw response — NOT inside setServos, whose
        // updater runs lazily and would leave totalMA=0 when read immediately after.
        const totalMA = (data.servos ?? []).reduce((sum: any, sv: any) => sum + (sv.currentmA ?? 0), 0);

        setServos(prev => {
          const next = { ...prev };
          for (const sv of (data.servos ?? [])) {
            const old = prev[sv.id] || { history: { current: [], load: [] } };
            next[sv.id] = {
              ...sv,
              history: {
                current: sv.currentmA != null ? pushH(old.history.current, sv.currentmA) : old.history.current,
                load:    sv.loadAbs    != null ? pushH(old.history.load,    sv.loadAbs)   : old.history.load,
              },
            };
          }
          return next;
        });

        const newAlerts = computeAlerts(
          defsRef.current,
          Object.fromEntries((data.servos ?? []).map((sv: any) => [sv.id, sv])),
          totalMA
        ).filter(a => !dismissRef.current.has(a.id));
        setAlerts(newAlerts);

        const onCnt = (data.servos ?? []).filter((s: any) => s.connected).length;
        setServoOnlineCount(onCnt);

        // Push average voltage + total current for header indicators
        const voltageSamples = (data.servos ?? []).filter((s: any) => s.connected && s.voltageV != null);
        if (voltageSamples.length > 0) {
          const avg = voltageSamples.reduce((sum: any, s: any) => sum + s.voltageV, 0) / voltageSamples.length;
          setAvgVoltage(avg);
        }
        if (onCnt > 0) setTotalCurrentMA(totalMA);

        // Track per-servo overcurrent (> 700 mA) for header warning
        const oc = (data.servos ?? [])
          .filter((s: any) => s.connected && s.currentmA != null && s.currentmA > 700)
          .map((s: any) => {
            const tn = typeNumRef.current[s.id] ?? { type: 'twist', num: s.id };
            return { id: s.id, label: s.label ?? `J${s.id}`, type: tn.type, typeNum: tn.num, currentmA: s.currentmA };
          });
        setOvercurrentServos(oc);

        // Log poll summary every ~4s (every 16th poll at 250ms)
        if (Math.random() < 0.063) {
          const hottest = (data.servos ?? []).reduce((m: any, s: any) => s.tempC > m ? s.tempC : m, 0);
          pushCtrlLog('info', 'POLL', `${onCnt}/${defsRef.current.length} online · ${lat}ms · ${(totalMA/1000).toFixed(2)}A · ${hottest}°C`);
        }
      }
      return true; // ESP answered — reachable
    } catch (err) {
      if (connectedRef.current) {
        pushCtrlLog('error', 'SYS', `ESP lost — ${err.message}`);
      }
      setConnected(false);
      setIntConnected(false, null);
      setServoOnlineCount(0);
      return false; // unreachable
    } finally {
      busyRef.current = false;
    }
  }, [espUrl, pushCtrlLog, setIntConnected]);

  // Connection-aware poll loop. Three phases, one request in flight at a time:
  //   probing — try every PROBE_MS for up to 5s. First success → 'live'.
  //   live    — poll at full speed (POLL_MS). Stop after MAX_LIVE_FAILS in a row.
  //   stopped — no requests at all. The user must hit Connect/Try again to retry.
  // This means an offline ESP generates ZERO network traffic (no busy cursor),
  // while a present one is polled at the full 50ms.
  useEffect(() => {
    let cancelled = false;
    probeDeadlineRef.current = Date.now() + PROBE_WINDOW_MS;
    failCountRef.current = 0;
    setLinkState('probing');
    linkStateRef.current = 'probing';

    const tick = async () => {
      if (cancelled) return;
      const ok = await poll();
      if (cancelled) return;

      if (ok) {
        failCountRef.current = 0;
        if (linkStateRef.current !== 'live') { linkStateRef.current = 'live'; setLinkState('live'); }
        pollRef.current = setTimeout(tick, POLL_MS);
        return;
      }

      // Poll failed —
      if (linkStateRef.current === 'live') {
        failCountRef.current += 1;
        if (failCountRef.current >= MAX_LIVE_FAILS) {
          pushCtrlLog('error', 'SYS', 'ESP unreachable — polling stopped. Press Connect to retry.');
          linkStateRef.current = 'stopped'; setLinkState('stopped');
          return; // halt the loop entirely
        }
        pollRef.current = setTimeout(tick, POLL_MS);
        return;
      }

      // Still probing —
      if (Date.now() < probeDeadlineRef.current) {
        pollRef.current = setTimeout(tick, PROBE_MS);
      } else {
        pushCtrlLog('offline', 'OFF', `No ESP at ${espUrlRef.current} after 5s — polling off. Press Connect to retry.`);
        linkStateRef.current = 'stopped'; setLinkState('stopped');
      }
    };
    tick();
    return () => { cancelled = true; clearTimeout(pollRef.current); };
  }, [poll, probeNonce, pushCtrlLog]);

  // ── Commands ────────────────────────────────────────────────────────────────
  const sendCmd = useCallback(async (servoId: any, cmd: any, extra: any = {}, src = 'USER') => {
    // Smooth ease-in/out for position commands >= 2°.
    // acc scales down with distance so the servo ramps up and down gradually.
    // Formula: acc = max(6, 40 / (1 + dist/15))
    //   2°→35  5°→30  10°→24  20°→17  45°→10  90°→6
    // Continuous sim-streaming (tiny steps every 50ms) bypasses this via /api/batch, not sendCmd.
    if (cmd === 'pos' && extra.angle != null) {
      const currentAngle = servos[servoId]?.currentAngle;
      if (currentAngle != null) {
        const dist = Math.abs(Number(extra.angle) - currentAngle);
        if (dist >= 2) {
          const smoothAcc = Math.max(6, Math.round(40 / (1 + dist / 15)));
          extra = { ...extra, acc: smoothAcc };
        }
      }
    }

    const label = defsRef.current.find(d => d.id === servoId)?.label ?? servoId;
    const desc  = `${label} → ${cmd}${extra.angle !== undefined ? ` ${Number(extra.angle).toFixed(1)}°` : ''}`;
    pushCtrlLog('cmd', src, desc);
    const qs = new URLSearchParams({ servo: String(servoId), cmd, ...extra });
    try {
      const t0  = Date.now();
      const res = await fetch(`${espUrlRef.current}/api/command?${qs}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(res.statusText);
      pushCtrlLog('ok', 'ESP', `${desc} ✓ (${Date.now()-t0}ms)`);
    } catch (err) {
      pushCtrlLog('error', 'ERR', `${desc} — ${err.message}`);
    }
  }, [pushCtrlLog, servos]);

  const estopAll = useCallback(async () => {
    pushCtrlLog('error', 'SYS', '⚡ EMERGENCY STOP ALL — killing torque on all servos');
    try {
      await fetch(`${espUrlRef.current}/api/command?servo=all&cmd=estop`, { signal: AbortSignal.timeout(5000) });
      pushCtrlLog('ok', 'ESP', 'E-STOP acknowledged');
    } catch (err) {
      pushCtrlLog('error', 'ERR', `E-STOP failed — ${err.message}`);
    }
  }, [pushCtrlLog]);

  const handleConnect = () => {
    const url = inputUrl.trim();
    const finalUrl = url.startsWith('http') ? url : `http://${url}`;
    setEspUrl(finalUrl);
    setIntEspUrl(finalUrl);
    pushCtrlLog('info', 'SYS', `Probing ${finalUrl} (5s)…`);
    // Restart the probe loop even if the URL is unchanged ("Try again").
    setProbeNonce(n => n + 1);
  };

  // ── Consume pending angles from sim ────────────────────────────────────────
  useEffect(() => {
    if (!pendingAngles) return;
    const angles = pendingAngles;
    consumeAngles();

    const summary = Object.entries(angles)
      .sort(([a],[b]) => Number(a)-Number(b))
      .map(([id, d]) => `J${id}→${Number(d).toFixed(1)}°`)
      .join(' ');

    pushCtrlLog('queued', 'SIM', `Received from Page 1: ${summary}`);

    if (!connectedRef.current) {
      pushCtrlLog('offline', 'OFF', `Cannot relay — ESP offline (${espUrlRef.current})`);
      simOffline(summary);
      return;
    }

    // Send as a single batch request to /api/batch
    const qs = new URLSearchParams({ speed: '5', acc: '20' });
    Object.entries(angles).forEach(([id, deg]) => qs.append(id, Number(deg).toFixed(2)));

    pushCtrlLog('cmd', 'ESP', `Sending batch → /api/batch?${qs.toString().slice(0,60)}…`);

    const t0 = Date.now();
    fetch(`${espUrlRef.current}/api/batch?${qs}`, { signal: AbortSignal.timeout(5000) })
      .then(async r => {
        if (!r.ok) throw new Error(r.statusText);
        const body = await r.json();
        const lat = Date.now() - t0;
        pushCtrlLog('ok', 'ESP', `Batch OK — ${body.sent ?? '?'} servos updated (${lat}ms)`);
        simSent(summary);
        markSent(angles);
      })
      .catch(err => {
        pushCtrlLog('error', 'ERR', `Batch failed — ${err.message}`);
        simFailed(`${summary} — ${err.message}`);
      });
  }, [pendingAngles]);

  const applyPreset = useCallback((snapshot: any) => {
    pushCtrlLog('ok', 'USER', `Applying preset — ${snapshot.length} servos`);
    for (const s of snapshot) sendCmd(s.id, 'pos', { angle: s.angle, speed: 5, acc: 20 }, 'USER');
  }, [sendCmd, pushCtrlLog]);

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
    <div className="sc-page">
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
          <div className="sc-url-row">
            <input className="sc-url-input"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder="http://nischaylap.local"
            />
            <button className="sc-btn" onClick={handleConnect}>
              {linkState === 'stopped' ? 'Try again' : 'Connect'}
            </button>
          </div>
          <div className="sc-topbar-sep" />
          <div className="sc-pill">
            <span className={`sc-dot ${linkState === 'live' ? 'ok' : linkState === 'probing' ? 'warn' : 'bad'}`} />
            {linkState === 'live' ? 'Live' : linkState === 'probing' ? 'Connecting…' : 'Offline (paused)'}
          </div>
          <div className="sc-pill">
            <span className={`sc-dot ${defs.length > 0 && onlineCnt === defs.length ? 'ok' : onlineCnt > 0 ? 'warn' : 'bad'}`} />
            {onlineCnt} / {defs.length}
          </div>
          {latencyMs != null && <div className="sc-pill">{latencyMs} ms</div>}
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
          {wifiInfo && <>
            <div className="sc-ls-sep" />
            <div className="sc-ls-stat">
              <span className="sc-ls-k">ESP32</span>
              <span className="sc-ls-v">{wifiInfo.ip} · {wifiInfo.hostname}.local</span>
            </div>
            <div className="sc-ls-stat">
              <span className="sc-ls-k">SSID</span>
              <span className="sc-ls-v">{wifiInfo.ssid}</span>
            </div>
          </>}
          <div className="sc-ls-sep" />
          <div className="sc-ls-stat">
            <span className="sc-ls-k">UPDATED</span>
            <span className="sc-ls-v">{lastUpdateStr}</span>
          </div>
        </div>

        {/* ── Group control ── */}
        <GroupControl defs={defs} onCmd={sendCmd} onEstop={estopAll} />

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

        {/* ── Sequence recorder ── */}
        <SequenceRecorder defs={defs} servos={servos} onCmd={sendCmd} />

        {/* ── Presets ── */}
        <PresetPanel defs={defs} servos={servos} onApply={applyPreset} />

        {/* ── Debug log ── */}
        <DebugLog log={ctrlLog} onClear={clearCtrlLog} />

      </div>
    </div>
  );
}