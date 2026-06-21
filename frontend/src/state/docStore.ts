import { create } from 'zustand';

/**
 * Tracks the currently-open project file.
 *  - name:   file name to show in the header (null → "untitled", local-only).
 *  - handle: FileSystemFileHandle for silent re-saves (session-only; lost on
 *            reload, at which point we fall back to local autosave).
 *  - status: 'idle' | 'saving' | 'saved'
 */
export type DocStatus = 'idle' | 'saving' | 'saved';
interface DocState {
  name: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: any;
  status: DocStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setDoc: (name: string | null, handle: any) => void;
  setStatus: (status: DocStatus) => void;
}

export const useDocStore = create<DocState>((set) => ({
  name: null,
  handle: null,
  status: 'idle',
  setDoc: (name, handle) => set({ name, handle, status: handle ? 'saved' : 'idle' }),
  setStatus: (status) => set({ status }),
}));
