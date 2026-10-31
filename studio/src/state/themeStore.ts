import { create } from 'zustand';

const KEY = 'tetrobot:theme';

export type Theme = 'light' | 'dark';
interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const initial: Theme = (() => {
  try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
})();

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial, // 'light' | 'dark' (default dark, direction A)
  setTheme(t) {
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
    set({ theme: t });
  },
  toggleTheme() {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },
}));