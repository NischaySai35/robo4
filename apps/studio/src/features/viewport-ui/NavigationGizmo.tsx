/**
 * NavigationGizmo — Blender-style 3D orientation cube overlay.
 *
 * • Click axis dot → snap camera to that axis view
 * • Click center dot → reset to perspective view
 * • Drag the gizmo disc → orbit camera freely
 */
import './NavigationGizmo.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import * as THREE from 'three';
import { bridge } from '@/viewport/cameraBridge';

const SIZE   = 112;
const CENTER = SIZE / 2;
const AXIS_R = 40;
const DOT_POS = 11;
const DOT_NEG = 8;

const AXES = [
  { key: '+X', dir: [1, 0, 0],  label: 'X',  color: '#e5534b', glow: 'rgba(229,83,75,0.35)',  isPos: true  },
  { key: '-X', dir: [-1, 0, 0], label: 'X',  color: '#e5534b', glow: 'rgba(229,83,75,0.25)',  isPos: false },
  { key: '+Y', dir: [0, 1, 0],  label: 'Y',  color: '#63c14e', glow: 'rgba(99,193,78,0.35)',  isPos: true  },
  { key: '-Y', dir: [0, -1, 0], label: 'Y',  color: '#63c14e', glow: 'rgba(99,193,78,0.25)',  isPos: false },
  { key: '+Z', dir: [0, 0, 1],  label: 'Z',  color: '#4a90d9', glow: 'rgba(74,144,217,0.35)', isPos: true  },
  { key: '-Z', dir: [0, 0, -1], label: 'Z',  color: '#4a90d9', glow: 'rgba(74,144,217,0.25)', isPos: false },
];

const SNAP_VIEWS = {
  '+X': { pos: { x: 14,  y: 1.5, z: 0   }, lookAt: { x: 0, y: 0, z: 0 } },
  '-X': { pos: { x:-14,  y: 1.5, z: 0   }, lookAt: { x: 0, y: 0, z: 0 } },
  '+Y': { pos: { x:  0,  y: 14,  z: 0.5 }, lookAt: { x: 0, y: 0, z: 0 } },
  '-Y': { pos: { x:  0.5, y: -5, z: 6   }, lookAt: { x: 0, y: 0, z: 0 } }, // low front angle
  '+Z': { pos: { x:  0,  y: 1.5, z: 14  }, lookAt: { x: 0, y: 0, z: 0 } },
  '-Z': { pos: { x:  0,  y: 1.5, z:-14  }, lookAt: { x: 0, y: 0, z: 0 } },
};

const PERSP_VIEW = { pos: { x: 0, y: 7, z: 9 }, lookAt: { x: 0, y: 0, z: 0 } };

const _tmpV = new THREE.Vector3();

export default function NavigationGizmo() {
  const [projected, setProjected] = useState<any[]>([]);
  const [hovered, setHovered]     = useState<string | null>(null);
  const rafRef     = useRef<number | null>(null);
  const dragging   = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });
  const svgRef     = useRef<any>(null);
  const lastSig    = useRef('');

  useEffect(() => {
    const update = () => {
      const cam = bridge.camera;
      if (cam) {
        cam.updateMatrixWorld();
        const result = AXES.map(ax => {
          _tmpV.set(...(ax.dir as [number, number, number]));
          _tmpV.transformDirection(cam.matrixWorldInverse);
          return {
            ...ax,
            sx: CENTER + _tmpV.x * AXIS_R,
            sy: CENTER - _tmpV.y * AXIS_R,
            depth: _tmpV.z,
          };
        });
        result.sort((a, b) => b.depth - a.depth);
        // Only re-render when the projection actually changed (camera moved).
        // Calling setProjected on every RAF frame triggers 60 React re-renders/sec
        // even when the camera is perfectly still, creating enormous GC pressure.
        const sig = result.map(r => `${r.key}:${r.sx.toFixed(1)},${r.sy.toFixed(1)}`).join('|');
        if (sig !== lastSig.current) {
          lastSig.current = sig;
          setProjected(result);
        }
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Snap to an axis view, pivoting around the CURRENT orbit target (so a prior
  // pan is preserved) via the pan-aware bridge helper. Falls back to the old
  // origin-locked behaviour only if the helper isn't wired yet.
  const snap = useCallback((key: any) => {
    const ax = AXES.find(a => a.key === key);
    if (ax && bridge.snapToAxis) { bridge.snapToAxis(ax.dir); return; }
    const view = SNAP_VIEWS[key as keyof typeof SNAP_VIEWS];
    if (view && bridge.animateTo) bridge.animateTo(view.pos, view.lookAt);
  }, []);

  const snapPersp = useCallback(() => {
    if (bridge.snapToAxis) { bridge.snapToAxis([0, 0.6, 0.9]); return; }
    if (bridge.animateTo) bridge.animateTo(PERSP_VIEW.pos, PERSP_VIEW.lookAt);
  }, []);

  // Drag-to-orbit: pointer events on the gizmo background disc
  const onBgPointerDown = useCallback((e: any) => {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onBgPointerMove = useCallback((e: any) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    if (bridge.orbitDelta) bridge.orbitDelta(dx, dy);
  }, []);

  const onBgPointerUp = useCallback((e: any) => {
    dragging.current = false;
    svgRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div className="gizmo-wrap">
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        style={{ overflow: 'visible', display: 'block', cursor: dragging.current ? 'grabbing' : 'grab' }}
        onPointerMove={onBgPointerMove}
        onPointerUp={onBgPointerUp}
      >
        <defs>
          <radialGradient id="gizmo-bg" cx="42%" cy="38%" r="65%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.14)" />
            <stop offset="70%"  stopColor="rgba(160,180,210,0.05)" />
            <stop offset="100%" stopColor="rgba(120,140,175,0.02)" />
          </radialGradient>
        </defs>

        {/* Draggable background disc */}
        <circle
          className="gizmo-disc"
          cx={CENTER} cy={CENTER} r={CENTER - 3}
          fill="url(#gizmo-bg)"
          stroke="rgba(180,200,225,0.28)"
          strokeWidth="1"
          onPointerDown={onBgPointerDown}
        />

        {/* Axis lines */}
        {projected.map(ax => {
          const front = ax.depth < 0;
          return (
            <line key={`ln-${ax.key}`} className="gizmo-line"
              x1={CENTER} y1={CENTER} x2={ax.sx} y2={ax.sy}
              stroke={ax.color}
              strokeWidth={front ? 2.5 : 1.5} strokeLinecap="round"
              opacity={front ? 0.9 : 0.22}
            />
          );
        })}

        {/* Axis dots + labels */}
        {projected.map(ax => {
          const front   = ax.depth < 0;
          const r       = (ax.isPos ? DOT_POS : DOT_NEG) + (hovered === ax.key ? 2 : 0);
          const isHov   = hovered === ax.key;
          const opacity = front ? 1 : (ax.isPos ? 0.5 : 0.3);

          return (
            <g key={`dot-${ax.key}`}
              className="gizmo-axis" opacity={opacity}
              onMouseEnter={() => setHovered(ax.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => { e.stopPropagation(); snap(ax.key); }}
            >
              {isHov && (
                <circle className="gizmo-halo" cx={ax.sx} cy={ax.sy} r={r + 6}
                  fill={ax.glow} stroke={ax.color} strokeWidth="1" opacity="0.85" />
              )}
              <circle
                className="gizmo-dot"
                cx={ax.sx} cy={ax.sy} r={r}
                fill={ax.isPos ? ax.color : 'rgba(24,30,42,0.82)'}
                stroke={ax.isPos ? 'rgba(255,255,255,0.5)' : ax.color}
                strokeWidth={ax.isPos ? 1 : 1.6}
              />
              <text
                x={ax.sx} y={ax.sy}
                textAnchor="middle" dominantBaseline="central"
                fontSize={ax.isPos ? 9.5 : 8}
                fontWeight="700" fontFamily="'Share Tech Mono', monospace"
                fill={ax.isPos ? '#fff' : ax.color}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {ax.label}
              </text>
            </g>
          );
        })}

        {/* Center — reset to perspective view */}
        <g className="gizmo-center" onClick={(e) => { e.stopPropagation(); snapPersp(); }}>
          <circle cx={CENTER} cy={CENTER} r="7" fill="rgba(30,38,52,0.9)"
            stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
          <circle cx={CENTER} cy={CENTER} r="2.4" fill="rgba(255,255,255,0.7)" />
        </g>
      </svg>

      {/* Axis snap quick-buttons */}
      <div className="gizmo-btn-row">
        {['+X', '+Y', '+Z'].map(k => (
          <button key={k} className="gizmo-axis-btn" onClick={() => snap(k)}
            style={{ '--ax-color': AXES.find(a => a.key === k)?.color } as CSSProperties}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}