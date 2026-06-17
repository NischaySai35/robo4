import './StatusBar.css';
import { useArmStore } from '../../store/armStore.js';

export default function StatusBar() {
  const collision = useArmStore(s => s.collision);
  const joints    = useArmStore(s => s.joints);

  const anyLimit = joints.some(j => j.limitHit);
  const moving   = joints.some(j => Math.abs(j.velocity) > 1); // deg/s

  let cfg;
  if (collision)     cfg = { label: 'BLOCKED',     dot: '#ff3b30', pulse: true  };
  else if (anyLimit) cfg = { label: 'JOINT LIMIT', dot: '#ff7a00', pulse: true  };
  else if (moving)   cfg = { label: 'MOVING',      dot: '#00cc66', pulse: true  };
  else               cfg = { label: 'IDLE',        dot: '#00aaff', pulse: false };

  return (
    <div className={`status-bar fade-in ${cfg.pulse ? 'pulse' : ''}`}>
      <div
        className="status-dot"
        style={{
          background: cfg.dot,
          boxShadow: `0 0 8px ${cfg.dot}`,
          animation: cfg.pulse ? 'dotPulse 0.8s ease-in-out infinite alternate' : 'none',
        }}
      />
      <span className="status-label" style={{ color: cfg.dot }}>
        {cfg.label}
      </span>
    </div>
  );
}
