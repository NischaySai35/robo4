/**
 * AnalysisPanel — engineering readout: mass, CoM, per-joint holding torque,
 * estimated current, structural safety factor (FoS), and winding temperature.
 *
 * Industrial additions over the original:
 *   - Per-joint motor lookup (joint.meta.motorType → motorDatabase)
 *   - Von Mises stress + structural FoS per body link
 *   - Live winding temperature indicator (from thermalModel)
 *   - Overload threshold is now motor-specific, not hardcoded ST3215
 */
import './AnalysisPanel.css';
import { useMemo, useEffect } from 'react';
import { useModelStore } from '@/state/modelStore';
import { useEditorStore } from '@/state/editorStore';
import { usePageStore } from '@/state/pageStore';
import { bridge } from '@/viewport/cameraBridge';
import { computeFK } from '@/kinematics/modelFK';
import { jointLoads, centerOfMass, bodyMechanics } from '@/kinematics/analysis';
import { getMotorSpec } from '@/kinematics/motorDatabase';
import { getTemp } from '@/kinematics/thermalModel';
import LiveTelemetryChart from './LiveTelemetryChart';

/** FoS → CSS class + short label */
function fosClass(fos: number): { cls: string; label: string } {
  if (!isFinite(fos) || fos > 99) return { cls: '', label: '—' };
  if (fos >= 3)   return { cls: 'an-fos-ok',   label: fos.toFixed(1) };
  if (fos >= 2)   return { cls: 'an-fos-ok',   label: fos.toFixed(1) };
  if (fos >= 1.5) return { cls: 'an-fos-warn',  label: fos.toFixed(1) };
  if (fos >= 1)   return { cls: 'an-fos-crit',  label: fos.toFixed(1) };
  return           { cls: 'an-fos-fail',  label: '⚠' + fos.toFixed(1) };
}

/** Temperature fraction → thermal dot class */
function thermalClass(tempC: number, maxTemp: number) {
  const f = tempC / maxTemp;
  if (f > 0.90) return 'an-therm an-therm--crit';
  if (f > 0.70) return 'an-therm an-therm--warn';
  return 'an-therm an-therm--ok';
}

export default function AnalysisPanel() {
  const doc           = useModelStore((s) => s.doc);
  const show          = useEditorStore((s) => s.showAnalysis);
  const toggle        = useEditorStore((s) => s.toggleAnalysis);
  const fallingBoxes  = useEditorStore((s) => s.fallingBoxes);
  const onAnalysisPage = usePageStore((s) => s.page === 'analysis');

  const toggleBoxes = () => useEditorStore.getState().toggleFallingBoxes();

  useEffect(() => {
    if (!onAnalysisPage) return;
    const prev = useEditorStore.getState().showAnalysis;
    if (!prev) useEditorStore.getState().toggleAnalysis();
    const t = setTimeout(() => bridge.fitCamera?.(), 80);
    return () => {
      clearTimeout(t);
      if (!prev && useEditorStore.getState().showAnalysis) useEditorStore.getState().toggleAnalysis();
    };
  }, [onAnalysisPage]);

  const { mass, com, loads, mechanics } = useMemo(() => {
    const fk = computeFK(doc);
    const c  = centerOfMass(doc, fk);
    const l  = jointLoads(doc, fk);
    const m  = bodyMechanics(doc, fk);
    return { mass: c.mass, com: c.com, loads: l, mechanics: m };
  }, [doc]);

  const joints = Object.values(doc.joints);

  // Collect worst-case FoS and motor sets for the footer
  const { worstFos, motorSet } = useMemo(() => {
    let wf = Infinity;
    const ms = new Set<string>();
    for (const j of joints) {
      const motor = getMotorSpec((j as any).meta?.motorType);
      ms.add(motor.name);
    }
    for (const [, m] of mechanics) {
      if (isFinite(m.fos) && m.fos < wf) wf = m.fos;
    }
    return { worstFos: wf, motorSet: ms };
  }, [joints, mechanics]);

  return (
    <div className="an-panel">
      <div className="an-chart-sticky">
        <div className="an-section">LIVE TELEMETRY</div>
        <LiveTelemetryChart />
      </div>

      <div className="an-scroll">
        <div className="an-head">
          <span className="an-title">ANALYSIS</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label className="an-toggle">
              <input type="checkbox" checked={show} onChange={toggle} />
              <span>Stress overlay</span>
            </label>
            <button
              className={`an-box-btn${fallingBoxes ? ' an-box-btn--on' : ''}`}
              onClick={toggleBoxes}
              title={fallingBoxes ? 'Stop falling boxes' : 'Rain physics boxes onto the robot — watch stress/torque spike on impact'}
            >
              {fallingBoxes ? '■ Stop boxes' : '▼ Fall boxes'}
            </button>
          </div>
        </div>

        <div className="an-stats">
          <div><span>Total mass</span><strong>{mass.toFixed(2)} kg</strong></div>
          <div><span>Center of mass</span><strong>{com.map((v) => v.toFixed(2)).join(', ')}</strong></div>
          {isFinite(worstFos) && (
            <div>
              <span>Min. FoS (structural)</span>
              <strong className={fosClass(worstFos).cls}>{worstFos.toFixed(1)}</strong>
            </div>
          )}
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
            <thead>
              <tr>
                <th>Joint</th>
                <th title="Static gravity-holding torque">τ (N·m)</th>
                <th title="Estimated winding current">I (A)</th>
                <th title="Structural factor of safety (von Mises / yield strength)">FoS</th>
                <th title="Winding temperature">T°</th>
              </tr>
            </thead>
            <tbody>
              {joints.map((j) => {
                const l     = loads.get(j.id) ?? { torque: 0, current: 0, overload: false, motorName: '' };
                const motor = getMotorSpec((j as any).meta?.motorType);

                // FoS from the child body's structural mechanics
                const childBodyId = j.childBodyId;
                const mech  = childBodyId ? mechanics.get(childBodyId) : undefined;
                const fos   = mech?.fos ?? Infinity;
                const fv    = fosClass(fos);

                // Live winding temperature from the module-level thermal state
                const tempC = getTemp(j.id);
                const thCls = thermalClass(tempC, motor.maxTemp);
                const tFrac = tempC / motor.maxTemp;

                return (
                  <tr key={j.id} className={l.overload ? 'an-over' : ''}>
                    <td>
                      <div>{j.name}</div>
                      <div className="an-motor-tag">{motor.name}</div>
                    </td>
                    <td>{l.torque.toFixed(2)}{l.overload ? ' ⚠' : ''}</td>
                    <td>{l.current.toFixed(2)}</td>
                    <td className={fv.cls}>{fv.label}</td>
                    <td>
                      <span className={thCls} title={`${tempC.toFixed(1)} °C / ${motor.maxTemp} °C (${(tFrac * 100).toFixed(0)}%)`} />
                      <span className="an-temp-val">{tempC.toFixed(0)}°</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="an-foot">
          {motorSet.size === 1
            ? `Motor: ${[...motorSet][0]}`
            : `Motors: ${[...motorSet].join(', ')}`}
          {' · '}
          FoS thresholds: &gt;3 safe · 2–3 adequate · 1.5–2 marginal · &lt;1.5 critical
        </div>
      </div>
    </div>
  );
}
