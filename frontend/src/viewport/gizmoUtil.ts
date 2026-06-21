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
export function stripNegativeTranslate(control) {
  const g = control?._gizmo;
  if (!g) return;
  const _c = new THREE.Vector3();
  const strip = (group) => {
    if (!group) return;
    for (const child of [...group.children]) {
      const ax = AXIS[child.name];
      if (!ax || !child.geometry) continue;
      child.geometry.computeBoundingBox();
      child.geometry.boundingBox.getCenter(_c);
      if (_c[ax] < -0.05) group.remove(child); // negative-direction handle
    }
  };
  strip(g.gizmo?.translate);
  strip(g.picker?.translate);
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
