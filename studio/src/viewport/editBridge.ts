/**
 * editBridge — thin channel so the Edit panel (React) can call into the viewport's
 * EditModeController (framework-free), mirroring cameraBridge. The controller sets
 * these on construction; the panel calls them. Null-safe no-ops before ready.
 */
export const editBridge = {
  deleteSelection:   () => {},
  mergeVertices:     () => {},
  selectAll:         () => {},
  deselectAll:       () => {},
  extrude:           () => {},
  subdivide:         () => {},
  duplicateSelection:() => {},
  startTwoPointMove: () => {},
  inset:             () => {},
  shrinkFatten:      () => {},
  smooth:            () => {},
  // New operations
  fill:         () => {},   // F   — create face from selected verts/edges
  connect:      () => {},   // J   — connect 2 selected verts with an edge
  bevel:        () => {},   // B   — bevel selected edges
  loopCut:      () => {},   // Ctrl+R — insert edge ring
  selectLinked: () => {},   // L   — flood-fill select connected geometry
  selectSimilar:() => {},   // Shift+G — select similar by criteria
  extrudeAlong: () => {},   // Alt+E → extrude along individual normals
};
