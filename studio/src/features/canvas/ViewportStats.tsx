/**
 * ViewportStats — floating HUD showing real-time renderer performance.
 *
 * For Cycles: shows sample count climbing from 0 (noisy) toward 200+ (converged),
 * and samples/sec rate so the user can see how much GPU work is happening.
 * Triangles are counted from scene geometry for a consistent count across engines.
 */
import './ViewportStats.css';
import { useEffect, useRef, useState } from 'react';
import { bridge } from '@/bridge/cameraBridge';
import { useSystemMetrics, formatRam } from '@/viewport/useSystemMetrics';

type Stats = {
  fps: number;
  tris: number;
  engine: string;
  ptSamples: number;
  ptSamplesPerSec: number;
};

export default function ViewportStats() {
  const [stats, setStats] = useState<Stats>({
    fps: 0, tris: 0, engine: 'eevee', ptSamples: 0, ptSamplesPerSec: 0,
  });
  // Real RAM/CPU/GPU for this application (desktop shell only) — see useSystemMetrics
  // for why the old JS-heap number was dropped rather than kept alongside these.
  const sys = useSystemMetrics();
  const [loadOpen, setLoadOpen] = useState(false);
  const lastTime    = useRef(performance.now());
  const lastSamples = useRef(0);

  useEffect(() => {
    let rafId = 0;
    let fpsAcc = 0, fpsSamples = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      fpsSamples++;
      const now = performance.now();
      fpsAcc += now - lastTime.current;
      lastTime.current = now;

      if (fpsAcc >= 250) {
        const fps  = Math.round((fpsSamples / fpsAcc) * 1000);
        fpsAcc = 0; fpsSamples = 0;

        const r    = bridge.getRendererStats?.() ?? { triangles: 0 };
        const eng  = bridge.getRenderEngine?.() ?? 'eevee';
        const ptS  = bridge.getPathTracerSamples?.() ?? 0;
        // Samples accumulated since last UI update → samples/sec
        const ptSps = Math.round((ptS - lastSamples.current) * (1000 / 250));
        lastSamples.current = ptS;

        setStats({ fps, tris: r.triangles, engine: eng, ptSamples: ptS, ptSamplesPerSec: Math.max(0, ptSps) });
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const fmtTris = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(0)}K`
    : `${n}`;

  const loadColour = (pct: number) => (pct >= 85 ? '#f87171' : pct >= 60 ? '#fbbf24' : '#4ade80');

  const ENGINE_COLOUR: Record<string, string> = {
    eevee:   '#2f7dff',
    cycles:  '#e07b39',
    raycast: '#22c55e',
  };

  // "Unknown GPU" must not read as "GPU idle", so an absent GPU figure falls back to
  // CPU alone rather than being treated as a zero that could drag the number down.
  const combinedLoad = Math.max(sys.cpuPercent, sys.gpuPercent ?? 0);
  // A browser tab can't be attributed a slice of the shared browser process tree, so the
  // dev-server source reports the whole machine. Mark it rather than let it read as app-only.
  const sysWide = sys.scope === 'dev';
  const scopeHint = sysWide
    ? 'Dev server + the whole browser, so it includes your other tabs. The desktop app reports this application only.'
    : 'This application only, across all its processes';

  const isCycles   = stats.engine === 'cycles';
  const maxSamples = bridge.getMaxSamples?.() ?? 32;
  const converged  = Math.min(100, Math.round((stats.ptSamples / maxSamples) * 100));

  return (
    <div className="vp-stats">
      <div className="vp-stats-engine" style={{ color: ENGINE_COLOUR[stats.engine] ?? '#fff' }}>
        {stats.engine.toUpperCase()}
        </div>

      <div className="vp-stats-row">
        <span className="vp-stats-label">FPS</span>
        <span className="vp-stats-val" style={{ color: stats.fps < 20 ? '#f87171' : stats.fps < 45 ? '#fbbf24' : '#4ade80' }}>
          {stats.fps}
        </span>
      </div>

      <div className="vp-stats-row">
        <span className="vp-stats-label">Triangles</span>
        <span className="vp-stats-val">{fmtTris(stats.tris)}</span>
      </div>

      {sys.available && (
        <>
          <div className="vp-stats-row" title={scopeHint}>
            <span className="vp-stats-label">RAM{sysWide ? '*' : ''}</span>
            <span className="vp-stats-val">{formatRam(sys.ramBytes)}</span>
          </div>

          {/* Combined load, expandable to the CPU/GPU split. The combined figure is the
              BUSIER of the two, not their sum: CPU and GPU run concurrently, so adding
              them would report 90% for a machine that is comfortably half idle, and the
              number you actually want at a glance is "how close to a limit am I". */}
          <div
            className="vp-stats-row vp-stats-row-click"
            onClick={() => setLoadOpen((v) => !v)}
            title={loadOpen ? 'Hide CPU/GPU split' : 'Show CPU/GPU split'}
          >
            <span className="vp-stats-label">Load{sysWide ? '*' : ''} {loadOpen ? '▾' : '▸'}</span>
            <span className="vp-stats-val" style={{ color: loadColour(combinedLoad) }}>
              {Math.round(combinedLoad)} %
            </span>
          </div>

          {loadOpen && (
            <>
              <div className="vp-stats-row vp-stats-row-sub">
                <span className="vp-stats-label">· CPU</span>
                <span className="vp-stats-val" style={{ color: loadColour(sys.cpuPercent) }}>
                  {Math.round(sys.cpuPercent)} %
                </span>
              </div>
              {sys.parts.map((part) => (
                <div className="vp-stats-row vp-stats-row-sub" key={part.label}>
                  <span className="vp-stats-label">· {part.label}</span>
                  <span className="vp-stats-val">{formatRam(part.ramBytes)}</span>
                </div>
              ))}
              {sysWide && <div className="vp-stats-note vp-stats-scope">* dev mode: editor + whole browser. The packaged app reports itself only.</div>}
              <div className="vp-stats-row vp-stats-row-sub">
                <span className="vp-stats-label">· GPU</span>
                <span className="vp-stats-val" style={{ color: sys.gpuPercent === null ? '#888' : loadColour(sys.gpuPercent) }}>
                  {sys.gpuPercent === null ? '—' : `${Math.round(sys.gpuPercent)} %`}
                </span>
              </div>
            </>
          )}
        </>
      )}

      {isCycles && (
        <>
          <div className="vp-stats-row">
            <span className="vp-stats-label">Samples</span>
            <span className="vp-stats-val" style={{ color: '#e07b39' }}>
              {stats.ptSamples}<span style={{ opacity: 0.45, fontSize: 9 }}>/{maxSamples}</span>
            </span>
          </div>
          <div className="vp-stats-row">
            <span className="vp-stats-label">Smp/sec</span>
            <span className="vp-stats-val" style={{ color: stats.ptSamplesPerSec > 0 ? '#e07b39' : '#888' }}>
              {stats.ptSamplesPerSec > 0 ? stats.ptSamplesPerSec : '—'}
            </span>
          </div>
          <div className="vp-stats-bar-wrap">
            <div className="vp-stats-bar" style={{ width: `${converged}%` }} />
          </div>
          <div className="vp-stats-note" style={{ color: converged >= 100 ? '#4ade80' : undefined }}>
            {stats.ptSamples === 0
              ? 'Starting…'
              : converged >= 100
              ? 'Converged ✓'
              : `Converging ${converged}%`}
          </div>
        </>
      )}

      {!isCycles && <div className="vp-stats-note">GPU · WebGL</div>}
    </div>
  );
}
