/**
 * dockStore — which right-dock panel is open. Shared so the dock's own icon rail,
 * the left panel's action icons, and selection logic can all drive it.
 */
import { create } from 'zustand';

const ACTIVE_KEY = 'tetrobot:dock:active';

interface DockState {
  active: string | null;
  open: (id: string) => void;
  toggle: (id: string) => void;
  close: () => void;
}

export const useDockStore = create<DockState>((set) => ({
  active: localStorage.getItem(ACTIVE_KEY) || 'inspector',
  open: (id) => { localStorage.setItem(ACTIVE_KEY, id); set({ active: id }); },
  toggle: (id) => set((s) => {
    const next = s.active === id ? null : id;
    if (next) localStorage.setItem(ACTIVE_KEY, next);
    return { active: next };
  }),
  close: () => set({ active: null }),
}));
