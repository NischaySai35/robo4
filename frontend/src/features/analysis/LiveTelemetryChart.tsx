/**
 * LiveTelemetryChart — real-time uPlot strip chart of per-joint telemetry
 * (Phase 8 "live data plots").
 *
 * Series come from the actual model joints (modelStore.doc.joints), using their
 * real names — NOT any fixed/legacy arm. The model stores only each joint's
 * position (state.value); velocity and acceleration are derived here by finite
 * differencing over time, so the chart is fully generic for any robot.
 *
 * It streams ONLY while a real data source is active — live physics preview,
 * connected hardware, or animation playback. When nothing is driving the joints
 * it sits idle (no fake stream) and says so.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useModelStore } from '@/state/modelStore';
import { useEditorStore } from '@/state/editorStore';
import { useHardwareStore } from '@/state/hardwareStore';
import { useAnimationStore } from '@/state/animationStore';

const RAD2DEG = 180 / Math.PI;
const SAMPLE_MS = 50;      // 20 Hz capture
const WINDOW = 600;        // ~30 s of history

const ANGULAR = new Set(['revolute', 'continuous']);

const METRICS = {
  position:     { label: 'Position (° / m)',          unit: 'pos' },
  velocity:     { label: 'Velocity (°/s / m/s)',      unit: 'vel' },
  acceleration: { label: 'Acceleration (°/s² / m/s²)', unit: 'acc' },
};

const COLORS = ['#ff8800', '#3b82f6', '#22c55e', '#e11d48', '#a855f7', '#06b6d4', '#eab308', '#14b8a6'];

export default function LiveTelemetryChart() {
  const [metric, setMetric] = useState('position');
  const hostRef = useRef(null);
  const plotRef = useRef(null);
  const dataRef = useRef(null);          // [xs, y0, y1, …]
  const t0Ref = useRef(performance.now());
  const prevRef = useRef(null);          // { t, pos[], vel[] } for differencing

  // Generic joint list straight from the model — id + display name + angular?.
  const doc = useModelStore((s) => s.doc);
  const jointList = useMemo(
    () => Object.values(doc.joints).map((j) => ({ id: j.id, name: j.name, angular: ANGULAR.has(j.type) })),
    [doc.joints],
  );
  // Stable identity so the plot only rebuilds when the joint set really changes.
  const sig = jointList.map((j) => `${j.id}:${j.name}`).join('|');

  // A "live source" = something actually moving the joints.
  const simRunning = useEditorStore((s) => s.simRunning);
  const connected = useHardwareStore((s) => s.status === 'connected');
  const playing = useAnimationStore((s) => s.playing);
  const hasSource = simRunning || connected || playing;

  // (Re)build uPlot when the joint set or metric changes (uPlot can't restructure
  // series in place).
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !jointList.length) return undefined;

    dataRef.current = [[], ...jointList.map(() => [])];
    prevRef.current = null;
    t0Ref.current = performance.now();

    const plot = new uPlot({
      width: host.clientWidth || 280,
      height: 200,
      scales: { x: { time: false } },
      legend: { show: true, live: true },
      cursor: { drag: { x: true, y: false } },
      series: [
        { label: 't (s)', value: (_u, v) => (v == null ? '' : v.toFixed(1)) },
        ...jointList.map((j, i) => ({
          label: j.name,
          stroke: COLORS[i % COLORS.length],
          width: 1.6,
          points: { show: false },
          value: (_u, v) => (v == null ? '' : v.toFixed(2)),
        })),
      ],
      axes: [
        { stroke: '#888', grid: { stroke: 'rgba(128,128,128,0.15)' }, ticks: { stroke: 'rgba(128,128,128,0.2)' } },
        { stroke: '#888', grid: { stroke: 'rgba(128,128,128,0.15)' }, ticks: { stroke: 'rgba(128,128,128,0.2)' }, size: 50 },
      ],
    }, dataRef.current, host);
    plotRef.current = plot;

    const ro = new ResizeObserver(() => plot.setSize({ width: host.clientWidth || 280, height: 200 }));
    ro.observe(host);
    return () => { ro.disconnect(); plot.destroy(); plotRef.current = null; };
  }, [sig, metric]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sampling loop — only while a real source is driving the joints. Reads each
  // joint's position from the model and derives velocity/acceleration over time.
  useEffect(() => {
    if (!hasSource || !jointList.length) return undefined;
    const want = METRICS[metric].unit;
    const id = setInterval(() => {
      const data = dataRef.current, plot = plotRef.current;
      if (!data || !plot) return;
      const joints = useModelStore.getState().doc.joints;
      const now = performance.now();
      const t = (now - t0Ref.current) / 1000;

      const pos = jointList.map((j) => {
        const v = joints[j.id]?.state?.value ?? 0;
        return j.angular ? v * RAD2DEG : v;
      });
      const prev = prevRef.current;
      const dt = prev ? Math.max(1e-3, (now - prev.t) / 1000) : 0;
      const vel = pos.map((p, i) => (prev ? (p - prev.pos[i]) / dt : 0));
      const acc = vel.map((vv, i) => (prev ? (vv - prev.vel[i]) / dt : 0));
      prevRef.current = { t: now, pos, vel };

      const row = want === 'vel' ? vel : want === 'acc' ? acc : pos;
      data[0].push(t);
      for (let i = 0; i < jointList.length; i++) data[i + 1].push(row[i]);
      if (data[0].length > WINDOW) for (const col of data) col.shift();
      plot.setData(data);
    }, SAMPLE_MS);
    return () => clearInterval(id);
  }, [hasSource, metric, sig]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!jointList.length) {
    return <div className="an-chart-idle">Add joints to plot live telemetry.</div>;
  }

  return (
    <div className="an-chart">
      <div className="an-chart-head">
        <span className="an-chart-title">{METRICS[metric].label}</span>
        <select value={metric} onChange={(e) => setMetric(e.target.value)}>
          <option value="position">Position</option>
          <option value="velocity">Velocity</option>
          <option value="acceleration">Acceleration</option>
        </select>
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
    </div>
  );
}