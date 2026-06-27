/**
 * SceneManager — owns the Three.js renderer, scene, camera,
 * OrbitControls, post-processing, and ground.
 * No store imports here; everything is driven by RenderLoop.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { bridge } from './cameraBridge';

export class SceneManager {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  constructor(canvas: any) {
    this.canvas = canvas;
    this._init();
  }

  _init() {
    const canvas = this.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // ── Renderer ─────────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ── Scene ─────────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4f2ee);
    this.scene.fog = null;

    // ── Camera ─────────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 100);
    // Arm extends ~0→6 along X; look at its midpoint from a 45° front-elevated angle
    this.camera.position.set(3, 4, 10);
    this.camera.lookAt(3, 0, 0);

    // ── Lights ────────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xc8d8f0, 1.5);
    this.ambient = ambient;
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.8);
    this.sun = sun;
    sun.position.set(5, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xb0c8f0, 0.8);
    this.fill = fill;
    fill.position.set(-5, 4, -3);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xe8f0ff, 0.5);
    this.rim = rim;
    rim.position.set(0, -3, -8);
    this.scene.add(rim);

    // ── Ground ────────────────────────────────────────────────────────────────
    this._buildGround();

    // ── OrbitControls ─────────────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 25;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;       // pan along camera view plane
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN; // middle-drag = pan (scroll wheel still zooms)
    this.controls.target.set(3, 0, 0);

    // Reset Cycles accumulation whenever the camera changes.
    // OrbitControls fires 'change' on every drag/zoom/pan/damping frame.
    this.controls.addEventListener('change', () => {
      if (this._engineMode === 'cycles' && this._pathTracer) {
        this._pathTracer.updateCamera();
      }
    });

    // ── Post-processing ───────────────────────────────────────────────────────
    this._buildPostProcessing(w, h);

    // ── Resize observer ───────────────────────────────────────────────────────
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(canvas.parentElement);

    // Register with bridge so React components can access camera + controls
    bridge.camera = this.camera;
    bridge.scene = this.scene; // exposed for the Analysis split's secondary view
    bridge.animateTo = (pos, lookAt, ms) => this.animateCameraTo(pos, lookAt, ms);
    bridge.fitCamera = () => this.fitCamera();

    // Camera Settings panel: read current lens/control state…
    bridge.getCameraState = () => ({
      fov:         this.camera.fov,
      focalLength: this.camera.getFocalLength(),
      near:        this.camera.near,
      far:         this.camera.far,
      minDistance: this.controls.minDistance,
      maxDistance: this.controls.maxDistance,
      distance:    this.camera.position.distanceTo(this.controls.target),
    });
    // …and apply a partial patch (only the fields present are changed).
    // Every value is validated: a non-finite number (e.g. from a half-typed
    // input) is ignored so it can never poison the projection matrix and blank
    // the viewport.
    bridge.applyCameraState = (p: any) => {
      const cam = this.camera, ctl = this.controls;
      const fin = (v: any) => typeof v === 'number' && Number.isFinite(v);
      if (fin(p.focalLength)) cam.setFocalLength(THREE.MathUtils.clamp(p.focalLength, 8, 300));
      if (fin(p.fov))         cam.fov = THREE.MathUtils.clamp(p.fov, 10, 120);
      if (fin(p.near))        cam.near = Math.max(0.001, p.near);
      if (fin(p.far))         cam.far = Math.max(cam.near + 0.01, p.far);
      cam.updateProjectionMatrix();
      if (fin(p.minDistance)) ctl.minDistance = Math.max(0.1, p.minDistance);
      if (fin(p.maxDistance)) ctl.maxDistance = Math.max(ctl.minDistance, p.maxDistance);
      if (fin(p.distance)) {
        const dir = cam.position.clone().sub(ctl.target);
        if (dir.lengthSq() < 1e-9) dir.set(0, 0, 1);
        dir.normalize().multiplyScalar(THREE.MathUtils.clamp(p.distance, ctl.minDistance, ctl.maxDistance));
        cam.position.copy(ctl.target).add(dir);
      }
      ctl.update();
    };

    // Snap the camera to look down `dir` (e.g. [1,0,0] for +X) while KEEPING the
    // current orbit target — so axis views / perspective reset pivot around the
    // place you panned to, not the scene origin.
    bridge.snapToAxis = (dir: number[], ms?: number) => {
      const t = this.controls.target.clone();
      const dist = Math.max(this.camera.position.distanceTo(t), 0.5);
      const v = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize().multiplyScalar(dist);
      const pos = t.clone().add(v);
      this.animateCameraTo({ x: pos.x, y: pos.y, z: pos.z }, { x: t.x, y: t.y, z: t.z }, ms);
    };

    // Capture the current frame as a data URL (used by the Render → Export
    // button). Force a fresh composite first so the read-back is never blank.
    bridge.captureImage = (mime = 'image/png', quality = 0.92) => {
      this.composer.render();
      return this.renderer.domElement.toDataURL(mime, quality);
    };

    // Small downscaled JPEG of the current frame, for project-card thumbnails.
    bridge.captureThumbnail = (maxDim = 256) => {
      this.composer.render();
      const src = this.renderer.domElement;
      const scale = Math.min(1, maxDim / Math.max(src.width, src.height));
      const w = Math.max(1, Math.round(src.width * scale));
      const h = Math.max(1, Math.round(src.height * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return '';
      ctx.drawImage(src, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.55);
    };

    // Gizmo drag: orbit camera without OrbitControls event interference
    bridge.orbitDelta = (dx, dy) => {
      const target = this.controls.target.clone();
      const offset = this.camera.position.clone().sub(target);
      const sp = new THREE.Spherical().setFromVector3(offset);
      sp.theta -= dx * 0.008;
      sp.phi = Math.max(0.05, Math.min(Math.PI * 0.47, sp.phi - dy * 0.006));
      offset.setFromSpherical(sp);
      this.camera.position.copy(target).add(offset);
      this.controls.target.copy(target);
      this.controls.update();
    };

    // Ensure correct pixel-perfect resolution after DOM layout settles
    requestAnimationFrame(() => this._onResize());
  }

  _buildGround() {
    const GROUND_Y = -3.2;

    // Faint ground plane (shadow receiver). Large + follows the camera so it
    // never runs out; still 90% transparent so rods dipping below stay visible.
    const groundGeo = new THREE.PlaneGeometry(1000, 1000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xd2ccc2,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;

    // Infinite grid: a large plane that follows the camera, with grid lines
    // computed in WORLD space (so they stay put while the plane tracks the view)
    // and a radial distance-fade so there is never a visible edge.
    const gridGeo = new THREE.PlaneGeometry(4000, 4000);
    const gridMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uCell:       { value: 1.0 },                       // minor cell size (world units)
        uMajor:      { value: 10.0 },                      // major line every N cells
        uColor:      { value: new THREE.Color(0xa7b9d2) }, // minor line colour (darker)
        uColorMajor: { value: new THREE.Color(0x8499b8) }, // major line colour (darker)
        uCenter:     { value: new THREE.Vector3() },       // fade centre (look-at point)
        uFade:       { value: 60.0 },                      // fade radius (scales with zoom)
      },
      vertexShader: /* glsl */`
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec3 vWorld;
        uniform float uCell;
        uniform float uMajor;
        uniform vec3  uColor;
        uniform vec3  uColorMajor;
        uniform vec3  uCenter;
        uniform float uFade;

        // Anti-aliased grid line intensity for a given cell size (uses derivatives).
        float lineFactor(vec2 coord, float cell) {
          vec2 c = coord / cell;
          vec2 d = abs(fract(c - 0.5) - 0.5) / fwidth(c);
          return 1.0 - min(min(d.x, d.y), 1.0);
        }

        void main() {
          vec2 p = vWorld.xz;
          float minorL = lineFactor(p, uCell);
          float majorL = lineFactor(p, uCell * uMajor);

          float dist = length(p - uCenter.xz);
          float fade = 1.0 - smoothstep(uFade * 0.5, uFade, dist);

          float a = max(minorL * 0.46, majorL * 0.82) * fade;
          if (a < 0.002) discard;

          vec3 col = majorL > minorL ? uColorMajor : uColor;
          gl_FragColor = vec4(col, a);
        }
      `,
    });
    (gridMat as any).extensions = { derivatives: true }; // for fwidth on WebGL1

    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = GROUND_Y + 0.01;
    grid.renderOrder = 1;
    grid.frustumCulled = false;
    this.scene.add(grid);
    this.grid = grid;
  }

  // Switch scene background / grid / ground colours for light or dark theme.
  applyTheme(theme: any) {
    const dark = theme === 'dark';
    this._theme = theme;
    this.scene.background = new THREE.Color(dark ? 0x0d111b : 0xf4f2ee);
    if (this.ground) {
      this.ground.material.color.set(dark ? 0x11161f : 0xd2ccc2);
      this.ground.material.opacity = dark ? 0.18 : 0.13;
    }
    if (this.grid) {
      this.grid.material.uniforms.uColor.value.set(dark ? 0x33405c : 0xa7b9d2);
      this.grid.material.uniforms.uColorMajor.value.set(dark ? 0x55659a : 0x8499b8);
    }
  }

  // Keep the infinite ground + grid centred on the view and sized to the zoom.
  _updateGround() {
    const t = this.controls.target;
    if (this.ground) { this.ground.position.x = t.x; this.ground.position.z = t.z; }
    if (this.grid) {
      this.grid.position.x = t.x;
      this.grid.position.z = t.z;
      this.grid.material.uniforms.uCenter.value.set(t.x, 0, t.z);
      const camDist = this.camera.position.distanceTo(t);
      this.grid.material.uniforms.uFade.value =
        THREE.MathUtils.clamp(camDist * 2.2, 30, 600);
    }
  }

  _buildPostProcessing(w: any, h: any) {
    this.composer = new EffectComposer(this.renderer);
    this._renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this._renderPass);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.20, 0.40, 0.85);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this._engineMode    = 'eevee';
    this._pathTracer    = null as WebGLPathTracer | null;
    this._computeDevice = 'gpu';
    this._maxSamples    = 32;
  }

  // ── setRenderEngine ───────────────────────────────────────────────────────────
  //
  // EEVEE  — Rasterization (like a video game engine). Single render pass per
  //          frame = always 60fps. PCFSoftShadowMap casts a kernel of shadow rays
  //          and blurs them → soft penumbra. UnrealBloom on bright pixels. ACES
  //          tone curve. No global illumination. Same algorithm as Blender Eevee.
  //
  // CYCLES — GPU path tracer via WebGLPathTracer (three-gpu-pathtracer). On first
  //          call, builds a BVH (Bounding Volume Hierarchy) over all scene triangles.
  //          Then each frame fires `_samplesPerFrame` sample passes: per pixel, a ray
  //          is cast into the scene, bounces N times (8 for GPU / 2 for CPU), and
  //          accumulates radiance. 1 sample = very noisy; 200+ samples = clean.
  //          Camera move clears all accumulated samples (same as Blender).
  //          GPU mode (4 spf × 8 bounces) is substantially heavier per frame than
  //          Eevee; visible as lower FPS on complex scenes.
  //
  // RAYCAST — BasicShadowMap = 1 shadow ray per texel, NO PCF filter kernel → crisp
  //           pixel-edged hard shadows (binary in-shadow / not-in-shadow per pixel).
  //           This is literally ray casting: a single ray tests occlusion. Cineon tone
  //           mapping gives a different highlight rolloff from ACES.
  setRenderEngine(mode: string) {
    this._engineMode = mode;
    const r = this.renderer;

    this._renderPass.enabled = (mode !== 'cycles');
    this.bloomPass.enabled   = (mode === 'eevee');

    switch (mode) {
      case 'eevee':
        r.shadowMap.type       = THREE.PCFSoftShadowMap;
        r.toneMapping          = THREE.ACESFilmicToneMapping;
        r.toneMappingExposure  = 0.95;
        // Subtle bloom — only very bright highlights (threshold=0.92), narrow spread.
        // Threshold 0.92 means only pixels >92% brightness bloom → no fog.
        this.bloomPass.strength  = 0.15;
        this.bloomPass.threshold = 0.92;
        this.bloomPass.radius    = 0.25;
        if (this.sun)     { this.sun.intensity = 3.0;  this.sun.shadow.radius = 4; }
        if (this.ambient) this.ambient.intensity = 1.4;
        if (this.fill)    this.fill.intensity    = 0.7;
        if (this.rim)     this.rim.intensity     = 0.5;
        this._teardownPathTracer();
        break;

      case 'cycles':
        r.toneMapping         = THREE.ACESFilmicToneMapping;
        r.toneMappingExposure = 1.0;
        if (this.sun)     this.sun.intensity     = 3.0;
        if (this.ambient) this.ambient.intensity = 1.2;
        if (this.fill)    this.fill.intensity    = 0.6;
        if (this.rim)     this.rim.intensity     = 0.4;
          this._initPathTracer();
        break;

      case 'raycast':
        r.shadowMap.type      = THREE.BasicShadowMap;
        r.toneMapping         = THREE.CineonToneMapping;
        r.toneMappingExposure = 1.25;
        if (this.sun)     { this.sun.intensity = 3.8;  this.sun.shadow.radius = 1; }
        if (this.ambient) this.ambient.intensity = 0.5;
        if (this.fill)    this.fill.intensity    = 1.5;
        if (this.rim)     this.rim.intensity     = 1.2;
        this._teardownPathTracer();
        break;
    }

    r.shadowMap.needsUpdate = true;
  }

  _initPathTracer() {
    if (!this._pathTracer) {
      this._pathTracer = new WebGLPathTracer(this.renderer);
      // Show path traced output immediately — no delay, no min-sample ramp.
      this._pathTracer.renderDelay    = 0;
      this._pathTracer.minSamples     = 1;
      this._pathTracer.fadeDuration   = 0;
      this._pathTracer.rasterizeScene = false; // never fall back to Eevee on move
      // 1×1 tiles: each renderSample() completes one FULL sample in one frame.
      // Default 3×3=9 tiles means 9 frames per sample → visible lag on first drag frame.
      // At 1×1 the first sample appears the very next frame after a camera reset.
      (this._pathTracer as any)._pathTracer.tiles.set(1, 1);
    }
    this._pathTracer.bounces = this._computeDevice === 'gpu' ? 5 : 2;
    // Hide ShaderMaterial objects (grid) — path tracer can't handle custom shaders.
    const gridWasVisible = this.grid?.visible ?? true;
    if (this.grid) this.grid.visible = false;
    this._pathTracer.setScene(this.scene, this.camera);
    if (this.grid) this.grid.visible = gridWasVisible;
  }

  _teardownPathTracer() {
    this._pathTracer?.dispose();
    this._pathTracer = null;
  }

  setComputeDevice(device: 'cpu' | 'gpu') {
    this._computeDevice = device;
    if (this._pathTracer) {
      this._pathTracer.bounces = device === 'gpu' ? 5 : 2;
      this._pathTracer.reset();
    }
  }

  setMaxSamples(n: number) {
    this._maxSamples = Math.max(1, Math.min(1024, Math.round(n)));
    // If path tracer was paused at old limit, unpause so it can run to new limit.
    if (this._pathTracer) this._pathTracer.pausePathTracing = false;
  }

  getMaxSamples(): number {
    return this._maxSamples ?? 16;
  }

  getPathTracerSamples(): number {
    return Math.floor(this._pathTracer?.samples ?? 0);
  }

  markPathTracerDirty() {
    if (this._pathTracer && this._engineMode === 'cycles') {
      const gridWasVisible = this.grid?.visible ?? true;
      if (this.grid) this.grid.visible = false;
      this._pathTracer.setScene(this.scene, this.camera);
      if (this.grid) this.grid.visible = gridWasVisible;
    }
  }

  getRendererStats() {
    let triangles = 0;
    this.scene.traverse((obj: any) => {
      if (!obj.isMesh || !obj.visible || !obj.geometry) return;
      if (obj.userData?.isConnector || obj.userData?.isCollision || obj.userData?.isGround) return;
      const geo = obj.geometry;
      if (geo.index) {
        triangles += geo.index.count / 3;
      } else if (geo.attributes?.position) {
        triangles += geo.attributes.position.count / 3;
      }
    });
    return { triangles: Math.round(triangles) };
  }

  getComputeDevice(): 'cpu' | 'gpu' {
    return this._computeDevice ?? 'gpu';
  }

  _onResize() {
    const canvas = this.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
  }

  /** Enable or disable orbit controls (disabled while dragging). */
  setOrbitEnabled(enabled: any) {
    this.controls.enabled = enabled;
  }

  /** Animate camera to a target position/lookAt over `ms` milliseconds. */
  animateCameraTo(targetPos: any, targetLookAt: any, ms = 700) {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPos = new THREE.Vector3(...(Object.values(targetPos) as number[]));
    const endTarget = new THREE.Vector3(...(Object.values(targetLookAt) as number[]));
    const startTime = performance.now();

    const tick = () => {
      const t = Math.min((performance.now() - startTime) / ms, 1);
      const ease = easeInOut(t);
      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      this.controls.update();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /**
   * Fit the camera to frame all model bodies. Preserves current azimuth, sets a
   * clean elevation, and sizes distance so content fills ~70% of the viewport.
   * No content → no-op.
   */
  fitCamera() {
    const box = bridge.getFitBox ? bridge.getFitBox() : null;
    if (!box || box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    // Bounding-sphere radius of the content (no hard floor → tiny parts frame closely).
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.05);

    // Distance so the content fills ~70% of the viewport, scaled purely by its size.
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const fitDist  = (radius * 1.45) / Math.tan(halfFov);

    // Dynamically size the depth range + zoom limits to the object so nothing clips
    // and you can zoom in/out proportionally to how big the model is.
    this.camera.near = Math.max(0.005, radius * 0.02);
    this.camera.far  = Math.max(fitDist * 6, radius * 50);
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = Math.max(radius * 0.3, 0.05);
    this.controls.maxDistance = fitDist * 8;

    // Preserve azimuth (horizontal angle), set elevation to a clean ~25°
    const offset = this.camera.position.clone().sub(this.controls.target);
    const sp = new THREE.Spherical().setFromVector3(offset);
    sp.radius = fitDist;
    sp.phi = Math.max(0.35, Math.min(Math.PI * 0.44, sp.phi)); // 20°–80° elevation

    offset.setFromSpherical(sp);
    const newPos = center.clone().add(offset);

    this.animateCameraTo(
      { x: newPos.x, y: newPos.y, z: newPos.z },
      { x: center.x, y: center.y, z: center.z }
    );
  }

  render() {
    this.controls.update();
    this._updateGround();

    if (this._engineMode === 'cycles' && this._pathTracer) {
      // Pause once we hit the user's sample limit (unpause when limit changes).
      this._pathTracer.pausePathTracing =
        Math.floor(this._pathTracer.samples) >= (this._maxSamples ?? 16);
      this._pathTracer.renderSample();
    } else {
      this.composer.render();
    }
  }

  dispose() {
    this._resizeObserver.disconnect();
    this._pathTracer?.dispose();
    this.renderer.dispose();
    this.composer.dispose();
  }
}

function easeInOut(t: any) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}