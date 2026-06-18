import './LeftPanel.css';
import { useState } from 'react';
import { useModelStore } from '@/state/modelStore.js';
import { useSelectionStore } from '@/state/selectionStore.js';
import { useEditorStore } from '@/state/editorStore.js';
import { useDockStore } from '@/state/dockStore.js';
import { bridge } from '@/viewport/cameraBridge.js';
import { commands } from '@/core/commands/index.js';
import {
  makeBody, makeJoint, makeGeometry, GeometryType, JointType, identityOrigin,
} from '@/core/model/index.js';
import { jointFramesForBodies } from '@/kinematics/modelFK.js';
import { importMesh } from '@/features/import/importMesh.js';
import { serializeProject } from '@/core/serialization/project.js';
import { saveProjectToFile, openProjectFromFile } from '@/core/serialization/fileIO.js';
import { useDocStore } from '@/state/docStore.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Small inline icon helper.
const I = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export default function LeftPanel({ style }) {
  const doc = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const select = useSelectionStore((s) => s.select);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const clear = useSelectionStore((s) => s.clear);
  const mateMode = useEditorStore((s) => s.mateMode);
  const toggleMate = useEditorStore((s) => s.toggleMate);
  const openPanel = useDockStore((s) => s.open);

  const bodies = Object.values(doc.bodies);
  const joints = Object.values(doc.joints);

  const [exportOpen, setExportOpen] = useState(false);

  // ── Project file actions ───────────────────────────────────────────────────
  const onNewProject = () => {
    if (!window.confirm('Start a new project? The current scene will be cleared (saved files are untouched).')) return;
    const fresh = {
      format: 'tetrobot-project', version: 1,
      scene: { activeModuleId: null, nextId: 1, modules: [], welds: [] },
      animation: { duration: 4, tracks: {} },
    };
    const r = bridge.loadScene?.(fresh);
    if (r && !r.ok) { alert(r.error); return; }
    useDocStore.getState().setDoc(null, null);
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
    } catch (e) { alert(`Could not open file: ${e.message}`); }
  };
  const doExport = (fmt) => {
    const r = bridge.exportModel?.(fmt);
    if (r && !r.ok) { alert(r.error); return; }
    setExportOpen(false);
  };

  // ── Build actions ──────────────────────────────────────────────────────────
  const addPrimitive = (type) => {
    const n = bodies.length;
    const params = type === GeometryType.BOX ? { size: [0.8, 0.8, 0.8] }
      : type === GeometryType.CYLINDER ? { radius: 0.4, length: 1 }
      : { radius: 0.5 };
    const body = makeBody({
      name: `${cap(type)} ${n + 1}`,
      visual: { geometry: makeGeometry(type, params), materialId: null, origin: identityOrigin() },
      transform: { position: [n * 1.3, 0.6, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
    });
    dispatch(commands.addBody(body));
    select(body.id, 'body');
  };

  // Create a joint between two bodies (selected one + the most-recent other, or the
  // last two). Selecting the new joint auto-opens its editor on the right.
  const createJoint = () => {
    if (bodies.length < 2) { alert('Add or import at least 2 bodies first.'); return; }
    const b1 = (selectedId && doc.bodies[selectedId]) ? doc.bodies[selectedId] : bodies[bodies.length - 2];
    const b2 = bodies.find((b) => b.id !== b1.id);
    const { origin, childRest } = jointFramesForBodies(b1, b2);
    const j = makeJoint({
      name: `Joint ${joints.length + 1}`, type: JointType.REVOLUTE,
      parentBodyId: b1.id, childBodyId: b2.id, origin, childRest,
    });
    dispatch(commands.addJoint(j));
    select(j.id, 'joint'); // opens Inspector
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    if (doc.bodies[selectedId]) dispatch(commands.removeBody(selectedId));
    else if (doc.joints[selectedId]) dispatch(commands.removeJoint(selectedId));
    clear();
  };

  return (
    <aside className="left-panel fade-in" style={style}>
      {/* Project file actions */}
      <div className="section">
        <div className="section-title">PROJECT</div>
        <div className="lp-icon-row">
          <button className="lp-icon-btn" onClick={onNewProject} title="New project">
            <I><path d="M9 2H4v12h8V5L9 2z" /><path d="M8 7.5v3M6.5 9h3" /></I>
          </button>
          <button className="lp-icon-btn" onClick={onOpenProject} title="Open project (.nischay)">
            <I><path d="M2 5h5l1.5 1.5H17V15H2V5z" /></I>
          </button>
          <button className="lp-icon-btn" onClick={onSaveProject} title="Save project (.nischay)">
            <I><path d="M4 3h9l3 3v11H4V3z" /><path d="M6 3v5h6V3M6 17v-5h7v5" /></I>
          </button>
          <button className="lp-icon-btn" onClick={() => setExportOpen(true)} title="Export model (OBJ / STL / GLB)">
            <I><path d="M10 3v9M10 12l-3-3M10 12l3-3M4 16h12" /></I>
          </button>
        </div>
      </div>

      {exportOpen && (
        <div className="export-modal-backdrop" onClick={() => setExportOpen(false)}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="export-modal-title">EXPORT AS</div>
            <button className="export-opt" onClick={() => doExport('obj')}>OBJ <small>mesh + materials</small></button>
            <button className="export-opt" onClick={() => doExport('stl')}>STL <small>mesh only · 3D print</small></button>
            <button className="export-opt" onClick={() => doExport('glb')}>GLB <small>Blender / 3D viewers</small></button>
            <button className="export-cancel" onClick={() => setExportOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Build — model graph */}
      <div className="section">
        <div className="section-title">BUILD</div>
        <div className="lp-icon-row">
          <button className="lp-icon-btn lp-icon-btn--accent" onClick={importMesh} title="Import STL / OBJ part">
            <I><path d="M10 3v9M10 12l-3-3M10 12l3-3M4 16h12" /></I>
          </button>
          <button className="lp-icon-btn" onClick={() => addPrimitive(GeometryType.BOX)} title="Add box">
            <I><path d="M4 6l6-3 6 3v8l-6 3-6-3V6z" /><path d="M4 6l6 3 6-3M10 9v8" /></I>
          </button>
          <button className="lp-icon-btn" onClick={() => addPrimitive(GeometryType.CYLINDER)} title="Add cylinder">
            <I><ellipse cx="10" cy="5" rx="5" ry="2" /><path d="M5 5v10c0 1.1 2.2 2 5 2s5-.9 5-2V5" /></I>
          </button>
          <button className="lp-icon-btn" onClick={() => addPrimitive(GeometryType.SPHERE)} title="Add sphere">
            <I><circle cx="10" cy="10" r="6.5" /><path d="M3.5 10h13M10 3.5c2.5 2 2.5 11 0 13M10 3.5c-2.5 2-2.5 11 0 13" /></I>
          </button>
        </div>
        <div className="lp-icon-row">
          <button className="lp-icon-btn" onClick={createJoint} title="Create joint between two bodies">
            <I><circle cx="4" cy="10" r="2" /><circle cx="16" cy="10" r="2" /><path d="M6 10h8" strokeDasharray="2 1.6" /></I>
          </button>
          <button className={`lp-icon-btn${mateMode ? ' lp-icon-btn--active' : ''}`} onClick={toggleMate} title="Mate faces (align two parts)">
            <I><path d="M3 4v12M9 4v12M9 7h5l-2-2M9 13h5l-2 2" /></I>
          </button>
          <button className="lp-icon-btn lp-icon-btn--danger" onClick={deleteSelected} disabled={!selectedId} title="Delete selected">
            <I><path d="M3 5h14M7 5V3h6v2M6 8v6M10 8v6M14 8v6M4 5l1 12h10l1-12" /></I>
          </button>
        </div>
      </div>

      {/* View */}
      <div className="section">
        <div className="section-title">VIEW</div>
        <div className="lp-icon-row">
          <button className="lp-icon-btn" onClick={() => bridge.fitCamera?.()} title="Fit view to scene">
            <I><path d="M4 7V4h3M16 7V4h-3M4 13v3h3M16 13v3h-3" /></I>
          </button>
        </div>
      </div>

      {/* Panels — open the matching editor on the right */}
      <div className="section">
        <div className="section-title">PANELS</div>
        <div className="lp-icon-row">
          <button className="lp-icon-btn" onClick={() => openPanel('outliner')} title="Model tree (Outliner)">
            <I><path d="M4 5h12M7 10h9M7 15h9M4 10h.01M4 15h.01" /></I>
          </button>
          <button className="lp-icon-btn" onClick={() => openPanel('inspector')} title="Properties (Inspector)">
            <I><path d="M3 4h14v12H3zM3 8h14M8 8v8" /></I>
          </button>
          <button className="lp-icon-btn" onClick={() => openPanel('copilot')} title="AI Copilot">
            <I><path d="M10 2l1.8 4.2L16 8l-4.2 1.8L10 14l-1.8-4.2L4 8l4.2-1.8L10 2z" /></I>
          </button>
          <button className="lp-icon-btn" onClick={() => openPanel('hardware')} title="Hardware / servos">
            <I><path d="M6 6h8v8H6zM8 2v3M12 2v3M8 15v3M12 15v3M2 8h3M2 12h3M15 8h3M15 12h3" /></I>
          </button>
        </div>
      </div>

      {/* Model summary + hints */}
      <div className="section">
        <div className="section-title">SCENE</div>
        <div className="lp-summary">
          <span><strong>{bodies.length}</strong> bodies</span>
          <span><strong>{joints.length}</strong> joints</span>
        </div>
        <p className="root-hint">
          Import parts, position them (gizmo / Mate), then Create joint. Select a part to
          see its joints; click a joint arrow to edit it on the right.
        </p>
      </div>

      <div className="instructions">
        <div className="section-title">CONTROLS</div>
        <ul>
          <li><kbd>Click</kbd> a part → select · gizmo</li>
          <li><kbd>Click</kbd> empty → deselect</li>
          <li><kbd>Scroll</kbd> zoom · <kbd>RMB</kbd> orbit</li>
          <li><kbd>MMB</kbd> / <kbd>Shift+Drag</kbd> pan</li>
          <li><kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+K</kbd> commands</li>
        </ul>
      </div>
    </aside>
  );
}
