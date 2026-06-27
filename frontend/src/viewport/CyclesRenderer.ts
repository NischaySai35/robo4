/**
 * CyclesRenderer — progressive accumulation path-tracing emulator.
 *
 * How Blender Cycles works:
 *   - Each "sample" fires a ray per pixel and accumulates radiance.
 *   - Sample 1 = pure stochastic noise (each pixel is one random ray result).
 *   - Samples 2→N = averaged. Noise ∝ 1/√N — halve noise every 4× more samples.
 *   - Camera move clears all accumulated samples (restart from noise).
 *
 * How this replicates it (without GPU ray BVH — no compatible library):
 *   1. Each sample renders the scene with randomised shadow-light jitter
 *      (simulates an area/disk light → different shadow pattern every frame).
 *   2. A stochastic noise layer is added per pixel (σ ∝ 1/√sample → averages out).
 *   3. Samples are accumulated in a floating-point render target using an
 *      exponential moving-average blend: accum = lerp(accum, current, 1/N).
 *   4. The accumulated buffer is copied to the canvas each frame.
 *
 * Result:
 *   - Sample 1 : very grainy (TV static look)
 *   - Sample 16: mostly clean with slight grain in dark areas
 *   - Sample 64+: converged, sharp image with soft shadows
 *   - Camera move: instant reset to noise then re-converges
 *   - Slower than Eevee because: full scene re-render + shadow recalc + blend pass
 */

import * as THREE from 'three';

// Accumulation + stochastic noise blend shader.
const BLEND_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BLEND_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tCurrent;   // freshly rendered frame (with light jitter)
  uniform sampler2D tAccum;     // accumulated previous samples
  uniform float     uBlend;     // 1 / sampleCount  (EMA blend factor)
  uniform float     uNoiseMag;  // stochastic noise magnitude for THIS sample
  uniform float     uSeed;      // random seed (changes every frame)

  // Low-discrepancy hash — different per-pixel, per-frame.
  float hash(vec2 p, float s) {
    return fract(sin(dot(p * 31.416 + s, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec4 curr = texture2D(tCurrent, vUv);
    vec4 prev = texture2D(tAccum,   vUv);

    // Add path-tracing-style stochastic grain to this sample.
    // Noise averages to 0 over many samples — same as a path tracer's variance.
    float n = (hash(vUv, uSeed) - 0.5) * 2.0;   // [-1, +1]
    curr.rgb = max(vec3(0.0), curr.rgb + n * uNoiseMag);

    // Blend current into accumulation buffer.
    gl_FragColor = mix(prev, curr, uBlend);
  }
`;


export class CyclesRenderer {
  samples = 0;

  private _r: THREE.WebGLRenderer;
  private _w = 0;
  private _h = 0;

  // 3 HDR render targets for ping-pong accumulation:
  //   rtFrame  = current rendered frame
  //   rtAccumR = read accumulation (previous N-1 samples)
  //   rtAccumW = write accumulation (new blend output)
  private _rtFrame!:  THREE.WebGLRenderTarget;
  private _rtAccumR!: THREE.WebGLRenderTarget;
  private _rtAccumW!: THREE.WebGLRenderTarget;

  // Full-screen quad for blend and copy passes.
  private _fsScene  = new THREE.Scene();
  private _fsCam    = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private _fsMesh!:  THREE.Mesh;
  private _blendMat!: THREE.ShaderMaterial;

  // Sun light base position (saved to restore after jitter).
  private _sunBase: THREE.Vector3 | null = null;
  private _sunRef:  THREE.DirectionalLight | null = null;

  constructor(renderer: THREE.WebGLRenderer) {
    this._r = renderer;
    this._buildRT();
    this._buildQuad();
  }

  private _buildRT() {
    const opts: THREE.RenderTargetOptions = {
      type:          THREE.HalfFloatType,
      minFilter:     THREE.LinearFilter,
      magFilter:     THREE.LinearFilter,
      generateMipmaps: false,
    };
    const w = this._r.domElement.width  || 800;
    const h = this._r.domElement.height || 600;
    this._w = w; this._h = h;
    this._rtFrame  = new THREE.WebGLRenderTarget(w, h, opts);
    this._rtAccumR = new THREE.WebGLRenderTarget(w, h, opts);
    this._rtAccumW = new THREE.WebGLRenderTarget(w, h, opts);
  }

  private _buildQuad() {
    const geo = new THREE.PlaneGeometry(2, 2);

    this._blendMat = new THREE.ShaderMaterial({
      depthTest:  false, depthWrite: false,
      vertexShader:   BLEND_VERT,
      fragmentShader: BLEND_FRAG,
      uniforms: {
        tCurrent:  { value: null },
        tAccum:    { value: null },
        uBlend:    { value: 1.0 },
        uNoiseMag: { value: 0.5 },
        uSeed:     { value: 0.0 },
      },
    });

    this._fsMesh = new THREE.Mesh(geo, this._blendMat);
    this._fsMesh.frustumCulled = false;
    this._fsScene.add(this._fsMesh);
  }

  // Call when the scene or geometry changes (same as Blender's BVH rebuild).
  setScene(_scene: THREE.Scene, _camera: THREE.Camera, sun?: THREE.DirectionalLight | null) {
    if (sun) {
      this._sunRef  = sun;
      this._sunBase = sun.position.clone();
    }
    this.reset();
  }

  // The accumulated texture — point a TexturePass at this to display via composer.
  get accumulatedTexture(): THREE.Texture {
    return this._rtAccumR.texture;
  }

  // Reset accumulated samples (called on camera move or scene change).
  reset() {
    this.samples = 0;
    const r = this._r;
    const prev = r.getRenderTarget();
    // Clear both accumulation buffers to transparent black.
    r.setRenderTarget(this._rtAccumR); r.clear();
    r.setRenderTarget(this._rtAccumW); r.clear();
    r.setRenderTarget(prev);
  }

  setSize(w: number, h: number) {
    if (w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    this._rtFrame.setSize(w, h);
    this._rtAccumR.setSize(w, h);
    this._rtAccumW.setSize(w, h);
    this.reset();
  }

  // Render one accumulated sample. Call multiple times per frame for GPU mode.
  renderSample(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const r = this._r;
    const n = this.samples;

    // ── 1. Jitter the sun light (simulate area/disk light → soft shadows) ──────
    const sun    = this._sunRef;
    const sunBase = this._sunBase;
    let savedSunPos: THREE.Vector3 | null = null;
    if (sun && sunBase) {
      savedSunPos = sun.position.clone();
      // Random offset within a disk (radius = 2.0 world units).
      // Larger radius = more shadow variation per sample = more visible noise
      // in shadow regions, just like path-tracing area-light noise.
      const amp = 2.0;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * amp; // uniform disk sampling
      sun.position.set(
        sunBase.x + Math.cos(angle) * radius,
        sunBase.y + (Math.random() - 0.5) * 0.3,
        sunBase.z + Math.sin(angle) * radius,
      );
      if (sun.shadow) sun.shadow.needsUpdate = true;
    }

    // ── 2. Sub-pixel camera jitter (temporal AA — edges converge smooth) ────────
    // Offset the projection matrix by a sub-pixel random amount.
    const jx = ((Math.random() - 0.5) * 2) / (this._w || 1);
    const jy = ((Math.random() - 0.5) * 2) / (this._h || 1);
    camera.projectionMatrix.elements[8]  = jx;
    camera.projectionMatrix.elements[9]  = jy;

    // ── 3. Render jittered frame to rtFrame ─────────────────────────────────────
    r.setRenderTarget(this._rtFrame);
    r.render(scene, camera);

    // ── 4. Restore sun and camera ────────────────────────────────────────────────
    if (sun && savedSunPos) sun.position.copy(savedSunPos);
    camera.projectionMatrix.elements[8] = 0;
    camera.projectionMatrix.elements[9] = 0;

    // ── 5. Blend rtFrame into accumulation (ping-pong) ───────────────────────────
    // Noise magnitude follows 1/√N — same as Monte Carlo path-tracing variance.
    // Start at 1.2 (very grainy, like sample 1 in Blender Cycles) and fall to
    // ~0.015 at sample 512. Values above 1.0 are clamped by max(0, rgb+n).
    const noiseMag = Math.max(0.008, 0.45 / Math.sqrt(n + 1));
    const blend    = 1.0 / (n + 1); // EMA blend — converges accumulated buffer

    this._blendMat.uniforms.tCurrent.value  = this._rtFrame.texture;
    this._blendMat.uniforms.tAccum.value    = this._rtAccumR.texture;
    this._blendMat.uniforms.uBlend.value    = blend;
    this._blendMat.uniforms.uNoiseMag.value = noiseMag;
    this._blendMat.uniforms.uSeed.value     = Math.random() * 9999;
    this._fsMesh.material = this._blendMat;

    r.setRenderTarget(this._rtAccumW);
    r.render(this._fsScene, this._fsCam);

    // Swap accum buffers (read ↔ write).
    const tmp    = this._rtAccumR;
    this._rtAccumR = this._rtAccumW;
    this._rtAccumW = tmp;

    this.samples++;
    // Caller (SceneManager) reads accumulatedTexture and pipes it through
    // the EffectComposer's TexturePass → canvas. No blit needed here.
  }

  dispose() {
    this._rtFrame.dispose();
    this._rtAccumR.dispose();
    this._rtAccumW.dispose();
    this._blendMat.dispose();
    (this._fsMesh.geometry as THREE.BufferGeometry).dispose();
  }
}
