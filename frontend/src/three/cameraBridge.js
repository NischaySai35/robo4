/**
 * cameraBridge — a simple module-level singleton so React components
 * can read Three.js camera state and trigger animations without prop-drilling.
 *
 * SceneManager sets the fields after construction.
 * NavigationGizmo / ViewControls read from them.
 */
export const bridge = {
  camera: null,
  animateTo: null, // (pos, lookAt, ms?) => void
  fitCamera: null, // (nodes) => void
};
