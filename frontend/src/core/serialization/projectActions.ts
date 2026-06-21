/**
 * projectActions.js — shared New/Open/Save/Export handlers used by both the
 * menu bar and the left-panel buttons.
 */

import { serializeProject } from './project';
import { saveProjectToFile, openProjectFromFile, writeProjectToHandle } from './fileIO';
import { useDocStore } from '@/state/docStore';
import { bridge } from '@/viewport/cameraBridge';
import { buildRobotArmProject } from '@/core/factory/robotArm';
import { buildHumanoidProject } from '@/core/factory/humanoid';

export function newProject() {
  if (!window.confirm('Start a new project? The current scene will be cleared (saved files are untouched).')) return;
  const fresh = {
    format: 'tetrobot-project',
    version: 1,
    scene: { activeModuleId: null, nextId: 1, modules: [], welds: [] },
    model: undefined, // cleared → empty model document
    animation: { duration: 4, tracks: {} },
  };
  const r = bridge.loadScene?.(fresh);
  if (r && !r.ok) { alert(r.error); return; }
  useDocStore.getState().setDoc(null, null);
}

/** Load the built-in articulated 6-DOF arm sample into the scene. */
export function newRobotArm() {
  if (!window.confirm('Load the 6-DOF robot arm sample? The current scene will be replaced (saved files are untouched).')) return;
  const r = bridge.loadScene?.(buildRobotArmProject());
  if (r && !r.ok) { alert(r.error); return; }
  useDocStore.getState().setDoc(null, null);
}

/** Load the built-in 20-DOF humanoid sample into the scene. */
export function newHumanoid() {
  if (!window.confirm('Load the humanoid robot sample? The current scene will be replaced (saved files are untouched).')) return;
  const r = bridge.loadScene?.(buildHumanoidProject());
  if (r && !r.ok) { alert(r.error); return; }
  useDocStore.getState().setDoc(null, null);
}

/** Save to the current file handle if we have one; otherwise prompt (Save As). */
export async function saveProject() {
  const { handle, name } = useDocStore.getState();
  if (handle) {
    try {
      useDocStore.getState().setStatus('saving');
      await writeProjectToHandle(handle, serializeProject());
      useDocStore.getState().setDoc(name, handle);
      return;
    } catch (e) {
      if (e?.name !== 'AbortError') console.warn('Save failed, falling back to Save As:', e);
    }
  }
  return saveProjectAs();
}

/** Always prompt for a new file location. */
export async function saveProjectAs() {
  const res = await saveProjectToFile(serializeProject(), 'tetrobot.nischay');
  if (res) useDocStore.getState().setDoc(res.name, res.handle);
}

export async function openProject() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await openProjectFromFile();
    if (!res) return;
    const r = bridge.loadScene?.(res.data);
    if (r && !r.ok) { alert(`Could not open project: ${r.error}`); return; }
    useDocStore.getState().setDoc(res.name, res.handle);
  } catch (e) {
    alert(`Could not open file: ${e.message}`);
  }
}

export function exportModel(fmt: any) {
  const r = bridge.exportModel?.(fmt);
  if (r && !r.ok) alert(r.error);
}