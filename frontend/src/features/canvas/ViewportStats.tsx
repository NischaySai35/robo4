/**
 * ViewportStats — floating HUD showing real-time renderer performance.
 *
 * For Cycles: shows sample count climbing from 0 (noisy) toward 200+ (converged),
 * and samples/sec rate so the user can see how much GPU work is happening.
 * Triangles are counted from scene geometry for a consistent count across engines.
 */
import './ViewportStats.css';
import { useEffect, useRef, useState } from 'react';
import { bridge } from '@/viewport/cameraBridge';

type Stats = {
  fps: number;
  tris: number;
  mem: number | null;
  engine: string;
  ptSamples: number;
  ptSamplesPerSec: number;
};

export default function ViewportStats() {
  const [stats, setStats] = useState<Stats>({
    fps: 0, tris: 0, mem: null, engine: 'eevee', ptSamples: 0, ptSamplesPerSec: 0,
  });
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
        const mem: number | null = (() => {
          const p = (performance as any).memory;
          return p ? Math.round(p.usedJSHeapSize / 1048576) : null;
        })();
        const eng  = bridge.getRenderEngine?.() ?? 'eevee';
        const ptS  = bridge.getPathTracerSamples?.() ?? 0;
        // Samples accumulated since last UI update → samples/sec
        const ptSps = Math.round((ptS - lastSamples.current) * (1000 / 250));
        lastSamples.current = ptS;

        setStats({ fps, tris: r.triangles, mem, engine: eng, ptSamples: ptS, ptSamplesPerSec: Math.max(0, ptSps) });
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const fmtTris = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(0)}K`
    : `${n}`;

  const ENGINE_COLOUR: Record<string, string> = {
    eevee:   '#2f7dff',
    cycles:  '#e07b39',
    raycast: '#22c55e',
  };

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

      {stats.mem !== null && (
        <div className="vp-stats-row">
          <span className="vp-stats-label">JS mem</span>
          <span className="vp-stats-val">{stats.mem} MB</span>
        </div>
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
