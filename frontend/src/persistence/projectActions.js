/**
 * projectActions.js — shared New/Open/Save/Export handlers used by both the
 * menu bar and the left-panel buttons.
 */

import { serializeProject } from './project.js';
import { saveProjectToFile, openProjectFromFile } from './fileIO.js';
import { useDocStore } from '../store/docStore.js';
import { bridge } from '../three/cameraBridge.js';

export function newProject() {
  if (!window.confirm('Start a new project? The current scene will be cleared (saved files are untouched).')) return;
  const fresh = {
    format: 'tetrobot-project',
    version: 1,
    scene: {
      activeModuleId: 'module-0',
      nextId: 1,
      modules: [{
        id: 'module-0', label: 'Module 1',
        angles: [0, 0, 0, 0, 0, 0], activeRootId: 'R1',
        position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 },
        mode: 'horizontal',
      }],
      welds: [],
    },
  };
  const r = bridge.loadScene?.(fresh);
  if (r && !r.ok) { alert(r.error); return; }
  useDocStore.getState().setDoc(null, null);
}

export async function saveProject() {
  const res = await saveProjectToFile(serializeProject(), 'tetrobot.nischay');
  if (res) useDocStore.getState().setDoc(res.name, res.handle);
}

export async function openProject() {
  try {
    const res = await openProjectFromFile();
    if (!res) return;
    const r = bridge.loadScene?.(res.data);
    if (r && !r.ok) { alert(`Could not open project: ${r.error}`); return; }
    useDocStore.getState().setDoc(res.name, res.handle);
  } catch (e) {
    alert(`Could not open file: ${e.message}`);
  }
}

export function exportModel(fmt) {
  const r = bridge.exportModel?.(fmt);
  if (r && !r.ok) alert(r.error);
}
