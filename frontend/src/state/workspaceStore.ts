/**
 * workspaceStore — UI layout state that persists per project file.
 * Saved into .nischay files under the `workspace` key so the exact panel
 * layout, page, and collapse states are restored when re-opening a project.
 */
import { create } from 'zustand';

const LS = 'tetrobot:workspace:v2';
const load = (): Partial<WorkspaceSnapshot> => {
  try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; }
};

export interface WorkspaceSnapshot {
  page?: string;
  leftPanelWidth?: number;
  pxHeight?: number;
  buildOpen?: boolean;
  controlsOpen?: boolean;
  collapsedComponents?: string[];
  dockActive?: string | null;
  dockSplit?: boolean;
  dockSecondary?: string | null;
  hiddenBodyIds?: string[];
}

interface WorkspaceState {
  leftPanelWidth: number;
  pxHeight: number;
  buildOpen: boolean;
  controlsOpen: boolean;
  collapsedComponents: string[];
  hiddenBodyIds: string[];
  // FK body mode: 'free' = tree FK (legacy), 'rigid' = graph FK rooted at activeBodyId
  bodyMode: 'free' | 'rigid';
  activeBodyId: string | null;
  // Auto-ground: keep the grounded body at whichever is nearest the live CoM.
  autoBase: boolean;
  setAutoBase: (v: boolean) => void;
  setLeftPanelWidth: (v: number) => void;
  setPxHeight: (v: number) => void;
  setBuildOpen: (v: boolean) => void;
  setControlsOpen: (v: boolean) => void;
  setCollapsedComponents: (ids: string[]) => void;
  toggleBodyVisibility: (id: string) => void;
  setHiddenBodyIds: (ids: string[]) => void;
  isBodyHidden: (id: string) => boolean;
  setBodyMode: (mode: 'free' | 'rigid') => void;
  setActiveBodyId: (id: string | null) => void;
  snapshot: () => WorkspaceSnapshot;
  restore: (ws: WorkspaceSnapshot) => void;
}

const init = load();

const persist = (s: WorkspaceState) => {
  try {
    localStorage.setItem(LS, JSON.stringify({
      leftPanelWidth: s.leftPanelWidth,
      pxHeight: s.pxHeight,
      buildOpen: s.buildOpen,
      controlsOpen: s.controlsOpen,
      collapsedComponents: s.collapsedComponents,
      hiddenBodyIds: s.hiddenBodyIds,
    }));
  } catch { /* quota */ }
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  leftPanelWidth: init.leftPanelWidth ?? 250,
  pxHeight:       init.pxHeight       ?? 340,
  buildOpen:      init.buildOpen      ?? true,
  controlsOpen:   init.controlsOpen   ?? false,
  collapsedComponents: init.collapsedComponents ?? [],
  hiddenBodyIds:  init.hiddenBodyIds  ?? [],
  bodyMode:       'free',
  activeBodyId:   null,
  autoBase:       false,
  setAutoBase:    (autoBase) => set({ autoBase }),

  setLeftPanelWidth: (leftPanelWidth) => { set({ leftPanelWidth }); persist(get()); },
  setPxHeight:       (pxHeight)       => { set({ pxHeight });       persist(get()); },
  setBuildOpen:      (buildOpen)      => { set({ buildOpen });      persist(get()); },
  setControlsOpen:   (controlsOpen)   => { set({ controlsOpen });   persist(get()); },
  setCollapsedComponents: (collapsedComponents) => { set({ collapsedComponents }); persist(get()); },

  toggleBodyVisibility: (id) => {
    const cur = get().hiddenBodyIds;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    set({ hiddenBodyIds: next });
    persist(get());
  },
  setHiddenBodyIds: (hiddenBodyIds) => { set({ hiddenBodyIds }); persist(get()); },
  isBodyHidden: (id) => get().hiddenBodyIds.includes(id),

  setBodyMode: (bodyMode) => set({ bodyMode, activeBodyId: bodyMode === 'free' ? null : get().activeBodyId }),
  setActiveBodyId: (activeBodyId) => set({ activeBodyId }),

  snapshot: () => {
    const s = get();
    return {
      leftPanelWidth: s.leftPanelWidth,
      pxHeight: s.pxHeight,
      buildOpen: s.buildOpen,
      controlsOpen: s.controlsOpen,
      collapsedComponents: s.collapsedComponents,
      hiddenBodyIds: s.hiddenBodyIds,
    };
  },

  restore: (ws) => {
    const patch: Partial<WorkspaceState> = {};
    if (ws.leftPanelWidth != null) patch.leftPanelWidth = ws.leftPanelWidth;
    if (ws.pxHeight        != null) patch.pxHeight       = ws.pxHeight;
    if (ws.buildOpen       != null) patch.buildOpen      = ws.buildOpen;
    if (ws.controlsOpen    != null) patch.controlsOpen   = ws.controlsOpen;
    if (ws.collapsedComponents != null) patch.collapsedComponents = ws.collapsedComponents;
    if (ws.hiddenBodyIds   != null) patch.hiddenBodyIds   = ws.hiddenBodyIds;
    set(patch);
    persist(get());
  },
}));
