/**
 * project.js — serialize / parse the TETROBOT native project format (.nischay).
 *
 * The robot is the graph `model` (bodies, joints, embedded meshes) plus the
 * animation clip. Plain JSON, versioned, self-contained. `parseProject()`
 * validates + normalizes an arbitrary object; a legacy `scene.modules` field is
 * tolerated but no longer used. `serializeProject()` writes the current model.
 */

import { useModelStore } from '@/state/modelStore';
import { useAnimationStore } from '@/state/animationStore';
import { useAnimSceneStore } from '@/state/animSceneStore';
import { usePageStore } from '@/state/pageStore';
import { useDockStore } from '@/state/dockStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { bridge } from '@/viewport/cameraBridge';
import { getActiveSpins } from '@/features/motor/spinEngine';
import { makeDocument } from '../model/index';

export const PROJECT_FORMAT  = 'tetrobot-project';
export const PROJECT_VERSION = 1;

export function serializeProject() {
  const dock = useDockStore.getState();
  return {
    format:  PROJECT_FORMAT,
    version: PROJECT_VERSION,
    app:     'TETROBOT',
    savedAt: new Date().toISOString(),
    scene: { activeModuleId: null, nextId: 1, modules: [], welds: [] },
    model: useModelStore.getState().doc,
    animation: useAnimationStore.getState().exportClip(),
    // Workspace layout: page, panel widths, collapse states, dock.
    workspace: {
      ...useWorkspaceStore.getState().snapshot(),
      page:          usePageStore.getState().page,
      dockActive:    dock.active,
      dockSplit:     dock.split,
      dockSecondary: dock.secondary,
      cameraState:   bridge.getCameraState?.() ?? null,
    },
    // Transient UI toggles that aren't part of the model/workspace but the user still wants
    // round-tripped: gravity switch, rigid-mode + which bodies are active in it, the A/B
    // lock-connector picks, and which joints are mid-spin (CW/CCW) with what direction.
    ui: {
      gravityOn: useAnimSceneStore.getState().gravityOn,
      rigidMode: useAnimSceneStore.getState().rigidMode,
      activeBodyIds: [...useAnimSceneStore.getState().activeBodyIds],
      mateSlotA: useAnimSceneStore.getState().mateSlotA,
      mateSlotB: useAnimSceneStore.getState().mateSlotB,
      activeSpins: getActiveSpins(),
    },
  };
}

const num = (v: any, d = 0) => (Number.isFinite(+v) ? +v : d);

/**
 * Validate + normalize an arbitrary parsed object into a clean scene:
 *   { modules, welds, activeModuleId, nextId }
 * Throws on anything that isn't a recognizable TETROBOT project.
 */
export function parseProject(obj: any) {
  if (!obj || typeof obj !== 'object' || obj.format !== PROJECT_FORMAT) {
    throw new Error('Not a TETROBOT project file.');
  }
  if (typeof obj.version !== 'number' || obj.version > PROJECT_VERSION) {
    throw new Error(`Unsupported project version: ${obj.version}`);
  }

  const sc = obj.scene ?? {};
  const rawModules = Array.isArray(sc.modules) ? sc.modules : []; // empty is allowed

  const modules = rawModules.map((m: any, i: any) => ({
    id:    String(m?.id ?? `module-${i}`),
    label: String(m?.label ?? `Module ${i + 1}`),
    angles: Array.isArray(m?.angles) && m.angles.length === 6
      ? m.angles.map((a: any) => num(a, 0))
      : [0, 0, 0, 0, 0, 0],
    activeRootId: typeof m?.activeRootId === 'string' ? m.activeRootId : 'R1',
    position: {
      x: num(m?.position?.x), y: num(m?.position?.y), z: num(m?.position?.z),
    },
    quaternion: {
      x: num(m?.quaternion?.x), y: num(m?.quaternion?.y),
      z: num(m?.quaternion?.z), w: m?.quaternion?.w == null ? 1 : num(m.quaternion.w, 1),
    },
    mode: m?.mode === 'vertical' ? 'vertical' : 'horizontal',
  }));

  const ids = new Set(modules.map((m: any) => m.id));
  const activeModuleId = ids.has(sc.activeModuleId) ? sc.activeModuleId : (modules[0]?.id ?? null);

  const welds = (Array.isArray(sc.welds) ? sc.welds : [])
    .filter((w: any) => w?.a?.moduleId && w?.b?.moduleId && ids.has(w.a.moduleId) && ids.has(w.b.moduleId))
    .map((w: any) => ({
      a:    { moduleId: w.a.moduleId, faceKey: w.a.faceKey },
      b:    { moduleId: w.b.moduleId, faceKey: w.b.faceKey },
      mate: Array.isArray(w.mate) && w.mate.length === 16 ? w.mate.map(Number) : null,
    }));

  let nextId = Number(sc.nextId);
  if (!Number.isFinite(nextId)) {
    // Derive from the highest numeric id suffix so new modules don't collide.
    nextId = 1 + modules.reduce((mx: any, m: any) => {
      const n = parseInt(String(m.id).replace(/\D/g, ''), 10);
      return Number.isFinite(n) ? Math.max(mx, n) : mx;
    }, 0);
  }

  // Graph model (Phase 0+). Absent in legacy files → start with an empty document.
  const model = obj.model && obj.model.kind === 'document' ? obj.model : makeDocument();
  // Pass the animation object through UNCHANGED so the full multi-clip v3 shape
  // (clips + keyframe tracks + groups) survives a save→open round-trip. loadClip
  // handles both the v3 format and the legacy { duration, tracks }; reducing it
  // here would silently drop every non-active clip and all groups.
  const animation = (obj.animation && typeof obj.animation === 'object')
    ? obj.animation
    : { duration: 4, tracks: {} };

  const workspace = (obj.workspace && typeof obj.workspace === 'object') ? obj.workspace : {};
  const ui = (obj.ui && typeof obj.ui === 'object') ? obj.ui : {};
  return { modules, welds, activeModuleId, nextId, model, animation, workspace, ui };
}