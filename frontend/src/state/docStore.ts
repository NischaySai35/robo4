import { create } from 'zustand';

/**
 * Tracks the currently-open project file + its identity in the local library, so the
 * startup picker can recognise "this is the project I'm working on" instead of showing
 * it twice. `name` + `libraryId` are persisted to localStorage (the file handle can't
 * be) and restored on launch; the autosaved scene is paired back with its identity.
 */
export type DocStatus = 'idle' | 'saving' | 'saved' | 'loading';

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
  setDoc: (name, handle) => {
    // Clear libraryId when switching to a fresh/new document (name === null).
    // A null name means "not saved yet"; a non-null name can keep its existing
    // library entry (e.g. re-opening from library preserves the link for Ctrl+S).
    const libraryId = name === null ? null : get().libraryId;
    saveRef(name, libraryId);
    set({ name, handle, libraryId, status: handle ? 'saved' : 'idle' });
  },
  setStatus: (status) => set({ status }),
  setLibraryId: (libraryId) => { saveRef(get().name, libraryId); set({ libraryId }); },
}));
