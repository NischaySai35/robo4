import { useArmStore, JOINT_DEFS } from '../store/armStore.js';
import JointCard from './JointCard.jsx';

export default function LeftPanel() {
  const joints        = useArmStore(s => s.joints);
  const activeRootId  = useArmStore(s => s.activeRootId);
  const jointAngles   = useArmStore(s => s.jointAngles);
  const homeArm       = useArmStore(s => s.homeArm);
  const setJointAngle = useArmStore(s => s.setJointAngle);
  const mode          = useArmStore(s => s.mode);
  const setMode       = useArmStore(s => s.setMode);

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

      {/* IK mode toggle */}
      <div className="section">
        <div className="section-title">IK MODE</div>
        <div className="mode-toggle-wrap">
          <button
            className={`mode-btn ${mode === 'horizontal' ? 'active' : ''}`}
            onClick={() => setMode('horizontal')}
            title="Horizontal IK — arm bends in XZ plane (top view)"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M5 7 Q10 4 15 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M5 13 Q10 16 15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
            HORIZ
          </button>
          <button
            className={`mode-btn ${mode === 'vertical' ? 'active' : ''}`}
            onClick={() => setMode('vertical')}
            title="Vertical IK — arm bends in XY plane (front view)"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 5 Q4 10 7 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M13 5 Q16 10 13 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
            VERT
          </button>
        </div>
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
              joint={joint}
              index={i}
              rawAngle={jointAngles[i]}
              onArcDrag={setJointAngle}
              onJointHome={(idx) => setJointAngle(idx, 0)}
              onJointSet={setJointAngle}
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
