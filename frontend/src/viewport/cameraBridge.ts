/**
 * cameraBridge — module-level singleton so React components can reach Three.js
 * state without prop-drilling.
 *
 * SceneManager sets camera/animateTo/fitCamera/orbitDelta after construction;
 * SimCanvas sets getFitBox/loadScene/exportModel/undo/redo. NavigationGizmo,
 * ViewControls, the menus, and the panels read from them.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CameraBridge {
  camera: any;
  animateTo: ((pos: any, lookAt: any, ms?: number) => void) | null;
  fitCamera: (() => void) | null;
  orbitDelta: ((dx: number, dy: number) => void) | null;
  // Set later by SimCanvas; optional so reads are type-safe before assignment.
  getFitBox?: (...args: any[]) => any;
  loadScene?: (data: any, opts?: any) => { ok: boolean; error?: string } | void;
  exportModel?: (fmt: any) => { ok: boolean; error?: string } | void;
  undo?: () => void;
  redo?: () => void;
}

export const bridge: CameraBridge = {
  camera:    null,
  animateTo: null, // (pos, lookAt, ms?) => void
  fitCamera: null, // () => void
  orbitDelta: null, // (dx, dy) => void  — gizmo drag orbit
};
