/**
 * layouts — one Dockview layout per workspace page (RESTRUCTURING §4.2): the default arrangement, saving and restoring
 * it, and Reset Layout. Separate from DockWorkspaces so the menu and command palette can reset without importing panels.
 */
import type { DockviewApi } from 'dockview-react';
import type { Page } from '@/state/pageStore';

interface PanelDef { id: string; title: string; ref?: string; dir?: 'left' | 'right' | 'above' | 'below'; size?: number }

export const WORKSPACES: Record<Page, PanelDef[]> = {
  editor: [{ id: 'viewport', title: 'Viewport' }, { id: 'leftPanel', title: 'Model', ref: 'viewport', dir: 'left', size: 280 }],
  analysis: [
    { id: 'viewport', title: 'Viewport' },
    { id: 'analysisPanel', title: 'Analysis', ref: 'viewport', dir: 'right', size: 400 },
    { id: 'analysisBottom', title: 'Stress view', ref: 'viewport', dir: 'below', size: 440 },
  ],
  training: [{ id: 'viewport', title: 'Viewport' }, { id: 'trainingPanel', title: 'Training', ref: 'viewport', dir: 'right', size: 400 }],
  animation: [
    { id: 'viewport', title: 'Viewport' },
    { id: 'animLeft', title: 'Animate', ref: 'viewport', dir: 'left', size: 280 },
    { id: 'timeline', title: 'Timeline', ref: 'viewport', dir: 'right', size: 480 },
  ],
  msrr: [{ id: 'msrrViewport', title: 'MSRR viewport' }, { id: 'msrrPanel', title: 'Planner', ref: 'msrrViewport', dir: 'right', size: 430 }],
  esptt: [{ id: 'esptt', title: 'ESP-TTL' }],
  motor: [{ id: 'motorMain', title: 'Servos' }, { id: 'hardware', title: 'Hardware', ref: 'motorMain', dir: 'right', size: 380 }],
};

const key = (page: Page) => `tetrobot:layout:v1:${page}`;
const apis = new Map<Page, DockviewApi>();

function buildDefault(api: DockviewApi, page: Page) {
  for (const p of WORKSPACES[page]) {
    api.addPanel({
      id: p.id, component: p.id, title: p.title, renderer: 'always', params: { page },
      position: p.ref ? { referencePanel: p.ref, direction: p.dir } : undefined,
      ...(p.size ? (p.dir === 'left' || p.dir === 'right' ? { initialWidth: p.size } : { initialHeight: p.size }) : {}),
    });
  }
}

/** Restore the saved layout, or build the default when there is none or it no longer loads. */
export function attachLayout(api: DockviewApi, page: Page, viewOnly = false) {
  if (viewOnly) { // just the viewport, not saved, so the full app keeps its own layout
    api.addPanel({ id: 'viewport', component: 'viewport', title: 'View', renderer: 'always', params: { page } });
    return { dispose() {} };
  }
  apis.set(page, api);
  let restored = false;
  try {
    const saved = localStorage.getItem(key(page));
    if (saved) { api.fromJSON(JSON.parse(saved)); restored = WORKSPACES[page].every((p) => api.getPanel(p.id)); }
  } catch (e) {
    console.warn(`The saved ${page} layout could not be loaded, using the default.`, e);
  }
  if (!restored) { api.clear(); buildDefault(api, page); }
  return api.onDidLayoutChange(() => {
    try { localStorage.setItem(key(page), JSON.stringify(api.toJSON())); } catch { /* private window: layout just isn't remembered */ }
  });
}

export function resetLayout(page: Page) {
  const api = apis.get(page);
  if (!api) return;
  localStorage.removeItem(key(page));
  api.clear();
  buildDefault(api, page);
}
