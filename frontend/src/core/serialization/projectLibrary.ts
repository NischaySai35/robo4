/**
 * projectLibrary — a local library of saved projects so the startup picker can show
 * cards for everything you've worked on. The lightweight INDEX (id, name, thumbnail,
 * timestamp) lives in one localStorage key for fast listing; each project's full data
 * is stored under its own key so the index stays small. Thumbnails are tiny JPEGs.
 */

const INDEX_KEY = 'tetrobot:library:index:v1';
const DATA_PREFIX = 'tetrobot:library:proj:';

export interface LibraryEntry {
  id: string;
  name: string;
  thumb: string;        // small JPEG data URL ('' if none)
  updatedAt: number;
}

function readIndex(): LibraryEntry[] {
  try {
    const s = localStorage.getItem(INDEX_KEY);
    const arr = s ? JSON.parse(s) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeIndex(entries: LibraryEntry[]): void {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(entries)); } catch { /* quota */ }
}

/** Newest-first list of saved projects (index only — no heavy data). */
export function listProjects(): LibraryEntry[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Full project data for an id, or null. */
export function getProjectData(id: string): unknown | null {
  try {
    const s = localStorage.getItem(DATA_PREFIX + id);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

const uid = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Insert or update a project. Pass `id` to overwrite an existing card (e.g. re-saving
 * the same project). Returns the id, or null if it couldn't be stored (quota).
 */
export function putProject(name: string, data: unknown, thumb = '', id?: string): string | null {
  const pid = id ?? uid();
  try {
    localStorage.setItem(DATA_PREFIX + pid, JSON.stringify(data));
  } catch {
    return null; // data too big for localStorage
  }
  const index = readIndex().filter((e) => e.id !== pid);
  index.push({ id: pid, name: name || 'Untitled', thumb, updatedAt: Date.now() });
  writeIndex(index);
  return pid;
}

export function removeProject(id: string): void {
  try { localStorage.removeItem(DATA_PREFIX + id); } catch { /* ignore */ }
  writeIndex(readIndex().filter((e) => e.id !== id));
}

export function renameProject(id: string, name: string): void {
  const index = readIndex();
  const e = index.find((x) => x.id === id);
  if (e) { e.name = name; e.updatedAt = Date.now(); writeIndex(index); }
}
