/**
 * projectActions.js — shared New/Open/Save/Export handlers used by both the
 * menu bar and the left-panel buttons.
 */

import { serializeProject } from './project';
import { saveProjectToFile, openProjectFromFile, writeProjectToHandle } from './fileIO';
import { putProject, getProjectData, listProjects } from './projectLibrary';
// Note: all projectLibrary functions are async (IndexedDB-backed).
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
  useDocStore.getState().setDoc(null, null); // also clears libraryId (see setDoc)
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

/**
 * Save to the current file handle if we have one (silent, no dialog).
 * If the project has a confirmed library entry, also try to update it.
 * For new/untitled projects (no handle, no libraryId) always show Save As.
 * If library save fails (quota exceeded for large meshes) we fall through to Save As.
 */
export async function saveProject() {
  const { handle, name, libraryId } = useDocStore.getState();

  // Case 1: OS file handle present → silent write to disk + update library index.
  if (handle) {
    try {
      useDocStore.getState().setStatus('saving');
      await writeProjectToHandle(handle, serializeProject());
      useDocStore.getState().setDoc(name, handle);
      await saveCurrentToLibrary(name ?? undefined); // await so library commits before app can close
      useDocStore.getState().setStatus('saved');
      return;
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') console.warn('Write to file failed:', e);
      // fall through to Save As
    }
  }

  // Case 2: project has a confirmed library ID → silent save to IndexedDB.
  if (libraryId) {
    useDocStore.getState().setStatus('saving');
    const id = await saveCurrentToLibrary(name ?? undefined);
    if (id) {
      useDocStore.getState().setStatus('saved');
      return;
    }
    // IndexedDB write failed (disk full?) → prompt the user.
  }

  // Case 3: no handle, no confirmed library entry → show Save As dialog.
  return saveProjectAs();
}

/** Auto-save on a timer — writes to disk (file handle) or IndexedDB (libraryId). */
export async function autoSave() {
  const { handle, name, libraryId } = useDocStore.getState();
  if (handle) {
    try {
      await writeProjectToHandle(handle, serializeProject());
      useDocStore.getState().setStatus('saved');
      saveCurrentToLibrary(name ?? undefined); // update thumbnail; best-effort
    } catch { /* will retry next interval */ }
  } else if (libraryId) {
    // Library-only project: save to IndexedDB (no size limit, so safe to auto-save).
    const id = await saveCurrentToLibrary(name ?? undefined);
    if (id) useDocStore.getState().setStatus('saved');
  }
  // untitled with no libraryId → skip (nothing to auto-save to)
}

/** Always prompt for a new file location. */
export async function saveProjectAs() {
  const res = await saveProjectToFile(serializeProject(), 'tetrobot.nischay');
  if (res) { useDocStore.getState().setDoc(res.name, res.handle); await saveCurrentToLibrary(res.name); }
}

export async function openProject() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await openProjectFromFile();
    if (!res) return;
    useDocStore.getState().setStatus('loading');
    await new Promise((r) => setTimeout(r, 0)); // yield one frame so loading indicator renders
    const r = bridge.loadScene?.(res.data);
    if (r && !r.ok) { alert(`Could not open project: ${r.error}`); return; }

    // Try to reuse an existing library entry with the same name so subsequent
    // Ctrl+S calls update it in place rather than creating endless duplicates.
    let matchedId: string | null = null;
    try {
      const all = await listProjects();
      const match = all.find((p) => p.name === res.name);
      if (match) matchedId = match.id;
    } catch { /* non-fatal */ }

    useDocStore.getState().setDoc(res.name, res.handle);
    useDocStore.getState().setLibraryId(matchedId);
  } catch (e) {
    alert(`Could not open file: ${(e as any).message}`);
  }
}

/** Save a snapshot of the current project into the local library (IndexedDB).
 *  Returns the library id on success, or null on failure. */
export async function saveCurrentToLibrary(nameOverride?: string): Promise<string | null> {
  const { name, libraryId } = useDocStore.getState();
  const projName = nameOverride || name || 'Untitled';
  const thumb = bridge.captureThumbnail?.(256) ?? '';
  const id = await putProject(projName, serializeProject(), thumb, libraryId ?? undefined);
  if (id) useDocStore.getState().setLibraryId(id);
  return id;
}

/** Load a project from the local library into the scene. */
export async function openFromLibrary(id: string, name: string): Promise<boolean> {
  useDocStore.getState().setStatus('loading');
  const data = await getProjectData(id);
  if (!data) { useDocStore.getState().setStatus('idle'); alert('That project could not be loaded from the library.'); return false; }
  await new Promise((r) => setTimeout(r, 0)); // yield frame so loading indicator shows
  const r = bridge.loadScene?.(data);
  if (r && !r.ok) { alert(`Could not open project: ${r.error}`); return false; }
  useDocStore.getState().setDoc(name, null);
  useDocStore.getState().setLibraryId(id);
  return true;
}

export function exportModel(fmt: any) {
  const r = bridge.exportModel?.(fmt);
  if (r && !r.ok) alert(r.error);
}