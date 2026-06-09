import { useArmStore, JOINT_DEFS, ROD_IDS } from '../store/armStore.js';
import JointCard from './JointCard.jsx';

export default function LeftPanel() {
  const joints        = useArmStore(s => s.joints);
  const activeRootId  = useArmStore(s => s.activeRootId);
  const jointAngles   = useArmStore(s => s.jointAngles);
  const homeArm       = useArmStore(s => s.homeArm);
  const setJointAngle = useArmStore(s => s.setJointAngle);

  const rootIdx = ROD_IDS.indexOf(activeRootId);
  const sg = (i) => rootIdx > i ? -1 : 1;

  return (
    <aside className="left-panel fade-in">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-logo">
          <span className="logo-main">ROBO4</span>
          <span className="logo-sub">ARM SIMULATOR</span>
        </div>
        <div className="panel-status-dot" />
      </div>

      {/* Home button */}
      <div className="section">
        <button className="home-btn" onClick={homeArm} title="Reset arm to home position">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
            <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H6a1 1 0 01-1-1V9.5z"
              stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
            <rect x="8" y="12" width="4" height="6" rx="0.5"
              stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
          HOME
        </button>
      </div>

      {/* Root indicator */}
      <div className="section">
        <div className="section-title">FIXED ROOT</div>
        <div className="root-info">
          <div className="root-indicator">
            <span className="root-glow-dot" />
            <span className="root-name">{activeRootId}</span>
            <span className="root-badge">ROOT</span>
          </div>
          <p className="root-hint">Click a rod in the viewport to set it as the fixed root.</p>
        </div>
      </div>

      {/* Joint telemetry */}
      <div className="section">
        <div className="section-title">JOINT TELEMETRY</div>
        <div className="joint-list">
          {joints.map((joint, i) => (
            <JointCard
              key={i}
              joint={{
                ...joint,
                angle:        joint.angle        * sg(i),
                velocity:     joint.velocity     * sg(i),
                acceleration: joint.acceleration * sg(i),
              }}
              index={i}
              rawAngle={jointAngles[i] * sg(i)}
              onArcDrag={(idx, angle) => setJointAngle(idx, angle * sg(idx))}
              onJointHome={(idx) => setJointAngle(idx, 0)}
              onJointSet={(idx, angle) => setJointAngle(idx, angle * sg(idx))}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions">
        <div className="section-title">CONTROLS</div>
        <ul>
          <li><kbd>Drag</kbd> any rod in viewport → IK follows cursor</li>
          <li><kbd>Click</kbd> a rod to set as root</li>
          <li><kbd>Arc</kbd> drag in panel to set joint angle</li>
          <li><kbd>ANG</kbd> input — type degrees, press Enter</li>
          <li><kbd>Scroll</kbd> to zoom, <kbd>RMB</kbd> to orbit</li>
        </ul>
      </div>

      <div className="panel-footer">
        <span>BEND ±{(JOINT_DEFS[1].limit * 180 / Math.PI).toFixed(0)}°</span>
        <span>TWIST ±180°</span>
        <span>6 RODS · 5 JOINTS</span>
      </div>
    </aside>
  );
}
