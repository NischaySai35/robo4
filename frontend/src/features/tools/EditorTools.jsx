/**
 * EditorTools — precision controls (Phase 3): display units, gizmo snapping, and
 * the measurement tool with a live distance readout.
 */
import './EditorTools.css';
import { useEditorStore, formatLen } from '@/state/editorStore.js';

export default function EditorTools() {
  const units = useEditorStore((s) => s.units);
  const setUnits = useEditorStore((s) => s.setUnits);
  const snap = useEditorStore((s) => s.snap);
  const setSnap = useEditorStore((s) => s.setSnap);
  const measureMode = useEditorStore((s) => s.measureMode);
  const toggleMeasure = useEditorStore((s) => s.toggleMeasure);
  const measureResult = useEditorStore((s) => s.measureResult);

  return (
    <div className="et-panel">
      <div className="et-row">
        <span className="et-label">Units</span>
        <select className="et-select" value={units} onChange={(e) => setUnits(e.target.value)}>
          <option value="m">m</option>
          <option value="cm">cm</option>
          <option value="mm">mm</option>
        </select>
      </div>

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

      <button className={`et-measure ${measureMode ? 'et-measure--on' : ''}`} onClick={toggleMeasure}>
        📏 {measureMode ? 'Measuring… click 2 points' : 'Measure'}
      </button>
      {measureResult && (
        <div className="et-result">
          Distance: <strong>{formatLen(measureResult.distance, units)}</strong>
        </div>
      )}
    </div>
  );
}
