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
import { bridge } from './cameraBridge.js';

export class SceneManager {
  constructor(canvas) {
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
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.8);
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
    fill.position.set(-5, 4, -3);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xe8f0ff, 0.5);
    rim.position.set(0, -3, -8);
    this.scene.add(rim);

    // ── Ground ────────────────────────────────────────────────────────────────
    this._buildGround();

    // ── OrbitControls ─────────────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 25;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;       // pan along camera view plane
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN; // middle-drag = pan (scroll wheel still zooms)
    this.controls.target.set(3, 0, 0);

    // ── Post-processing ───────────────────────────────────────────────────────
    this._buildPostProcessing(w, h);

    // ── Resize observer ───────────────────────────────────────────────────────
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(canvas.parentElement);

    // Register with bridge so React components can access camera + controls
    bridge.camera = this.camera;
    bridge.animateTo = (pos, lookAt, ms) => this.animateCameraTo(pos, lookAt, ms);
    bridge.fitCamera = () => this.fitCamera();

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
    gridMat.extensions = { derivatives: true }; // for fwidth on WebGL1

    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = GROUND_Y + 0.01;
    grid.renderOrder = 1;
    grid.frustumCulled = false;
    this.scene.add(grid);
    this.grid = grid;
  }

  // Switch scene background / grid / ground colours for light or dark theme.
  applyTheme(theme) {
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

  _buildPostProcessing(w, h) {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.18,  // strength
      0.25,  // radius
      0.95   // threshold — high so near-white background does NOT bloom
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
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
  setOrbitEnabled(enabled) {
    this.controls.enabled = enabled;
  }

  /** Animate camera to a target position/lookAt over `ms` milliseconds. */
  animateCameraTo(targetPos, targetLookAt, ms = 700) {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPos = new THREE.Vector3(...Object.values(targetPos));
    const endTarget = new THREE.Vector3(...Object.values(targetLookAt));
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
    const maxDist = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.5);

    // Distance so the arm bounding sphere fills ~70% of the viewport
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const fitDist  = Math.max((maxDist * 1.45) / Math.tan(halfFov), 4);

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
    this.composer.render();
  }

  dispose() {
    this._resizeObserver.disconnect();
    this.renderer.dispose();
    this.composer.dispose();
  }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
