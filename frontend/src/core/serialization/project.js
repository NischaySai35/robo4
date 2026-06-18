/**
 * project.js — serialize / parse the TETROBOT native project format (.nischay).
 *
 * The project file is the full editable source of truth: every module's joint
 * angles, fixed root, world transform, mode, plus all welds (with their rigid
 * `mate` matrices) and the active module. It is plain JSON and versioned.
 *
 * `serializeProject()` first asks SimCanvas (via the bridge) to commit the live
 * active-module state into multiStore, so the store is authoritative, then reads
 * it. `parseProject()` validates + normalizes an arbitrary object into a clean
 * scene description ready for SimCanvas.loadScene().
 */

import { bridge } from '@/viewport/cameraBridge.js';
import { useMultiStore } from '@/state/multiStore.js';

export const PROJECT_FORMAT  = 'tetrobot-project';
export const PROJECT_VERSION = 1;

export function serializeProject() {
  // Push the live active module (armStore + live FK transform) into multiStore.
  bridge.commitLiveState?.();
  const s = useMultiStore.getState();
  return {
    format:  PROJECT_FORMAT,
    version: PROJECT_VERSION,
    app:     'TETROBOT',
    savedAt: new Date().toISOString(),
    scene: {
      activeModuleId: s.activeModuleId,
      nextId:         s.nextId,
      modules: s.modules.map(m => ({
        id:           m.id,
        label:        m.label,
        angles:       [...m.angles],
        activeRootId: m.activeRootId,
        position:     { ...m.position },
        quaternion:   { ...m.quaternion },
        mode:         m.mode,
      })),
      welds: s.welds.map(w => ({
        a:    { moduleId: w.a.moduleId, faceKey: w.a.faceKey },
        b:    { moduleId: w.b.moduleId, faceKey: w.b.faceKey },
        mate: Array.isArray(w.mate) ? [...w.mate] : null,
      })),
    },
  };
}

const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

/**
 * Validate + normalize an arbitrary parsed object into a clean scene:
 *   { modules, welds, activeModuleId, nextId }
 * Throws on anything that isn't a recognizable TETROBOT project.
 */
export function parseProject(obj) {
  if (!obj || typeof obj !== 'object' || obj.format !== PROJECT_FORMAT) {
    throw new Error('Not a TETROBOT project file.');
  }
  if (typeof obj.version !== 'number' || obj.version > PROJECT_VERSION) {
    throw new Error(`Unsupported project version: ${obj.version}`);
  }

  const sc = obj.scene ?? {};
  const rawModules = Array.isArray(sc.modules) ? sc.modules : [];
  if (rawModules.length === 0) throw new Error('Project contains no modules.');

  const modules = rawModules.map((m, i) => ({
    id:    String(m?.id ?? `module-${i}`),
    label: String(m?.label ?? `Module ${i + 1}`),
    angles: Array.isArray(m?.angles) && m.angles.length === 6
      ? m.angles.map(a => num(a, 0))
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

  const ids = new Set(modules.map(m => m.id));
  const activeModuleId = ids.has(sc.activeModuleId) ? sc.activeModuleId : modules[0].id;

  const welds = (Array.isArray(sc.welds) ? sc.welds : [])
    .filter(w => w?.a?.moduleId && w?.b?.moduleId && ids.has(w.a.moduleId) && ids.has(w.b.moduleId))
    .map(w => ({
      a:    { moduleId: w.a.moduleId, faceKey: w.a.faceKey },
      b:    { moduleId: w.b.moduleId, faceKey: w.b.faceKey },
      mate: Array.isArray(w.mate) && w.mate.length === 16 ? w.mate.map(Number) : null,
    }));

  let nextId = Number(sc.nextId);
  if (!Number.isFinite(nextId)) {
    // Derive from the highest numeric id suffix so new modules don't collide.
    nextId = 1 + modules.reduce((mx, m) => {
      const n = parseInt(String(m.id).replace(/\D/g, ''), 10);
      return Number.isFinite(n) ? Math.max(mx, n) : mx;
    }, 0);
  }

  return { modules, welds, activeModuleId, nextId };
}
