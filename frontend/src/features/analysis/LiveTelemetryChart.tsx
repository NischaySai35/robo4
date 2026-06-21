/**
 * LiveTelemetryChart — real-time multi-metric strip chart (Phase 8 "live plots").
 *
 * Unlike a single-metric view, this overlays EVERY metric at once — position,
 * velocity, acceleration, torque, current, stress — as separate lines. Because the
 * units are wildly different, each line is auto-normalised to its own running
 * peak (so you read deviations/shape, not absolute scale); the Y axis is therefore
 * meaningless and hidden. Hovering shows each line's REAL value (with its unit) in
 * the legend. A checkbox list below toggles any line on/off.
 *
 * Values are aggregated across the model's joints as the worst-case (largest
 * magnitude) joint, so it stays a compact overview for any robot. It streams only
 * while a real source drives the joints (physics, hardware, or animation).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useModelStore } from '@/state/modelStore';
import { useEditorStore } from '@/state/editorStore';
import { useHardwareStore } from '@/state/hardwareStore';
import { useAnimationStore } from '@/state/animationStore';
import { useSelectionStore } from '@/state/selectionStore';
import { computeFK } from '@/kinematics/modelFK';
import { jointLoads, ST3215 } from '@/kinematics/analysis';

const RAD2DEG = 180 / Math.PI;
const SAMPLE_MS = 50;   // 20 Hz capture
const WINDOW = 600;     // ~30 s of history
const ANGULAR = new Set(['revolute', 'continuous']);

// The overlaid metrics. `unit` is shown on hover; `color` is the line colour.
const SERIES = [
  { key: 'velocity',     label: 'Velocity',     unit: '°/s',  color: '#3b82f6' },
  { key: 'acceleration', label: 'Acceleration', unit: '°/s²', color: '#22c55e' },
  { key: 'torque',       label: 'Torque',       unit: 'N·m',  color: '#e11d48' },
  { key: 'current',      label: 'Current',      unit: 'A',    color: '#a855f7' },
  { key: 'stress',       label: 'Stress',       unit: '%',    color: '#06b6d4' },
] as const;

const signedMax = (arr: number[]) => arr.reduce((m, v) => (Math.abs(v) > Math.abs(m) ? v : m), 0);

export default function LiveTelemetryChart() {
  const hostRef = useRef<any>(null);
  const plotRef = useRef<any>(null);
  const dataRef = useRef<any>(null);   // [xs, …normalised series]  (what uPlot draws)
  const realRef = useRef<any>(null);   // [xs, …real series]        (what hover shows)
  const t0Ref = useRef(performance.now());
  const prevRef = useRef<any>(null);   // { t, pos, vel } for differencing
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(SERIES.map((s) => [s.key, true])),
  );

  const doc = useModelStore((s) => s.doc);
  const jointList = useMemo(
    () => Object.values(doc.joints).map((j) => ({ id: j.id, angular: ANGULAR.has(j.type) })),
    [doc.joints],
  );
  // Selected joint → chart shows just that joint; nothing selected → totals.
  const selJoint = useSelectionStore((s) => (s.kind === 'joint' ? s.selectedId : null));
  const selName = selJoint ? doc.joints[selJoint]?.name : null;
  const sig = `${jointList.map((j) => j.id).join('|')}#${selJoint ?? ''}`;

  const simRunning = useEditorStore((s) => s.simRunning);
  const connected = useHardwareStore((s) => s.status === 'connected');
  const playing = useAnimationStore((s) => s.playing);
  const hasSource = simRunning || connected || playing;

  // Build uPlot once per joint set. Series visibility is toggled live (no rebuild).
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !jointList.length) return undefined;

    dataRef.current = [[], ...SERIES.map(() => [])];
    realRef.current = [[], ...SERIES.map(() => [])];
    prevRef.current = null;
    t0Ref.current = performance.now();

    const plot = new uPlot({
      width: host.clientWidth || 280,
      height: 200,
      scales: { x: { time: false }, y: { auto: true } },
      legend: { show: true, live: true },
      cursor: { drag: { x: true, y: false } },
      series: [
        { label: 't (s)', value: (_u, v) => (v == null ? '' : v.toFixed(1)) },
        ...SERIES.map((s, i) => ({
          label: s.label,
          stroke: s.color,
          width: 1.6,
          show: enabled[s.key],
          points: { show: false },
          // Hover/legend shows the REAL value (read from realRef by data index).
          value: (_u: any, _v: any, _si: any, idx: any) => {
            const r = realRef.current?.[i + 1]?.[idx];
            return r == null ? '' : `${r.toFixed(2)} ${s.unit}`;
          },
        })),
      ],
      axes: [
        { stroke: '#888', grid: { stroke: 'rgba(128,128,128,0.15)' }, ticks: { stroke: 'rgba(128,128,128,0.2)' } },
        // Y is normalised → hide ticks/labels (the legend carries real values).
        { show: false },
      ],
    }, dataRef.current, host);
    plotRef.current = plot;

    const ro = new ResizeObserver(() => plot.setSize({ width: host.clientWidth || 280, height: 200 }));
    ro.observe(host);
    return () => { ro.disconnect(); plot.destroy(); plotRef.current = null; };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sampling loop — reads joints + computes all metrics, normalises for drawing.
  useEffect(() => {
    if (!hasSource || !jointList.length) return undefined;
    const id = setInterval(() => {
      const data = dataRef.current, real = realRef.current, plot = plotRef.current;
      if (!data || !real || !plot) return;
      const d = useModelStore.getState().doc;
      const joints = d.joints;
      const now = performance.now();
      const t = (now - t0Ref.current) / 1000;

      const fk = computeFK(d);
      const loads = jointLoads(d, fk);
      // Selected joint → just that joint; otherwise aggregate over ALL joints
      // (velocity/accel = worst-case joint; torque/current = total; stress = peak).
      const set = selJoint && joints[selJoint]
        ? [{ id: selJoint, angular: ANGULAR.has(joints[selJoint].type) }]
        : jointList;
      const posArr = set.map((j) => {
        const v = joints[j.id]?.state?.value ?? 0;
        return j.angular ? v * RAD2DEG : v;
      });
      const torArr = set.map((j) => loads.get(j.id)?.torque ?? 0);
      const pos = signedMax(posArr);
      const prev = prevRef.current;
      const dt = prev ? Math.max(1e-3, (now - prev.t) / 1000) : 0;
      const vel = prev ? (pos - prev.pos) / dt : 0;
      const acc = prev ? (vel - prev.vel) / dt : 0;
      prevRef.current = { t: now, pos, vel };

      const tor = torArr.reduce((a, b) => a + b, 0);                       // total torque
      const cur = set.reduce((a, j) => a + (loads.get(j.id)?.current ?? 0), 0); // total current
      const stress = Math.min(1, Math.max(0, ...torArr.map(Math.abs)) / ST3215.stallTorque) * 100;
      const vals = [vel, acc, tor, cur, stress];

      real[0].push(t);
      for (let i = 0; i < SERIES.length; i++) real[i + 1].push(vals[i]);
      if (real[0].length > WINDOW) for (const col of real) col.shift();

      // Normalise each series to its own running peak so all overlay legibly.
      data[0] = real[0];
      for (let i = 0; i < SERIES.length; i++) {
        const col = real[i + 1];
        let peak = 1e-9;
        for (const v of col) peak = Math.max(peak, Math.abs(v));
        data[i + 1] = col.map((v: number) => v / peak);
      }
      plot.setData(data);
    }, SAMPLE_MS);
    return () => clearInterval(id);
  }, [hasSource, sig, selJoint]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: string) => {
    const next = !enabled[key];
    setEnabled((e) => ({ ...e, [key]: next }));
    const idx = SERIES.findIndex((s) => s.key === key);
    plotRef.current?.setSeries(idx + 1, { show: next });
  };

  if (!jointList.length) {
    return <div className="an-chart-idle">Add joints to plot live telemetry.</div>;
  }

  return (
    <div className="an-chart">
      <div className="an-chart-head">
        <span className="an-chart-title">{selName ? `${selName} · normalised` : 'All joints · total (normalised)'}</span>
      </div>
      <div className="an-chart-wrap">
        <div className="an-chart-host" ref={hostRef} />
        {!hasSource && (
          <div className="an-chart-idle an-chart-overlay">
            Idle — no live source.<br />
            Start physics, connect hardware, or play an animation.
          </div>
        )}
      </div>

      <div className="an-tlist">
        {SERIES.map((s) => (
          <label key={s.key} className="an-titem">
            <input type="checkbox" checked={enabled[s.key]} onChange={() => toggle(s.key)} />
            <span className="an-tswatch" style={{ background: s.color }} />
            <span className="an-tlabel">{s.label}</span>
            <span className="an-tunit">{s.unit}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
