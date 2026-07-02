/**
 * gizmoUtil — small helpers shared by the viewport's TransformControls gizmos.
 *
 *  • stripNegativeTranslate() removes the negative-direction translate arrows
 *    (and their invisible pickers) so each axis shows only the +X / +Y / +Z
 *    handle, per the requested cleaner gizmo.
 *  • circleSpriteTexture() builds a soft round dot used as the map for
 *    PointsMaterial so vertices render as small circles instead of squares.
 */
import * as THREE from 'three';

const AXIS = { X: 'x', Y: 'y', Z: 'z' };

/** Remove the negative half of the translate gizmo (arrows + pickers).
 *  TransformControls bakes each handle's offset into its geometry and resets
 *  object.position to (0,0,0), so we discriminate by the geometry's bounding-box
 *  center: the negative-axis handle sits at center ≈ -0.5 (gizmo) / -0.3 (picker),
 *  while the positive arrow (+0.5) and the shaft line (+0.25) stay. */
export function stripNegativeTranslate(control: any) {
  const g = control?._gizmo;
  if (!g) return;
  const _c = new THREE.Vector3();
  const strip = (group: any) => {
    if (!group) return;
    for (const child of [...group.children]) {
      const ax = AXIS[child.name as keyof typeof AXIS];
      if (!ax || !child.geometry) continue;
      child.geometry.computeBoundingBox();
      child.geometry.boundingBox.getCenter(_c);
      if ((_c as any)[ax] < -0.05) group.remove(child); // negative-direction handle
    }
  };
  strip(g.gizmo?.translate);
  strip(g.picker?.translate);
}

/** Stop the gizmo's individual axis handles from being frustum-culled.
 *  TransformControls bakes each handle's own offset into its geometry via
 *  `geometry.applyMatrix4(...)` (see stripNegativeTranslate's comment) but never
 *  recomputes the geometry's bounding sphere afterward — so three.js's default
 *  frustum-culling test uses a stale, now-wrong bounding sphere and can decide an
 *  axis handle is off-screen when it isn't. Depending on camera angle this drops
 *  one or more axes (X/Y/Z) silently, leaving only whichever one's stale bounds
 *  still happen to overlap the frustum. A tiny always-visible helper like this
 *  should never be culled, so just turn it off. */
export function disableGizmoFrustumCulling(control: any) {
  const g = control?._gizmo;
  if (!g) return;
  g.traverse((o: any) => { o.frustumCulled = false; });
}

/** TransformControls hides an axis handle whenever it's nearly parallel to the
 *  camera view direction (AXIS_HIDE_THRESHOLD, an internal, unconfigurable
 *  three.js behavior — dragging an arrow pointing straight at/away from the
 *  camera is unusable). That's reasonable for one axis, but depending on the
 *  gizmo's rotation relative to the camera it can end up hiding two of three
 *  axes at once, leaving the group move/rotate gizmo looking broken. Patch the
 *  instance's updateMatrixWorld to re-assert X/Y/Z visibility every frame,
 *  after the library's own hide check has run. */
export function forceGizmoAxesVisible(control: any) {
  const orig = control.updateMatrixWorld.bind(control);
  control.updateMatrixWorld = (force?: boolean) => {
    orig(force);
    const g = control._gizmo;
    if (!g) return;
    for (const key of ['gizmo', 'picker', 'helper']) {
      const group = g[key]?.[control.mode];
      if (!group) continue;
      group.visible = true; // the group itself is also toggled by mode — don't leave it hidden
      for (const child of group.children) {
        if (child.name === 'X' || child.name === 'Y' || child.name === 'Z') child.visible = true;
      }
    }
  };
}

/** Hide TransformControls' own visual handles (arrows / rings / planes and the
 *  drag helper lines) every frame, while leaving its invisible pickers intact so
 *  dragging keeps working. Use this when a separate, constant-screen-size custom
 *  indicator is drawn in the gizmo's place (see ModelEditor's _moveIndicator) —
 *  otherwise the library gizmo and the custom one both render, giving the
 *  "two kinds of axes" double gizmo. Raycasting ignores `.visible`, so the
 *  pickers still register drags even though nothing is drawn. */
export function hideGizmoVisuals(control: any) {
  const g = control?._gizmo;
  if (!g) return;
  const orig = control.updateMatrixWorld.bind(control);
  control.updateMatrixWorld = (force?: boolean) => {
    orig(force);
    for (const key of ['gizmo', 'helper']) {
      const byMode = g[key];
      if (!byMode) continue;
      for (const mode of Object.keys(byMode)) {
        const group = byMode[mode];
        if (group) group.visible = false;
      }
    }
  };
}

const _cssPos = new THREE.Vector3();

/** Rescale `target` every frame so it stays ~`pixels` tall on screen regardless
 *  of camera distance / zoom — the standard Blender & Fusion 360 behavior for
 *  manipulator gizmos and overlay markers (they never grow or shrink as you
 *  zoom). `driver` must be a mesh that actually gets drawn, because three.js
 *  only fires onBeforeRender on rendered meshes, never on Groups; `target` is
 *  what gets scaled (often the driver's parent group). `unitScale` is the
 *  target's design size in world units that should map to `pixels`. */
export function constantScreenSize(
  driver: any,
  target: any,
  pixels: number,
  unitScale = 1,
  heightFrac = 0,
) {
  driver.onBeforeRender = (renderer: any, _scene: any, camera: any) => {
    target.getWorldPosition(_cssPos);
    const h = renderer.domElement.height || 1;
    // heightFrac sizes the marker as a fraction of the canvas height instead of
    // a fixed pixel count, so it grows/shrinks with the window/viewport rather
    // than staying a fixed (and, on big canvases, tiny) pixel size.
    const px = heightFrac > 0 ? h * heightFrac : pixels;
    let world: number;
    if (camera.isPerspectiveCamera) {
      const dist = _cssPos.distanceTo(camera.position);
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      world = (px / h) * 2 * dist * Math.tan(fovRad / 2);
    } else {
      world = (px / h) * (camera.top - camera.bottom);
    }
    target.scale.setScalar(world / unitScale);
  };
}

let _circleTex: any = null;

/** A cached round-dot texture for vertex points (drawn once on a canvas). */
export function circleSpriteTexture() {
  if (_circleTex) return _circleTex;
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  _circleTex = new THREE.CanvasTexture(cv);
  _circleTex.minFilter = THREE.LinearFilter;
  return _circleTex;
}
