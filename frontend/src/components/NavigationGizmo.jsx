/**
 * NavigationGizmo — Blender-style 3D orientation cube overlay.
 *
 * • Click axis dot → snap camera to that axis view
 * • Click center dot → reset to perspective view
 * • Drag the gizmo disc → orbit camera freely
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { bridge } from '../three/cameraBridge.js';

const SIZE   = 110;
const CENTER = SIZE / 2;
const AXIS_R = 40;
const DOT_POS = 14;
const DOT_NEG = 10;

const AXES = [
  { key: '+X', dir: [1, 0, 0],  label: 'X',  color: '#e84040', glow: '#ff000044', isPos: true  },
  { key: '-X', dir: [-1, 0, 0], label: '-X', color: '#cc6666', glow: '#cc000022', isPos: false },
  { key: '+Y', dir: [0, 1, 0],  label: 'Y',  color: '#22cc55', glow: '#00ff4444', isPos: true  },
  { key: '-Y', dir: [0, -1, 0], label: '-Y', color: '#66bb88', glow: '#00cc2222', isPos: false },
  { key: '+Z', dir: [0, 0, 1],  label: 'Z',  color: '#4488ff', glow: '#0044ff44', isPos: true  },
  { key: '-Z', dir: [0, 0, -1], label: '-Z', color: '#7799cc', glow: '#0022cc22', isPos: false },
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
  const [projected, setProjected] = useState([]);
  const [hovered, setHovered]     = useState(null);
  const rafRef     = useRef(null);
  const dragging   = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });
  const svgRef     = useRef(null);

  useEffect(() => {
    const update = () => {
      const cam = bridge.camera;
      if (cam) {
        cam.updateMatrixWorld();
        const result = AXES.map(ax => {
          _tmpV.set(...ax.dir);
          _tmpV.transformDirection(cam.matrixWorldInverse);
          return {
            ...ax,
            sx: CENTER + _tmpV.x * AXIS_R,
            sy: CENTER - _tmpV.y * AXIS_R,
            depth: _tmpV.z,
          };
        });
        result.sort((a, b) => b.depth - a.depth);
        setProjected(result);
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const snap = useCallback((key) => {
    const view = SNAP_VIEWS[key];
    if (view && bridge.animateTo) bridge.animateTo(view.pos, view.lookAt);
  }, []);

  const snapPersp = useCallback(() => {
    if (bridge.animateTo) bridge.animateTo(PERSP_VIEW.pos, PERSP_VIEW.lookAt);
  }, []);

  // Drag-to-orbit: pointer events on the gizmo background disc
  const onBgPointerDown = useCallback((e) => {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onBgPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    if (bridge.orbitDelta) bridge.orbitDelta(dx, dy);
  }, []);

  const onBgPointerUp = useCallback((e) => {
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
          <radialGradient id="gizmo-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(200,215,235,0.06)" />
          </radialGradient>
        </defs>

        {/* Draggable background disc */}
        <circle
          cx={CENTER} cy={CENTER} r={CENTER - 4}
          fill="url(#gizmo-bg)"
          stroke="rgba(180,200,225,0.4)"
          strokeWidth="1"
          style={{ cursor: 'grab' }}
          onPointerDown={onBgPointerDown}
        />

        {/* Axis lines */}
        {projected.map(ax => {
          const front = ax.depth < 0;
          return (
            <line key={`ln-${ax.key}`}
              x1={CENTER} y1={CENTER} x2={ax.sx} y2={ax.sy}
              stroke={ax.color}
              strokeWidth={front ? 2 : 1}
              opacity={front ? 0.85 : 0.28}
              style={{ pointerEvents: 'none' }}
            />
          );
        })}

        {/* Axis dots + labels */}
        {projected.map(ax => {
          const front   = ax.depth < 0;
          const r       = ax.isPos ? DOT_POS : DOT_NEG;
          const isHov   = hovered === ax.key;
          const opacity = front ? 1 : (ax.isPos ? 0.42 : 0.2);

          return (
            <g key={`dot-${ax.key}`}
              opacity={opacity}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(ax.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => { e.stopPropagation(); snap(ax.key); }}
            >
              {isHov && (
                <circle cx={ax.sx} cy={ax.sy} r={r + 5}
                  fill={ax.glow} stroke={ax.color} strokeWidth="1" opacity="0.7"
                />
              )}
              {/* Face square (rounded) */}
              <rect
                x={ax.sx - r} y={ax.sy - r}
                width={r * 2} height={r * 2}
                rx={ax.isPos ? 4 : 3}
                fill={isHov ? ax.color : (ax.isPos ? ax.color : 'rgba(200,215,235,0.75)')}
                stroke={ax.isPos ? 'rgba(255,255,255,0.4)' : 'rgba(120,140,170,0.3)'}
                strokeWidth="0.8"
              />
              <text
                x={ax.sx} y={ax.sy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={ax.isPos ? 9.5 : 7}
                fontWeight="700"
                fontFamily="'Share Tech Mono', monospace"
                fill={ax.isPos ? 'white' : '#334466'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {ax.label}
              </text>
            </g>
          );
        })}

        {/* Center — perspective view */}
        <circle cx={CENTER} cy={CENTER} r="6"
          fill="rgba(80,100,130,0.75)"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="1"
          style={{ cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); snapPersp(); }}
        />
      </svg>

      {/* Axis snap quick-buttons */}
      <div className="gizmo-btn-row">
        {['+X', '+Y', '+Z'].map(k => (
          <button key={k} className="gizmo-axis-btn" onClick={() => snap(k)}
            style={{ '--ax-color': AXES.find(a => a.key === k)?.color }}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
