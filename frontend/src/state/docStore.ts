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
  /** A remembered file handle whose write permission needs a fresh user click to
   *  reactivate (browsers won't silently re-grant across a reload) — set when a
   *  persisted handle is found on boot but isn't already 'granted'. Null once
   *  reconnected or dismissed. See `reconnect()`. */
  pendingReconnectName: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setDoc: (name: string | null, handle: any) => void;
  setStatus: (status: DocStatus) => void;
  setLibraryId: (id: string | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setPendingReconnect: (name: string | null, handle: any) => void;
  reconnect: () => Promise<boolean>;
}

const ref = loadRef();

// The actual pending handle object (not just its name) — lives outside the store
// since it's only ever consumed by `reconnect()`, not rendered.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pendingHandle: any = null;

export const useDocStore = create<DocState>((set, get) => ({
  name: ref.name,
  handle: null,
  status: 'idle',
  libraryId: ref.libraryId,
  pendingReconnectName: null,
  setDoc: (name, handle) => {
    // Clear libraryId when switching to a fresh/new document (name === null).
    // A null name means "not saved yet"; a non-null name can keep its existing
    // library entry (e.g. re-opening from library preserves the link for Ctrl+S).
    const libraryId = name === null ? null : get().libraryId;
    saveRef(name, libraryId);
    set({ name, handle, libraryId, status: handle ? 'saved' : 'idle', pendingReconnectName: null });
  },
  setStatus: (status) => set({ status }),
  setLibraryId: (libraryId) => { saveRef(get().name, libraryId); set({ libraryId }); },
  setPendingReconnect: (name, handle) => {
    _pendingHandle = handle;
    set({ pendingReconnectName: name });
  },
  reconnect: async () => {
    if (!_pendingHandle) return false;
    try {
      // requestPermission (unlike queryPermission) needs a real user gesture to
      // succeed — this is why reconnecting can't happen silently on boot when the
      // browser didn't already remember a 'granted' state; it needs one click.
      const perm = await _pendingHandle.requestPermission?.({ mode: 'readwrite' });
      if (perm !== 'granted') return false;
      const name = get().pendingReconnectName;
      get().setDoc(name, _pendingHandle);
      return true;
    } catch { return false; }
  },
}));
