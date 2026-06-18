/**
 * Outliner — the model's hierarchy panel. Add primitive bodies, see every
 * body/joint in the document, and select one (which drives the viewport gizmo
 * and the Inspector). All edits go through the command bus, so undo/redo "just
 * works" via the buttons here or Ctrl+Z.
 */
import './Outliner.css';
import { useState } from 'react';
import { useModelStore } from '@/state/modelStore.js';
import { useSelectionStore } from '@/state/selectionStore.js';
import { commands } from '@/core/commands/index.js';
import {
  makeBody, makeJoint, makeGeometry, GeometryType, JointType, identityOrigin,
} from '@/core/model/index.js';
import { importMesh } from '@/features/import/importMesh.js';
import { exportRobot } from '@/features/export/exportRobot.js';
import { relativeOrigin } from '@/kinematics/modelFK.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Outliner() {
  const doc = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const undo = useModelStore((s) => s.undo);
  const redo = useModelStore((s) => s.redo);
  const canUndo = useModelStore((s) => s.canUndo);
  const canRedo = useModelStore((s) => s.canRedo);

  const selectedId = useSelectionStore((s) => s.selectedId);
  const select = useSelectionStore((s) => s.select);
  const clear = useSelectionStore((s) => s.clear);

  const bodies = Object.values(doc.bodies);
  const joints = Object.values(doc.joints);

  const [jointForm, setJointForm] = useState(null); // { parent, child, type } | null
  const openJointForm = () => setJointForm({
    parent: bodies[0]?.id ?? '', child: bodies[1]?.id ?? '', type: JointType.REVOLUTE,
  });
  const createJoint = () => {
    const { parent, child, type } = jointForm;
    if (!parent || !child || parent === child) return;
    // Capture the child's current pose relative to the parent so FK reproduces
    // the authored layout at value 0.
    const origin = relativeOrigin(doc.bodies[parent], doc.bodies[child]);
    const j = makeJoint({
      name: `Joint ${joints.length + 1}`, type,
      parentBodyId: parent, childBodyId: child, origin,
    });
    dispatch(commands.addJoint(j));
    select(j.id, 'joint');
    setJointForm(null);
  };

  const addPrimitive = (type) => {
    const n = bodies.length;
    const params =
      type === GeometryType.BOX ? { size: [0.8, 0.8, 0.8] }
      : type === GeometryType.CYLINDER ? { radius: 0.4, length: 1 }
      : { radius: 0.5 };
    const body = makeBody({
      name: `${cap(type)} ${n + 1}`,
      visual: { geometry: makeGeometry(type, params), materialId: null, origin: identityOrigin() },
      transform: { position: [n * 1.3, 0.6, 3.5], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
    });
    dispatch(commands.addBody(body));
    select(body.id, 'body');
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    if (doc.bodies[selectedId]) dispatch(commands.removeBody(selectedId));
    else if (doc.joints[selectedId]) dispatch(commands.removeJoint(selectedId));
    clear();
  };

  return (
    <div className="ol-panel">
      <div className="ol-head">
        <span className="ol-title">MODEL</span>
        <div className="ol-hist">
          <button className="ol-icon" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>↶</button>
          <button className="ol-icon" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={redo}>↷</button>
        </div>
      </div>

      <div className="ol-add">
        <button onClick={() => addPrimitive(GeometryType.BOX)}>+ Box</button>
        <button onClick={() => addPrimitive(GeometryType.CYLINDER)}>+ Cyl</button>
        <button onClick={() => addPrimitive(GeometryType.SPHERE)}>+ Sphere</button>
      </div>
      <button className="ol-import" onClick={importMesh}>⬇ Import Mesh (STL / OBJ)</button>

      {bodies.length >= 2 && !jointForm && (
        <button className="ol-import" onClick={openJointForm}>＋ Joint (connect 2 bodies)</button>
      )}
      {jointForm && (
        <div className="ol-jointform">
          <label>Parent
            <select value={jointForm.parent} onChange={(e) => setJointForm({ ...jointForm, parent: e.target.value })}>
              {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label>Child
            <select value={jointForm.child} onChange={(e) => setJointForm({ ...jointForm, child: e.target.value })}>
              {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label>Type
            <select value={jointForm.type} onChange={(e) => setJointForm({ ...jointForm, type: e.target.value })}>
              {Object.values(JointType).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <div className="ol-jointform-actions">
            <button className="ol-jf-create" disabled={jointForm.parent === jointForm.child} onClick={createJoint}>Create</button>
            <button className="ol-jf-cancel" onClick={() => setJointForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="ol-scroll">
        <div className="ol-section">Bodies ({bodies.length})</div>
        {bodies.length === 0 && <div className="ol-empty">No bodies yet — add a primitive or import a mesh (Phase 2).</div>}
        {bodies.map((b) => (
          <button
            key={b.id}
            className={`ol-row ${selectedId === b.id ? 'ol-row--sel' : ''}`}
            onClick={() => select(b.id, 'body')}
          >
            <span className="ol-dot ol-dot--body" />
            <span className="ol-name">{b.name}</span>
          </button>
        ))}

        {joints.length > 0 && <div className="ol-section">Joints ({joints.length})</div>}
        {joints.map((j) => (
          <button
            key={j.id}
            className={`ol-row ${selectedId === j.id ? 'ol-row--sel' : ''}`}
            onClick={() => select(j.id, 'joint')}
          >
            <span className="ol-dot ol-dot--joint" />
            <span className="ol-name">{j.name}</span>
            <span className="ol-type">{j.type}</span>
          </button>
        ))}
      </div>

      {selectedId && (
        <button className="ol-delete" onClick={deleteSelected}>Delete selected</button>
      )}

      {bodies.length > 0 && (
        <div className="ol-export">
          <button onClick={() => exportRobot('urdf')} title="Export URDF (ROS/Gazebo)">⬆ URDF</button>
          <button onClick={() => exportRobot('idl')} title="Export comms interface">⬆ IDL</button>
        </div>
      )}
    </div>
  );
}
