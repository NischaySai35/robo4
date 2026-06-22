import { create } from 'zustand';

/**
 * Tracks the currently-open project file + its identity in the local library, so the
 * startup picker can recognise "this is the project I'm working on" instead of showing
 * it twice. `name` + `libraryId` are persisted to localStorage (the file handle can't
 * be) and restored on launch; the autosaved scene is paired back with its identity.
 */
export type DocStatus = 'idle' | 'saving' | 'saved';

const REF_KEY = 'tetrobot:current:v1';
function loadRef(): { name: string | null; libraryId: string | null } {
  try { const s = localStorage.getItem(REF_KEY); return s ? JSON.parse(s) : { name: null, libraryId: null }; }
  catch { return { name: null, libraryId: null }; }
}
function saveRef(name: string | null, libraryId: string | null): void {
  try { localStorage.setItem(REF_KEY, JSON.stringify({ name, libraryId })); } catch { /* quota */ }
}

interface DocState {
  name: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: any;
  status: DocStatus;
  /** id of this project's card in the local library (for overwriting on re-save). */
  libraryId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setDoc: (name: string | null, handle: any) => void;
  setStatus: (status: DocStatus) => void;
  setLibraryId: (id: string | null) => void;
}

const ref = loadRef();

export const useDocStore = create<DocState>((set, get) => ({
  name: ref.name,
  handle: null,
  status: 'idle',
  libraryId: ref.libraryId,
  setDoc: (name, handle) => { saveRef(name, get().libraryId); set({ name, handle, status: handle ? 'saved' : 'idle' }); },
  setStatus: (status) => set({ status }),
  setLibraryId: (libraryId) => { saveRef(get().name, libraryId); set({ libraryId }); },
}));
