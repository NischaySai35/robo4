/**
 * RuntimePanel — observability surface for the native runtime (Track 1).
 *
 * Foxglove/rqt in one panel: a live Topics inspector (Hz/count/subscribers + last
 * message + a live plot of its numeric fields), the TF transform tree, a record/
 * playback transport (the .nischaybag rosbag analog), and a diagnostics summary.
 * Everything here READS the bus/tf/recorder/player — it owns no robot state.
 */
import { NativeSelect } from '@/components/ui/input';
import { TabBar } from '@/components/ui/tab-bar';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './RuntimePanel.css';
import { bus, type TopicStats, type Envelope } from '@/runtime/messageBus';
import { tf } from '@/runtime/tf';
import { recorder, player } from '@/runtime/recorder';
import { clock } from '@/runtime/clock';
import { Topics } from '@/runtime/messageBus';
import { downloadBlob } from '@/core/serialization/fileIO';
import type { DiagnosticsMsg } from '@/state/runtimeBridge';
import type { Bag } from '@/runtime/recorder';
import { parseTrace, type Trace } from '@/runtime/traceFile';
import RtCoreReadout from '@/features/runtime/RtCoreReadout';

type Tab = 'topics' | 'tf' | 'nodes' | 'health' | 'record' | 'trace' | 'rtcore';

// ── numeric leaf flattening (for plotting any topic's message) ────────────────
function flattenNumeric(obj: unknown, prefix = '', out: Record<string, number> = {}, depth = 0): Record<string, number> {
  if (depth > 4 || obj == null) return out;
  if (typeof obj === 'number') { out[prefix || 'value'] = obj; return out; }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => { if (typeof v === 'number') out[`${prefix}[${i}]`] = v; else flattenNumeric(v, `${prefix}[${i}]`, out, depth + 1); });
    return out;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) flattenNumeric(v, prefix ? `${prefix}.${k}` : k, out, depth + 1);
  }
  return out;
}

const PLOT_COLORS = ['#3b82f6', '#22c55e', '#e11d48', '#a855f7', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6'];

function useForceRefresh(hz = 4) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
}

// ── live plot of one topic's numeric leaves ───────────────────────────────────
function TopicPlot({ topic }: { topic: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const dataRef = useRef<number[][]>([[]]);
  const keysRef = useRef<string[]>([]);
  const t0 = useRef(performance.now());

  useEffect(() => {
    dataRef.current = [[]];
    keysRef.current = [];
    if (plotRef.current) { plotRef.current.destroy(); plotRef.current = null; }
    t0.current = performance.now();

    const unsub = bus.subscribe<unknown>(topic, (msg) => {
      const flat = flattenNumeric(msg);
      const keys = Object.keys(flat).slice(0, PLOT_COLORS.length);
      const host = hostRef.current;
      if (!host) return;

      // (Re)build the plot if the field set changed.
      if (keys.join('|') !== keysRef.current.join('|') || !plotRef.current) {
        keysRef.current = keys;
        dataRef.current = [[], ...keys.map(() => [])];
        if (plotRef.current) plotRef.current.destroy();
        plotRef.current = new uPlot({
          width: host.clientWidth || 260, height: 150,
          scales: { x: { time: false } },
          legend: { show: true, live: true },
          cursor: { drag: { x: true, y: false } },
          series: [
            { label: 't', value: (_u, v) => (v == null ? '' : v.toFixed(1)) },
            ...keys.map((k, i) => ({ label: k, stroke: PLOT_COLORS[i], width: 1.5, points: { show: false } })),
          ],
          axes: [
            { stroke: '#888', grid: { stroke: 'rgba(128,128,128,0.15)' } },
            { stroke: '#888', grid: { stroke: 'rgba(128,128,128,0.12)' } },
          ],
        }, dataRef.current as unknown as uPlot.AlignedData, host);
      }
      const t = (performance.now() - t0.current) / 1000;
      const data = dataRef.current;
      data[0].push(t);
      keys.forEach((k, i) => data[i + 1].push(flat[k]));
      if (data[0].length > 400) for (const col of data) col.shift();
      plotRef.current!.setData(data as unknown as uPlot.AlignedData);
    });
    return () => { unsub(); if (plotRef.current) { plotRef.current.destroy(); plotRef.current = null; } };
  }, [topic]);

  return <div className="rt-plot-host" ref={hostRef} />;
}

// ── Topics tab ────────────────────────────────────────────────────────────────
function TopicsTab() {
  useForceRefresh(4);
  const [sel, setSel] = useState<string | null>(null);
  const [last, setLast] = useState<Envelope | null>(null);
  const topics: TopicStats[] = bus.topics();

  useEffect(() => {
    if (!sel) return;
    const u = bus.subscribe(sel, (_m, env) => setLast(env));
    return u;
  }, [sel]);

  return (
    <div className="rt-cols">
      <div className="rt-topiclist">
        {topics.length === 0 && <div className="rt-empty">No topics yet.</div>}
        {topics.map((t) => (
          <button key={t.name} className={`rt-topicrow ${sel === t.name ? 'active' : ''}`} onClick={() => setSel(t.name)}>
            <span className="rt-tname">{t.name}</span>
            <span className="rt-tmeta">
              <span className="rt-thz">{t.hz >= 0.1 ? `${t.hz.toFixed(1)} Hz` : '—'}</span>
              <span className="rt-tbps" title="bytes per second">{t.bps >= 1 ? (t.bps >= 1024 ? `${(t.bps / 1024).toFixed(1)} kB/s` : `${Math.round(t.bps)} B/s`) : ''}</span>
              <span className="rt-tcount">{t.count}</span>
            </span>
            <span className="rt-ttype">{t.type} · {t.subscribers} sub</span>
          </button>
        ))}
      </div>
      <div className="rt-topicdetail">
        {sel ? (
          <>
            <div className="rt-detail-title">{sel}</div>
            <TopicPlot topic={sel} />
            <pre className="rt-msg">{last ? JSON.stringify(last.msg, null, 2) : 'waiting for a message…'}</pre>
          </>
        ) : (
          <div className="rt-empty">Select a topic to inspect its messages and plot its values.</div>
        )}
      </div>
    </div>
  );
}

// ── TF tab ────────────────────────────────────────────────────────────────────
function TfTab() {
  useForceRefresh(2);
  const frames = tf.frames();
  const roots = tf.roots();
  // group children by parent for an indented tree
  const byParent = new Map<string, string[]>();
  for (const f of frames) {
    if (!byParent.has(f.parent)) byParent.set(f.parent, []);
    byParent.get(f.parent)!.push(f.frame);
  }
  const render = (frame: string, depth: number): ReactElement[] => {
    const kids = byParent.get(frame) ?? [];
    return [
      <div key={frame} className="rt-tfrow" style={{ paddingLeft: depth * 14 + 8 }}>
        <span className="rt-tfdot" />{frame}
      </div>,
      ...kids.flatMap((k) => render(k, depth + 1)),
    ];
  };
  return (
    <div className="rt-tf">
      {frames.length === 0 && <div className="rt-empty">No transforms published yet.</div>}
      {roots.flatMap((r) => render(r, 0))}
      <div className="rt-tfcount">{frames.length} frames</div>
    </div>
  );
}

// ── Nodes (topology) tab ──────────────────────────────────────────────────────
function NodesTab() {
  useForceRefresh(2);
  const graph = bus.nodeGraph();
  return (
    <div className="rt-nodes">
      {graph.length === 0 && <div className="rt-empty">No nodes publishing yet.</div>}
      {graph.map((n) => (
        <div key={n.node} className="rt-node">
          <div className="rt-node-name">{n.node}</div>
          {n.publishes.map((tp) => (
            <div key={tp} className="rt-node-edge"><span className="rt-arrow">→</span>{tp}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Health (diagnostics) tab ──────────────────────────────────────────────────
function HealthTab() {
  const [diag, setDiag] = useState<DiagnosticsMsg | null>(null);
  useEffect(() => bus.subscribe<DiagnosticsMsg>(Topics.diagnostics, setDiag), []);
  const items = diag?.status ?? [];
  const worst = items.reduce<'OK' | 'WARN' | 'ERROR'>((acc, s) =>
    s.level === 'ERROR' ? 'ERROR' : s.level === 'WARN' && acc !== 'ERROR' ? 'WARN' : acc, 'OK');
  return (
    <div className="rt-health">
      <div className={`rt-health-summary lvl-${worst}`}>System: {worst}</div>
      {items.length === 0 && <div className="rt-empty">Waiting for diagnostics…</div>}
      {items.map((s) => (
        <div key={s.name} className={`rt-diag lvl-${s.level}`}>
          <span className="rt-diag-dot" />
          <span className="rt-diag-name">{s.name}</span>
          <span className="rt-diag-msg">{s.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Record/playback tab ───────────────────────────────────────────────────────
function RecordTab() {
  useForceRefresh(8);
  const rec = recorder.recording;
  const bag = player.bag;
  const [frac, setFrac] = useState(0);

  useEffect(() => {
    const u = player.subscribe(() => setFrac(player.progress));
    return u;
  }, []);

  const stopAndLoad = () => { const b = recorder.stop(); player.load(b); };
  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  const saveBag = () => {
    if (!bag) return;
    downloadBlob(new Blob([JSON.stringify(bag)], { type: 'application/json' }),
      `session-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.nischaybag`);
  };
  const openBag = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.nischaybag,.json';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      try { player.load(JSON.parse(await f.text()) as Bag); }
      catch { alert('Not a valid .nischaybag file.'); }
    };
    inp.click();
  };

  return (
    <div className="rt-record">
      <div className="rt-rec-row">
        {!rec ? (
          <Button variant="destructive" size="xs" onClick={() => recorder.start()} disabled={!!bag}>● Record</Button>
        ) : (
          <Button variant="outline" size="xs" onClick={stopAndLoad}>■ Stop ({recorder.count})</Button>
        )}
        {rec && <span className="rt-recording">recording {recorder.count} msgs…</span>}
        {!rec && <Button variant="outline" size="xs" onClick={openBag}>Open bag…</Button>}
        {bag && <Button variant="outline" size="xs" onClick={saveBag}>Save bag…</Button>}
      </div>

      {bag && (
        <div className="rt-player">
          <div className="rt-player-head">
            Bag · {bag.messages.length} msgs · {fmt(bag.t1 - bag.t0)} · {bag.topics.length} topics
            <Button variant="ghost" size="icon-xs" onClick={() => player.unload()} title="Close bag">✕</Button>
          </div>
          <div className="rt-transport">
            {player.playing
              ? <Button variant="outline" size="xs" onClick={() => player.pause()}>❚❚</Button>
              : <Button variant="outline" size="xs" onClick={() => player.play()}>▶</Button>}
            <input
              className="rt-scrub" type="range" min={0} max={1} step={0.001} value={frac}
              onChange={(e) => { player.pause(); player.seek(parseFloat(e.target.value)); }}
            />
            <NativeSelect size="xs" className="tw:w-auto" defaultValue="1" onChange={(e) => player.setRate(parseFloat(e.target.value))}>
              {['0.25', '0.5', '1', '2', '4'].map((r) => <option key={r} value={r}>{r}×</option>)}
            </NativeSelect>
          </div>
          <div className="rt-clock">clock: {clock.source} · t={fmt(clock.now() - bag.t0)}</div>
        </div>
      )}

      {!bag && !rec && (
        <p className="rt-hint">
          Record captures every published message onto one timeline. Stop loads it as a
          bag you can scrub, step and replay — every panel and the 3D scene react exactly
          as they did live.
        </p>
      )}
    </div>
  );
}

// ── callback timings from a GOS script (App(trace=path)) ─────────────────────
const TRACE_ROW = 22;
const fmtMs = (ms: number) => (ms >= 100 ? ms.toFixed(0) : ms >= 1 ? ms.toFixed(1) : ms.toFixed(3));

function TraceTab() {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [file, setFile] = useState('');
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState('');
  const input = useRef<HTMLInputElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  const open = async (f: File | undefined) => {
    if (!f) return;
    try { setTrace(parseTrace(await f.text())); setFile(f.name); setError(''); setPicked(null); }
    catch (e: any) { setTrace(null); setFile(''); setError(e.message); }
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c || !trace) return;
    const draw = () => {
      const w = c.clientWidth, h = trace.threads.length * TRACE_ROW, dpr = window.devicePixelRatio || 1;
      c.width = w * dpr; c.height = h * dpr;
      const g = c.getContext('2d')!;
      g.scale(dpr, dpr);
      const css = getComputedStyle(c);
      g.fillStyle = css.getPropertyValue('--bg-card'); g.fillRect(0, 0, w, h);
      for (const b of trace.bars) {
        g.fillStyle = picked && b.name !== picked ? css.getPropertyValue('--border-bright') : css.getPropertyValue('--primary');
        g.fillRect(b.startMs / trace.lengthMs * w, trace.threads.indexOf(b.thread) * TRACE_ROW + 3, Math.max(1, b.durMs / trace.lengthMs * w), TRACE_ROW - 6);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [trace, picked]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!trace) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ms = (e.clientX - r.left) / r.width * trace.lengthMs, slop = 3 / r.width * trace.lengthMs;
    const thread = trace.threads[Math.floor((e.clientY - r.top) / TRACE_ROW)];
    const b = trace.bars.find((x) => x.thread === thread && ms >= x.startMs - slop && ms <= x.startMs + x.durMs + slop);
    setHover(b ? `${b.name}: ${fmtMs(b.durMs)} ms, at ${fmtMs(b.startMs)} ms` : '');
  };

  return (
    <div className="rt-trace">
      <input ref={input} type="file" accept=".json" style={{ display: 'none' }} data-testid="trace-file"
        onChange={(e) => { void open(e.target.files?.[0]); e.target.value = ''; }} />
      <Button variant="outline" size="sm" onClick={() => input.current?.click()}>Open trace file…</Button>
      {error && <div className="rt-trace-error" role="alert">{error}</div>}
      {!trace && !error && <div className="rt-hint">Shows how long each callback of a script took. Run the script with gos.App(trace="trace.json"), then open that file here.</div>}
      {trace && <>
        <div className="rt-hint">{file}: {trace.bars.length} callback runs over {fmtMs(trace.lengthMs)} ms, {trace.threads.length} thread(s)</div>
        <canvas ref={canvas} className="rt-trace-view" style={{ height: trace.threads.length * TRACE_ROW }} onMouseMove={onMove} onMouseLeave={() => setHover('')} />
        <div className="rt-trace-hover">{hover || 'Point at a bar for its name and time. Click a row below to pick out one callback.'}</div>
        <table className="rt-trace-table">
          <thead><tr><th>Callback</th><th>Runs</th><th>Total ms</th><th>Median ms</th><th>Worst ms</th></tr></thead>
          <tbody>
            {trace.rows.map((r) => (
              <tr key={r.name} className={picked === r.name ? 'active' : ''} onClick={() => setPicked(picked === r.name ? null : r.name)}>
                <td>{r.name}</td><td>{r.count}</td><td>{fmtMs(r.totalMs)}</td><td>{fmtMs(r.medianMs)}</td><td>{fmtMs(r.worstMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>}
    </div>
  );
}

export default function RuntimePanel() {
  const [tab, setTab] = useState<Tab>('topics');
  return (
    <div className="rt-panel" data-ui="a">
      <TabBar size="sm" value={tab} onChange={setTab} tabs={[{ id: 'topics', label: 'Topics' }, { id: 'tf', label: 'TF' }, { id: 'nodes', label: 'Nodes' },
        { id: 'health', label: 'Health' }, { id: 'record', label: 'Record' }, { id: 'trace', label: 'Trace' }, { id: 'rtcore', label: 'RT Core' }]} />
      <div className="rt-body">
        {tab === 'topics' && <TopicsTab />}
        {tab === 'tf' && <TfTab />}
        {tab === 'nodes' && <NodesTab />}
        {tab === 'health' && <HealthTab />}
        {tab === 'record' && <RecordTab />}
        {tab === 'trace' && <TraceTab />}
        {tab === 'rtcore' && <RtCoreReadout />}
      </div>
    </div>
  );
}
