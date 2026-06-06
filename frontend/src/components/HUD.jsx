import { useArmStore } from '../store/armStore.js';

function ReachBar({ pct }) {
  const clampedPct = Math.min(Math.max(pct, 0), 100);
  const color = clampedPct > 90 ? '#ff4400' : clampedPct > 70 ? '#ffaa00' : '#00e8ff';

  return (
    <div className="reach-bar-wrap">
      <div className="reach-label">REACH</div>
      <div className="reach-track">
        <div
          className="reach-fill"
          style={{
            width: `${clampedPct}%`,
            background: color,
            boxShadow: `0 0 8px ${color}88`,
          }}
        />
      </div>
      <div className="reach-pct" style={{ color }}>{clampedPct.toFixed(1)}%</div>
    </div>
  );
}

export default function HUD() {
  const pos = useArmStore(s => s.endEffectorPosition);
  const reachPercent = useArmStore(s => s.reachPercent);

  return (
    <div className="hud fade-in">
      <div className="hud-title">END EFFECTOR</div>
      <div className="hud-coords">
        <div className="hud-coord">
          <span className="hud-axis x">X</span>
          <span className="hud-val">{(pos.x ?? 0).toFixed(3)}</span>
        </div>
        <div className="hud-coord">
          <span className="hud-axis y">Y</span>
          <span className="hud-val">{(pos.y ?? 0).toFixed(3)}</span>
        </div>
        <div className="hud-coord">
          <span className="hud-axis z">Z</span>
          <span className="hud-val">{(pos.z ?? 0).toFixed(3)}</span>
        </div>
      </div>
      <ReachBar pct={reachPercent} />
    </div>
  );
}
