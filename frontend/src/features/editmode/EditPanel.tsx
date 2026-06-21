/**
 * EditPanel — the right-dock panel shown only while mesh Edit Mode is active.
 * Drives editModeStore + calls into the viewport via editBridge. Foundation set:
 * vertex/edge/face select modes, wireframe, select all/none, delete, weld (merge),
 * and live readouts (count / area / edge length / vertex position).
 */
import './EditPanel.css';
import { useEditModeStore } from '@/state/editModeStore';
import type { SelectMode } from '@/state/editModeStore';
import { useModelStore } from '@/state/modelStore';
import { editBridge } from '@/viewport/editBridge';

const fmt = (v: any, d = 3) => (v == null ? '—' : Number(v).toFixed(d));

export default function EditPanel() {
  const bodyId = useEditModeStore((s) => s.bodyId);
  const selectMode = useEditModeStore((s) => s.selectMode);
  const setSelectMode = useEditModeStore((s) => s.setSelectMode);
  const wireframe = useEditModeStore((s) => s.wireframe);
  const toggleWireframe = useEditModeStore((s) => s.toggleWireframe);
  const exit = useEditModeStore((s) => s.exit);
  const stats = useEditModeStore((s) => s.stats);

  const doc = useModelStore((s) => s.doc);
  const name = bodyId ? doc.bodies[bodyId]?.name : '—';

  const MODES: { id: SelectMode; label: string; icon: string }[] = [
    { id: 'vertex', label: 'Vertices', icon: '•' },
    { id: 'edge',   label: 'Edges',    icon: '╱' },
    { id: 'face',   label: 'Faces',    icon: '◢' },
  ];

  return (
    <div className="ed-panel">
      <div className="ed-banner">
        <span className="ed-banner-dot" />
        EDIT MODE — MESH
      </div>
      <div className="ed-head">
        <span className="ed-editing">Editing: <strong>{name}</strong></span>
        <button className="ed-exit" onClick={exit} title="Exit Edit Mode (Tab)">Done</button>
      </div>

      <div className="ed-group">SELECT MODE</div>
      <div className="ed-modes">
        {MODES.map((m) => (
          <button key={m.id}
            className={`ed-mode ${selectMode === m.id ? 'ed-mode--on' : ''}`}
            onClick={() => setSelectMode(m.id)}>
            <span className="ed-mode-ic">{m.icon}</span>{m.label}
          </button>
        ))}
      </div>
      <p className="ed-hint">Click to select · Shift/Ctrl-click to add · drag the gizmo to move.</p>

      <div className="ed-group">SELECTION</div>
      <div className="ed-row">
        <button className="ed-btn" onClick={() => editBridge.selectAll()}>Select all</button>
        <button className="ed-btn" onClick={() => editBridge.deselectAll()}>Deselect</button>
      </div>
      <div className="ed-row">
        <button className="ed-btn ed-btn--danger" onClick={() => editBridge.deleteSelection()}>Delete</button>
        <button className="ed-btn" onClick={() => editBridge.mergeVertices()} title="Weld selected vertices to their average">Merge</button>
      </div>

      <div className="ed-group">OPERATIONS</div>
      <div className="ed-row">
        <button className="ed-btn" onClick={() => editBridge.extrude()} title="Extrude selected faces (E)" disabled={selectMode !== 'face'}>Extrude</button>
        <button className="ed-btn" onClick={() => editBridge.subdivide()} title="Subdivide selected faces (or all)">Subdivide</button>
      </div>
      <div className="ed-row">
        <button className="ed-btn" onClick={() => editBridge.duplicateSelection()} title="Duplicate selected faces" disabled={selectMode !== 'face'}>Duplicate</button>
      </div>

      <div className="ed-group">VIEW</div>
      <label className="ed-check">
        <input type="checkbox" checked={wireframe} onChange={toggleWireframe} />
        <span>Wireframe</span>
      </label>

      <div className="ed-group">READOUT</div>
      <div className="ed-stats">
        <div className="ed-stat"><span>Selected</span><strong>{stats.count}</strong></div>
        {selectMode === 'face' && <div className="ed-stat"><span>Area (m²)</span><strong>{fmt(stats.area, 4)}</strong></div>}
        {selectMode === 'edge' && <div className="ed-stat"><span>Length (m)</span><strong>{fmt(stats.length, 4)}</strong></div>}
        {selectMode === 'vertex' && stats.point && (
          <div className="ed-stat ed-stat--wide">
            <span>Vertex</span>
            <strong>{stats.point.map((v) => fmt(v, 3)).join(', ')}</strong>
          </div>
        )}
      </div>
    </div>
  );
}