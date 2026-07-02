/**
 * storage.ts — silent auto-save of the current project so a reload/crash never
 * loses work. Uses IndexedDB (no 5 MB quota) so large mesh projects are safe.
 */

import { putProject, getProjectData, removeProject } from './projectLibrary';

// Fixed ID for the autosave slot — filtered out of listProjects.
const AUTOSAVE_ID = '__autosave__';

export async function saveAutosave(project: any): Promise<void> {
  try {
    await putProject('__autosave__', project, '', AUTOSAVE_ID);
  } catch {
    /* non-fatal */
  }
}

export async function loadAutosave(): Promise<any> {
  try {
    return await getProjectData(AUTOSAVE_ID);
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  removeProject(AUTOSAVE_ID).catch(() => {});
}
