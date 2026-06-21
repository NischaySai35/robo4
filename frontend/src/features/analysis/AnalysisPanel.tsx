/**
 * AnalysisPanel — engineering readout (Phase 8): total mass, center of mass, and
 * per-joint gravity-holding torque + estimated ST3215 current, with a toggle for
 * the 3D overlay (COM marker + joint load heatmap). Overloaded joints (torque
 * beyond the servo's stall) are flagged red. Below the static readout, a live
 * uPlot strip chart streams per-joint angle/velocity/acceleration over time.
 */
import './AnalysisPanel.css';
import { useMemo } from 'react';
import { useModelStore } from '@/state/modelStore';
import { useEditorStore } from '@/state/editorStore';
import { computeFK } from '@/kinematics/modelFK';
import { jointLoads, centerOfMass, ST3215 } from '@/kinematics/analysis';
import LiveTelemetryChart from './LiveTelemetryChart';

export default function AnalysisPanel() {
  const doc = useModelStore((s) => s.doc);
  const show = useEditorStore((s) => s.showAnalysis);
  const toggle = useEditorStore((s) => s.toggleAnalysis);

  const { mass, com, loads } = useMemo(() => {
    const fk = computeFK(doc);
    const c = centerOfMass(doc, fk);
    return { mass: c.mass, com: c.com, loads: jointLoads(doc, fk) };
  }, [doc]);

  const joints = Object.values(doc.joints);

  return (
    <div className="an-panel">
      <div className="an-head">
        <span className="an-title">ANALYSIS</span>
        <label className="an-toggle">
          <input type="checkbox" checked={show} onChange={toggle} />
          <span>Overlay</span>
        </label>
      </div>

      <div className="an-stats">
        <div><span>Total mass</span><strong>{mass.toFixed(2)} kg</strong></div>
        <div><span>Center of mass</span><strong>{com.map((v) => v.toFixed(2)).join(', ')}</strong></div>
      </div>

      {show && (
        <div className="an-legend">
          <div className="an-legend-bar" />
          <div className="an-legend-labels"><span>low load</span><span>high load</span></div>
        </div>
      )}

      {joints.length === 0 && <div className="an-empty">Add joints to see holding torque & current.</div>}
      {joints.length > 0 && (
        <table className="an-table">
          <thead><tr><th>Joint</th><th>τ (N·m)</th><th>I (A)</th></tr></thead>
          <tbody>
            {joints.map((j) => {
              const l = loads.get(j.id) ?? { torque: 0, current: 0, overload: false };
              return (
                <tr key={j.id} className={l.overload ? 'an-over' : ''}>
                  <td>{j.name}</td>
                  <td>{l.torque.toFixed(2)}</td>
                  <td>{l.current.toFixed(2)}{l.overload ? ' ⚠' : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="an-foot">Model: ST3215 · stall {ST3215.stallTorque} N·m / {ST3215.stallCurrent} A</div>

      <div className="an-section">LIVE TELEMETRY</div>
      <LiveTelemetryChart />
    </div>
  );
}