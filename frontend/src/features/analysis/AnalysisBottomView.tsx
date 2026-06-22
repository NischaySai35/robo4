/**
 * AnalysisBottomView — the bottom pane of the Analysis page's split. It renders the
 * SAME live scene as the main (top) viewport, from a camera that follows the main one
 * each frame (so the two panes stay perfectly in sync as you orbit/zoom the top). The
 * top pane shows the stress/load overlay; this bottom pane renders the geometry CLEAN
 * (a neutral flat material) so you can compare "where the load is" against the actual
 * shape.
 *
 * It uses its own lightweight WebGLRenderer on its own canvas (a second WebGL context)
 * and sets `scene.overrideMaterial` only for the duration of its synchronous render —
 * so it never affects the editor's renderer (which runs in a separate rAF callback).
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { bridge } from '@/viewport/cameraBridge';
import { useModelStore } from '@/state/modelStore';

const DEFAULT_COL = '#b3b8c2';

export default function AnalysisBottomView() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    host.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const cam = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);

    // Cache one solid (no-vertex-colour) material per colour so the bottom view shows
    // the robot's REAL material colours instead of the top's stress heatmap. Swapping
    // a mesh's `material` reference (vs toggling vertexColors) avoids shader recompiles.
    const matCache = new Map<string, THREE.MeshStandardMaterial>();
    const solidFor = (hex: string) => {
      let m = matCache.get(hex);
      if (!m) { m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), metalness: 0.25, roughness: 0.6 }); matCache.set(hex, m); }
      return m;
    };
    const colorHexOf = (bodyId: string): string => {
      const doc = useModelStore.getState().doc as any;
      const b = doc.bodies?.[bodyId];
      const mid = b?.visual?.materialId;
      const c = mid ? doc.materials?.[mid]?.color : null;
      return c ? `#${[0, 1, 2].map((i) => Math.round((c[i] ?? 0.7) * 255).toString(16).padStart(2, '0')).join('')}` : DEFAULT_COL;
    };

    const resize = () => {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    const tick = () => {
      const scene = bridge.scene as THREE.Scene | undefined;
      const main = bridge.camera as THREE.PerspectiveCamera | undefined;
      if (scene && main) {
        // follow the main camera (keep our own aspect)
        cam.position.copy(main.position);
        cam.quaternion.copy(main.quaternion);
        cam.fov = main.fov;
        cam.updateProjectionMatrix();

        // Swap each body's meshes to a solid material in its real colour, render, then
        // restore — all synchronous, so the editor's renderer never sees the swap.
        const swaps: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
        scene.traverse((o: any) => {
          if (o.userData?.isModelBody && o.userData?.bodyId) {
            const solid = solidFor(colorHexOf(o.userData.bodyId));
            o.traverse((m: any) => { if (m.isMesh) { swaps.push([m, m.material]); m.material = solid; } });
          }
        });
        renderer.render(scene, cam);
        for (const [m, orig] of swaps) m.material = orig;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const m of matCache.values()) m.dispose();
      renderer.dispose();
      host.removeChild(canvas);
    };
  }, []);

  return (
    <div className="an-bottom">
      <span className="an-bottom-label">Normal (real colours)</span>
      <div className="an-bottom-host" ref={hostRef} />
    </div>
  );
}
