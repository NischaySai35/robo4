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

    // Resilient per-object draw: a single object whose material throws inside
    // setProgram/refreshUniforms must NOT abort the whole frame (which silently drops
    // every object drawn AFTER it in the render order — e.g. the mesh-edit overlay).
    // Catch it, skip just that object, and let the rest of the frame render. This is a
    // permanent safety net; it warns once per distinct offender so real bugs stay
    // visible without spamming the console every frame.
    {
      const r: any = this.renderer;
      const orig = r.renderBufferDirect.bind(r);
      const warned = new Set<string>();
      r.renderBufferDirect = (camera: any, scene: any, geometry: any, material: any, object: any, group: any) => {
        try {
          return orig(camera, scene, geometry, material, object, group);
        } catch (e) {
          const key = `${object?.type}/${object?.name || '?'}/${material?.type}`;
          if (!warned.has(key)) {
            warned.add(key);
            console.warn('[SceneManager] skipped an object that failed to render:', key, e);
          }
          // skip this object this frame — the rest of the scene still draws
        }
      };
    }

    // ── Scene ─────────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4f2ee);
    this.scene.fog = null;

    // ── Camera ─────────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(52, w / h, 0.005, 200);
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
    this.controls.maxPolarAngle = Math.PI; // full sphere — allows looking from below
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

    // ── Fusion-360-style smart orbit pivot + green-dot indicator ──────────────
    // OrbitControls always looks at controls.target, so orbiting around an OFF-axis
    // point by moving the target shifts the whole scene (three.js #18476). Instead we
    // disable OrbitControls' rotate and orbit the camera RIG rigidly about a chosen
    // pivot P — rotating both the camera position AND orientation about P keeps P
    // pinned on screen with ZERO jump. Pan/zoom stay with OrbitControls.
    //
    // Pivot P is chosen like Fusion: (1) the geometry under the cursor, else (2) the
    // model's bounding-box centre when the whole model is on-screen, else (3) the
    // nearest geometry to the camera. A small green dot marks P while you orbit.
    this.controls.enableRotate = false;
    const _UP = new THREE.Vector3(0, 1, 0);
    const _ray = new THREE.Raycaster();
    const _tmpV = new THREE.Vector3();
    const _fwd = new THREE.Vector3();
    let _orbit: { px: number; py: number; P: THREE.Vector3; active: boolean } | null = null;

    const ndcOf = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 } as THREE.Vector2;
    };
    const modelHit = (ndc: THREE.Vector2): THREE.Vector3 | null => {
      const grp = bridge.getModelGroup?.();
      if (!grp) return null;
      _ray.setFromCamera(ndc, this.camera);
      for (const h of _ray.intersectObjects([grp], true)) {
        const o = h.object as any;
        if (o.visible && o.isMesh && !(o.material && o.material.depthTest === false)) return h.point.clone();
      }
      return null;
    };
    const pickPivot = (ndc: THREE.Vector2): THREE.Vector3 => {
      const hit = modelHit(ndc);                              // 1) geometry under cursor
      if (hit) return hit;
      const box = bridge.getFitBox?.() as THREE.Box3 | null | undefined;
      if (!box || box.isEmpty()) return this.controls.target.clone();
      this.camera.updateMatrixWorld();
      const frustum = new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
      if (frustum.containsPoint(box.min) && frustum.containsPoint(box.max))
        return box.getCenter(new THREE.Vector3());           // 2) whole model on-screen → centre
      return modelHit({ x: 0, y: 0 } as THREE.Vector2)       // 3a) nearest geometry ahead
        ?? box.clampPoint(this.camera.position, new THREE.Vector3()); // 3b) nearest bbox point
    };
    const rotateRig = (q: THREE.Quaternion, P: THREE.Vector3) => {
      this.camera.position.sub(P).applyQuaternion(q).add(P);
      this.camera.quaternion.premultiply(q);
      // Keep OrbitControls' target on the camera forward axis so its per-frame
      // update()/lookAt(target) stays a no-op (no fight with the rig rotation).
      this.camera.getWorldDirection(_fwd);
      this.controls.target.copy(this.camera.position).addScaledVector(_fwd, this.camera.position.distanceTo(P));
    };

    this._onOrbitDown = (e: PointerEvent) => {
      if (e.button !== 0 || !this.controls.enabled) return;
      _orbit = { px: e.clientX, py: e.clientY, P: pickPivot(ndcOf(e)), active: false };
    };
    this._onOrbitMove = (e: PointerEvent) => {
      if (!_orbit) return;
      // A gizmo / IK "drag tip" grab disables the controls AFTER pointer-down — bail so
      // the camera never orbits while you're actually dragging a body or a handle.
      if (!this.controls.enabled) { if (_orbit.active) this._hidePivotDot(); _orbit = null; return; }
      const dx = e.clientX - _orbit.px, dy = e.clientY - _orbit.py;
      if (!_orbit.active) {
        if (Math.hypot(e.clientX - _orbit.px, e.clientY - _orbit.py) < 4) return; // still a click
        _orbit.active = true;
        this._showPivotDot(_orbit.P);
        canvas.setPointerCapture?.(e.pointerId);
      }
      const h = canvas.clientHeight || 1;
      const az = (-2 * Math.PI * dx) / h, pol = (-2 * Math.PI * dy) / h;
      const right = _tmpV.setFromMatrixColumn(this.camera.matrix, 0).normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(_UP, az)
        .multiply(new THREE.Quaternion().setFromAxisAngle(right, pol));
      rotateRig(q, _orbit.P);
      _orbit.px = e.clientX; _orbit.py = e.clientY;
    };
    this._onOrbitUp = (e: PointerEvent) => {
      if (_orbit?.active) { this._hidePivotDot(); canvas.releasePointerCapture?.(e.pointerId); }
      _orbit = null;
    };
    canvas.addEventListener('pointerdown', this._onOrbitDown);
    canvas.addEventListener('pointermove', this._onOrbitMove);
    window.addEventListener('pointerup', this._onOrbitUp);

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
    bridge.updateCameraLimits = () => this.updateCameraLimits();

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
      if (fin(p.minDistance)) ctl.minDistance = Math.max(0.001, p.minDistance);
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
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL(mime, quality);
    };

    // Small downscaled JPEG of the current frame, for project-card thumbnails.
    bridge.captureThumbnail = (maxDim = 256) => {
      // Render inside a try-catch: if materials are mid-recompile (e.g. called from
      // the autoSave setInterval between RAF frames), the render can crash and leave
      // the WebGL context dirty. resetState() restores bindings so the main loop survives.
      try {
        this.renderer.render(this.scene, this.camera);
      } catch {
        this.renderer.resetState();
        return '';
      }
      const src = this.renderer.domElement;
      const scale = Math.min(1, maxDim / Math.max(src.width, src.height));
      const w = Math.max(1, Math.round(src.width * scale));
      const h = Math.max(1, Math.round(src.height * scale));
      if (!this._thumbCanvas) this._thumbCanvas = document.createElement('canvas');
      const c = this._thumbCanvas;
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
    ground.userData.isGround = true;
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
    grid.userData.isGround = true;
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
      if (!obj.isMesh || !obj.geometry) return;
      if (obj.userData?.isConnector || obj.userData?.isCollision || obj.userData?.isGround || obj.userData?.isGizmo) return;
      // Check EFFECTIVE visibility: walk the parent chain — Three.js stores visibility
      // locally per object, so a child can have visible=true even when its parent is
      // hidden. TransformControls does exactly this, adding ~7K phantom triangles.
      let cur: any = obj;
      while (cur) { if (!cur.visible) return; cur = cur.parent; }
      const geo = obj.geometry;
      if (geo.index) triangles += geo.index.count / 3;
      else if (geo.attributes?.position) triangles += geo.attributes.position.count / 3;
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
  animateCameraTo(targetPos: any, targetLookAt: any, ms = 950) {
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
   * Recompute camera min/max zoom limits and near/far clip planes from the
   * current model bounding sphere. Called whenever bodies are added/removed/moved.
   *
   * Limits:
   *   minDistance = max(0.001, radius * 0.002)  — can get within ~0.2% of model size
   *   maxDistance = radius * 300                — zoom out 300× the model radius
   *   near = max(0.0001, radius * 0.0005)       — no near-clip even at 1 mm from surface
   *   far  = maxDistance * 4                    — never far-clip
   *
   * If no model exists yet, sensible small-scene defaults are applied.
   * Clamps the current camera distance into the new limits without jumping.
   */
  updateCameraLimits() {
    const box = bridge.getFitBox ? bridge.getFitBox() : null;
    let radius: number;
    if (box && !box.isEmpty()) {
      radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.05);
    } else {
      // No geometry yet — use a sensible 1 m default world
      radius = 1;
    }

    const minDist = Math.max(0.001, radius * 0.002);
    const maxDist = Math.max(minDist * 2, radius * 300);
    const near    = Math.max(0.0001, radius * 0.0005);
    const far     = Math.max(maxDist * 4, 1000);

    this.controls.minDistance = minDist;
    this.controls.maxDistance = maxDist;
    this.camera.near = near;
    this.camera.far  = far;
    this.camera.updateProjectionMatrix();

    // Clamp current camera distance into the new range without repositioning
    const dir = this.camera.position.clone().sub(this.controls.target);
    const curDist = dir.length();
    if (curDist > 1e-6) {
      const clamped = THREE.MathUtils.clamp(curDist, minDist, maxDist);
      if (Math.abs(clamped - curDist) > 1e-6) {
        this.camera.position.copy(
          this.controls.target.clone().add(dir.normalize().multiplyScalar(clamped))
        );
      }
    }
    this.controls.update();
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

    // Apply the same wide limits as updateCameraLimits() so you can freely
    // zoom to 0.2% in or 300× out after fitting.
    this.controls.minDistance = Math.max(0.001, radius * 0.002);
    this.controls.maxDistance = Math.max(fitDist * 2, radius * 300);
    this.camera.near = Math.max(0.0001, radius * 0.0005);
    this.camera.far  = Math.max(this.controls.maxDistance * 4, 1000);
    this.camera.updateProjectionMatrix();

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
      // Render directly to screen. The EffectComposer's ping-pong render targets
      // force LinearSRGBColorSpace output on first material compilation, which
      // corrupts materialProperties.uniforms for STL-asset bodies (opacity missing).
      // Tone mapping, ACES, and SRGB output are all handled by renderer settings,
      // so visual quality is identical. UnrealBloom was threshold=0.92 (nearly invisible).
      // Per-object failures are already contained by the resilient renderBufferDirect
      // wrapper installed in the constructor (a single bad object is skipped, not the
      // whole frame). This outer catch is only a last-resort guard for an error thrown
      // outside that path; it evicts cached material properties and retries once.
      try {
        this.renderer.render(this.scene, this.camera);
      } catch {
        this.renderer.resetState();
        const props: any = (this.renderer as any).properties;
        this.scene.traverse((o: any) => {
          if (!o.material) return;
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            props?.remove?.(m);
            m.needsUpdate = true;
          }
        });
        try { this.renderer.render(this.scene, this.camera); } catch { /* give up for this frame */ }
      }
    }
  }

  /** Show the green orbit-pivot dot at world point P, sized for ~constant screen size. */
  _showPivotDot(P: any) {
    if (!this._pivotDot) {
      this._pivotDot = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 14),
        new THREE.MeshBasicMaterial({ color: 0x27e36a, depthTest: false, transparent: true, opacity: 0.95 }),
      );
      this._pivotDot.renderOrder = 3000;
      this.scene.add(this._pivotDot);
    }
    this._pivotDot.position.copy(P);
    // Rig rotation keeps |camera − P| constant during the orbit, so this size holds.
    const s = this.camera.position.distanceTo(P) * 0.011;
    this._pivotDot.scale.setScalar(Math.max(1e-4, s));
    this._pivotDot.visible = true;
  }
  _hidePivotDot() { if (this._pivotDot) this._pivotDot.visible = false; }

  dispose() {
    this._resizeObserver.disconnect();
    if (this._onOrbitDown) this.canvas.removeEventListener('pointerdown', this._onOrbitDown);
    if (this._onOrbitMove) this.canvas.removeEventListener('pointermove', this._onOrbitMove);
    if (this._onOrbitUp) window.removeEventListener('pointerup', this._onOrbitUp);
    this._pivotDot?.geometry?.dispose?.();
    this._pivotDot?.material?.dispose?.();
    this._pathTracer?.dispose();
    this.renderer.dispose();
    this.composer.dispose();
  }
}

function easeInOut(t: any) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}