/**
 * storage.js — silent auto-save of the current project to the browser so a
 * reload/crash never loses work. Uses localStorage (project JSON is small).
 */

const KEY = 'tetrobot:autosave:v1';

export function saveAutosave(project: any) {
  try {
    localStorage.setItem(KEY, JSON.stringify(project));
  } catch {
    /* quota / private-mode — ignore */
  }
}

export function loadAutosave() {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function clearAutosave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
