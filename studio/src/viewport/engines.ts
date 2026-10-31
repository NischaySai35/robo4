/**
 * Render engines (P9, docs/design/p9-render-engines.md): each viewport picks one by id, and adding an engine means
 * adding an entry here, not another branch inside SceneManager. An engine sets the renderer, lights and passes it
 * needs; `tracer` engines draw with the Cycles path tracer instead of the rasterizer.
 */
import * as THREE from 'three';

export interface RenderEngine {
  id: string;
  label: string;
  /** draws through the path tracer and keeps drawing until it converges */
  tracer: boolean;
  /** bloom pass on */
  bloom: boolean;
  apply(sm: any, r: THREE.WebGLRenderer): void;
}

// What each engine is:
//
// EEVEE  — Rasterization (like a video game engine). Single render pass per
// frame = always 60fps. PCFSoftShadowMap casts a kernel of shadow rays
// and blurs them → soft penumbra. UnrealBloom on bright pixels. ACES
// tone curve. No global illumination. Same algorithm as Blender Eevee.
//
// CYCLES — GPU path tracer via CyclesTracer (three-gpu-pathtracer on WebGPU). On first
// call, builds a BVH (Bounding Volume Hierarchy) over all scene triangles.
// Then each frame fires `_samplesPerFrame` sample passes: per pixel, a ray
// is cast into the scene, bounces N times (8 for GPU / 2 for CPU), and
// accumulates radiance. 1 sample = very noisy; 200+ samples = clean.
// Camera move clears all accumulated samples (same as Blender).
// GPU mode (4 spf × 8 bounces) is substantially heavier per frame than
// Eevee; visible as lower FPS on complex scenes.
//
// RAYCAST — BasicShadowMap = 1 shadow ray per texel, NO PCF filter kernel → crisp
// pixel-edged hard shadows (binary in-shadow / not-in-shadow per pixel).
// This is literally ray casting: a single ray tests occlusion. Cineon tone
// mapping gives a different highlight rolloff from ACES.
export const ENGINES: Record<string, RenderEngine> = {
  eevee: { id: 'eevee', label: 'Eevee', tracer: false, bloom: true, apply(sm: any, r) {
    // PCFShadowMap, not PCFSoftShadowMap — see the constructor's note: soft shadows'
    // multi-tap filtering was the single biggest render-time cost (frameProfiler showed
    // render ~10x tick on a 324K-tri model). This mode is selected by default on load
    // (ViewControls.tsx), so it was the actual default experience, not an opt-in.
    r.shadowMap.type       = THREE.PCFShadowMap;
    r.toneMapping          = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure  = 0.95;
    // Subtle bloom — only very bright highlights (threshold=0.92), narrow spread.
    // Threshold 0.92 means only pixels >92% brightness bloom → no fog.
    sm.bloomPass.strength  = 0.15;
    sm.bloomPass.threshold = 0.92;
    sm.bloomPass.radius    = 0.25;
    if (sm.sun)     { sm.sun.intensity = 3.0;  sm.sun.shadow.radius = 4; }
    if (sm.ambient) sm.ambient.intensity = 1.4;
    if (sm.fill)    sm.fill.intensity    = 0.7;
    if (sm.rim)     sm.rim.intensity     = 0.5;
    sm._teardownPathTracer();
  } },
  cycles: { id: 'cycles', label: 'Cycles', tracer: true, bloom: false, apply(sm: any, r) {
    r.toneMapping         = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    if (sm.sun)     sm.sun.intensity     = 3.0;
    if (sm.ambient) sm.ambient.intensity = 1.2;
    if (sm.fill)    sm.fill.intensity    = 0.6;
    if (sm.rim)     sm.rim.intensity     = 0.4;
    sm._initPathTracer();
  } },
  raycast: { id: 'raycast', label: 'Raycast', tracer: false, bloom: false, apply(sm: any, r) {
    r.shadowMap.type      = THREE.BasicShadowMap;
    r.toneMapping         = THREE.CineonToneMapping;
    r.toneMappingExposure = 1.25;
    if (sm.sun)     { sm.sun.intensity = 3.8;  sm.sun.shadow.radius = 1; }
    if (sm.ambient) sm.ambient.intensity = 0.5;
    if (sm.fill)    sm.fill.intensity    = 1.5;
    if (sm.rim)     sm.rim.intensity     = 1.2;
    sm._teardownPathTracer();
  } },
};
