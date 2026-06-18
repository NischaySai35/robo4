import './LeftPanel.css';
import { useState } from 'react';
import { useArmStore, JOINT_DEFS, ROD_IDS } from '@/state/armStore.js';
import { useMultiStore } from '@/state/multiStore.js';
import { bridge } from '@/viewport/cameraBridge.js';
import { serializeProject } from '@/core/serialization/project.js';
import { saveProjectToFile, openProjectFromFile } from '@/core/serialization/fileIO.js';
import { useDocStore } from '@/state/docStore.js';
import JointCard from '@/features/viewport-ui/JointCard.jsx';

export default function LeftPanel({ style }) {
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

  const onNewProject = () => {
    if (!window.confirm('Start a new project? The current scene will be cleared (saved files are untouched).')) return;
    const fresh = {
      format: 'tetrobot-project',
      version: 1,
      scene: {
        activeModuleId: 'module-0',
        nextId: 1,
        modules: [{
          id: 'module-0', label: 'Module 1',
          angles: [0, 0, 0, 0, 0, 0], activeRootId: 'R1',
          position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 },
          mode: 'horizontal',
        }],
        welds: [],
      },
    };
    const r = bridge.loadScene?.(fresh);
    if (r && !r.ok) { alert(r.error); return; }
    useDocStore.getState().setDoc(null, null); // back to "untitled", unbound
  };
  const onSaveProject = async () => {
    const res = await saveProjectToFile(serializeProject(), 'tetrobot.nischay');
    if (res) useDocStore.getState().setDoc(res.name, res.handle);
  };
  const onOpenProject = async () => {
    try {
      const res = await openProjectFromFile();
      if (!res) return;
      const r = bridge.loadScene?.(res.data);
      if (r && !r.ok) { alert(`Could not open project: ${r.error}`); return; }
      useDocStore.getState().setDoc(res.name, res.handle);
    } catch (e) {
      alert(`Could not open file: ${e.message}`);
    }
  };
  const [exportOpen, setExportOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const doExport = (fmt) => {
    const r = bridge.exportModel?.(fmt);
    if (r && !r.ok) { alert(r.error); return; }   // keep menu open on unsupported
    setExportOpen(false);
  };

  return (
    <aside className="left-panel fade-in" style={style}>
      {/* Project file actions — icon buttons */}
      <div className="section">
        <div className="section-title">PROJECT</div>
        <div className="lp-icon-row">
          <button className="lp-icon-btn" onClick={onNewProject} title="New project">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M9 2H4v12h8V5L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M8 7.5v3M6.5 9h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="lp-icon-btn" onClick={onOpenProject} title="Open project (.nischay)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h4l1.5 1.5H14V13H2V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="lp-icon-btn" onClick={onSaveProject} title="Save project (.nischay)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 2h8l3 3v9H3V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M5 2v4h5V2M5 14v-4h6v4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="lp-icon-btn" onClick={() => setExportOpen(true)} title="Export model (OBJ / STL / STEP / GLB)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M8 10l-3-3M8 10l3-3M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Export format chooser */}
      {exportOpen && (
        <div className="export-modal-backdrop" onClick={() => setExportOpen(false)}>
          <div className="export-modal" onClick={e => e.stopPropagation()}>
            <div className="export-modal-title">EXPORT AS</div>
            <button className="export-opt" onClick={() => doExport('obj')}>
              OBJ <small>mesh + materials</small>
            </button>
            <button className="export-opt" onClick={() => doExport('stl')}>
              STL <small>mesh only · 3D print</small>
            </button>
            <button className="export-opt export-opt--soft" onClick={() => doExport('step')}>
              STEP <small>CAD · not supported yet</small>
            </button>
            <button className="export-opt" onClick={() => doExport('glb')}>
              GLB <small>Blender / 3D viewers</small>
            </button>
            <button className="export-cancel" onClick={() => setExportOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

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

      {/* Module actions — icon buttons */}
      <div className="section">
        <div className="section-title">MODULE</div>
        <div className="lp-icon-row">
          <button className="lp-icon-btn" onClick={() => addModule(bridge.computeFreeSpawn?.())} title="Add module">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            className={`lp-icon-btn${connectMode ? ' lp-icon-btn--active' : ''}`}
            onClick={() => { setConnectMode(!connectMode); if (disconnectMode) setDisconnectMode(false); }}
            title={connectMode ? 'Cancel connect' : 'Connect modules'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="3"  cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="13" cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M5 8h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 1.5"/>
            </svg>
          </button>
          <button
            className={`lp-icon-btn${disconnectMode ? ' lp-icon-btn--active lp-icon-btn--danger' : ''}`}
            onClick={() => { setDisconnectMode(!disconnectMode); if (connectMode) setConnectMode(false); }}
            title={disconnectMode ? 'Cancel disconnect' : 'Disconnect modules'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="3"  cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="13" cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M5.5 6.5l5-3M5.5 9.5l5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            className={`lp-icon-btn lp-icon-btn--danger${deleteMode ? ' lp-icon-btn--active' : ''}`}
            onClick={() => setDeleteMode(!deleteMode)}
            disabled={modules.length <= 1}
            title={modules.length <= 1 ? 'At least one module required' : (deleteMode ? 'Cancel delete' : 'Delete module')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
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

      {/* Fixed roots — one chip per module, in ROD-Mn format */}
      <div className="section">
        <div className="section-title">FIXED ROOTS</div>
        <div className="root-grid">
          {modules.map((m, i) => {
            const root = m.id === activeModuleId ? activeRootId : m.activeRootId;
            const isActive = m.id === activeModuleId;
            return (
              <button
                key={m.id}
                className={`root-chip${isActive ? ' root-chip--active' : ''}`}
                onClick={() => setActiveModule(m.id)}
                title={`${m.label} — root ${root}${isActive ? ' (active)' : ''}`}
              >
                <span className="root-chip-dot" />
                {root}-M{i + 1}
              </button>
            );
          })}
        </div>
        <p className="root-hint">
          Click a rod in the viewport to set the active module’s root. Click a chip to switch active module.
        </p>
      </div>

      {/* Joint telemetry — collapsed by default */}
      <div className="section">
        <button className="section-collapse" onClick={() => setTelemetryOpen(o => !o)}>
          <span className="section-title">JOINT TELEMETRY</span>
          <span className={`collapse-arrow${telemetryOpen ? ' open' : ''}`}>▸</span>
        </button>
        {telemetryOpen && (
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
        )}
      </div>

      {/* Instructions */}
      <div className="instructions">
        <div className="section-title">CONTROLS</div>
        <ul>
          <li><kbd>Drag</kbd> any rod → arm follows cursor (IK)</li>
          <li><kbd>Click</kbd> a rod → set it as fixed root</li>
          <li><kbd>Connect</kbd> CONNECT MODULES, then click 2 faces</li>
          <li><kbd>Linked</kbd> drag a joined module → whole unit moves</li>
          <li><kbd>Arc</kbd> drag in a joint card to set its angle</li>
          <li><kbd>ANG</kbd> type degrees, press Enter</li>
          <li><kbd>Scroll</kbd> zoom · <kbd>RMB</kbd> orbit</li>
          <li><kbd>MMB</kbd> / <kbd>Shift+Drag</kbd> pan</li>
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
