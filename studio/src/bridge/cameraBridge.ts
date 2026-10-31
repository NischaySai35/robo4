/**
 * cameraBridge — how React components reach a viewport's Three.js state without prop-drilling.
 *
 * Each SceneManager owns a ViewportHandle and it, SimCanvas and ModelEditor write to that handle.
 * NavigationGizmo, ViewControls, the menus and the panels read `bridge`, which forwards to the
 * active viewport. See docs/design/p2-viewport-context.md.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Result of a viewport pivot pick. Declared HERE, with the contract, rather than in
 * PivotPickTool: this file sits below the UI layer so that engine code may read the
 * bridge, and importing a type out of viewport/ would have dragged the whole render
 * layer back across that line for the sake of three plain fields.
 */
export interface PivotPickResult {
  worldPosition: import('three').Vector3;
  suggestedAxis?: import('three').Vector3; // from cylinder detection or face normal
  snapType: string;
}
export interface CameraBridge {
  camera: any;
  scene?: any;
  animateTo: ((pos: any, lookAt: any, ms?: number) => void) | null;
  fitCamera: (() => void) | null;
  orbitDelta: ((dx: number, dy: number) => void) | null;
  // Set by SceneManager; read/written by the Camera Settings panel.
  getCameraState?: () => {
    fov: number; focalLength: number; near: number; far: number;
    minDistance: number; maxDistance: number; distance: number;
  };
  applyCameraState?: (patch: Partial<{
    fov: number; focalLength: number; near: number; far: number;
    minDistance: number; maxDistance: number; distance: number;
  }>) => void;
  captureImage?: (mime?: string, quality?: number) => string;
  captureThumbnail?: (maxDim?: number) => string;
  // Snap to an axis view while preserving the current orbit target (pan-aware).
  snapToAxis?: (dir: number[], ms?: number) => void;
  // Autonomy: cast a LiDAR scan from a world point (default: robot base) against
  // the scene; returns the scan (also pushed to the autonomy store + overlay).
  scanLidar?: (origin?: [number, number, number]) => any;
  // Recompute camera min/max zoom limits from current model bounding sphere.
  updateCameraLimits?: () => void;
  // On-demand rendering: request the viewport to draw the next few frames (idle scene rests).
  requestRender?: (n?: number) => void;
  // Joint pivot "click to place" — activates the PivotPickTool in the viewport.
  startPivotPick?: (opts: { onPick: (result: PivotPickResult) => void; onCancel: () => void }) => void;
  cancelPivotPick?: () => void;
  // Set later by SimCanvas; optional so reads are type-safe before assignment.
  getFitBox?: (...args: any[]) => any;
  getModelGroup?: (...args: any[]) => any;
  orientSelectionAxis?: (axis: 'x' | 'y' | 'z') => { ok: boolean; error?: string };
  loadScene?: (data: any, opts?: any) => { ok: boolean; error?: string } | void;
  exportModel?: (fmt: any) => { ok: boolean; error?: string } | void;
  undo?: () => void;
  redo?: () => void;
  // Axis-modal transform (press X/Y/Z while gizmo is visible)
  startAxisModal?: (axis: 'x'|'y'|'z') => void;
  commitAxisModal?: (exactMeters?: number) => void;
  cancelAxisModal?: () => void;
  // Render utilities
  captureStream?: (fps?: number) => MediaStream | null;
  setRenderScale?: (scale: number) => void;
  setRenderResolution?: (w: number, h: number) => void;
  resetRenderResolution?: () => void;
  setRenderEngine?: (engine: string) => void;
  getRenderEngine?: () => string;
  getPathTracerSamples?: () => number;
  markSceneChanged?: () => void;
  getRendererStats?: () => { triangles: number };
  setComputeDevice?: (device: 'cpu' | 'gpu') => void;
  getComputeDevice?: () => 'cpu' | 'gpu';
  setMaxSamples?: (n: number) => void;
  getMaxSamples?: () => number;
  setWireframe?: (on: boolean) => void;
  getWireframe?: () => boolean;
  setConnectorsVisible?: (on: boolean) => void;
  getConnectorsVisible?: () => boolean;
  // World positions in metres of the bodies this viewport draws, for a score of the robot on screen.
  getBodyCentres?: () => [number, number, number][];
}

export type ViewportKind = 'editor' | 'msrr';
export interface ViewportHandle extends CameraBridge { kind: ViewportKind }

const DEFAULTS: CameraBridge = { camera: null, animateTo: null, fitCamera: null, orbitDelta: null };
const viewports: ViewportHandle[] = [];
let active: ViewportHandle | null = null;

/** Called by SceneManager: one handle per viewport. A new Editor viewport doesn't take focus from another viewport. */
export function createViewport(kind: ViewportKind): ViewportHandle {
  const h: ViewportHandle = { kind, ...DEFAULTS };
  viewports.push(h);
  if (!active || kind !== 'editor') active = h;
  return h;
}

export function releaseViewport(h: ViewportHandle) {
  const i = viewports.indexOf(h);
  if (i >= 0) viewports.splice(i, 1);
  if (active === h) active = viewports.find((v) => v.kind === 'editor') ?? viewports[viewports.length - 1] ?? null;
}

/** The canvas under the pointer is the active viewport, like Blender's context from the region under the mouse. */
export function setActiveViewport(h: ViewportHandle) { active = h; }
export function activeViewport() { return active; }

const editorViewport = () => viewports.find((v) => v.kind === 'editor') ?? null;

/**
 * Reads: active viewport, then the Editor, then the defaults. The Editor fallback is needed: on MSRR,
 * undo and loadScene still act on the Editor's project. Writes throw, because a write through here
 * would land on whichever viewport happens to be active.
 */
export const bridge: CameraBridge = new Proxy(DEFAULTS, {
  get(_t, k: string) {
    const a = active as any, e = editorViewport() as any, d = DEFAULTS as any;
    return a?.[k] ?? e?.[k] ?? d[k];
  },
  set(_t, k: string) {
    throw new Error(`bridge.${k}: write to the viewport that owns it, through its ViewportHandle`);
  },
});
