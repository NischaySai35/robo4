import './LeftPanel.css';
import { useState } from 'react';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useEditorStore } from '@/state/editorStore';
import { useEditModeStore } from '@/state/editModeStore';
import { useDockStore } from '@/state/dockStore';
import { commands } from '@/core/commands/index';
import {
  makeBody, makeJoint, makeGeometry, GeometryType, JointType, identityOrigin,
} from '@/core/model/index';
import { jointFramesForBodies } from '@/kinematics/modelFK';
import { deleteSelectedEntity } from '@/features/editing/deleteSelected';

const cap = (s: any) => s.charAt(0).toUpperCase() + s.slice(1);

// Small inline icon helper.
const I = ({ children }: any) => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

// Primitives offered by the "+" add menu. `params` seed sensible default sizes.
const PRIMITIVES = [
  { type: GeometryType.BOX,      label: 'Box',      params: { size: [0.8, 0.8, 0.8] } },
  { type: GeometryType.PLANE,    label: 'Plane',    params: { size: [1, 1] } },
  { type: GeometryType.CIRCLE,   label: 'Circle',   params: { radius: 0.5 } },
  { type: GeometryType.SPHERE,   label: 'Sphere',   params: { radius: 0.5 } },
  { type: GeometryType.CYLINDER, label: 'Cylinder', params: { radius: 0.4, length: 1 } },
  { type: GeometryType.CONE,     label: 'Cone',     params: { radius: 0.5, length: 1 } },
  { type: GeometryType.TORUS,    label: 'Torus',    params: { radius: 0.5, tube: 0.18 } },
  { type: GeometryType.CAPSULE,  label: 'Capsule',  params: { radius: 0.35, length: 0.9 } },
];

export default function LeftPanel({ style }: any) {
  const doc = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const select = useSelectionStore((s) => s.select);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selKind = useSelectionStore((s) => s.kind);
  const gizmoMode = useSelectionStore((s) => s.gizmoMode);
  const showGizmo = useSelectionStore((s) => s.showGizmo);
  const setGizmoMode = useSelectionStore((s) => s.setGizmoMode);
  const mateMode = useEditorStore((s) => s.mateMode);
  const toggleMate = useEditorStore((s) => s.toggleMate);
  const openPanel = useDockStore((s) => s.open);
  const editActive = useEditModeStore((s) => s.active);

  const isBodySelected = !!(selectedId && doc.bodies[selectedId]);
  const toggleEditMode = () => {
    const es = useEditModeStore.getState();
    if (es.active) es.exit();
    else if (isBodySelected) es.enter(selectedId); // RightDock derives the Edit panel from edit mode
  };

  const bodies = Object.values(doc.bodies);
  const joints = Object.values(doc.joints);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null); // { id, kind, text } | null

  // ── Build actions ──────────────────────────────────────────────────────────
  const addPrimitive = (type: any, params: any) => {
    const n = bodies.length;
    const body = makeBody({
      name: `${cap(type)} ${n + 1}`,
      visual: { geometry: makeGeometry(type, params), materialId: null, origin: identityOrigin() },
      transform: { position: [n * 1.3, 0.6, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
    });
    dispatch(commands.addBody(body));
    select(body.id, 'body');
    setAddOpen(false);
  };

  const createJoint = () => {
    if (bodies.length < 2) { alert('Add at least 2 bodies first.'); return; }
    const b1 = (selectedId && doc.bodies[selectedId]) ? doc.bodies[selectedId] : bodies[bodies.length - 2];
    const b2 = bodies.find((b) => b.id !== b1.id);
    if (!b2) return;
    const { origin, childRest } = jointFramesForBodies(b1, b2);
    const j = makeJoint({
      name: `Joint ${joints.length + 1}`, type: JointType.REVOLUTE,
      parentBodyId: b1.id, childBodyId: b2.id, origin, childRest,
    });
    dispatch(commands.addJoint(j));
    select(j.id, 'joint');
    openPanel('inspector');
  };

  // ── Project explorer actions ────────────────────────────────────────────────
  const openInspectorFor = (id: any, kind: any) => { select(id, kind); openPanel('inspector'); };

  const startRename = (id: any, kind: any, name: any) => setEditing({ id, kind, text: name });
  const commitRename = () => {
    if (!editing) return;
    const name = editing.text.trim();
    if (name) {
      const cmd = editing.kind === 'body' ? commands.updateBody : commands.updateJoint;
      dispatch(cmd(editing.id, { name }));
    }
    setEditing(null);
  };

  const move = (collection: any, ids: any, idx: any, dir: any) => {
    const arr = [...ids];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    dispatch(commands.reorderCollection(collection, arr));
  };

  const bodyIds = bodies.map((b) => b.id);
  const jointIds = joints.map((j) => j.id);

  const renderRow = (entity: any, kind: any, ids: any, idx: any, collection: any, extra: any) => {
    const isSel = selectedId === entity.id;
    const isEditing = editing && editing.id === entity.id;
    return (
      <div key={entity.id} className={`px-row ${isSel ? 'px-row--sel' : ''}`}>
        <span className={`px-dot px-dot--${kind}`} />
        {isEditing ? (
          <input
            className="px-rename"
            autoFocus
            value={editing.text}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(null); }}
          />
        ) : (
          <button
            className="px-name"
            title="Click to select · double-click to open editor"
            onClick={() => select(entity.id, kind)}
            onDoubleClick={() => openInspectorFor(entity.id, kind)}
          >
            {entity.name}
          </button>
        )}
        {extra}
        <span className="px-row-actions">
          <button className="px-mini" title="Move up"   disabled={idx === 0}            onClick={() => move(collection, ids, idx, -1)}>▲</button>
          <button className="px-mini" title="Move down" disabled={idx === ids.length-1} onClick={() => move(collection, ids, idx, +1)}>▼</button>
          <button className="px-mini" title="Rename"    onClick={() => startRename(entity.id, kind, entity.name)}>✎</button>
        </span>
      </div>
    );
  };

  return (
    <aside className="left-panel fade-in" style={style}>
      {/* ── Mode (Object ↔ Edit, Blender-style) ── */}
      <div className="section">
        <div className="section-title">MODE</div>
        <div className="lp-mode-toggle">
          <button
            className={`lp-mode-btn ${!editActive ? 'lp-mode-btn--on' : ''}`}
            onClick={() => useEditModeStore.getState().exit()}>
            Object
          </button>
          <button
            className={`lp-mode-btn ${editActive ? 'lp-mode-btn--on' : ''}`}
            onClick={toggleEditMode}
            disabled={!editActive && !isBodySelected}
            title={isBodySelected || editActive ? 'Edit mesh (vertices/edges/faces)' : 'Select a body first'}>
            Edit
          </button>
        </div>
        {!isBodySelected && !editActive && (
          <p className="lp-mode-hint">Select a body to enter Edit Mode.</p>
        )}
      </div>

      {editActive && (
        <div className="section">
          <p className="lp-mode-hint">
            <strong>Edit Mode.</strong> Use the <em>Edit Mesh</em> panel on the right to pick
            vertices / edges / faces. Press <strong>Object</strong> to return.
          </p>
        </div>
      )}

      {/* ── Transform (shown when a body is selected) ── */}
      {!editActive && selKind === 'body' && isBodySelected && (
        <div className="section">
          <div className="section-title">TRANSFORM</div>
          <div className="lp-mode-toggle lp-xform">
            {[
              { id: 'translate', label: 'Move',   key: 'M' },
              { id: 'rotate',    label: 'Rotate', key: 'R' },
              { id: 'scale',     label: 'Scale',  key: 'S' },
            ].map((m) => (
              <button key={m.id}
                className={`lp-mode-btn ${showGizmo && gizmoMode === m.id ? 'lp-mode-btn--on' : ''}`}
                onClick={() => setGizmoMode(m.id as 'translate' | 'rotate' | 'scale')}
                title={`${m.label} (${m.key})`}>
                {m.label} <kbd className="lp-xform-key">{m.key}</kbd>
              </button>
            ))}
          </div>
          {!showGizmo && (
            <p className="lp-mode-hint">Click the body again — or press M / R / S — to show the move gizmo.</p>
          )}
        </div>
      )}

      {!editActive && <>
      {/* ── Build ── */}
      <div className="section">
        <div className="section-title">BUILD</div>
        <div className="lp-icon-row">
          <div className="lp-add-wrap">
            <button
              className={`lp-icon-btn lp-icon-btn--accent${addOpen ? ' lp-icon-btn--active' : ''}`}
              onClick={() => setAddOpen((v) => !v)}
              title="Add a primitive body">
              <I><path d="M10 4v12M4 10h12" /></I>
            </button>
            {addOpen && (
              <div className="lp-add-menu" onMouseLeave={() => setAddOpen(false)}>
                <div className="lp-add-title">ADD MESH</div>
                <div className="lp-add-grid">
                  {PRIMITIVES.map((p) => (
                    <button key={p.type} className="lp-add-item" onClick={() => addPrimitive(p.type, p.params)}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="lp-icon-btn" onClick={createJoint} title="Create joint between two bodies">
            <I><circle cx="4" cy="10" r="2" /><circle cx="16" cy="10" r="2" /><path d="M6 10h8" strokeDasharray="2 1.6" /></I>
          </button>
          <button className={`lp-icon-btn${mateMode ? ' lp-icon-btn--active' : ''}`} onClick={toggleMate} title="Mate faces (align two parts)">
            <I><path d="M3 4v12M9 4v12M9 7h5l-2-2M9 13h5l-2 2" /></I>
          </button>
          <button className="lp-icon-btn lp-icon-btn--danger" onClick={deleteSelectedEntity} disabled={!selectedId} title="Delete selected (Del / X)">
            <I><path d="M3 5h14M7 5V3h6v2M6 8v6M10 8v6M14 8v6M4 5l1 12h10l1-12" /></I>
          </button>
        </div>
      </div>

      {/* ── Project Explorer ── */}
      <div className="section px-section">
        <div className="section-title">PROJECT EXPLORER</div>

        <div className="px-scroll">
          <div className="px-group">Bodies ({bodies.length})</div>
          {bodies.length === 0 && <div className="px-empty">No bodies yet — use + to add one.</div>}
          {bodies.map((b, i) => renderRow(b, 'body', bodyIds, i, 'bodies', null))}

          <div className="px-group">Joints ({joints.length})</div>
          {joints.length === 0 && <div className="px-empty">No joints — select a part and use the joint tool.</div>}
          {joints.map((j, i) => renderRow(j, 'joint', jointIds, i, 'joints',
            <span className="px-type">{j.type}</span>))}
        </div>
      </div>
      </>}

      {/* ── Controls hint ── */}
      <div className="instructions">
        <div className="section-title">CONTROLS</div>
        <ul>
          <li><kbd>Click</kbd> a part → select · click again → move</li>
          <li><kbd>M</kbd>/<kbd>R</kbd>/<kbd>S</kbd> move · rotate · scale</li>
          <li><kbd>Dbl-click</kbd> in explorer → open editor</li>
          <li><kbd>Del</kbd> / <kbd>X</kbd> delete selected</li>
          <li><kbd>Scroll</kbd> zoom · <kbd>RMB</kbd> orbit</li>
          <li><kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+K</kbd> commands</li>
        </ul>
      </div>
    </aside>
  );
}