/**
 * pageStore — which top-level workspace page is active. The 3D scene is shared across
 * Editor / Analysis / Training / Animation (different side panels + layout per page);
 * Motor Control is a separate hardware page. Kept in a store (not local state) so the
 * viewport can switch pages too — e.g. double-clicking a part jumps to the Editor.
 */
import { create } from 'zustand';

export type Page = 'editor' | 'analysis' | 'training' | 'animation' | 'motor';

interface PageState {
  page: Page;
  setPage: (p: Page) => void;
}

export const usePageStore = create<PageState>((set) => ({
  page: 'editor',
  setPage: (page) => set({ page }),
}));
