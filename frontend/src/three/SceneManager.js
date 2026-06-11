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
    this.controls.enablePan = false; // keep arm always in view
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
    // Dark reflective ground plane
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xe0dbd4,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid overlay
    const gridHelper = new THREE.GridHelper(28, 28, 0x9aafcc, 0xbccce0);
    gridHelper.position.y = -3.19;
    gridHelper.material.opacity = 0.55;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    this.ground = ground;
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
   * Fit the camera to frame all arm nodes perfectly.
   * Uses bridge.getArmNodes() to get current joint world positions.
   * Preserves current azimuth, sets a clean elevation angle, and sizes
   * distance so the entire arm fills about 70% of the viewport.
   */
  fitCamera() {
    const nodes = bridge.getArmNodes ? bridge.getArmNodes() : null;
    if (!nodes || nodes.length === 0) return;

    const pts = nodes.map(n => new THREE.Vector3(n.x, n.y, n.z));
    const center = new THREE.Vector3();
    pts.forEach(p => center.add(p));
    center.divideScalar(pts.length);

    let maxDist = 0;
    pts.forEach(p => { maxDist = Math.max(maxDist, p.distanceTo(center)); });
    maxDist = Math.max(maxDist, 0.5);

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
