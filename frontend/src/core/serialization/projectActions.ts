/**
 * projectActions.js — shared New/Open/Save/Export handlers used by both the
 * menu bar and the left-panel buttons.
 */

import { serializeProject } from './project';
import { saveProjectToFile, openProjectFromFile, writeProjectToHandle } from './fileIO';
import { putProject, getProjectData, listProjects, removeProject, saveHandle, getSavedHandle } from './projectLibrary';
// Note: all projectLibrary functions are async (IndexedDB-backed).
import { useDocStore } from '@/state/docStore';
import { bridge } from '@/viewport/cameraBridge';
import { buildRobotArmProject } from '@/core/factory/robotArm';
import { buildHumanoidProject } from '@/core/factory/humanoid';
import { getDefaultModuleDoc, moduleDocToProject } from '@/core/factory/defaultModule';

/** Start a new project. New projects begin with the default module already placed
 *  as a component (freshly-id'd so it's an independent copy) — users can delete or
 *  edit it freely. Pass `{ empty: true }` for a truly blank document. */
export function newProject(opts: { empty?: boolean; confirm?: boolean } = {}) {
  const ask = opts.confirm ?? true;
  if (ask && !window.confirm('Start a new project? The current scene will be cleared (saved files are untouched).')) return;
  const project = opts.empty
    ? {
        format: 'tetrobot-project', version: 1,
        scene: { activeModuleId: null, nextId: 1, modules: [], welds: [] },
        model: undefined, // truly empty
        animation: { duration: 4, tracks: {} },
      }
    : moduleDocToProject(freshCopyOfDefaultModule());
  const r = bridge.loadScene?.(project);
  if (r && !r.ok) { alert(r.error); return; }
  useDocStore.getState().setDoc(null, null); // also clears libraryId (see setDoc)
}

/** A deep copy of the default module document with regenerated ids, so a new
 *  project's starter module is independent (not sharing ids with the bundled one). */
function freshCopyOfDefaultModule() {
  const src: any = getDefaultModuleDoc();
  const clone: any = structuredClone(src);
  clone.id = `doc-${Math.random().toString(36).slice(2, 9)}`;
  clone.name = 'Untitled';
  // Regenerate component/body/joint ids (keep asset & material ids — meshes are shared).
  const remap = new Map<string, string>();
  const rid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  for (const kind of ['components', 'bodies', 'joints', 'jointProfiles'] as const) {
    const coll = clone[kind]; if (!coll) continue;
    for (const oldId of Object.keys(coll)) remap.set(oldId, rid(kind.slice(0, 4)));
  }
  const map = (id: any) => (id && remap.has(id) ? remap.get(id) : id);
  const rebuild: any = {};
  for (const kind of ['components', 'bodies', 'joints', 'jointProfiles'] as const) {
    const coll = clone[kind]; if (!coll) continue;
    const next: any = {};
    for (const [oldId, e] of Object.entries<any>(coll)) {
      const id = remap.get(oldId)!;
      const copy: any = { ...e, id };
      if ('componentId' in copy) copy.componentId = map(copy.componentId);
      if ('parentBodyId' in copy) copy.parentBodyId = map(copy.parentBodyId);
      if ('childBodyId' in copy) copy.childBodyId = map(copy.childBodyId);
      if ('profileId' in copy) copy.profileId = map(copy.profileId);
      next[id] = copy;
    }
    rebuild[kind] = next;
  }
  return { ...clone, ...rebuild };
}

/** Load the built-in articulated 6-DOF arm sample into the scene. */
export function newRobotArm() {
  if (!window.confirm('Load the 6-DOF robot arm sample? The current scene will be replaced (saved files are untouched).')) return;
  const r = bridge.loadScene?.(buildRobotArmProject());
  if (r && !r.ok) { alert(r.error); return; }
  useDocStore.getState().setDoc(null, null);
}

/** Load a fresh copy of the default module (freshly-id'd) as a new scene. */
export function newModule() {
  if (!window.confirm('Load the default module? The current scene will be replaced (saved files are untouched).')) return;
  const r = bridge.loadScene?.(moduleDocToProject(freshCopyOfDefaultModule()));
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
      await saveHandle(name ?? 'untitled.nischay', handle); // survive the next reload — see docStore.reconnect()
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

/** Always prompt for a new file location. Save As creates a DISTINCT project, so
 *  it must NOT reuse the previous project's library id — otherwise it overwrites
 *  that entry (name + contents), wiping the original from the library/recents. */
export async function saveProjectAs() {
  const res = await saveProjectToFile(serializeProject(), 'tetrobot.nischay');
  if (res) {
    useDocStore.getState().setDoc(res.name, res.handle);
    useDocStore.getState().setLibraryId(null); // force a fresh library entry for the new file
    if (res.handle) await saveHandle(res.name, res.handle); // survive the next reload
    await saveCurrentToLibrary(res.name);
  }
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
    if (res.handle) await saveHandle(res.name, res.handle); // survive the next reload
  } catch (e) {
    alert(`Could not open file: ${(e as any).message}`);
  }
}

/**
 * Call once at app boot: try to silently regain write access to whatever file
 * was open last session. If the browser already remembers a 'granted'
 * permission for that handle, this reconnects with NO prompt — the same file
 * handle only went stale in memory, not in the browser's permission store, so
 * this is the fix for "reload loses the connection to the real file, and
 * Ctrl+S silently starts writing to the internal library instead without any
 * warning." If the browser needs a fresh user gesture to re-grant (its own
 * security rule, not something this app can bypass), this instead exposes a
 * `pendingReconnectName` for a one-click "Reconnect" UI to call
 * `useDocStore.getState().reconnect()` from.
 */
export async function tryRestoreFileHandle(): Promise<void> {
  const saved = await getSavedHandle();
  if (!saved?.handle) return;
  // Don't clobber a handle already acquired this session (e.g. just opened a file).
  if (useDocStore.getState().handle) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h: any = saved.handle;
    const perm = await h.queryPermission?.({ mode: 'readwrite' });
    if (perm === 'granted') {
      useDocStore.getState().setDoc(saved.name, h);
    } else {
      useDocStore.getState().setPendingReconnect(saved.name, h);
    }
  } catch { /* stale/invalid handle — ignore, user can re-open manually */ }
}

/** Save a snapshot of the current project into the local library (IndexedDB).
 *  Returns the library id on success, or null on failure. */
export async function saveCurrentToLibrary(nameOverride?: string): Promise<string | null> {
  const { name, libraryId } = useDocStore.getState();
  const projName = nameOverride || name || 'Untitled';
  const thumb = bridge.captureThumbnail?.(256) ?? '';

  // The library is keyed by a random id, so without a target id every save would
  // create a NEW entry → many duplicates with the same name. Reuse the existing
  // entry for this name (dedupe by name), then remove any leftover same-name dupes.
  let targetId = libraryId ?? undefined;
  if (!targetId) {
    try { targetId = (await listProjects()).find((p) => p.name === projName)?.id; } catch { /* non-fatal */ }
  }
  const id = await putProject(projName, serializeProject(), thumb, targetId);
  if (id) {
    useDocStore.getState().setLibraryId(id);
    try {
      for (const p of await listProjects()) {
        if (p.name === projName && p.id !== id) await removeProject(p.id);
      }
    } catch { /* non-fatal */ }
  }
  return id;
}

/** Remove pre-existing duplicate library entries: keep the newest per name, drop
 *  the rest. Fixes libraries that already accumulated same-name duplicates. */
export async function dedupeLibrary(): Promise<void> {
  try {
    const all = await listProjects(); // newest first
    const seen = new Set<string>();
    for (const p of all) {
      if (seen.has(p.name)) await removeProject(p.id);
      else seen.add(p.name);
    }
  } catch { /* non-fatal */ }
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