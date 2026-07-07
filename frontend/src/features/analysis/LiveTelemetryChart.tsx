/**
 * LiveTelemetryChart — real-time multi-metric strip chart (Phase 8 "live plots").
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useModelStore } from '@/state/modelStore';
import { useHardwareStore } from '@/state/hardwareStore';
import { useIntegrationStore } from '@/state/integrationStore';
import { useSelectionStore } from '@/state/selectionStore';
import { computeFK } from '@/kinematics/modelFK';
import { jointLoads, ST3215 } from '@/kinematics/analysis';
import { extraContactTorques } from '@/viewport/BoxWorld';
import { getMotorSpec } from '@/kinematics/motorDatabase';
import { updateThermal, getTemp } from '@/kinematics/thermalModel';

const RAD2DEG  = 180 / Math.PI;
const SAMPLE_MS = 50;
const WINDOW    = 600;
const ANGULAR   = new Set(['revolute', 'continuous']);
const SVG_NS    = 'http://www.w3.org/2000/svg';
const LABEL_H   = 18;
const LABEL_PAD = 3; // min gap between spread labels
const LABEL_OFF = 10; // horizontal offset from cursor to label

// Categorical palette validated for the dark chart surface (CVD-safe, worst
// adjacent ΔE 27.6; see dataviz validator). Ordered so no two adjacent series
// clash under colour-blindness.
const SERIES = [
  { key: 'velocity',     label: 'Velocity',     unit: '°/s',  color: '#3987e5' },
  { key: 'acceleration', label: 'Acceleration', unit: '°/s²', color: '#c98500' },
  { key: 'torque',       label: 'Torque',       unit: 'N·m',  color: '#e66767' },
  { key: 'current',      label: 'Current',      unit: 'A',    color: '#9085e9' },
  { key: 'stress',       label: 'Stress',       unit: '%',    color: '#199e70' },
  { key: 'temperature',  label: 'Temperature',  unit: '°C',   color: '#d95926' },
] as const;

type SeriesKey = typeof SERIES[number]['key'];

const signedMax = (arr: number[]) => arr.reduce((m, v) => (Math.abs(v) > Math.abs(m) ? v : m), 0);

/** Spread y-positions apart so labels don't overlap. Mutates the `sy` field. */
function spreadLabels(items: { yPx: number; sy: number }[], chartH: number) {
  // sort by actual position ascending
  items.sort((a, b) => a.yPx - b.yPx);
  // init spread y = data y (centred on label)
  for (const it of items) it.sy = it.yPx - LABEL_H / 2;
  // forward pass: push down
  for (let i = 1; i < items.length; i++) {
    const need = items[i - 1].sy + LABEL_H + LABEL_PAD;
    if (items[i].sy < need) items[i].sy = need;
  }
  // clamp bottom then push up
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].sy + LABEL_H > chartH) items[i].sy = chartH - LABEL_H;
    if (i > 0 && items[i - 1].sy + LABEL_H + LABEL_PAD > items[i].sy)
      items[i - 1].sy = items[i].sy - LABEL_H - LABEL_PAD;
  }
  // clamp top
  for (const it of items) if (it.sy < 0) it.sy = 0;
}

/** Estimate px width of a monospace label string. */
function labelWidth(text: string) { return text.length * 6.5 + 22; } // +room for colour dot

export default function LiveTelemetryChart() {
  const hostRef  = useRef<HTMLDivElement | null>(null);
  const plotRef  = useRef<any>(null);
  const dataRef  = useRef<any>(null);
  const realRef  = useRef<any>(null);
  const t0Ref    = useRef(performance.now());
  const prevRef  = useRef<any>(null);
  const svgRef   = useRef<SVGSVGElement | null>(null); // overlay SVG in plot.over

  const [enabled, setEnabled] = useState<Record<SeriesKey, boolean>>({
    velocity:     false,
    acceleration: false,
    torque:       true,
    current:      true,
    stress:       true,
    temperature:  false,
  });
  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // min/max over the current history window, updated at 1 Hz
  const [minMax, setMinMax] = useState<Record<SeriesKey, { min: number; max: number }>>({} as any);
  const tickRef = useRef(0);

  const doc = useModelStore((s) => s.doc);
  const jointList = useMemo(
    () => Object.values(doc.joints).map((j) => ({ id: j.id, angular: ANGULAR.has(j.type) })),
    [doc.joints],
  );
  const selJoint = useSelectionStore((s) => (s.kind === 'joint' ? s.selectedId : null));
  const selName  = selJoint ? doc.joints[selJoint]?.name : null;
  const sig      = `${jointList.map((j) => j.id).join('|')}#${selJoint ?? ''}`;

  const connected = useHardwareStore((s) => s.status === 'connected');
  const [mode, setMode] = useState<'virtual' | 'real'>('virtual');
  const streamOn = mode === 'virtual' ? true : connected;

  // Build uPlot once per joint set.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !jointList.length) return undefined;

    dataRef.current = [[], ...SERIES.map(() => [])];
    realRef.current = [[], ...SERIES.map(() => [])];
    prevRef.current = null;
    t0Ref.current   = performance.now();

    const CHART_H = 200;

    // Pull theme-aware ink/grid from CSS so the chart matches light & dark modes.
    // Concrete colours (canvas can't resolve CSS vars / color-mix / oklch); a mid
    // grey reads on both light and dark surfaces.
    const axisInk = '#8a8f98';
    const gridCol = 'rgba(128,128,128,0.15)';
    const AX_FONT = '10px ui-monospace, monospace';

    const plot = new uPlot({
      width:  host.clientWidth || 280,
      height: CHART_H,
      // Normalised to each series' PHYSICAL LIMIT (motor stall torque/current,
      // thermal max, no-load speed) → 100% = at the rated limit. Overloads read
      // ABOVE 100% intentionally, so the top auto-expands past the 100% gridline.
      scales: {
        x: { time: false },
        y: { auto: true, range: (_u: any, _min: number, max: number) => [0, Math.max(1.06, (max ?? 1) * 1.08)] },
      },
      legend: { show: false },
      cursor: { drag: { x: true, y: false }, points: { show: false } },
      series: [
        { label: 't (s)' },
        ...SERIES.map((s) => ({
          label:  s.label,
          stroke: s.color,
          width:  2,
          show:   enabledRef.current[s.key],
          points: { show: false },
        })),
      ],
      axes: [
        {
          stroke: axisInk,
          font: AX_FONT,
          size: 26,
          grid: { stroke: gridCol, width: 1, dash: [3, 4] },
          ticks: { show: false },
        },
        {
          show: true,
          stroke: axisInk,
          font: AX_FONT,
          size: 30,
          splits: () => [0, 0.5, 1],
          values: (_u: any, splits: number[]) => splits.map((v) => `${Math.round(v * 100)}%`),
          grid: { stroke: gridCol, width: 1, dash: [3, 4] },
          ticks: { show: false },
        },
      ],
      hooks: {
        setCursor: [(u: any) => {
          const svg = svgRef.current;
          if (!svg) return;
          // clear previous drawings
          while (svg.firstChild) svg.removeChild(svg.lastChild!);

          const { left, idx } = u.cursor;
          if (idx == null || left == null || left < 0) return;

          const overW = (u.over as HTMLElement).clientWidth;

          // Build items: one per enabled+visible series
          const raw: { s: typeof SERIES[number]; r: number; yPx: number; sy: number }[] = [];
          for (let i = 0; i < SERIES.length; i++) {
            const s = SERIES[i];
            if (!enabledRef.current[s.key]) continue;
            const r = realRef.current?.[i + 1]?.[idx];
            if (r == null) continue;
            const normVal = dataRef.current?.[i + 1]?.[idx];
            if (normVal == null) continue;
            const yPx = u.valToPos(normVal, 'y');
            raw.push({ s, r, yPx, sy: 0 });
          }
          if (!raw.length) return;

          spreadLabels(raw, CHART_H);

          // Decide label side: right unless cursor is in the right 35%
          const goLeft = left > overW * 0.65;

          // vertical cursor line
          const vline = document.createElementNS(SVG_NS, 'line');
          vline.setAttribute('x1', String(left)); vline.setAttribute('y1', '0');
          vline.setAttribute('x2', String(left)); vline.setAttribute('y2', String(CHART_H));
          vline.setAttribute('stroke', 'rgba(200,200,200,0.28)');
          vline.setAttribute('stroke-width', '1');
          vline.setAttribute('stroke-dasharray', '3 3');
          svg.appendChild(vline);

          for (const { s, r, yPx, sy } of raw) {
            const txt   = `${r.toFixed(2)} ${s.unit}`;
            const boxW  = labelWidth(txt);
            const boxX  = goLeft ? left - LABEL_OFF - boxW : left + LABEL_OFF;
            const midY  = sy + LABEL_H / 2;

            // dot on the line
            const dot = document.createElementNS(SVG_NS, 'circle');
            dot.setAttribute('cx', String(left));
            dot.setAttribute('cy', String(yPx));
            dot.setAttribute('r', '3');
            dot.setAttribute('fill', s.color);
            dot.setAttribute('stroke', '#111');
            dot.setAttribute('stroke-width', '1');
            svg.appendChild(dot);

            // angled connector from dot → label mid-edge
            const lineEndX = goLeft ? boxX + boxW : boxX;
            const conn = document.createElementNS(SVG_NS, 'line');
            conn.setAttribute('x1', String(left));
            conn.setAttribute('y1', String(yPx));
            conn.setAttribute('x2', String(lineEndX));
            conn.setAttribute('y2', String(midY));
            conn.setAttribute('stroke', s.color);
            conn.setAttribute('stroke-width', '1');
            conn.setAttribute('stroke-opacity', '0.7');
            svg.appendChild(conn);

            // label box
            const rect = document.createElementNS(SVG_NS, 'rect');
            rect.setAttribute('x', String(boxX));
            rect.setAttribute('y', String(sy));
            rect.setAttribute('width', String(boxW));
            rect.setAttribute('height', String(LABEL_H));
            rect.setAttribute('rx', '5');
            rect.setAttribute('fill', 'rgba(16,18,24,0.92)');
            rect.setAttribute('stroke', s.color);
            rect.setAttribute('stroke-width', '1.5');
            svg.appendChild(rect);

            // colour dot inside the label (identity) + value text in near-white ink
            const chip = document.createElementNS(SVG_NS, 'circle');
            chip.setAttribute('cx', String(boxX + 8));
            chip.setAttribute('cy', String(midY));
            chip.setAttribute('r', '2.6');
            chip.setAttribute('fill', s.color);
            svg.appendChild(chip);

            const text = document.createElementNS(SVG_NS, 'text');
            text.setAttribute('x', String(boxX + 15));
            text.setAttribute('y', String(sy + 12.5));
            text.setAttribute('fill', '#f2f3f6');
            text.setAttribute('font-size', '10');
            text.setAttribute('font-family', 'ui-monospace, monospace');
            text.setAttribute('font-weight', '600');
            text.textContent = txt;
            svg.appendChild(text);
          }
        }],
      },
    }, dataRef.current, host);
    plotRef.current = plot;

    // Inject SVG overlay directly into uPlot's interaction layer
    const svgEl = document.createElementNS(SVG_NS, 'svg');
    svgEl.setAttribute('style', 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible');
    plot.over.appendChild(svgEl);
    svgRef.current = svgEl as unknown as SVGSVGElement;

    const ro = new ResizeObserver(() => plot.setSize({ width: host.clientWidth || 280, height: CHART_H }));
    ro.observe(host);
    return () => {
      ro.disconnect();
      plot.destroy();
      plotRef.current = null;
      svgRef.current  = null;
    };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sampling loop
  useEffect(() => {
    if (!streamOn || !jointList.length) return undefined;
    const id = setInterval(() => {
      const data = dataRef.current, real = realRef.current, plot = plotRef.current;
      if (!data || !real || !plot) return;
      const d      = useModelStore.getState().doc;
      const joints = d.joints;
      const now    = performance.now();
      const t      = (now - t0Ref.current) / 1000;
      const fk     = computeFK(d);
      const loads  = jointLoads(d, fk);
      const set    = selJoint && joints[selJoint]
        ? [{ id: selJoint, angular: ANGULAR.has(joints[selJoint].type) }]
        : jointList;
      const posArr = set.map((j) => {
        const v = joints[j.id]?.state?.value ?? 0;
        return j.angular ? v * RAD2DEG : v;
      });
      const torArr = set.map((j) => loads.get(j.id)?.torque ?? 0);
      const pos    = signedMax(posArr);
      const prev   = prevRef.current;
      const dt     = prev ? Math.max(1e-3, (now - prev.t) / 1000) : 0;
      const vel    = prev ? (pos - prev.pos) / dt : 0;
      const acc    = prev ? (vel - prev.vel) / dt : 0;
      prevRef.current = { t: now, pos, vel };

      // Peak single-servo — base + impact torque combined per joint, then max across joints.
      // Torque uses per-joint motor spec for correct stall current and Kt.
      let tor = 0, cur = 0, peakStall = ST3215.stallTorque;
      let gov = getMotorSpec(null); // governing motor = the peak-torque joint's spec
      for (const j of set) {
        const motor    = getMotorSpec((d.joints[j.id] as any)?.meta?.motorType);
        const baseTor  = Math.abs(loads.get(j.id)?.torque ?? 0);
        const impact   = Math.abs(extraContactTorques.get(j.id) ?? 0);
        const totalTor = baseTor + impact;
        const totalCur = motor.noLoadCurrent + totalTor / motor.Kt;
        if (totalTor > tor) { tor = totalTor; peakStall = motor.stallTorque; gov = motor; }
        if (totalCur > cur)   cur = totalCur;

        // Advance thermal model with current draw
        updateThermal(j.id, motor, Math.min(totalCur, motor.stallCurrent), now);
      }
      tor = Math.max(0, tor);
      cur = Math.max(0, Math.min(cur, peakStall / (ST3215.Kt / ST3215.stallCurrent)));

      // Stress = torque as a fraction of stall, UNCLAMPED so an overload shows >100%.
      const stress = peakStall > 0 ? (tor / peakStall) * 100 : 0;

      if (mode === 'real') {
        cur = (useIntegrationStore.getState().totalCurrentMA ?? 0) / 1000;
        tor = cur * (ST3215.stallTorque / ST3215.stallCurrent);
      }

      // Peak winding temperature across active joints
      const temperature = Math.max(25, ...set.map((j) => getTemp(j.id)));

      const vals = [Math.abs(vel), Math.abs(acc), Math.abs(tor), Math.abs(cur), stress, temperature];

      real[0].push(t);
      for (let i = 0; i < SERIES.length; i++) real[i + 1].push(vals[i]);
      if (real[0].length > WINDOW) for (const col of real) col.shift();

      // Per-series denominator = the physical LIMIT (1.0 = at the rating). null =
      // no hard limit (acceleration) → fall back to the rolling-window peak so it
      // still shows relative shape. Values are NOT clamped: an overload reads >1.0.
      const denom: (number | null)[] = [
        Math.max(1e-6, gov.maxSpeed * RAD2DEG), // velocity     °/s  (no-load speed limit)
        null,                                    // acceleration      (no rated limit)
        Math.max(1e-6, gov.stallTorque),         // torque       N·m  (stall)
        Math.max(1e-6, gov.stallCurrent),        // current      A    (stall)
        100,                                     // stress       %    (already % of stall)
        Math.max(1e-6, gov.maxTemp),             // temperature  °C   (winding max)
      ];
      data[0] = real[0];
      for (let i = 0; i < SERIES.length; i++) {
        const col = real[i + 1];
        let d = denom[i];
        if (d == null) { let peak = 1e-9; for (const v of col) peak = Math.max(peak, Math.abs(v)); d = peak; }
        data[i + 1] = col.map((v: number) => Math.abs(v) / (d as number));
      }
      plot.setData(data);

      // Update min/max every ~1 s (every 20 samples)
      tickRef.current = (tickRef.current + 1) % 20;
      if (tickRef.current === 0) {
        const mm: Record<string, { min: number; max: number }> = {};
        for (let i = 0; i < SERIES.length; i++) {
          const col = real[i + 1];
          if (!col.length) continue;
          let mn = Infinity, mx = -Infinity;
          for (const v of col) { if (v < mn) mn = v; if (v > mx) mx = v; }
          mm[SERIES[i].key] = { min: mn, max: mx };
        }
        setMinMax(mm as any);
      }
    }, SAMPLE_MS);
    return () => clearInterval(id);
  }, [streamOn, sig, selJoint, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: SeriesKey) => {
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
        <span className="an-chart-title">{selName ? `${selName} · % of limit` : 'Peak servo · % of limit'}</span>
        <select className="an-chart-mode" value={mode} onChange={(e) => setMode(e.target.value as 'virtual' | 'real')}
          title="Virtual = computed from the model · Real = measured from hardware">
          <option value="virtual">Virtual</option>
          <option value="real">Real{connected ? '' : ' (offline)'}</option>
        </select>
      </div>
      <div className="an-chart-wrap">
        <div className="an-chart-host" ref={hostRef} />
        {!streamOn && (
          <div className="an-chart-idle an-chart-overlay">
            Real mode needs hardware.<br />
            Connect a board (Motor Control) or switch to Virtual.
          </div>
        )}
      </div>

      {/* Toggle checkboxes */}
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

      {/* Min/max summary — one row below all checkboxes */}
      {Object.keys(minMax).length > 0 && (
        <div className="an-minmax">
          {SERIES.filter((s) => enabled[s.key] && minMax[s.key]).map((s) => {
            const { min, max } = minMax[s.key];
            return (
              <span key={s.key} className="an-minmax-item" style={{ color: s.color }}>
                <span className="an-minmax-label">{s.label}</span>
                <span className="an-minmax-range">
                  {min.toFixed(2)}–{max.toFixed(2)}
                  <span className="an-minmax-unit">{s.unit}</span>
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
