/**
 * EditorTools — precision controls: units, snapping, Fusion-style measurement, mate, gravity.
 */
import './EditorTools.css';
import { useEditorStore, formatLen } from '@/state/editorStore';
import type { MeasureResult2 } from '@/state/editorStore';

const TYPE_ICON: Record<string, string> = {
  vertex:      '◆',
  'edge-mid':  '◇',
  edge:        '—',
  'face-center': '▣',
  face:        '▨',
};
const TYPE_LABEL: Record<string, string> = {
  vertex:       'Vertex',
  'edge-mid':   'Edge midpoint',
  edge:         'Edge',
  'face-center':'Face center',
  face:         'Face',
};

function EntityTag({ entity, color }: { entity: any; color: string }) {
  if (!entity) return null;
  const icon  = TYPE_ICON[entity.type]  ?? '·';
  const label = TYPE_LABEL[entity.type] ?? entity.type;
  return (
    <div className="et-entity" style={{ '--et-entity-color': color } as any}>
      <span className="et-entity-icon" style={{ color }}>{icon}</span>
      <span className="et-entity-type">{label}</span>
      {entity.bodyName && <span className="et-entity-body">· {entity.bodyName}</span>}
    </div>
  );
}

function DistRow({ label, value, units, accent }: { label: string; value: number; units: string; accent: string }) {
  return (
    <div className="et-dist-row">
      <span className="et-dist-label" style={{ color: accent }}>{label}</span>
      <span className="et-dist-val" style={{ color: accent }}>{formatLen(value, units as any)}</span>
    </div>
  );
}

export default function EditorTools() {
  const units        = useEditorStore((s) => s.units);
  const setUnits     = useEditorStore((s) => s.setUnits);
  const snap         = useEditorStore((s) => s.snap);
  const setSnap      = useEditorStore((s) => s.setSnap);
  const measureMode  = useEditorStore((s) => s.measureMode);
  const toggleMeasure = useEditorStore((s) => s.toggleMeasure);
  const measureResult = useEditorStore((s) => s.measureResult);
  const mateMode     = useEditorStore((s) => s.mateMode);
  const toggleMate   = useEditorStore((s) => s.toggleMate);
  const matePick     = useEditorStore((s) => s.matePick);
  const simRunning   = useEditorStore((s) => s.simRunning);
  const toggleSim    = useEditorStore((s) => s.toggleSim);
  const gravity      = useEditorStore((s) => s.gravity);
  const setGravity   = useEditorStore((s) => s.setGravity);

  // Determine if it's a rich v2 result
  const r2 = measureResult && 'entityA' in measureResult ? measureResult as MeasureResult2 : null;
  const hasEntities = !!(r2?.entityA);
  const hasBoth = !!(r2?.entityA && r2?.entityB);

  return (
    <div className="et-panel">
      {/* Units */}
      <div className="et-row">
        <span className="et-label">Units</span>
        <select className="et-select" value={units} onChange={(e) => setUnits(e.target.value as 'm' | 'cm' | 'mm')}>
          <option value="m">m</option>
          <option value="cm">cm</option>
          <option value="mm">mm</option>
        </select>
      </div>

      {/* Snap */}
      <div className="et-row">
        <label className="et-check">
          <input type="checkbox" checked={snap.enabled} onChange={(e) => setSnap({ enabled: e.target.checked })} />
          <span>Snap</span>
        </label>
        <input className="et-num" type="number" step="0.05" min="0.01" title="Move snap (units)"
          value={snap.translate} onChange={(e) => setSnap({ translate: parseFloat(e.target.value) || 0.05 })} />
        <input className="et-num" type="number" step="5" min="1" title="Rotate snap (deg)"
          value={snap.rotateDeg} onChange={(e) => setSnap({ rotateDeg: parseFloat(e.target.value) || 15 })} />
      </div>

      {/* Measure button */}
      <button className={`et-measure ${measureMode ? 'et-measure--on' : ''}`} onClick={toggleMeasure}>
        📏 {measureMode
          ? (hasEntities ? (hasBoth ? 'Click to restart' : 'Click entity B…') : 'Click entity A…')
          : 'Measure'}
      </button>

      {/* Measurement results */}
      {measureMode && (
        <div className="et-measure-panel">
          {/* Entity A */}
          <div className="et-measure-slot">
            <span className="et-slot-label" style={{ color: '#f5c518' }}>A</span>
            {r2?.entityA
              ? <EntityTag entity={r2.entityA} color="#f5c518" />
              : <span className="et-slot-empty">Hover + click to select</span>}
          </div>
          {/* Entity B */}
          <div className="et-measure-slot">
            <span className="et-slot-label" style={{ color: '#18d4f5' }}>B</span>
            {r2?.entityB
              ? <EntityTag entity={r2.entityB} color="#18d4f5" />
              : <span className="et-slot-empty">{r2?.entityA ? 'Click second entity' : '—'}</span>}
          </div>

          {/* Distance results */}
          {hasBoth && r2 && (
            <div className="et-dist-block">
              <DistRow label="▴ Max"    value={r2.maxDist!}    units={units} accent="#f04040" />
              <DistRow label="● Center" value={r2.centerDist!} units={units} accent="#aaaacc" />
              <DistRow label="▾ Min"    value={r2.minDist!}    units={units} accent="#40c070" />
            </div>
          )}

          <div className="et-measure-hint">
            Esc — reset last pick · click empty space to clear
          </div>
        </div>
      )}

      {/* Mate */}
      <button className={`et-measure ${mateMode ? 'et-measure--on' : ''}`} onClick={toggleMate}>
        🧲 {mateMode
          ? (matePick === 0 ? 'Mate — click face FIXED' : 'Mate — click face to MOVE')
          : 'Mate faces (align parts)'}
      </button>

      {/* Gravity */}
      <div className="et-row et-gravity">
        <label className="et-check">
          <input type="checkbox" checked={simRunning} onChange={toggleSim} />
          <span>Gravity</span>
        </label>
        <input className="et-num" type="number" step="0.1" min="0" title="Gravity magnitude (m/s²)"
          value={gravity} onChange={(e) => setGravity(parseFloat(e.target.value))} />
        <span className="et-unit">m/s²</span>
      </div>
    </div>
  );
}
