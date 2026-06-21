/**
 * editBridge — thin channel so the Edit panel (React) can call into the viewport's
 * EditModeController (framework-free), mirroring cameraBridge. The controller sets
 * these on construction; the panel calls them. Null-safe no-ops before ready.
 */
export const editBridge = {
  deleteSelection: () => {},
  mergeVertices: () => {},
  selectAll: () => {},
  deselectAll: () => {},
  extrude: () => {},
  subdivide: () => {},
  duplicateSelection: () => {},
  startTwoPointMove: () => {},
  inset: () => {},
  shrinkFatten: () => {},
  smooth: () => {},
};
