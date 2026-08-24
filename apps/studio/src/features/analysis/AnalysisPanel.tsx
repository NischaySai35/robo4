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
import { useMemo, useEffect, useRef, useState } from 'react';
import { useModelStore } from '@/state/modelStore';
import { getJointActuator } from '@/core/model/index';
import { commands } from '@/core/commands/index';
import { useEditorStore } from '@/state/editorStore';
import { usePageStore } from '@/state/pageStore';
import { bridge } from '@/viewport/cameraBridge';
import { computeFK } from '@/kinematics/modelFK';
import { jointLoads, centerOfMass, bodyMechanics } from '@/kinematics/analysis';
import { getMotorSpec } from '@/kinematics/motorDatabase';
import { getTemp } from '@/kinematics/thermalModel';
import LiveTelemetryChart from './LiveTelemetryChart';
import RigidSelectionPanel from './RigidSelectionPanel';

/** FoS → CSS class + short label */
/** Motor-load fraction → colour class. >1 = overstrained (past the servo limit). */
function loadClass(frac: number): string {
  if (frac > 1)    return 'an-fos-fail'; // OVER limit — overstrained
  if (frac > 0.85) return 'an-fos-crit'; // near stall
  if (frac > 0.60) return 'an-fos-warn'; // high
  return 'an-fos-ok';                     // comfortable
}

/** Editable joint angle: type + Enter to set, ◀ ▶ to step, or drag left/right to
 *  scrub. Values are clamped to the joint's limits ("move as far as it can"). */
function AngleInput({ joint }: { joint: any }) {
  const dispatch = useModelStore((s) => s.dispatch);
  const isPrismatic = joint.type === 'prismatic';
  const val = joint.state?.value ?? 0; // rad (or m for prismatic)
  const lim = joint.limit ?? { lower: -Math.PI, upper: Math.PI };
  const toDisp = (r: number) => (isPrismatic ? r * 1000 : (r * 180) / Math.PI);
  const toRad = (d: number) => (isPrismatic ? d / 1000 : (d * Math.PI) / 180);
  const clamp = (r: number) => Math.max(lim.lower, Math.min(lim.upper, r));
  const setRad = (r: number) => dispatch(commands.setJointValue(joint.id, clamp(r)));

  const [buf, setBuf] = useState(String(Math.round(toDisp(val))));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setBuf(String(Math.round(toDisp(val)))); }, [val, editing]); // eslint-disable-line
  const commit = () => { setEditing(false); const d = parseFloat(buf); if (!isNaN(d)) setRad(toRad(d)); };
  const step = (dir: number) => setRad(val + toRad(isPrismatic ? 1 : 5) * dir);

  const drag = useRef<{ x: number; startRad: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); // don't focus yet — a drag scrubs, a click (no move) focuses
    drag.current = { x: e.clientX, startRad: val, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 2) d.moved = true;
    const perPx = isPrismatic ? 0.0005 : (1.2 * Math.PI) / 180; // sensitivity/px
    const r = clamp(d.startRad + dx * perPx);
    setBuf(String(Math.round(toDisp(r))));
    setRad(r);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (d && !d.moved) (e.target as HTMLInputElement).focus(); // was a click → type
  };

  if (joint.type === 'fixed') return <span className="an-angle-fixed">—</span>;
  return (
    <div className="an-angle">
      <button className="an-angle-arrow" onClick={() => step(-1)} title="Decrease">◀</button>
      <input
        className="an-angle-input"
        value={buf}
        onFocus={() => setEditing(true)}
        onChange={(e) => setBuf(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') e.currentTarget.blur();
          else if (e.key === 'Escape') { setBuf(String(Math.round(toDisp(val)))); setEditing(false); e.currentTarget.blur(); }
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        title="Type a value + Enter · drag left/right to scrub"
      />
      <span className="an-angle-unit">{isPrismatic ? 'mm' : '°'}</span>
      <button className="an-angle-arrow" onClick={() => step(1)} title="Increase">▶</button>
    </div>
  );
}

/** Interactive stress-legend bar: hover/drag to read the load value at the cursor,
 *  plus a live pointer that slides to the model's current peak load fraction. */
function LegendBar({ peakFrac, unit, material }: { peakFrac: number; unit: string; material?: boolean }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null); // 0..1 cursor fraction
  const readAt = (clientX: number) => {
    const r = barRef.current?.getBoundingClientRect();
    if (!r) return;
    setHover(Math.max(0, Math.min(1, (clientX - r.left) / r.width)));
  };
  const label = (f: number) => (f < 0.33 ? 'low' : f < 0.66 ? 'moderate' : f < 0.9 ? 'high' : 'critical');
  return (
    <div className="an-legend">
      <div
        ref={barRef}
        className="an-legend-bar"
        onMouseMove={(e) => readAt(e.clientX)}
        onMouseLeave={() => setHover(null)}
      >
        {peakFrac > 0 && (
          <div
            className={`an-legend-ptr${peakFrac > 1 ? ' over' : ''}`}
            style={{ left: `${Math.min(1, peakFrac) * 100}%` }}
            title={`Current peak: ${Math.round(peakFrac * 100)}% of limit${peakFrac > 1 ? ' — OVERSTRAINED' : ''}`}
          />
        )}
        {hover !== null && (
          <>
            <div className="an-legend-cursor" style={{ left: `${hover * 100}%` }} />
            <div className="an-legend-tip" style={{ left: `${hover * 100}%` }}>
              {Math.round(hover * 100)}% · {label(hover)}
            </div>
          </>
        )}
      </div>
      <div className="an-legend-labels">
        <span>low load</span>
        <span className={`an-legend-peak${peakFrac > 1 ? ' over' : ''}`}>
          {material
            ? 'relative stress'
            : <>peak {Math.round(peakFrac * 100)}% {peakFrac > 1 ? '· OVER LIMIT ⚠' : unit}</>}
        </span>
        <span>high load</span>
      </div>
    </div>
  );
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
  const analysisMode  = useEditorStore((s) => s.analysisMode);
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

  const { mass, loads } = useMemo(() => {
    try {
      const fk = computeFK(doc);
      const c  = centerOfMass(doc, fk);
      const l  = jointLoads(doc, fk);
      return { mass: c.mass, loads: l };
    } catch (e) {
      console.error('[AnalysisPanel] computation error:', e);
      return { mass: 0, loads: new Map() };
    }
  }, [doc]);

  // Per-joint motor load fraction (|torque| ÷ limit) — the one metric that matters
  // (the servo, not the metal, is the limiter). Used by the table + peak pointer.
  const loadFrac = (j: any) => {
    const act = getJointActuator(doc, j);
    const limit = act.torqueLimit ?? getMotorSpec(act.motorType).stallTorque;
    return limit > 0 ? Math.abs(loads.get(j.id)?.torque ?? 0) / limit : 0; // raw, may exceed 1
  };

  const joints = Object.values(doc.joints);

  // Current peak load fraction (max |torque| ÷ that joint's limit) — drives the
  // live pointer on the colour bar, so it slides toward "high load" as you pose.
  // Overlay readout for the active mode. motor/current → peak % of limit/stall.
  // material → relative distribution (pointer sits at the most-stressed link) plus
  // the real structural safety factor (Min FoS).
  const overlay = useMemo(() => {
    if (analysisMode === 'material') {
      const mech = bodyMechanics(doc, computeFK(doc));
      let peakVM = 0, minFos = Infinity;
      for (const [, m] of mech) {
        if (m.vonMises > peakVM) peakVM = m.vonMises;
        if (isFinite(m.fos) && m.fos < minFos) minFos = m.fos;
      }
      return { frac: peakVM > 1e-9 ? 1 : 0, minFos, material: true };
    }
    let mx = 0;
    for (const j of joints) {
      const act = getJointActuator(doc, j);
      if (analysisMode === 'current') {
        const limit = getMotorSpec(act.motorType).stallCurrent || 1;
        mx = Math.max(mx, Math.abs(loads.get(j.id)?.current ?? 0) / limit);
      } else {
        const limit = act.torqueLimit ?? getMotorSpec(act.motorType).stallTorque;
        mx = Math.max(mx, Math.abs(loads.get(j.id)?.torque ?? 0) / limit);
      }
    }
    return { frac: mx, minFos: Infinity, material: false };
  }, [analysisMode, joints, loads, doc]);
  const peakFrac = overlay.frac;

  const modeInfo = {
    motor:    { stat: 'Peak motor load', unit: 'of limit' },
    material: { stat: 'Min FoS (structural)', unit: 'relative' },
    current:  { stat: 'Peak current', unit: 'of stall' },
  }[analysisMode];

  // Motor names for the footer.
  const motorSet = useMemo(() => {
    const ms = new Set<string>();
    for (const j of joints) ms.add(getMotorSpec((j as any).meta?.motorType).name);
    return ms;
  }, [joints]);

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

        <RigidSelectionPanel />

        <div className="an-stats">
          <div><span>Total mass</span><strong>{mass.toFixed(2)} kg</strong></div>
          <div>
            <span>{modeInfo.stat}</span>
            {overlay.material ? (
              <strong className={!isFinite(overlay.minFos) || overlay.minFos > 100 ? 'an-fos-ok' : overlay.minFos > 1.5 ? 'an-fos-warn' : 'an-fos-crit'}>
                {!isFinite(overlay.minFos) || overlay.minFos > 100 ? '∞ (safe)' : `${overlay.minFos.toFixed(1)}×`}
              </strong>
            ) : (
              <strong className={loadClass(peakFrac)}>
                {Math.round(peakFrac * 100)}% {peakFrac > 1 ? '⚠ over limit' : modeInfo.unit}
              </strong>
            )}
          </div>
        </div>

        {show && <LegendBar peakFrac={peakFrac} unit={modeInfo.unit} material={overlay.material} />}

        {joints.length === 0 && <div className="an-empty">Add joints to see holding torque & current.</div>}
        {joints.length > 0 && (
          <table className="an-table">
            <thead>
              <tr>
                <th>Joint</th>
                <th title="Current joint angle (or travel for prismatic)">Angle</th>
                <th title="Static gravity-holding torque">τ (N·m)</th>
                <th title="Estimated winding current">I (A)</th>
                <th title="Motor load = |torque| ÷ this joint's torque limit">Load</th>
                <th title="Winding temperature">T°</th>
              </tr>
            </thead>
            <tbody>
              {joints.map((j) => {
                const l     = loads.get(j.id) ?? { torque: 0, current: 0, overload: false, motorName: '' };
                const motor = getMotorSpec((j as any).meta?.motorType);
                const load  = loadFrac(j); // motor load fraction (0..1)

                // Live winding temperature from the module-level thermal state
                const tempC = getTemp(j.id);
                const thCls = thermalClass(tempC, motor.maxTemp);
                const tFrac = tempC / motor.maxTemp;

                return (
                  <tr key={j.id} className={l.overload ? 'an-over' : ''}>
                    <td>
                      <div>{j.name}</div>
                      <div className="an-motor-tag">
                        {motor.name}
                        {(doc.jointProfiles ?? {})[j.profileId ?? '']?.name
                          ? ` · ${(doc.jointProfiles ?? {})[j.profileId ?? ''].name}`
                          : ''}
                      </div>
                    </td>
                    <td><AngleInput joint={j} /></td>
                    <td>{l.torque.toFixed(2)}{l.overload ? ' ⚠' : ''}</td>
                    <td>{l.current.toFixed(2)}</td>
                    <td className={loadClass(load)}>{Math.round(load * 100)}%</td>
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
          Load = motor torque ÷ its limit: &lt;60% ok · 60–85% high · &gt;85% near stall
        </div>
      </div>
    </div>
  );
}
