import { useArmStore } from '../store/armStore.js';

const STATUS_CONFIG = {
  idle: {
    label: 'IDLE',
    color: '#334455',
    glow: '#00aaff44',
    dot: '#00aaff',
    pulse: false,
  },
  solving: {
    label: 'FK ACTIVE',
    color: '#1a3322',
    glow: '#00ff8844',
    dot: '#00ff88',
    pulse: true,
  },
  limit_hit: {
    label: 'JOINT LIMIT',
    color: '#331100',
    glow: '#ff440044',
    dot: '#ff4400',
    pulse: true,
  },
};

export default function StatusBar() {
  const status = useArmStore(s => s.status);
  const cfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;

  return (
    <div
      className={`status-bar fade-in ${cfg.pulse ? 'pulse' : ''}`}
      style={{ '--status-color': cfg.color, '--status-glow': cfg.glow }}
    >
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
