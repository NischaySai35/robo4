import { useRef, useEffect, useCallback, useState } from 'react';
import { JOINT_DEFS } from '../store/armStore.js';

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

// Color palettes per joint index
const JOINT_PALETTES = [
  { main: '#cc8800', glow: '#cc880033', track: '#fff0cc', neg: '#cc3344' }, // J1 twist (CUBE L)
  { main: '#0088ff', glow: '#0088ff33', track: '#d0e8ff', neg: '#cc3344' }, // J2 bend
  { main: '#9944ff', glow: '#9944ff33', track: '#e8d8ff', neg: '#cc3344' }, // J3 bend
  { main: '#00aabb', glow: '#00aabb33', track: '#ccf0f4', neg: '#cc3344' }, // J4 bend
  { main: '#cc8800', glow: '#cc880033', track: '#fff0cc', neg: '#cc3344' }, // J5 twist (CUBE R)
];

/** Animated number — smoothly interpolates to target value. */
function AnimatedValue({ value, format, className, style }) {
  const spanRef    = useRef(null);
  const currentRef = useRef(value);
  const rafRef     = useRef(null);

  useEffect(() => {
    const target = value;
    const animate = () => {
      currentRef.current += (target - currentRef.current) * 0.14;
      if (spanRef.current) {
        spanRef.current.textContent = format(currentRef.current);
      }
      if (Math.abs(target - currentRef.current) > 0.005) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, format]);

  return <span ref={spanRef} className={className} style={style}>{format(value)}</span>;
}

/**
 * Inline angle input — shows animated degrees value normally;
 * on click becomes an editable input. Enter/blur commits.
 */
function AngleInput({ rawAngle, palette, panelIdx, limit, onJointSet }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const inputRef              = useRef(null);

  // Display as absolute servo angle: internal 0 rad = 180°, range shifts to 80-280 or 0-360
  const displayDeg = (rawAngle * RAD_TO_DEG + 180).toFixed(1);

  const startEdit = useCallback(() => {
    setDraft((rawAngle * RAD_TO_DEG + 180).toFixed(1));
    setEditing(true);
  }, [rawAngle]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const absDeg = parseFloat(draft);
    if (!isNaN(absDeg) && onJointSet) {
      // Convert absolute display angle back to internal radians (offset from 180°)
      const rad = (absDeg - 180) * DEG_TO_RAD;
      const clamped = Math.max(-limit, Math.min(limit, rad));
      onJointSet(panelIdx, clamped);
    }
    setEditing(false);
  }, [draft, onJointSet, panelIdx, limit]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setEditing(false); }
  }, [commit]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="angle-input editing"
        style={{ color: palette?.main }}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    );
  }

  return (
    <span
      className="stat-val angle-input-display"
      style={{ color: palette?.main, cursor: 'text' }}
      title="Click to set angle (80–280° bend · 0–360° twist)"
      onClick={startEdit}
    >
      {displayDeg}°
    </span>
  );
}

/**
 * SVG arc indicator with drag-to-set interaction.
 */
function ArcIndicator({ angle, rawAngle, limit, limitHit, palette, panelIdx, onDrag }) {
  const SIZE = 88;
  const R    = 36;
  const cx   = SIZE / 2;
  const cy   = SIZE / 2;

  const svgRef   = useRef(null);
  const dragging = useRef(false);

  const trackColor = limitHit ? '#ffdddd' : (palette?.track ?? '#d0e8ff');
  const arcColor   = limitHit ? (palette?.neg ?? '#cc3344') : (palette?.main ?? '#0088ff');
  const dotColor   = limitHit ? '#ff5533' : (palette?.main ?? '#0088ff');

  const displayAngle = dragging.current ? (rawAngle ?? angle) : angle;

  function arcPath(fromDeg, toDeg, sweep = 1) {
    const toRad = (d) => (d - 90) * (Math.PI / 180);
    const x1 = cx + R * Math.cos(toRad(fromDeg));
    const y1 = cy + R * Math.sin(toRad(fromDeg));
    const x2 = cx + R * Math.cos(toRad(toDeg));
    const y2 = cy + R * Math.sin(toRad(toDeg));
    const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} ${sweep} ${x2} ${y2}`;
  }

  const limitDeg = (limit * 180) / Math.PI;
  const angleDeg = (displayAngle * 180) / Math.PI;
  const endDeg   = Math.max(-limitDeg, Math.min(limitDeg, angleDeg));

  const dotAngleRad = (endDeg - 90) * (Math.PI / 180);
  const dotX = cx + R * Math.cos(dotAngleRad);
  const dotY = cy + R * Math.sin(dotAngleRad);

  const angleFromPointer = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const deg = Math.atan2(mx - cx, -(my - cy)) * RAD_TO_DEG;
    return Math.max(-limit, Math.min(limit, deg * DEG_TO_RAD));
  }, [cx, cy, limit]);

  const handlePointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    if (onDrag) onDrag(panelIdx, angleFromPointer(e));
  }, [onDrag, panelIdx, angleFromPointer]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current) return;
    if (onDrag) onDrag(panelIdx, angleFromPointer(e));
  }, [onDrag, panelIdx, angleFromPointer]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const isInteractive = !!onDrag;

  return (
    <svg
      ref={svgRef}
      width={SIZE}
      height={SIZE}
      style={{ flexShrink: 0, cursor: isInteractive ? 'crosshair' : 'default', touchAction: 'none' }}
      onPointerDown={isInteractive ? handlePointerDown : undefined}
      onPointerMove={isInteractive ? handlePointerMove : undefined}
      onPointerUp={isInteractive ? handlePointerUp : undefined}
    >
      {isInteractive && <circle cx={cx} cy={cy} r={R + 8} fill="transparent" />}

      {/* Track */}
      <path d={arcPath(-limitDeg, limitDeg)} fill="none" stroke={trackColor} strokeWidth="5" strokeLinecap="round" />

      {/* Limit end-markers */}
      <circle cx={cx + R * Math.cos((-limitDeg - 90) * Math.PI / 180)}
              cy={cy + R * Math.sin((-limitDeg - 90) * Math.PI / 180)}
              r="3" fill={palette?.main ?? '#0088ff'} opacity="0.5" />
      <circle cx={cx + R * Math.cos((limitDeg - 90) * Math.PI / 180)}
              cy={cy + R * Math.sin((limitDeg - 90) * Math.PI / 180)}
              r="3" fill={palette?.main ?? '#0088ff'} opacity="0.5" />

      {/* Zero tick */}
      <line x1={cx} y1={cy - R + 4} x2={cx} y2={cy - R + 11}
            stroke={palette?.main ?? '#0088ff'} strokeWidth="2" opacity="0.7" />

      {/* Active arc */}
      {Math.abs(endDeg) > 0.5 && (
        <path d={arcPath(0, endDeg, endDeg >= 0 ? 1 : 0)} fill="none" stroke={arcColor}
              strokeWidth="4.5" strokeLinecap="round"
              style={{ filter: limitHit ? 'none' : `drop-shadow(0 0 4px ${arcColor}88)` }} />
      )}

      {/* Position dot */}
      <circle cx={dotX} cy={dotY} r={isInteractive ? 6 : 4.5} fill={dotColor}
              style={{ filter: `drop-shadow(0 0 5px ${dotColor})` }} />

      {/* Degree label — displayed as absolute servo angle (80–280 or 0–360) */}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="10" fontFamily="monospace"
            fill={palette?.main ?? '#0088ff'} opacity="0.85">
        {(180 + endDeg).toFixed(0)}°
      </text>
    </svg>
  );
}

/** Velocity arrow — direction + magnitude indicator. */
function VelocityArrow({ velocity }) {
  const absV  = Math.abs(velocity);
  const dir   = velocity >= 0 ? '→' : '←';
  const mag   = Math.min(absV / 5, 1);
  const bars  = Math.round(mag * 5);
  const color = absV > 3 ? '#ffaa00' : '#00aaff';

  return (
    <div className="vel-arrow">
      <span className="vel-dir" style={{ color }}>{dir}</span>
      <span className="vel-bars">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="vel-bar" style={{ opacity: i < bars ? 1 : 0.15, background: color }} />
        ))}
      </span>
    </div>
  );
}

export default function JointCard({ joint, index, rawAngle, onArcDrag, onJointHome, onJointSet }) {
  const { angle = 0, velocity = 0, acceleration = 0, limitHit = false } = joint ?? {};

  const def      = JOINT_DEFS[index];
  const palette  = JOINT_PALETTES[index] ?? JOINT_PALETTES[1];
  const isEndcap = def?.type === 'twist';
  const limit    = def?.limit ?? Math.PI;
  const label    = def?.label ?? `JOINT ${index + 1}`;

  const angleDeg = angle * RAD_TO_DEG;

  return (
    <div
      className={`joint-card ${limitHit ? 'limit-hit' : ''}`}
      style={{ '--joint-color': palette.main, '--joint-glow': palette.glow }}
    >
      <div className="joint-accent" />

      <div className="joint-header">
        <span className="joint-label" style={{ color: palette.main }}>{label}</span>
        <div className="joint-header-right">
          {limitHit && !isEndcap && <span className="limit-badge">LIMIT</span>}
          {onJointHome && (
            <button
              className="joint-home-btn"
              onClick={() => onJointHome(index)}
              title={`Reset ${label} to home (180°)`}
              style={{ '--joint-color': palette.main }}
            >
              ↺
            </button>
          )}
        </div>
      </div>

      <div className="joint-body">
        <ArcIndicator
          angle={angle}
          rawAngle={rawAngle}
          limit={limit}
          limitHit={limitHit && !isEndcap}
          palette={palette}
          panelIdx={index}
          onDrag={onArcDrag}
        />

        <div className="joint-stats">
          <div className="stat-row">
            <span className="stat-key">ANG</span>
            <AngleInput
              rawAngle={rawAngle ?? angle}
              palette={palette}
              panelIdx={index}
              limit={limit}
              onJointSet={onJointSet}
            />
          </div>

          <div className="stat-row">
            <span className="stat-key">VEL</span>
            <div className="stat-val-group">
              <AnimatedValue
                value={velocity * RAD_TO_DEG}
                format={(v) => `${Math.abs(v).toFixed(1)}°/s`}
                className="stat-val"
              />
              <VelocityArrow velocity={velocity} />
            </div>
          </div>

          <div className="stat-row">
            <span className="stat-key">ACC</span>
            <AnimatedValue
              value={acceleration * RAD_TO_DEG}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}°/s²`}
              className={`stat-val ${Math.abs(acceleration) > 5 ? 'accent' : ''}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
