/**
 * CyclesTracer — the Cycles engine: three-gpu-pathtracer's WebGPUPathTracer on its own canvas.
 *
 * A canvas can only hold one kind of context, and SceneManager's canvas is WebGL, so the
 * tracer draws to an overlay placed exactly over it. The overlay ignores the pointer, so
 * orbit, picking and gizmos keep working on the canvas underneath. three/webgpu is large
 * and only Cycles needs it, so it is loaded the first time Cycles is switched on.
 */
import * as THREE from 'three';

const SAMPLE_POLL_MS = 500;

const isTraceable = (m: any) => !!m && !Array.isArray(m) && m.isMeshStandardMaterial;

export class CyclesTracer {
  [key: string]: any;

  static get supported(): boolean {
    return !!(navigator as any).gpu;
  }

  constructor(host: HTMLCanvasElement) {
    const overlay = document.createElement('canvas');
    overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    host.parentElement!.appendChild(overlay);
    this.overlay = overlay;
    this.samples = 0;
    this._lastPoll = 0;
  }

  /** Create the renderer and tracer. Resolves once renderSample() may be called. */
  async init(pixelRatio: number, toneMapping: number, exposure: number) {
    const [{ WebGPURenderer }, { WebGPUPathTracer }] = await Promise.all([
      import('three/webgpu'),
      import('three-gpu-pathtracer/webgpu'),
    ]);
    const renderer: any = new WebGPURenderer({ canvas: this.overlay });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(this.overlay.clientWidth, this.overlay.clientHeight, false);
    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = exposure;
    await renderer.init();
    this.renderer = renderer;

    const tracer: any = new WebGPUPathTracer(renderer);
    // Show path traced output immediately: no delay, no low-res preview, no fade.
    tracer.renderDelay = 0;
    tracer.minSamples = 1;
    tracer.fadeDuration = 0;
    tracer.dynamicLowRes = false;
    this.tracer = tracer;
  }

  /** Trace only what is on screen. The tracer walks every object regardless of `visible` and
   *  can't read anything but standard materials, so the grid, gizmos and overlays are left out. */
  setScene(scene: any, camera: any) {
    scene.updateMatrixWorld(true);
    const view = new THREE.Scene();
    view.background = scene.background;
    view.environment = scene.environment;
    scene.traverseVisible((o: any) => {
      if (o.isMesh && isTraceable(o.material) && !o.userData.isGizmo && !o.userData.isConnector && !o.userData.isCollision) {
        const proxy = new THREE.Mesh(o.geometry, o.material);
        proxy.matrixAutoUpdate = false;
        proxy.matrix.copy(o.matrixWorld);
        view.add(proxy);
      } else if (o.isLight) {
        const light = o.clone(false);
        o.getWorldPosition(light.position);
        if (o.target) {
          light.target = new THREE.Object3D();
          o.target.getWorldPosition(light.target.position);
          view.add(light.target);
        }
        view.add(light);
      }
    });
    this.tracer.setScene(view, camera);
    this.samples = 0;
  }
  updateCamera() { this.tracer.updateCamera(); this.samples = 0; }
  setBounces(n: number) { this.tracer.maxBounces = n; this.samples = 0; }
  setMaxSamples(n: number) { this.tracer.maxSamples = n; }
  setSize(w: number, h: number) { this.renderer.setSize(w, h, false); }

  renderSample() {
    this.tracer.renderSample();
    // The count is read back from the GPU, so ask for it a few times a second, not every frame.
    const now = performance.now();
    if (now - this._lastPoll < SAMPLE_POLL_MS) return;
    this._lastPoll = now;
    this.tracer.getSampleCountsAsync().then((c: any) => { this.samples = c.avg; }).catch(() => {});
  }

  /** The current image as a data URL. Must be drawn in this same task, or the canvas reads blank. */
  capture(mime: string, quality: number): string {
    this.tracer.renderSample();
    return this.overlay.toDataURL(mime, quality);
  }

  dispose() {
    this.tracer?.dispose();
    this.renderer?.dispose();
    this.overlay.remove();
  }
}
