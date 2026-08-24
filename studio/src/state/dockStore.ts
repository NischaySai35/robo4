/**
 * dockStore — which right-dock panel is open. Shared so the dock's own icon rail,
 * the left panel's action icons, and selection logic can all drive it.
 */
import { create } from 'zustand';

const ACTIVE_KEY = 'tetrobot:dock:active';
const SPLIT_KEY = 'tetrobot:dock:split';
const SECOND_KEY = 'tetrobot:dock:secondary';

interface DockState {
  active: string | null;     // primary (top) panel
  split: boolean;            // show two panels stacked
  secondary: string | null;  // secondary (bottom) panel when split
  open: (id: string) => void;
  toggle: (id: string) => void;
  close: () => void;
  toggleSplit: () => void;
  setSecondary: (id: string) => void;
}

export const useDockStore = create<DockState>((set) => ({
  active: localStorage.getItem(ACTIVE_KEY) || 'inspector',
  split: localStorage.getItem(SPLIT_KEY) === '1',
  secondary: localStorage.getItem(SECOND_KEY) || 'outliner',
  open: (id) => { localStorage.setItem(ACTIVE_KEY, id); set({ active: id }); },
  toggle: (id) => set((s) => {
    const next = s.active === id ? null : id;
    if (next) localStorage.setItem(ACTIVE_KEY, next);
    return { active: next };
  }),
  close: () => set({ active: null }),
  // Split view: two panels stacked. Turning it on with nothing open seeds a sane
  // primary so the user always sees two panes.
  toggleSplit: () => set((s) => {
    const split = !s.split;
    localStorage.setItem(SPLIT_KEY, split ? '1' : '0');
    const active = s.active ?? 'inspector';
    if (split) localStorage.setItem(ACTIVE_KEY, active);
    return { split, active };
  }),
  setSecondary: (id) => { localStorage.setItem(SECOND_KEY, id); set({ secondary: id }); },
}));
