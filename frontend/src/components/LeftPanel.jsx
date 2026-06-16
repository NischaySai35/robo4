import { useArmStore, JOINT_DEFS, ROD_IDS } from '../store/armStore.js';
import { useMultiStore } from '../store/multiStore.js';
import JointCard from './JointCard.jsx';

export default function LeftPanel() {
  const joints        = useArmStore(s => s.joints);
  const activeRootId  = useArmStore(s => s.activeRootId);
  const jointAngles   = useArmStore(s => s.jointAngles);
  const homeArm       = useArmStore(s => s.homeArm);
  const setJointAngle = useArmStore(s => s.setJointAngle);
  const collision     = useArmStore(s => s.collision);

  const modules        = useMultiStore(s => s.modules);
  const activeModuleId = useMultiStore(s => s.activeModuleId);
  const setActiveModule = useMultiStore(s => s.setActiveModule);
  const addModule      = useMultiStore(s => s.addModule);
  const removeModule   = useMultiStore(s => s.removeModule);
  const deleteMode     = useMultiStore(s => s.deleteMode);
  const setDeleteMode  = useMultiStore(s => s.setDeleteMode);
  const connectMode    = useMultiStore(s => s.connectMode);
  const setConnectMode = useMultiStore(s => s.setConnectMode);
  const face1          = useMultiStore(s => s.face1);
  const face2          = useMultiStore(s => s.face2);
  const connectError   = useMultiStore(s => s.connectError);
  const clearFaces        = useMultiStore(s => s.clearFaces);
  const disconnectMode    = useMultiStore(s => s.disconnectMode);
  const setDisconnectMode = useMultiStore(s => s.setDisconnectMode);
  const dSel1             = useMultiStore(s => s.dSel1);
  const dSel2             = useMultiStore(s => s.dSel2);
  const disconnectError   = useMultiStore(s => s.disconnectError);
  const clearDSelections  = useMultiStore(s => s.clearDSelections);

  const rootIdx = ROD_IDS.indexOf(activeRootId);
  const sg = (i) => rootIdx > i ? -1 : 1;

  const activeLabel = modules.find(m => m.id === activeModuleId)?.label ?? 'Module 1';

  return (
    <aside className="left-panel fade-in">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-logo">
          <span className="logo-main">TETROBOT</span>
          <span className="logo-sub">CONTROL SIMULATOR</span>
        </div>
        <div className="panel-status-dot" />
      </div>

      {/* Module selector — shown whenever more than one module exists */}
      {modules.length > 1 && (
        <div className="section">
          <div className="section-title">ACTIVE MODULE</div>
          <select
            className="module-select"
            value={activeModuleId}
            onChange={e => setActiveModule(e.target.value)}
          >
            {modules.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Module actions */}
      <div className="section module-actions">
        <button
          className={`delete-module-btn${deleteMode ? ' delete-module-btn--active' : ''}`}
          onClick={() => setDeleteMode(!deleteMode)}
          disabled={modules.length <= 1}
          title={modules.length <= 1 ? 'Cannot delete — at least one module required' : 'Click a module in the viewport to delete it'}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {deleteMode ? 'CANCEL DELETE' : 'DELETE MODULE'}
        </button>

        <button className="add-module-btn" onClick={addModule} title="Add a new arm module to the scene">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          ADD MODULE
        </button>

        <button
          className={`connect-btn${connectMode ? ' connect-btn--active' : ''}`}
          onClick={() => { setConnectMode(!connectMode); if (disconnectMode) setDisconnectMode(false); }}
          title="Select end-faces on two modules to join them"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="3"  cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/>
            <circle cx="13" cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M5 8h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 1.5"/>
          </svg>
          {connectMode ? 'CANCEL CONNECT' : 'CONNECT MODULES'}
        </button>

        <button
          className={`connect-btn disconnect-btn${disconnectMode ? ' connect-btn--active disconnect-btn--active' : ''}`}
          onClick={() => { setDisconnectMode(!disconnectMode); if (connectMode) setConnectMode(false); }}
          title="Click two modules to separate them"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="3"  cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/>
            <circle cx="13" cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M5.5 6.5l5-3M5.5 9.5l5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {disconnectMode ? 'CANCEL DISCONNECT' : 'DISCONNECT MODULES'}
        </button>
      </div>

      {/* Delete-mode hint */}
      {deleteMode && (
        <div className="section connect-status disconnect-status">
          <div className="section-title">DELETE MODULE</div>
          <p className="connect-hint">
            Click on any part of the module you want to delete in the 3D viewport.
          </p>
        </div>
      )}

      {/* Connect-mode face selection status */}
      {connectMode && (
        <div className="section connect-status">
          <div className="section-title">FACE SELECTION</div>
          <p className="connect-hint">
            Click a square end-face on a module to select it. Two faces from different modules will join them.
          </p>

          <div className="face-slots">
            <div className={`face-slot face-slot--1${face1 ? ' face-slot--set' : ''}`}>
              <span className="face-slot-label">FACE A</span>
              <span className="face-slot-value">
                {face1
                  ? `${modules.find(m => m.id === face1.moduleId)?.label ?? '?'} · ${face1.faceKey}`
                  : 'not selected'}
              </span>
            </div>
            <div className={`face-slot face-slot--2${face2 ? ' face-slot--set' : ''}`}>
              <span className="face-slot-label">FACE B</span>
              <span className="face-slot-value">
                {face2
                  ? `${modules.find(m => m.id === face2.moduleId)?.label ?? '?'} · ${face2.faceKey}`
                  : 'not selected'}
              </span>
            </div>
          </div>

          {connectError && (
            <div className="connect-error">{connectError}</div>
          )}

          {face1 && (
            <button className="clear-faces-btn" onClick={clearFaces}>
              CLEAR SELECTION
            </button>
          )}
        </div>
      )}

      {/* Disconnect-mode module selection status */}
      {disconnectMode && (
        <div className="section connect-status disconnect-status">
          <div className="section-title">DISCONNECT SELECTION</div>
          <p className="connect-hint">
            Click on any part of a module to select it. Select two different modules to separate them.
          </p>

          <div className="face-slots">
            <div className={`face-slot face-slot--1${dSel1 ? ' face-slot--set' : ''}`}>
              <span className="face-slot-label">MOD A</span>
              <span className="face-slot-value">
                {dSel1 ? modules.find(m => m.id === dSel1)?.label ?? '?' : 'not selected'}
              </span>
            </div>
            <div className={`face-slot face-slot--2${dSel2 ? ' face-slot--set' : ''}`}>
              <span className="face-slot-label">MOD B</span>
              <span className="face-slot-value">
                {dSel2 ? modules.find(m => m.id === dSel2)?.label ?? '?' : 'not selected'}
              </span>
            </div>
          </div>

          {disconnectError && (
            <div className="connect-error">{disconnectError}</div>
          )}

          {dSel1 && !dSel2 && (
            <button className="clear-faces-btn" onClick={clearDSelections}>
              CLEAR SELECTION
            </button>
          )}
        </div>
      )}

      {/* Home button */}
      <div className="section">
        <div className="section-title">{activeLabel}</div>
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
              collision={collision}
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
        <span>BEND 80–280°</span>
        <span>TWIST 0–360°</span>
        <span>{modules.length} MODULE{modules.length > 1 ? 'S' : ''} · 6 JOINTS</span>
      </div>
    </aside>
  );
}
