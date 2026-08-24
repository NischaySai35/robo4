/**
 * Outliner — the model's hierarchy panel. Add primitive bodies, see every
 * body/joint in the document, and select one (which drives the viewport gizmo
 * and the Inspector). All edits go through the command bus, so undo/redo "just
 * works" via the buttons here or Ctrl+Z.
 */
import './Outliner.css';
import { useState } from 'react';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useDockStore } from '@/state/dockStore';
import { commands } from '@/core/commands/index';
import { makeJoint, JointType, makeDocument } from '@/core/model/index';
import { armMacro, expandChain } from '@/core/model/macros';
import { importMesh } from '@/features/import/importMesh';
import { exportRobot } from '@/features/export/exportRobot';
import { jointFramesForBodies } from '@/kinematics/modelFK';

export default function Outliner() {
  const doc = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);

  const selectedId = useSelectionStore((s) => s.selectedId);
  const selIds = useSelectionStore((s) => s.ids);
  const select = useSelectionStore((s) => s.select);
  const clear = useSelectionStore((s) => s.clear);
  // Single click selects; double click opens the Inspector (Properties).
  const openInspector = (id: any, kind: any) => { select(id, kind); useDockStore.getState().open('inspector'); };
  // Ctrl/⌘-click toggles a body in/out of the multi-selection; plain click replaces it.
  const onRowClick = (e: any, id: any, kind: any) => {
    if (e.ctrlKey || e.metaKey) useSelectionStore.getState().toggle(id, kind);
    else select(id, kind);
  };

  const bodies = Object.values(doc.bodies);
  const joints = Object.values(doc.joints);

  const [macroForm, setMacroForm] = useState<any>(null); // { segments, length } | null
  const spawnMacro = () => {
    const segments = Math.max(1, Math.min(12, Math.round(macroForm?.segments ?? 3)));
    const length = Math.max(0.05, macroForm?.length ?? 0.6);
    // Expand into a throwaway doc, then add the created entities as ONE undoable op.
    const { doc: tmp, bodyIds, jointIds } = expandChain(makeDocument({ name: 'tmp' }), armMacro({ segments, length, name: 'Arm' }));
    const entities = [...bodyIds.map((id) => tmp.bodies[id]), ...jointIds.map((id) => tmp.joints[id])];
    dispatch(commands.addEntities(entities, `Spawn macro: ${segments}-DOF arm`));
    setMacroForm(null);
  };

  const [jointForm, setJointForm] = useState<any>(null); // { parent, child, type } | null
  const openJointForm = () => {
    // Default the child to whatever body is selected (the part you're attaching),
    // and the parent to the first other body — tweak in the form before creating.
    const child = (selectedId && doc.bodies[selectedId]) ? selectedId : (bodies[1]?.id ?? '');
    const parent = bodies.find((b) => b.id !== child)?.id ?? '';
    setJointForm({ parent, child, type: JointType.REVOLUTE });
  };
  const createJoint = () => {
    const { parent, child, type } = jointForm;
    if (!parent || !child || parent === child) return;
    // Pivot defaults to the MIDDLE of the two bodies; both bodies stay where they
    // are (origin + childRest reproduce the layout at value 0). The pivot can then
    // be moved independently in the Inspector.
    const { origin, childRest } = jointFramesForBodies(doc.bodies[parent], doc.bodies[child]);
    const j = makeJoint({
      name: `Joint ${joints.length + 1}`, type,
      parentBodyId: parent, childBodyId: child, origin, childRest,
    });
    dispatch(commands.addJoint(j));
    openInspector(j.id, 'joint');
    setJointForm(null);
  };

  const deleteSelected = () => {
    const targets = selIds.length ? selIds : (selectedId ? [selectedId] : []);
    if (!targets.length) return;
    for (const id of targets) {
      if (doc.bodies[id]) dispatch(commands.removeBody(id));
      else if (doc.joints[id]) dispatch(commands.removeJoint(id));
    }
    clear();
  };

  return (
    <div className="ol-panel">
      <button className="ol-import" onClick={() => importMesh()}>⬇ Import Mesh / Scene</button>

      {!macroForm
        ? <button className="ol-import" onClick={() => setMacroForm({ segments: 3, length: 0.6 })}>⚙ Spawn Macro (parametric arm)</button>
        : (
          <div className="ol-jointform">
            <label>Segments
              <input type="number" min={1} max={12} value={macroForm.segments}
                onChange={(e) => setMacroForm({ ...macroForm, segments: +e.target.value })} />
            </label>
            <label>Link length (m)
              <input type="number" min={0.05} step={0.05} value={macroForm.length}
                onChange={(e) => setMacroForm({ ...macroForm, length: +e.target.value })} />
            </label>
            <div className="ol-jointform-actions">
              <button className="ol-jf-create" onClick={spawnMacro}>Spawn</button>
              <button className="ol-jf-cancel" onClick={() => setMacroForm(null)}>Cancel</button>
            </div>
          </div>
        )}

      {bodies.length >= 2 && !jointForm && (
        <button className="ol-import" onClick={openJointForm}>＋ Joint (connect 2 bodies)</button>
      )}
      {jointForm && (
        <div className="ol-jointform">
          <label>Body 1
            <select value={jointForm.parent} onChange={(e) => setJointForm({ ...jointForm, parent: e.target.value })}>
              {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label>Body 2
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
            className={`ol-row ${selIds.includes(b.id) ? 'ol-row--sel' : ''}`}
            onClick={(e) => onRowClick(e, b.id, 'body')}
            onDoubleClick={() => openInspector(b.id, 'body')}
            title="Click to select · Ctrl-click for multi · double-click for Properties"
          >
            <span className="ol-dot ol-dot--body" />
            <span className="ol-name">{b.name}</span>
          </button>
        ))}

        {joints.length > 0 && <div className="ol-section">Joints ({joints.length})</div>}
        {joints.map((j) => (
          <button
            key={j.id}
            className={`ol-row ${selIds.includes(j.id) ? 'ol-row--sel' : ''}`}
            onClick={(e) => onRowClick(e, j.id, 'joint')}
            onDoubleClick={() => openInspector(j.id, 'joint')}
            title="Click to select · double-click for Properties"
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
          <button onClick={() => exportRobot('sdf')} title="Export SDF (Gazebo/Ignition)">⬆ SDF</button>
          <button onClick={() => exportRobot('mjcf')} title="Export MJCF (MuJoCo)">⬆ MJCF</button>
          <button onClick={() => exportRobot('idl')} title="Export comms interface">⬆ IDL</button>
        </div>
      )}
    </div>
  );
}