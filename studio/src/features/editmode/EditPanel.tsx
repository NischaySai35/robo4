/**
 * EditPanel — right-dock panel shown only while mesh Edit Mode is active.
 */
import { Button } from '@/components/ui/button';
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
    <div className="ed-panel" data-ui="a">
      <div className="ed-banner">
        <span className="ed-banner-dot" />
        EDIT MODE — MESH
      </div>
      <div className="ed-head">
        <span className="ed-editing">Editing: <strong>{name}</strong></span>
        <Button size="sm" onClick={exit} title="Exit Edit Mode (Tab)">Done</Button>
      </div>

      <div className="ed-group">EDIT STYLE</div>
      <div className="ed-modes">
        {(['fusion', 'blender'] as EditStyle[]).map((s) => (
          <Button size="sm" className="tw:flex-1" variant={editStyle === s ? 'default' : 'outline'} key={s}
           
            onClick={() => setEditStyle(s)}
            title={s === 'fusion' ? 'Clean edges only — no tessellation lines' : 'All triangles, vertices, edges visible'}>
            {s === 'fusion' ? '◈ Fusion' : '⬡ Blender'}
          </Button>
        ))}
      </div>

      {editStyle === 'blender' && (
        <>
          <div className="ed-group">SELECT MODE</div>
          <div className="ed-modes">
            {MODES.map((m) => (
              <Button size="sm" className="tw:flex-1" variant={selectMode === m.id ? 'default' : 'outline'} key={m.id}
               
                onClick={() => setSelectMode(m.id)}>
                <span className="ed-mode-ic">{m.icon}</span>{m.label}
              </Button>
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
        <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.selectAll()}>All <kbd>A</kbd></Button>
        <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.deselectAll()}>None</Button>
      </div>
      <div className="ed-row">
        <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.selectLinked()} title="Select all connected (L)">Linked <kbd>L</kbd></Button>
        <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.selectSimilar()} title="Select similar faces/edges/verts">Similar</Button>
      </div>
      <div className="ed-row">
        <Button variant="destructive" size="sm" className="tw:flex-1" onClick={() => editBridge.deleteSelection()} title="Delete selection (X)">Delete <kbd>X</kbd></Button>
        <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.mergeVertices()} title="Weld selected verts to centre">Merge</Button>
      </div>

      <div className="ed-group">MODIFY</div>
      {editStyle === 'fusion' ? (
        <>
          <div className="ed-row">
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.extrude()} title="Push/Pull selected face (E)">Extrude <kbd>E</kbd></Button>
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.inset()} title="Inset face (I)">Inset <kbd>I</kbd></Button>
          </div>
          <div className="ed-row">
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.bevel()} title="Chamfer / Fillet edge (B)">Chamfer <kbd>B</kbd></Button>
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.subdivide()} title="Subdivide selected">Subdivide</Button>
          </div>
          <div className="ed-row">
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.smooth()} title="Smooth vertices">Smooth</Button>
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.shrinkFatten()} title="Shell / Offset along normals">Shell</Button>
          </div>
          <div className="ed-row">
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.fill()} title="Fill / close open edges (F)">Fill <kbd>F</kbd></Button>
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.startTwoPointMove()} title="Snap vertex to another vertex">2-Pt Move</Button>
          </div>
        </>
      ) : (
        <>
          <div className="ed-row">
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.extrude()} title="Extrude faces (E)" disabled={!isFace}>Extrude <kbd>E</kbd></Button>
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.inset()} title="Inset faces (I)" disabled={!isFace}>Inset <kbd>I</kbd></Button>
          </div>
          <div className="ed-row">
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.bevel()} title="Bevel selected edges (B)" disabled={!isEdge}>Bevel <kbd>B</kbd></Button>
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.loopCut()} title="Loop Cut: insert edge ring (Ctrl+R)" disabled={!isEdge}>Loop Cut</Button>
          </div>
          <div className="ed-row">
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.fill()} title="Fill: create face (F)" disabled={isFace}>Fill <kbd>F</kbd></Button>
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.connect()} title="Connect 2 verts (J)" disabled={!isVert}>Connect <kbd>J</kbd></Button>
          </div>
          <div className="ed-row">
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.subdivide()}>Subdivide</Button>
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.duplicateSelection()} disabled={!isFace}>Duplicate</Button>
          </div>
          <div className="ed-row">
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.shrinkFatten()} title="Shrink/Fatten along normals">Shrink/Fat</Button>
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.smooth()}>Smooth</Button>
          </div>
          <div className="ed-row">
            <Button variant="outline" size="sm" className="tw:flex-1" onClick={() => editBridge.startTwoPointMove()} title="Move: snap vertex to vertex">2-Pt Move</Button>
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
