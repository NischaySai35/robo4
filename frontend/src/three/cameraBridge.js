/**
 * cameraBridge — module-level singleton so React components can reach
 * Three.js camera state without prop-drilling.
 *
 * SceneManager sets the fields after construction.
 * RenderLoop sets getArmNodes.
 * NavigationGizmo / ViewControls read from them.
 */
export const bridge = {
  camera:       null,
  animateTo:    null, // (pos, lookAt, ms?) => void
  fitCamera:    null, // () => void
  orbitDelta:   null, // (dx, dy) => void  — gizmo drag orbit
  getArmNodes:  null, // () => {x,y,z}[]   — current joint world positions
};
