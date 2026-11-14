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
import { CyclesTracer } from '@/viewport/cyclesTracer';
import { ENGINES } from '@/viewport/engines';
import { createViewport, releaseViewport, setActiveViewport, type ViewportHandle, type ViewportKind } from '@/bridge/cameraBridge';
import { scheduleFrame } from '@/runtime/frameScheduler';

export class SceneManager {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  /** This viewport's own context; see docs/design/p2-viewport-context.md. */
  viewport: ViewportHandle;
  _onActivate: () => void;

  constructor(canvas: any, kind: ViewportKind = 'editor') {
    this.viewport = createViewport(kind);
    this._onActivate = () => setActiveViewport(this.viewport);
    canvas.addEventListener('pointerenter', this._onActivate);
    canvas.addEventListener('pointerdown', this._onActivate);
    this.canvas = canvas;
    this._init();
  }

  _init() {
    const canvas = this.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // ── Renderer ─────────────────────────────────────────────────────────────
    // antialias: false — MSAA is explicitly flagged by Chromium's own driver bug list as
    // unacceptably slow on Intel integrated GPUs (chrome://gpu: "On Intel GPUs MSAA
    // performance is not acceptable for GPU rasterization", workaround `msaa_is_slow`).
    // Measured live on an Intel UHD 620: an 80-draw-call, 323K-triangle scene (trivial by
    // any real GPU's standard) was taking 100-200ms/frame — this was the dominant cost,
    // not triangle count or shadow quality. Was `true`.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    // Was PCFSoftShadowMap: soft shadows do several taps per fragment sampling the shadow
    // map, on top of a full extra geometry pass (the light-perspective depth render) every
    // frame — measured (frameProfiler) at ~90-180ms/frame render time on a 324K-triangle
    // model, the dominant cost by ~10x over physics tick time. PCFShadowMap is a single
    // hardware-filtered tap, visually close enough for this app's flat lighting, at a
    // fraction of the fragment cost.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
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
    // a panel that mounts hidden is 0 px tall: w / 0 = NaN would poison the first Fit (blank viewport, Nischay 12 Nov)
    this.camera = new THREE.PerspectiveCamera(52, w > 0 && h > 0 ? w / h : 1, 0.005, 200);
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
    // Was 2048x2048: 4x the shadow-map texels to rasterize AND sample every frame for a cost
    // most models here don't need — halving it cuts that pass's fragment work by 4x. See the
    // shadowMap.type note above for the measured render-time breakdown.
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
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
    this.controls.zoomToCursor = true;             // wheel zooms toward what's under the cursor (Fusion / Blender)
    this.controls.target.set(3, 0, 0);

    // Reset Cycles accumulation whenever the camera changes.
    // OrbitControls fires 'change' on every drag/zoom/pan/damping frame.
    this.controls.addEventListener('change', () => {
      this.requestRender(2); // on-demand: camera moved → draw
      if (ENGINES[this._engineMode]?.tracer && this._pathTracer) {
        this._pathTracer.updateCamera();
      }
    });
    // On-demand rendering (like Blender): only draw when something changed, so an idle scene
    // uses ~0 GPU. Any interaction with the canvas requests a burst that also covers damping.
    for (const ev of ['pointerdown', 'pointermove', 'wheel']) {
      canvas.addEventListener(ev, () => this.requestRender(30), { passive: true });
    }
    window.addEventListener('pointerup', () => this.requestRender(90)); // let orbit inertia settle
    this._renderReq = 30; // draw the first frames on startup

    // ── Fusion-360-style smart orbit pivot + green-dot indicator ──────────────
    // OrbitControls always looks at controls.target, so orbiting around an OFF-axis
    // point by moving the target shifts the whole scene (three.js #18476). Instead we
    // disable OrbitControls' rotate and orbit the camera RIG rigidly about a chosen
    // pivot P — rotating both the camera position AND orientation about P keeps P
    // pinned on screen with ZERO jump. Pan/zoom stay with OrbitControls.
    //
    // Pivot P is chosen like Fusion: (1) the geometry under the cursor, else (2) the
    // geometry NEAR the cursor (within NEAR_PX on screen), else (3) the centre of the
    // model's solids when the whole model is on-screen, else the nearest geometry ahead.
    // "Model" = viewport.getModelGroup() — every canvas (Editor, Animation, MSRR) lists
    // its own. A small green dot marks P while you orbit.
    this.controls.enableRotate = false;
    const _UP = new THREE.Vector3(0, 1, 0);
    const _ray = new THREE.Raycaster();
    const _tmpV = new THREE.Vector3();
    const _fwd = new THREE.Vector3();
    let _orbit: { px: number; py: number; ndc: THREE.Vector2; P: THREE.Vector3 | null; active: boolean } | null = null;

    const ndcOf = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 } as THREE.Vector2;
    };
    // A "solid" = a mesh you can see and that is part of the model: not an overlay drawn on
    // top (depthTest off: labels, port balls, CoM ball), not an invisible pick plane, and
    // not inside a hidden parent.
    const isSolid = (o: any, root: THREE.Object3D): boolean => {
      if (!o.isMesh) return false;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.visible === false || m.depthTest === false || (m.transparent && m.opacity < 0.05)) return false;
      for (let p = o; p && p !== root.parent; p = p.parent) if (!p.visible) return false;
      return true;
    };
    const solids = (): THREE.Mesh[] => {
      const grp = this.viewport.getModelGroup?.() as THREE.Object3D | null | undefined;
      const out: THREE.Mesh[] = [];
      if (grp) { grp.updateMatrixWorld(true); grp.traverse((o: any) => { if (isSolid(o, grp)) out.push(o); }); }
      return out;
    };
    const worldBox = (o: THREE.Mesh, b = new THREE.Box3()) => {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      return b.copy(o.geometry.boundingBox!).applyMatrix4(o.matrixWorld);
    };
    const firstHit = (ndc: THREE.Vector2, objs: THREE.Object3D[]): THREE.Vector3 | null => {
      _ray.setFromCamera(ndc, this.camera);
      const h = _ray.intersectObjects(objs, false)[0];
      return h ? h.point.clone() : null;
    };
    // FIT frames these points: every solid's box corners (tight for long / diagonal robots),
    // else the Viewport's own fit box.
    this._fitPoints = (): THREE.Vector3[] | null => {
      const meshes = solids(), pts: THREE.Vector3[] = [], b = new THREE.Box3();
      const corners = (bx: THREE.Box3) => { for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? bx.max.x : bx.min.x, i & 2 ? bx.max.y : bx.min.y, i & 4 ? bx.max.z : bx.min.z)); };
      if (meshes.length) for (const o of meshes) corners(worldBox(o, b));
      else { const fb = this.viewport.getFitBox?.() as THREE.Box3 | null | undefined; if (fb && !fb.isEmpty()) corners(fb); }
      return pts.length ? pts : null;
    };
    const NEAR_PX = 56;   // Fusion-like "near the model" reach around the cursor
    const pickPivot = (ndc: THREE.Vector2): THREE.Vector3 => {
      const meshes = solids();
      if (meshes.length) {
        const hit = firstHit(ndc, meshes);                    // 1) geometry under the cursor
        if (hit) return hit;
        // 2) geometry NEAR the cursor: the parts whose screen rectangle is within NEAR_PX,
        //    then rays in growing rings around the cursor — the first ring that touches a
        //    part gives the surface point closest (on screen) to where you grabbed.
        const W = canvas.clientWidth || 1, H = canvas.clientHeight || 1;
        const cx = (ndc.x + 1) * 0.5 * W, cy = (1 - ndc.y) * 0.5 * H;
        const b = new THREE.Box3(), c = new THREE.Vector3();
        const near: { o: THREE.Mesh; d: number }[] = [];
        for (const o of meshes) {
          worldBox(o, b);
          if (b.containsPoint(this.camera.position)) continue;
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, behind = false;
          for (let i = 0; i < 8; i++) {
            c.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(this.camera);
            if (c.z > 1) { behind = true; break; }
            const sx = (c.x + 1) * 0.5 * W, sy = (1 - c.y) * 0.5 * H;
            x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
          }
          if (behind) continue;
          const d = Math.hypot(Math.max(x0 - cx, 0, cx - x1), Math.max(y0 - cy, 0, cy - y1));
          if (d <= NEAR_PX) near.push({ o, d });
        }
        if (near.length) {
          near.sort((a, z) => a.d - z.d);
          const cand = near.slice(0, 6).map((n) => n.o);
          const p = new THREE.Vector2();
          for (let r = 6; r <= NEAR_PX; r += 6) {
            let best: THREE.Vector3 | null = null, bestD = Infinity;
            for (let k = 0; k < 16; k++) {
              const a = (k / 16) * Math.PI * 2;
              p.set(((cx + r * Math.cos(a)) / W) * 2 - 1, -((cy + r * Math.sin(a)) / H) * 2 + 1);
              const h = firstHit(p, cand);
              const dd = h ? h.distanceTo(this.camera.position) : Infinity;
              if (dd < bestD) { best = h; bestD = dd; }
            }
            if (best) return best;
          }
        }
      }
      // 3) nothing near: the centre of the model's solids (labels, arrows and helper balls
      //    don't count), or the Viewport's own fit box when it lists no model group.
      let box: THREE.Box3 | null | undefined = null;
      if (meshes.length) { box = new THREE.Box3(); const b = new THREE.Box3(); for (const o of meshes) box.union(worldBox(o, b)); }
      else box = this.viewport.getFitBox?.() as THREE.Box3 | null | undefined;
      if (!box || box.isEmpty()) return this.controls.target.clone();
      this.camera.updateMatrixWorld();
      const frustum = new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
      if (frustum.containsPoint(box.min) && frustum.containsPoint(box.max))
        return box.getCenter(new THREE.Vector3());           // whole model on-screen → its centre
      return (meshes.length ? firstHit({ x: 0, y: 0 } as THREE.Vector2, meshes) : null) // 3a) nearest geometry ahead
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
      // The pivot is picked when the drag starts (a plain click never pays for the search).
      _orbit = { px: e.clientX, py: e.clientY, ndc: ndcOf(e), P: null, active: false };
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
        _orbit.P = pickPivot(_orbit.ndc);
        this._showPivotDot(_orbit.P);
        canvas.setPointerCapture?.(e.pointerId);
      }
      const h = canvas.clientHeight || 1;
      const az = (-2 * Math.PI * dx) / h, pol = (-2 * Math.PI * dy) / h;
      const right = _tmpV.setFromMatrixColumn(this.camera.matrix, 0).normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(_UP, az)
        .multiply(new THREE.Quaternion().setFromAxisAngle(right, pol));
      rotateRig(q, _orbit.P!);
      _orbit.px = e.clientX; _orbit.py = e.clientY;
    };
    this._onOrbitUp = (e: PointerEvent) => {
      if (_orbit?.active) { this._hidePivotDot(); canvas.releasePointerCapture?.(e.pointerId); }
      _orbit = null;
    };
    canvas.addEventListener('pointerdown', this._onOrbitDown);
    canvas.addEventListener('pointermove', this._onOrbitMove);
    window.addEventListener('pointerup', this._onOrbitUp);

    // ── Zoom onto the surface under the cursor (Fusion / Blender "zoom to mouse") ──
    // OrbitControls' wheel step is a fraction of the camera→target distance, so a target left
    // behind by an orbit/pan makes zoom stall short of the model (or fly through it). Before each
    // wheel step, put the target at the depth of the surface under the cursor: zoom then slows
    // as you near the surface and stops at minDistance from it. Capture on the parent so this
    // runs before OrbitControls' own wheel listener on the canvas. One ray per ~100 ms at most.
    let _lastAim = 0;
    this._onAimWheel = (e: WheelEvent) => {
      if (e.target !== canvas || !this.controls.enabled || !this.controls.enableZoom) return;
      const now = performance.now();
      if (now - _lastAim < 100) return;
      _lastAim = now;
      const meshes = solids();
      if (!meshes.length) return;
      const hit = firstHit(ndcOf(e), meshes);
      if (!hit) return;
      this.camera.getWorldDirection(_fwd);
      const depth = _tmpV.copy(hit).sub(this.camera.position).dot(_fwd);
      if (depth > 1e-5) this.controls.target.copy(this.camera.position).addScaledVector(_fwd, depth);
    };
    this._aimHost = canvas.parentElement;
    this._aimHost?.addEventListener('wheel', this._onAimWheel, { capture: true, passive: true });

    // ── Post-processing ───────────────────────────────────────────────────────
    this._buildPostProcessing(w, h);

    // ── Resize observer ───────────────────────────────────────────────────────
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(canvas.parentElement);

    // Register with this viewport so React components can access camera + controls
    this.viewport.camera = this.camera;
    this.viewport.scene = this.scene; // exposed for the Analysis split's secondary view
    this.viewport.animateTo = (pos, lookAt, ms) => this.animateCameraTo(pos, lookAt, ms);
    this.viewport.fitCamera = () => this.fitCamera();
    this.viewport.updateCameraLimits = () => this.updateCameraLimits();
    this.viewport.requestRender = (n?: number) => this.requestRender(n ?? 4); // any UI change → redraw

    // Camera Settings panel: read current lens/control state…
    this.viewport.getCameraState = () => ({
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
    this.viewport.applyCameraState = (p: any) => {
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
    this.viewport.snapToAxis = (dir: number[], ms?: number) => {
      const t = this.controls.target.clone();
      const dist = Math.max(this.camera.position.distanceTo(t), 0.5);
      const v = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize().multiplyScalar(dist);
      const pos = t.clone().add(v);
      this.animateCameraTo({ x: pos.x, y: pos.y, z: pos.z }, { x: t.x, y: t.y, z: t.z }, ms);
    };

    // Capture the current frame as a data URL (used by the Render → Export
    // button). Force a fresh composite first so the read-back is never blank.
    this.viewport.captureImage = (mime = 'image/png', quality = 0.92) => {
      if (this._pathTracer) return this._pathTracer.capture(mime, quality);
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL(mime, quality);
    };

    // Small downscaled JPEG of the current frame, for project-card thumbnails.
    this.viewport.captureThumbnail = (maxDim = 256) => {
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
    this.viewport.orbitDelta = (dx, dy) => {
      const target = this.controls.target.clone();
      const offset = this.camera.position.clone().sub(target);
      const sp = new THREE.Spherical().setFromVector3(offset);
      sp.theta -= dx * 0.008;
      sp.phi = Math.max(0.01, Math.min(Math.PI - 0.01, sp.phi - dy * 0.006)); // full orbit, under the floor too
      offset.setFromSpherical(sp);
      this.camera.position.copy(target).add(offset);
      this.controls.target.copy(target);
      this.controls.update();
    };

    // The one floor's height: ModelEditor's gravity physics moves it to its physics floor (no second floor of its own).
    this.viewport.setFloorY = (y: number | null) => this.setFloorY(y);

    scheduleFrame(() => this._onResize());
  }

  _buildGround() {
    const GROUND_Y = -3.2;

    // Blender-style floor (Nischay 12 Nov: "the Blender kind of smooth floor"): no solid slab, no edge.
    // The ground is a SHADOW CATCHER only - invisible except where the robot's shadow falls - so it never
    // shows a horizon band, and the camera can orbit under it and see the robot from below.
    // Unit plane, scaled to the view in _updateGround.
    const groundGeo = new THREE.PlaneGeometry(1, 1);
    const groundMat = new THREE.ShadowMaterial({ transparent: true, opacity: 0.3, depthWrite: false });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    this.scene.add(ground);
    this.ground = ground; this._groundY0 = GROUND_Y;

    // Infinite grid like Blender's viewport grid: lines in WORLD space on a plane that follows the view,
    //  - the cell size follows the zoom and the levels CROSS-FADE (small lines fade out, the 10x lines take
    //    over) instead of popping,
    //  - lines fade with distance from the camera AND when seen edge-on, so nothing ever "hits the camera"
    //    or ends in a hard horizon,
    //  - the X axis (red) and Z axis (blue) run through the origin, like Blender's red/green lines.
    const gridGeo = new THREE.PlaneGeometry(1, 1);
    const gridMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uLevel: { value: -1.0 },                         // log10 of the smallest visible cell (continuous)
        uColor: { value: new THREE.Color(0x8a9ab3) },    // grid line colour
        uAxisX: { value: new THREE.Color(0xd9534f) },    // X axis line
        uAxisZ: { value: new THREE.Color(0x4a7fd6) },    // Z axis line
        uFade:  { value: 20.0 },                         // distance (m) where the grid is gone
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
        uniform float uLevel;
        uniform vec3  uColor;
        uniform vec3  uAxisX;
        uniform vec3  uAxisZ;
        uniform float uFade;

        // Anti-aliased 1-pixel grid line intensity for a cell size (screen-space derivatives).
        float lineFactor(vec2 coord, float cell) {
          vec2 c = coord / cell;
          vec2 d = abs(fract(c - 0.5) - 0.5) / max(fwidth(c), 1e-6);
          return 1.0 - min(min(d.x, d.y), 1.0);
        }
        // Weight of the level whose cell is 10^k: fades in once it is big enough on screen, gets bolder as it grows.
        float levelWeight(float k) {
          float s = k - uLevel;
          return smoothstep(-1.0, 0.0, s) * 0.55 + smoothstep(0.0, 1.0, s) * 0.35;
        }

        void main() {
          vec2 p = vWorld.xz;
          float l0 = floor(uLevel);
          float a = 0.0;
          for (int i = 0; i < 3; i++) {
            float k = l0 + float(i);
            a = max(a, lineFactor(p, pow(10.0, k)) * levelWeight(k));
          }
          // axis lines through the origin, ~1.5 px wide
          vec2 w = max(fwidth(p), vec2(1e-6));
          float ax = 1.0 - min(abs(p.y) / (w.y * 1.5), 1.0);   // z = 0 -> the X axis
          float az = 1.0 - min(abs(p.x) / (w.x * 1.5), 1.0);   // x = 0 -> the Z axis

          vec3 toCam = cameraPosition - vWorld;
          float fade = 1.0 - smoothstep(uFade * 0.25, uFade, length(toCam));
          float edgeOn = smoothstep(0.0, 0.1, abs(normalize(toCam).y));   // fade out when seen flat-on
          float vis = fade * edgeOn;

          vec3 col = uColor;
          float alpha = a;
          if (ax > 0.0) { col = mix(col, uAxisX, ax); alpha = max(alpha, ax * 0.85); }
          if (az > 0.0) { col = mix(col, uAxisZ, az); alpha = max(alpha, az * 0.85); }
          alpha *= vis;
          if (alpha < 0.003) discard;
          gl_FragColor = vec4(col, alpha);
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
    this.scene.background = new THREE.Color(dark ? 0x2b2b2b : 0xf4f2ee);
    this._paintGround();
    if (this.grid) {
      const u = this.grid.material.uniforms;
      u.uColor.value.set(dark ? 0x8a8a8a : 0x7f90ab);
      u.uAxisX.value.set(dark ? 0xc0504d : 0xd9534f);
      u.uAxisZ.value.set(dark ? 0x4f7fc8 : 0x4a7fd6);
    }
  }

  /** REAL FLOOR (Nischay 5 Nov: every tab and viewport except the Editor): the floor sits where the physics floor is
   *  (height 0, or the height ModelEditor's gravity physics reports through setFloorY) and catches the robots' shadows, the
   *  grid lying on it. Off (Editor): it sits below the model. Either way it is see-through and can be orbited under
   *  (Blender style, 12 Nov) - ONE floor for every tab, nobody draws a second one. */
  realFloor = false;
  _floorY: number | null = null;
  setRealFloor(on: boolean) {
    this.realFloor = on;
    this._placeFloor();
  }
  /** Physics floor height in world metres (ModelEditor's gravity floor); null = height 0. */
  setFloorY(y: number | null) {
    this._floorY = y;
    this._placeFloor();
  }
  _placeFloor() {
    const y = this.realFloor ? (this._floorY ?? 0) : this._groundY0;
    if (this.ground) this.ground.position.y = y;
    if (this.grid) this.grid.position.y = y + 0.0005;
    this._paintGround();
    this.requestRender?.(3);
  }

  _paintGround() {
    if (!this.ground) return;
    this.ground.material.opacity = this._theme === 'dark' ? 0.45 : 0.22;   // shadow darkness
  }

  // Keep the infinite ground + grid centred on the view and sized to the zoom.
  _updateGround() {
    const t = this.controls.target;
    const camDist = Math.max(this.camera.position.distanceTo(t), 1e-4);
    const fadeDist = THREE.MathUtils.clamp(camDist * 8, 2, 4000);
    const span = fadeDist * 2.5;
    if (this.ground) { this.ground.position.x = t.x; this.ground.position.z = t.z; this.ground.scale.set(span, span, 1); }
    if (this.grid) {
      this.grid.position.x = t.x;
      this.grid.position.z = t.z;
      this.grid.scale.set(span, span, 1);
      const u = this.grid.material.uniforms;
      u.uFade.value = fadeDist;
      // smallest cell ~ 1/20 of the view distance: 2 m away -> 10 cm cells cross-fading into 1 m cells
      u.uLevel.value = Math.log10(camDist) - 1.3;
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
    this._pathTracer    = null as CyclesTracer | null;
    this._computeDevice = 'gpu';
    this._maxSamples    = 32;
  }

  setRenderEngine(mode: string) {
    const engine = ENGINES[mode];
    if (!engine) { console.warn(`No render engine "${mode}". Engines: ${Object.keys(ENGINES).join(', ')}.`); return; }
    this._engineMode = mode;
    this._renderPass.enabled = !engine.tracer;
    this.bloomPass.enabled = engine.bloom;
    engine.apply(this, this.renderer);
    this.renderer.shadowMap.needsUpdate = true;
  }

  _initPathTracer() {
    if (this._pathTracer || this._pathTracerLoading) { this.markPathTracerDirty(); return; }
    if (!CyclesTracer.supported) {
      console.warn('Cycles needs WebGPU, which this browser does not provide. Showing the normal view.');
      return;
    }
    const tracer = new CyclesTracer(this.canvas);
    this._pathTracerLoading = tracer;
    const r = this.renderer;
    tracer.init(r.getPixelRatio(), r.toneMapping, r.toneMappingExposure).then(() => {
      // Switched away while it was loading.
      if (this._pathTracerLoading !== tracer) { tracer.dispose(); return; }
      this._pathTracerLoading = null;
      tracer.setBounces(this._computeDevice === 'gpu' ? 5 : 2);
      tracer.setMaxSamples(this._maxSamples ?? 16);
      tracer.setScene(this.scene, this.camera);
      this._pathTracer = tracer;
    }).catch((e: any) => {
      console.warn('Cycles could not start. Showing the normal view.', e);
      if (this._pathTracerLoading === tracer) this._pathTracerLoading = null;
      tracer.dispose();
    });
  }

  _teardownPathTracer() {
    this._pathTracerLoading = null;
    this._pathTracer?.dispose();
    this._pathTracer = null;
  }

  setComputeDevice(device: 'cpu' | 'gpu') {
    this._computeDevice = device;
    this._pathTracer?.setBounces(device === 'gpu' ? 5 : 2);
  }

  setMaxSamples(n: number) {
    this._maxSamples = Math.max(1, Math.min(1024, Math.round(n)));
    this._pathTracer?.setMaxSamples(this._maxSamples);
  }

  getMaxSamples(): number {
    return this._maxSamples ?? 16;
  }

  getPathTracerSamples(): number {
    return Math.floor(this._pathTracer?.samples ?? 0);
  }

  markPathTracerDirty() {
    if (this._pathTracer && ENGINES[this._engineMode]?.tracer) this._pathTracer.setScene(this.scene, this.camera);
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
    const pending = this._fitPending; this._fitPending = false;
    this.camera.aspect = (this.split ? Math.floor(w / 2) : w) / h;   // split view: each half has half the width
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this._pathTracer?.setSize(w, h);
    if (pending) this.fitCamera();                                   // a Fit asked for while the panel had no size
    this.requestRender(3);
  }

  /** a Fit asked for while the canvas was 0 px (hidden panel): done on the first real resize */
  _fitPending = false;

  /** every camera number finite? One NaN (0-px panel, 0-ms animation) blanks the view for good: Fit started from it too */
  _cameraOk(): boolean {
    const c = this.camera, t = this.controls?.target, ok = (v: THREE.Vector3 | THREE.Quaternion) => [...v.toArray()].every(Number.isFinite);
    return ok(c.position) && ok(c.quaternion) && (!t || ok(t)) && Number.isFinite(c.aspect) && c.aspect > 0
      && Number.isFinite(c.near) && Number.isFinite(c.far) && c.far > c.near;
  }

  /** put a broken camera back to a sane default (then the caller frames the model) */
  _healCamera() {
    const c = this.camera, canvas = this.canvas;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    c.aspect = w > 0 && h > 0 ? (this.split ? Math.floor(w / 2) : w) / h : 1;
    if (!Number.isFinite(c.near) || c.near <= 0) c.near = 0.001;
    if (!Number.isFinite(c.far) || c.far <= c.near) c.far = 1000;
    if (!Number.isFinite(c.fov) || c.fov <= 0) c.fov = 52;
    c.up.set(0, 1, 0);
    c.position.set(0.35, 0.45, 0.8);
    this.controls.target.set(0, 0.05, 0);
    c.lookAt(this.controls.target);
    c.updateProjectionMatrix();
    this.controls.update();
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
    if (![...endPos.toArray(), ...endTarget.toArray()].every(Number.isFinite)) return;   // never animate into NaN
    const startTime = performance.now();

    const tick = () => {
      const t = ms > 0 ? Math.min((performance.now() - startTime) / ms, 1) : 1;          // 0 ms: 0/0 would be NaN
      const ease = easeInOut(t);
      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      this.controls.update();
      if (t < 1) scheduleFrame(tick);
    };
    scheduleFrame(tick);
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
    const box = this.viewport.getFitBox ? this.viewport.getFitBox() : null;
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
   * fresh (a new robot / session, Nischay 7 Nov): also pick a clean 3/4 angle - 30° above the floor, 35° off square to the
   * robot's longest floor direction (the side nearer the camera now). Looking down a lying chain's length made it look standing.
   */
  fitCamera(opts?: { fresh?: boolean }) {
    if (!this.canvas.clientWidth || !this.canvas.clientHeight) { this._fitPending = true; return; }   // hidden: fit once it has a size
    if (!this._cameraOk()) this._healCamera();
    const pts = (this._fitPoints?.() as THREE.Vector3[] | null)?.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
    if (!pts?.length) return;
    const box = new THREE.Box3().setFromPoints(pts);
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.05);

    // View direction: keep the azimuth (horizontal angle), clamp elevation to 20°–80°.
    const offset = this.camera.position.clone().sub(this.controls.target);
    if (offset.lengthSq() < 1e-12) offset.set(0.35, 0.4, 0.75);      // camera sitting on its target: any 3/4 view
    const sp = new THREE.Spherical().setFromVector3(offset);
    sp.phi = Math.max(0.35, Math.min(Math.PI * 0.44, sp.phi));
    if (opts?.fresh) {
      // the robot's longest direction on the floor (2x2 principal axis of x, z); a robot spread evenly keeps the azimuth
      let xx = 0, zz = 0, xz = 0;
      for (const p of pts) { const dx = p.x - center.x, dz = p.z - center.z; xx += dx * dx; zz += dz * dz; xz += dx * dz; }
      const half = Math.atan2(2 * xz, xx - zz) / 2;                  // angle of the long axis from +x
      const tr = xx + zz, det = xx * zz - xz * xz, gap = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      const l1 = tr / 2 + gap, l2 = tr / 2 - gap;
      if (l1 > 1.5 * Math.max(l2, 1e-12)) {
        const axis = Math.atan2(Math.cos(half), Math.sin(half));     // the same axis as a Spherical theta (atan2(x, z))
        const cands = [55, 125, 235, 305].map((d) => axis + THREE.MathUtils.degToRad(d));
        const dist = (a: number) => Math.abs(Math.atan2(Math.sin(a - sp.theta), Math.cos(a - sp.theta)));
        sp.theta = cands.reduce((b, a) => (dist(a) < dist(b) ? a : b));
      }
      sp.phi = THREE.MathUtils.degToRad(60);                          // 30° above the floor
    }
    sp.radius = 1;
    const back = new THREE.Vector3().setFromSpherical(sp);          // centre → camera, unit
    const fwd = back.clone().negate();
    const right = new THREE.Vector3().crossVectors(fwd, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd);

    // Fusion-style tight fit: the closest distance at which every part's corner is inside
    // both the vertical AND horizontal field of view, filling ~85% of the smaller one.
    const FILL = 0.85;
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * FILL;
    const tanH = tanV * this.camera.aspect;
    let fitDist = 0;
    const v = new THREE.Vector3();
    for (const p of pts) {
      v.subVectors(p, center);
      const z = v.dot(fwd);                                          // further away = +
      fitDist = Math.max(fitDist, Math.abs(v.dot(right)) / tanH - z, Math.abs(v.dot(up)) / tanV - z);
    }
    fitDist = Math.max(fitDist, radius * 0.5);

    // Apply the same wide limits as updateCameraLimits() so you can freely
    // zoom to 0.2% in or 300× out after fitting.
    this.controls.minDistance = Math.max(0.001, radius * 0.002);
    this.controls.maxDistance = Math.max(fitDist * 2, radius * 300);
    this.camera.near = Math.max(0.0001, radius * 0.0005);
    this.camera.far  = Math.max(this.controls.maxDistance * 4, 1000);
    this.camera.updateProjectionMatrix();

    const newPos = center.clone().addScaledVector(back, fitDist);
    this.animateCameraTo(
      { x: newPos.x, y: newPos.y, z: newPos.z },
      { x: center.x, y: center.y, z: center.z }
    );
  }

  /** On-demand render bookkeeping: request N frames of drawing (covers transitions/damping). */
  requestRender(n = 2) { this._renderReq = Math.max(this._renderReq ?? 0, n); }
  /** True if a draw is owed this frame (consumes one). Idle → false → GPU rests. */
  shouldRender(): boolean {
    // A hidden canvas keeps its queued requests, so it draws as soon as its page is shown again.
    if (this.canvas.getClientRects().length === 0) return false;
    if ((this._renderReq ?? 0) > 0) { this._renderReq--; return true; }
    return !!this._pathTracer; // Cycles keeps accumulating between input events
  }

  /** Side-by-side view (MSRR split, Nischay 5 Nov): the SAME scene and camera drawn twice, left half then right half; each
   *  callback shows/hides what belongs to its half just before it is drawn; left() is also the state kept between draws.
   *  null = one full view. */
  split: { left: () => void; right: () => void } | null = null;

  /** switch the side-by-side view on/off: the camera's aspect becomes that of ONE half (so Fit, zoom limits and picking frame
   *  the robot for the half it is drawn in), then the robot is framed again */
  setSplit(sp: { left: () => void; right: () => void } | null) {
    this.split = sp;
    this._onResize();
    this.fitCamera();
    this.requestRender(3);
  }

  /** one draw of the scene: whole canvas, or the two halves of a split view (same camera: both halves orbit and zoom together) */
  _draw() {
    const r = this.renderer, sp = this.split;
    if (!sp) { r.render(this.scene, this.camera); return; }
    const size = r.getSize(new THREE.Vector2()), w = size.x, h = size.y, half = Math.floor(w / 2);
    r.setScissorTest(true);
    try {
      r.setViewport(0, 0, half, h); r.setScissor(0, 0, half, h); sp.left(); r.render(this.scene, this.camera);
      r.setViewport(half, 0, w - half, h); r.setScissor(half, 0, w - half, h); sp.right(); r.render(this.scene, this.camera);
    } finally {
      sp.left();                                                    // the normal (left) state between draws: fit / picking see the ideal robot
      r.setScissorTest(false); r.setViewport(0, 0, w, h);
    }
  }

  render() {
    if (!this._cameraOk()) { this._healCamera(); this.fitCamera(); }   // self-heal: a NaN camera draws nothing, forever
    this.controls.update();
    // (12 Nov, Nischay: "the camera is virtual - why does it collide with the floor?") no floor clamp: the camera goes anywhere
    this._updateGround();

    if (ENGINES[this._engineMode]?.tracer && this._pathTracer) {
      this._pathTracer.renderSample(); // stops by itself at the sample limit
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
        this._draw();
        // TEMP DIAGNOSTIC (same opt-in flag as frameProfiler): render() alone was ~100-150ms/frame
        // even with gravity off and physics idle, and switching shadow map type/size barely moved
        // it — so the cost isn't (only) shadow filtering. Dump renderer.info once a second to see
        // whether it's draw-call count (CPU/state-change bound) or triangle/geometry count
        // (fill-rate/vertex bound) that's actually dominating.
        try {
          if (localStorage.getItem('robo_profile') === '1') {
            const now = performance.now();
            if (!this._lastInfoLog || now - this._lastInfoLog > 1000) {
              this._lastInfoLog = now;
              const i = this.renderer.info;
              // eslint-disable-next-line no-console
              console.info(
                `[renderInfo] calls=${i.render.calls} triangles=${i.render.triangles} ` +
                `points=${i.render.points} lines=${i.render.lines} ` +
                `geometries=${i.memory.geometries} textures=${i.memory.textures}`,
              );
            }
          }
        } catch { /* diagnostic only */ }
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
    this.canvas.removeEventListener('pointerenter', this._onActivate);
    this.canvas.removeEventListener('pointerdown', this._onActivate);
    releaseViewport(this.viewport);
    this._resizeObserver.disconnect();
    if (this._onOrbitDown) this.canvas.removeEventListener('pointerdown', this._onOrbitDown);
    if (this._onAimWheel) this._aimHost?.removeEventListener('wheel', this._onAimWheel, { capture: true });
    if (this._onOrbitMove) this.canvas.removeEventListener('pointermove', this._onOrbitMove);
    if (this._onOrbitUp) window.removeEventListener('pointerup', this._onOrbitUp);
    this._pivotDot?.geometry?.dispose?.();
    this._pivotDot?.material?.dispose?.();
    this._teardownPathTracer();
    this.renderer.dispose();
    this.composer.dispose();
  }
}

function easeInOut(t: any) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}