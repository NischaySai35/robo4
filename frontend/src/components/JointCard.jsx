import { useRef, useEffect } from 'react';
import { JOINT_LIMIT } from '../store/armStore.js';

const RAD_TO_DEG = 180 / Math.PI;

const JOINT_PALETTES = [
  { main: '#0088ff', glow: '#0088ff33', track: '#d0e8ff', neg: '#cc3344' },
  { main: '#9944ff', glow: '#9944ff33', track: '#e8d8ff', neg: '#cc3344' },
  { main: '#00aabb', glow: '#00aabb33', track: '#ccf0f4', neg: '#cc3344' },
];

/** Animated number — smoothly interpolates to target value. */
function AnimatedValue({ value, format, className, style }) {
  const spanRef = useRef(null);
  const currentRef = useRef(value);
  const rafRef = useRef(null);

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

/** SVG arc indicator showing current angle within ±limit. */
function ArcIndicator({ angle, limit, limitHit, palette }) {
  const SIZE = 56;
  const R = 22;
  const cx = SIZE / 2, cy = SIZE / 2;

  const trackColor = limitHit ? '#ffdddd' : (palette?.track ?? '#d0e8ff');
  const arcColor   = limitHit ? (palette?.neg ?? '#cc3344') : (palette?.main ?? '#0088ff');
  const dotColor   = limitHit ? '#ff5533' : (palette?.main ?? '#0088ff');

  function arcPath(fromDeg, toDeg) {
    const toRad = (d) => (d - 90) * (Math.PI / 180);
    const x1 = cx + R * Math.cos(toRad(fromDeg));
    const y1 = cy + R * Math.sin(toRad(fromDeg));
    const x2 = cx + R * Math.cos(toRad(toDeg));
    const y2 = cy + R * Math.sin(toRad(toDeg));
    const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  }

  const limitDeg = (limit * 180) / Math.PI;
  const angleDeg = (angle * 180) / Math.PI;
  const startDeg = -limitDeg;
  const endDeg = Math.max(-limitDeg, Math.min(limitDeg, angleDeg));

  const dotAngleRad = (endDeg - 90) * (Math.PI / 180);
  const dotX = cx + R * Math.cos(dotAngleRad);
  const dotY = cy + R * Math.sin(dotAngleRad);

  return (
    <svg width={SIZE} height={SIZE} style={{ flexShrink: 0 }}>
      {/* Track */}
      <path
        d={arcPath(-limitDeg, limitDeg)}
        fill="none"
        stroke={trackColor}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Limit markers */}
      <circle
        cx={cx + R * Math.cos((-limitDeg - 90) * Math.PI / 180)}
        cy={cy + R * Math.sin((-limitDeg - 90) * Math.PI / 180)}
        r="2.5" fill={palette?.main ?? '#0088ff'} opacity="0.5"
      />
      <circle
        cx={cx + R * Math.cos((limitDeg - 90) * Math.PI / 180)}
        cy={cy + R * Math.sin((limitDeg - 90) * Math.PI / 180)}
        r="2.5" fill={palette?.main ?? '#0088ff'} opacity="0.5"
      />
      {/* Center zero tick */}
      <line
        x1={cx} y1={cy - R + 3} x2={cx} y2={cy - R + 9}
        stroke={palette?.main ?? '#0088ff'} strokeWidth="1.5" opacity="0.6"
      />
      {/* Active arc */}
      {Math.abs(endDeg - startDeg) > 0.5 && (
        <path
          d={arcPath(startDeg < -limitDeg ? -limitDeg : 0, endDeg)}
          fill="none"
          stroke={arcColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ filter: limitHit ? 'none' : 'drop-shadow(0 0 3px #00aaff88)' }}
        />
      )}
      {/* Current position dot */}
      <circle cx={dotX} cy={dotY} r="4" fill={dotColor}
        style={{ filter: `drop-shadow(0 0 4px ${dotColor})` }}
      />
    </svg>
  );
}

/** Velocity arrow — direction + magnitude indicator. */
function VelocityArrow({ velocity }) {
  const absV = Math.abs(velocity);
  const dir = velocity >= 0 ? '→' : '←';
  const mag = Math.min(absV / 5, 1); // normalize to 0-1 for display
  const bars = Math.round(mag * 5);
  const color = absV > 3 ? '#ffaa00' : '#00aaff';

  return (
    <div className="vel-arrow">
      <span className="vel-dir" style={{ color }}>{dir}</span>
      <span className="vel-bars">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="vel-bar" style={{
            opacity: i < bars ? 1 : 0.15,
            background: color,
          }} />
        ))}
      </span>
    </div>
  );
}

export default function JointCard({ joint, index }) {
  const { angle = 0, velocity = 0, acceleration = 0, limitHit = false } = joint ?? {};
  const palette = JOINT_PALETTES[index] ?? JOINT_PALETTES[0];

  const angleDeg = angle * RAD_TO_DEG;
  const limitDeg = JOINT_LIMIT * RAD_TO_DEG;

  return (
    <div
      className={`joint-card ${limitHit ? 'limit-hit' : ''}`}
      style={{ '--joint-color': palette.main, '--joint-glow': palette.glow }}
    >
      {/* Colored accent strip */}
      <div className="joint-accent" />

      <div className="joint-header">
        <span className="joint-label" style={{ color: palette.main }}>JOINT {index + 1}</span>
        {limitHit && <span className="limit-badge">LIMIT</span>}
      </div>

      <div className="joint-body">
        <ArcIndicator angle={angle} limit={JOINT_LIMIT} limitHit={limitHit} palette={palette} />

        <div className="joint-stats">
          <div className="stat-row">
            <span className="stat-key">ANG</span>
            <AnimatedValue
              value={angleDeg}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}°`}
              className="stat-val"
              style={{ color: palette.main }}
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
