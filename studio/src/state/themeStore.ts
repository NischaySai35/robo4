import { create } from 'zustand';

const KEY = 'tetrobot:theme';

export type Theme = 'light' | 'dark';
interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const initial: Theme = (() => {
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
})();

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial, // 'light' | 'dark' (default light)
  setTheme(t) {
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
    set({ theme: t });
  },
  toggleTheme() {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },
}));