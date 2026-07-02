/**
 * projectLibrary — local library of saved projects backed by IndexedDB.
 *
 * IndexedDB is used instead of localStorage because:
 *  - No 5 MB quota: projects with embedded STEP/OBJ meshes can easily exceed 50 MB.
 *  - Structured-clone serialisation: asset buffers are stored as ArrayBuffers (binary),
 *    not base64 strings, saving ~33% space and eliminating expensive encode/decode.
 *
 * Schema (DB "tetrobot-library" v1):
 *   "index" — { id, name, thumb, updatedAt }       (fast listing, no heavy data)
 *   "data"  — { id, project: <structured clone> }  (full project, assets as ArrayBuffer)
 *
 * Old localStorage entries (v0) are migrated once on first use and then removed.
 */

const DB_NAME    = 'tetrobot-library';
const DB_VERSION = 1;

/* ── shared DB handle (lazy, singleton) ────────────────────────────────── */

let _db: IDBDatabase | null = null;

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  if (_dbPromise) return _dbPromise; // deduplicate concurrent opens
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('index')) db.createObjectStore('index', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('data'))  db.createObjectStore('data',  { keyPath: 'id' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db!); };
    req.onerror   = () => reject(req.error);
  });
  return _dbPromise;
}

function idbReq<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror   = () => reject(r.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error ?? new Error('IDB transaction error'));
    tx.onabort    = () => reject(tx.error ?? new Error('IDB transaction aborted'));
  });
}

/* ── binary asset packing ───────────────────────────────────────────────── */

/**
 * Walk project.model.assets and convert base64 `data` strings to ArrayBuffers
 * so IndexedDB stores them as compact binary blobs via structured clone.
 */
function packAssets(project: unknown): unknown {
  const p = project as any;
  if (!p?.model?.assets) return project;
  const packed: Record<string, unknown> = {};
  for (const [id, asset] of Object.entries(p.model.assets as Record<string, any>)) {
    if (asset?.data && typeof asset.data === 'string') {
      const raw = atob(asset.data);
      const buf = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
      packed[id] = { ...asset, data: buf.buffer };
    } else {
      packed[id] = asset;
    }
  }
  return { ...p, model: { ...p.model, assets: packed } };
}

/**
 * Reverse of packAssets — convert ArrayBuffers back to base64 strings
 * so the rest of the app receives the shape it always expected.
 */
function unpackAssets(project: unknown): unknown {
  const p = project as any;
  if (!p?.model?.assets) return project;
  const unpacked: Record<string, unknown> = {};
  for (const [id, asset] of Object.entries(p.model.assets as Record<string, any>)) {
    if (asset?.data instanceof ArrayBuffer) {
      const buf = new Uint8Array(asset.data);
      // Chunked fromCharCode to avoid stack overflow on large buffers.
      let bin = '';
      for (let i = 0; i < buf.length; i += 8192) {
        bin += String.fromCharCode(...buf.subarray(i, i + 8192));
      }
      unpacked[id] = { ...asset, data: btoa(bin) };
    } else {
      unpacked[id] = asset;
    }
  }
  return { ...p, model: { ...p.model, assets: unpacked } };
}

/* ── one-time migration from localStorage (v0) ──────────────────────────── */

const LS_INDEX_KEY = 'tetrobot:library:index:v1';
const LS_DATA_PFX  = 'tetrobot:library:proj:';
const LS_MIGRATED  = 'tetrobot:library:idb-migrated';

async function migrateOnce(): Promise<void> {
  if (localStorage.getItem(LS_MIGRATED)) return;
  try {
    const raw = localStorage.getItem(LS_INDEX_KEY);
    if (raw) {
      const index: LibraryEntry[] = JSON.parse(raw);
      for (const entry of index) {
        const dRaw = localStorage.getItem(LS_DATA_PFX + entry.id);
        if (!dRaw) continue;
        try {
          const data = JSON.parse(dRaw);
          await putProject(entry.name, data, entry.thumb, entry.id);
          localStorage.removeItem(LS_DATA_PFX + entry.id);
        } catch { /* skip corrupt entries */ }
      }
      localStorage.removeItem(LS_INDEX_KEY);
    }
  } catch (e) {
    console.warn('library migration from localStorage failed (non-fatal):', e);
  } finally {
    localStorage.setItem(LS_MIGRATED, '1');
  }
}

let _migrated = false;
async function ensureDB(): Promise<IDBDatabase> {
  if (!_migrated) { _migrated = true; await migrateOnce(); }
  return openDB();
}

/* ── public API ─────────────────────────────────────────────────────────── */

export interface LibraryEntry {
  id: string;
  name: string;
  thumb: string;       // small JPEG data URL ('' if none)
  updatedAt: number;
}

/** Newest-first list of saved projects (index only — no heavy data). */
export async function listProjects(): Promise<LibraryEntry[]> {
  const db = await ensureDB();
  const tx  = db.transaction('index', 'readonly');
  const all = await idbReq<LibraryEntry[]>(tx.objectStore('index').getAll());
  return all.filter(p => p.id !== '__autosave__').sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Full project data for an id, or null. Assets come back as base64 strings. */
export async function getProjectData(id: string): Promise<unknown | null> {
  const db  = await ensureDB();
  const tx  = db.transaction('data', 'readonly');
  const row = await idbReq<{ id: string; project: unknown } | undefined>(tx.objectStore('data').get(id));
  if (!row) return null;
  return unpackAssets(row.project);
}

const uid = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Insert or update a project. Pass `id` to overwrite an existing entry.
 * Returns the project id on success, or null on failure.
 */
export async function putProject(name: string, data: unknown, thumb = '', id?: string): Promise<string | null> {
  const pid    = id ?? uid();
  const packed = packAssets(data);
  try {
    const db = await openDB(); // use openDB directly (not ensureDB) to avoid re-migration loop
    const tx = db.transaction(['index', 'data'], 'readwrite');
    tx.objectStore('data').put({ id: pid, project: packed });
    tx.objectStore('index').put({ id: pid, name: name || 'Untitled', thumb, updatedAt: Date.now() } as LibraryEntry);
    await txDone(tx);
    return pid;
  } catch (e) {
    console.warn('putProject: IndexedDB write failed:', e);
    return null;
  }
}

export async function removeProject(id: string): Promise<void> {
  const db = await ensureDB();
  const tx = db.transaction(['index', 'data'], 'readwrite');
  tx.objectStore('index').delete(id);
  tx.objectStore('data').delete(id);
  await txDone(tx);
}

export async function renameProject(id: string, name: string): Promise<void> {
  const db    = await ensureDB();
  const tx    = db.transaction('index', 'readwrite');
  const store = tx.objectStore('index');
  const entry = await idbReq<LibraryEntry | undefined>(store.get(id));
  if (entry) { entry.name = name; entry.updatedAt = Date.now(); store.put(entry); }
  await txDone(tx);
}
