/**
 * cameraBridge — module-level singleton so React components can reach Three.js
 * state without prop-drilling.
 *
 * SceneManager sets camera/animateTo/fitCamera/orbitDelta after construction;
 * SimCanvas sets getFitBox/loadScene/exportModel/undo/redo. NavigationGizmo,
 * ViewControls, the menus, and the panels read from them.
 */
export const bridge = {
  camera:    null,
  animateTo: null, // (pos, lookAt, ms?) => void
  fitCamera: null, // () => void
  orbitDelta: null, // (dx, dy) => void  — gizmo drag orbit
};
