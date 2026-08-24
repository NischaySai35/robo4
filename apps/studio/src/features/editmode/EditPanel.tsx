/**
 * EditPanel — right-dock panel shown only while mesh Edit Mode is active.
 */
import './EditPanel.css';
import { useEditModeStore } from '@/state/editModeStore';
import type { SelectMode, EditStyle } from '@/state/editModeStore';
import { useModelStore } from '@/state/modelStore';
import { editBridge } from '@/viewport/editBridge';

const fmt = (v: any, d = 3) => (v == null ? '—' : Number(v).toFixed(d));

export default function EditPanel() {
  const bodyId     = useEditModeStore((s) => s.bodyId);
  const selectMode = useEditModeStore((s) => s.selectMode);
  const setSelectMode = useEditModeStore((s) => s.setSelectMode);
  const editStyle  = useEditModeStore((s) => s.editStyle);
  const setEditStyle = useEditModeStore((s) => s.setEditStyle);
  const wireframe  = useEditModeStore((s) => s.wireframe);
  const toggleWireframe = useEditModeStore((s) => s.toggleWireframe);
  const exit       = useEditModeStore((s) => s.exit);
  const stats      = useEditModeStore((s) => s.stats);

  const doc  = useModelStore((s) => s.doc);
  const name = bodyId ? doc.bodies[bodyId]?.name : '—';

  const MODES: { id: SelectMode; label: string; icon: string }[] = [
    { id: 'vertex', label: 'Vertices', icon: '•' },
    { id: 'edge',   label: 'Edges',    icon: '╱' },
    { id: 'face',   label: 'Faces',    icon: '◢' },
  ];

  const isVert = selectMode === 'vertex';
  const isEdge = selectMode === 'edge';
  const isFace = selectMode === 'face';

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

      <div className="ed-group">EDIT STYLE</div>
      <div className="ed-modes">
        {(['fusion', 'blender'] as EditStyle[]).map((s) => (
          <button key={s}
            className={`ed-mode ${editStyle === s ? 'ed-mode--on' : ''}`}
            onClick={() => setEditStyle(s)}
            title={s === 'fusion' ? 'Clean edges only — no tessellation lines' : 'All triangles, vertices, edges visible'}>
            {s === 'fusion' ? '◈ Fusion' : '⬡ Blender'}
          </button>
        ))}
      </div>

      {editStyle === 'blender' && (
        <>
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
        </>
      )}
      <p className="ed-hint">
        {editStyle === 'fusion'
          ? 'Hover to highlight · click to select · drag gizmo to move'
          : 'Click · Shift/Ctrl+click to add · drag gizmo to move'}
      </p>

      <div className="ed-group">SELECTION</div>
      <div className="ed-row">
        <button className="ed-btn" onClick={() => editBridge.selectAll()}>All <kbd>A</kbd></button>
        <button className="ed-btn" onClick={() => editBridge.deselectAll()}>None</button>
      </div>
      <div className="ed-row">
        <button className="ed-btn" onClick={() => editBridge.selectLinked()} title="Select all connected (L)">Linked <kbd>L</kbd></button>
        <button className="ed-btn" onClick={() => editBridge.selectSimilar()} title="Select similar faces/edges/verts">Similar</button>
      </div>
      <div className="ed-row">
        <button className="ed-btn ed-btn--danger" onClick={() => editBridge.deleteSelection()} title="Delete selection (X)">Delete <kbd>X</kbd></button>
        <button className="ed-btn" onClick={() => editBridge.mergeVertices()} title="Weld selected verts to centre">Merge</button>
      </div>

      <div className="ed-group">MODIFY</div>
      {editStyle === 'fusion' ? (
        <>
          <div className="ed-row">
            <button className="ed-btn" onClick={() => editBridge.extrude()} title="Push/Pull selected face (E)">Extrude <kbd>E</kbd></button>
            <button className="ed-btn" onClick={() => editBridge.inset()} title="Inset face (I)">Inset <kbd>I</kbd></button>
          </div>
          <div className="ed-row">
            <button className="ed-btn" onClick={() => editBridge.bevel()} title="Chamfer / Fillet edge (B)">Chamfer <kbd>B</kbd></button>
            <button className="ed-btn" onClick={() => editBridge.subdivide()} title="Subdivide selected">Subdivide</button>
          </div>
          <div className="ed-row">
            <button className="ed-btn" onClick={() => editBridge.smooth()} title="Smooth vertices">Smooth</button>
            <button className="ed-btn" onClick={() => editBridge.shrinkFatten()} title="Shell / Offset along normals">Shell</button>
          </div>
          <div className="ed-row">
            <button className="ed-btn" onClick={() => editBridge.fill()} title="Fill / close open edges (F)">Fill <kbd>F</kbd></button>
            <button className="ed-btn" onClick={() => editBridge.startTwoPointMove()} title="Snap vertex to another vertex">2-Pt Move</button>
          </div>
        </>
      ) : (
        <>
          <div className="ed-row">
            <button className="ed-btn" onClick={() => editBridge.extrude()} title="Extrude faces (E)" disabled={!isFace}>Extrude <kbd>E</kbd></button>
            <button className="ed-btn" onClick={() => editBridge.inset()} title="Inset faces (I)" disabled={!isFace}>Inset <kbd>I</kbd></button>
          </div>
          <div className="ed-row">
            <button className="ed-btn" onClick={() => editBridge.bevel()} title="Bevel selected edges (B)" disabled={!isEdge}>Bevel <kbd>B</kbd></button>
            <button className="ed-btn" onClick={() => editBridge.loopCut()} title="Loop Cut: insert edge ring (Ctrl+R)" disabled={!isEdge}>Loop Cut</button>
          </div>
          <div className="ed-row">
            <button className="ed-btn" onClick={() => editBridge.fill()} title="Fill: create face (F)" disabled={isFace}>Fill <kbd>F</kbd></button>
            <button className="ed-btn" onClick={() => editBridge.connect()} title="Connect 2 verts (J)" disabled={!isVert}>Connect <kbd>J</kbd></button>
          </div>
          <div className="ed-row">
            <button className="ed-btn" onClick={() => editBridge.subdivide()}>Subdivide</button>
            <button className="ed-btn" onClick={() => editBridge.duplicateSelection()} disabled={!isFace}>Duplicate</button>
          </div>
          <div className="ed-row">
            <button className="ed-btn" onClick={() => editBridge.shrinkFatten()} title="Shrink/Fatten along normals">Shrink/Fat</button>
            <button className="ed-btn" onClick={() => editBridge.smooth()}>Smooth</button>
          </div>
          <div className="ed-row">
            <button className="ed-btn" onClick={() => editBridge.startTwoPointMove()} title="Move: snap vertex to vertex">2-Pt Move</button>
          </div>
        </>
      )}

      <div className="ed-group">VIEW</div>
      <label className="ed-check">
        <input type="checkbox" checked={wireframe} onChange={toggleWireframe} />
        <span>Wireframe</span>
      </label>

      <div className="ed-group">READOUT</div>
      <div className="ed-stats">
        <div className="ed-stat"><span>Selected</span><strong>{stats.count}</strong></div>
        {isFace && <div className="ed-stat"><span>Area (mm²)</span><strong>{fmt((stats.area ?? 0) * 1e6, 1)}</strong></div>}
        {isEdge && <div className="ed-stat"><span>Length (mm)</span><strong>{fmt((stats.length ?? 0) * 1000, 2)}</strong></div>}
        {isVert && stats.point && (
          <div className="ed-stat ed-stat--wide">
            <span>Vertex (mm)</span>
            <strong>{(stats.point as number[]).map((v) => fmt(v * 1000, 2)).join(', ')}</strong>
          </div>
        )}
      </div>

      <div className="ed-group ed-shortcuts-hdr">SHORTCUTS</div>
      <div className="ed-shortcuts">
        <span><kbd>Tab</kbd> exit</span>
        <span><kbd>A</kbd> select all</span>
        <span><kbd>E</kbd> extrude</span>
        <span><kbd>F</kbd> fill</span>
        <span><kbd>J</kbd> connect</span>
        <span><kbd>B</kbd> bevel</span>
        <span><kbd>L</kbd> linked</span>
        <span><kbd>X</kbd> delete</span>
        <span><kbd>Ctrl+R</kbd> loop cut</span>
        <span><kbd>Shift+G</kbd> similar</span>
      </div>
    </div>
  );
}
