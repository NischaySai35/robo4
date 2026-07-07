/**
 * AnalysisBottomView — the bottom pane of the Analysis page's split.
 *
 * SYNC ON (default): camera mirrors the top viewport exactly — same orbit,
 * zoom, angle. The two panes track each other as you interact with the top.
 *
 * SYNC OFF: an independent OrbitControls instance lets you pan, zoom, and
 * rotate the bottom view freely. The model stays live (model changes in the
 * top still appear here immediately) but the camera is yours.
 *
 * Renders the SAME THREE.js scene using its own lightweight WebGLRenderer
 * with per-body material swaps so the real colours show instead of the
 * stress heatmap, without ever affecting the editor's own renderer.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { bridge } from '@/viewport/cameraBridge';
import { useModelStore } from '@/state/modelStore';

const DEFAULT_COL = '#b3b8c2';
const _zeroV = new THREE.Vector3();

export default function AnalysisBottomView() {
  const hostRef   = useRef<HTMLDivElement | null>(null);
  const [synced, setSynced] = useState(true);
  const syncRef   = useRef(true);
  const controlsRef = useRef<OrbitControls | null>(null);
  const requestDrawRef = useRef<(n?: number) => void>(() => {});

  // Keep ref in sync with React state (readable inside the RAF loop)
  useEffect(() => {
    syncRef.current = synced;
    if (controlsRef.current) controlsRef.current.enabled = !synced;
    requestDrawRef.current(2); // mode changed → redraw so the pane updates immediately
  }, [synced]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    host.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    // Cap DPR at 1.5 here (vs 2 on the main view): this is a secondary reference pane,
    // and pixel count is the dominant GPU cost of the extra render pass.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const cam = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);

    // Independent orbit controls (only active when sync is OFF)
    const controls = new OrbitControls(cam, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enabled = false; // sync ON by default
    controlsRef.current = controls;

    // ── On-demand rendering (like the main viewport / Blender) ─────────────────
    // A static scene must NOT keep re-rendering. We draw only when something that
    // affects THIS pane changed: the top camera moved (synced), the user orbited
    // this pane (free), or the model changed. Idle ⇒ zero GPU/CPU here.
    let dirty = 3; // draw the first few frames to appear immediately
    const requestDraw = (n = 2) => { dirty = Math.max(dirty, n); };
    controls.addEventListener('change', () => requestDraw(2));         // free-orbit / damping
    const unsubModel = useModelStore.subscribe(() => requestDraw(2));  // geometry/pose/material change
    requestDrawRef.current = requestDraw;                              // let the sync toggle force a redraw
    let lastCamKey = '';

    // Material cache: real-colour solid materials (no vertex colour = no heatmap)
    const matCache = new Map<string, THREE.MeshStandardMaterial>();
    const solidFor = (hex: string) => {
      let m = matCache.get(hex);
      if (!m) {
        m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), metalness: 0.25, roughness: 0.6 });
        matCache.set(hex, m);
      }
      return m;
    };
    const colorHexOf = (bodyId: string): string => {
      const doc = useModelStore.getState().doc as any;
      const b   = doc.bodies?.[bodyId];
      const mid = b?.visual?.materialId;
      const c   = mid ? doc.materials?.[mid]?.color : null;
      return c
        ? `#${[0, 1, 2].map((i) => Math.round((c[i] ?? 0.7) * 255).toString(16).padStart(2, '0')).join('')}`
        : DEFAULT_COL;
    };

    const resize = () => {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      requestDraw(2);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    let lastRender = 0;
    const FRAME_MS = 1000 / 30; // ceiling only — actual draws are gated by `dirty`
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const scene = bridge.scene as THREE.Scene | undefined;
      const main  = bridge.camera as THREE.PerspectiveCamera | undefined;
      if (!scene || !main) return;

      // Synced: redraw when the top camera pose changed. Cheap string key compare.
      if (syncRef.current) {
        const p = main.position, q = main.quaternion;
        const key = `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)},${q.x.toFixed(4)},${q.y.toFixed(4)},${q.z.toFixed(4)},${main.fov}`;
        if (key !== lastCamKey) { lastCamKey = key; requestDraw(2); }
      } else {
        controls.update(); // emits 'change' while damping → sets dirty itself
      }

      if (dirty <= 0) return;           // nothing changed → GPU/CPU rest
      if (now - lastRender < FRAME_MS) return;
      lastRender = now;
      dirty--;

      if (syncRef.current) {
        // Mirror the top camera exactly
        cam.position.copy(main.position);
        cam.quaternion.copy(main.quaternion);
        cam.fov = main.fov;
        cam.near = main.near;
        cam.far  = main.far;
        cam.updateProjectionMatrix();
        // Reset orbit target so it's ready when user switches to free mode
        controls.target.copy((main as any).target ?? _zeroV);
      }

      // Swap each body mesh to its solid real-colour material, render, then restore —
      // all synchronous so the editor's renderer never sees the swap.
      const swaps: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
      scene.traverse((o: any) => {
        if (o.userData?.isModelBody && o.userData?.bodyId) {
          const solid = solidFor(colorHexOf(o.userData.bodyId));
          o.traverse((m: any) => {
            if (m.isMesh) { swaps.push([m, m.material]); m.material = solid; }
          });
        }
      });
      renderer.render(scene, cam);
      for (const [m, orig] of swaps) m.material = orig;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      unsubModel();
      ro.disconnect();
      controls.dispose();
      controlsRef.current = null;
      for (const m of matCache.values()) m.dispose();
      renderer.dispose();
      if (host.contains(canvas)) host.removeChild(canvas);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="an-bottom">
      <span className="an-bottom-label">Normal (real colours)</span>
      <div className="an-bottom-host" ref={hostRef} />
      <button
        className={`an-sync-btn${synced ? ' an-sync-btn--on' : ''}`}
        onClick={() => setSynced((s) => !s)}
        title={synced ? 'Camera synced with top view — click to unlock' : 'Camera free — click to sync with top view'}
      >
        {synced ? '⧉ Sync' : '⧉ Free'}
      </button>
    </div>
  );
}
