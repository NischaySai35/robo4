import { useArmStore } from '../store/armStore.js';
import JointCard from './JointCard.jsx';

const ROD_NAMES = ['ROD A', 'ROD B', 'ROD C', 'ROD D'];

export default function LeftPanel() {
  const joints = useArmStore(s => s.joints);
  const rootRodIndex = useArmStore(s => s.rootRodIndex);
  const mode = useArmStore(s => s.mode);
  const setMode = useArmStore(s => s.setMode);
  const homeArm = useArmStore(s => s.homeArm);

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
            <span className="root-name">{ROD_NAMES[rootRodIndex]}</span>
            <span className="root-badge">ROOT</span>
          </div>
          <p className="root-hint">Click any rod in the viewport to set it as the new fixed root.</p>
        </div>
      </div>

      {/* Joint telemetry */}
      <div className="section">
        <div className="section-title">JOINT TELEMETRY</div>
        <div className="joint-list">
          {joints.map((joint, i) => (
            <JointCard key={i} joint={joint} index={i} />
          ))}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="section">
        <div className="section-title">ARM ORIENTATION</div>
        <div className="mode-toggle-wrap">
          <button
            className={`mode-btn ${mode === 'horizontal' ? 'active' : ''}`}
            onClick={() => setMode('horizontal')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="2.5" fill="currentColor"/>
            </svg>
            HORIZONTAL
          </button>
          <button
            className={`mode-btn ${mode === 'vertical' ? 'active' : ''}`}
            onClick={() => setMode('vertical')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <line x1="9" y1="2" x2="9" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="2.5" fill="currentColor"/>
            </svg>
            VERTICAL
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions">
        <div className="section-title">CONTROLS</div>
        <ul>
          <li><kbd>Drag</kbd> any rod or joint to move</li>
          <li><kbd>Click</kbd> a rod to set as root</li>
          <li><kbd>Scroll</kbd> to zoom, <kbd>RMB</kbd> to orbit</li>
        </ul>
      </div>

      <div className="panel-footer">
        <span>LIMIT ±{(useArmStore.getState().jointLimit * 180 / Math.PI).toFixed(0)}°</span>
        <span>4 RODS · 3 JOINTS</span>
      </div>
    </aside>
  );
}
