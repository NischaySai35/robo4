/**
 * NavigationGizmo — Blender-style 3D orientation cube overlay.
 *
 * Shows X/Y/Z world axes from the camera's perspective.
 * Click any axis label to snap the camera to that view.
 * Click the center dot to return to perspective view.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { bridge } from '../three/cameraBridge.js';
import { useArmStore } from '../store/armStore.js';

const SIZE = 100;
const CENTER = SIZE / 2;
const AXIS_RADIUS = 36;
const DOT_R_POS = 13;
const DOT_R_NEG = 9;

const AXES = [
  { key: '+X', dir: [1, 0, 0],  label: 'X',  color: '#e84040', glow: '#ff000044', isPos: true  },
  { key: '-X', dir: [-1, 0, 0], label: '-X', color: '#cc8888', glow: '#cc000022', isPos: false },
  { key: '+Y', dir: [0, 1, 0],  label: 'Y',  color: '#22cc55', glow: '#00ff4444', isPos: true  },
  { key: '-Y', dir: [0, -1, 0], label: '-Y', color: '#88cc99', glow: '#00cc2222', isPos: false },
  { key: '+Z', dir: [0, 0, 1],  label: 'Z',  color: '#4488ff', glow: '#0044ff44', isPos: true  },
  { key: '-Z', dir: [0, 0, -1], label: '-Z', color: '#99aadd', glow: '#0022cc22', isPos: false },
];

const SNAP_VIEWS = {
  '+X': { pos: { x: 12, y: 1.5, z: 0   }, lookAt: { x: 0, y: 0, z: 0 } },
  '-X': { pos: { x:-12, y: 1.5, z: 0   }, lookAt: { x: 0, y: 0, z: 0 } },
  '+Y': { pos: { x:  0, y: 13,  z: 0.5 }, lookAt: { x: 0, y: 0, z: 0 } },
  '-Y': { pos: { x:  0, y:-9,   z: 0.5 }, lookAt: { x: 0, y: 0, z: 0 } },
  '+Z': { pos: { x:  0, y: 1.5, z: 12  }, lookAt: { x: 0, y: 0, z: 0 } },
  '-Z': { pos: { x:  0, y: 1.5, z:-12  }, lookAt: { x: 0, y: 0, z: 0 } },
};

const PERSP_VIEW = { pos: { x: 0, y: 7, z: 9 }, lookAt: { x: 0, y: 0, z: 0 } };

const _tmpV = new THREE.Vector3();
const _mat = new THREE.Matrix4();

export default function NavigationGizmo() {
  const [projected, setProjected] = useState([]);
  const [hovered, setHovered] = useState(null);
  const rafRef = useRef(null);

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
            sx: CENTER + _tmpV.x * AXIS_RADIUS,
            sy: CENTER - _tmpV.y * AXIS_RADIUS,
            depth: _tmpV.z,   // negative = facing camera (in front)
          };
        });
        // Sort: back-facing first (drawn behind), front-facing last (on top)
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

  return (
    <div className="gizmo-wrap">
      <svg
        width={SIZE}
        height={SIZE}
        style={{ overflow: 'visible', display: 'block' }}
      >
        {/* Subtle background disc */}
        <defs>
          <radialGradient id="gizmo-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(200,215,235,0.06)" />
          </radialGradient>
          <filter id="gizmo-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={CENTER - 3}
          fill="url(#gizmo-bg)"
          stroke="rgba(180,200,225,0.35)"
          strokeWidth="0.8"
        />

        {/* Axis lines */}
        {projected.map(ax => {
          const front = ax.depth < 0;
          return (
            <line key={`ln-${ax.key}`}
              x1={CENTER} y1={CENTER} x2={ax.sx} y2={ax.sy}
              stroke={ax.color}
              strokeWidth={front ? 1.8 : 1}
              opacity={front ? 0.85 : 0.3}
            />
          );
        })}

        {/* Axis dots + labels */}
        {projected.map(ax => {
          const front = ax.depth < 0;
          const r = ax.isPos ? DOT_R_POS : DOT_R_NEG;
          const isHov = hovered === ax.key;
          const opacity = front ? 1 : (ax.isPos ? 0.4 : 0.22);

          return (
            <g key={`dot-${ax.key}`}
              opacity={opacity}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(ax.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => snap(ax.key)}
            >
              {/* Glow ring on hover */}
              {isHov && (
                <circle cx={ax.sx} cy={ax.sy} r={r + 4}
                  fill={ax.glow} stroke={ax.color} strokeWidth="0.8" opacity="0.6"
                />
              )}
              {/* Main dot */}
              <circle cx={ax.sx} cy={ax.sy} r={r}
                fill={isHov ? ax.color : (ax.isPos ? ax.color : 'rgba(200,215,230,0.7)')}
                stroke={ax.isPos ? 'rgba(255,255,255,0.5)' : 'transparent'}
                strokeWidth="0.8"
              />
              {/* Label */}
              <text
                x={ax.sx} y={ax.sy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={ax.isPos ? 10 : 7.5}
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

        {/* Center — click for perspective view */}
        <circle cx={CENTER} cy={CENTER} r="5"
          fill="rgba(80,100,130,0.7)"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="0.8"
          style={{ cursor: 'pointer' }}
          onClick={snapPersp}
        />
      </svg>

      {/* Axis snap quick-buttons below gizmo */}
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
