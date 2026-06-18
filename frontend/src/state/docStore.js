import { create } from 'zustand';

/**
 * Tracks the currently-open project file.
 *  - name:   file name to show in the header (null → "untitled", local-only).
 *  - handle: FileSystemFileHandle for silent re-saves (session-only; lost on
 *            reload, at which point we fall back to local autosave).
 *  - status: 'idle' | 'saving' | 'saved'
 */
export const useDocStore = create((set) => ({
  name: null,
  handle: null,
  status: 'idle',
  setDoc: (name, handle) => set({ name, handle, status: handle ? 'saved' : 'idle' }),
  setStatus: (status) => set({ status }),
}));
