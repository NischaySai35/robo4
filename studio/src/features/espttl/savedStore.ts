/**
 * savedStore — named animations kept inside TETROBOT itself (browser/Electron local storage).
 *
 * An entry is a full timeline snapshot in the same `tetrobot.timeline` format that Export
 * writes, so Load is just timelineStore.importJson — one code path for files and saved
 * entries, and loading goes through the timeline's undo history.
 */
import { create } from 'zustand';
import type { TimelineFile } from './timelineStore';

export interface SavedAnimation {
  id: string;
  name: string;
  savedAt: string;          // ISO
  data: TimelineFile;
}

interface SavedState {
  items: SavedAnimation[];  // newest first
  /** Save a snapshot. A blank name gets "Animation N". Returns the stored entry. */
  save: (timelineJson: string, name?: string) => SavedAnimation | null;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
}

const LS_KEY = 'robo4:esptt:saved-animations';
const uid = () => 's' + Math.random().toString(36).slice(2, 9);

function load(): SavedAnimation[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(x => x && typeof x.id === 'string' && x.data && Array.isArray(x.data.frames));
  } catch { return []; }
}

function persist(items: SavedAnimation[]): boolean {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)); return true; }
  catch { return false; }   // quota / storage blocked — still usable this session
}

/** Make a name unique among saved entries ("Wave" -> "Wave (2)"). */
function uniqueName(base: string, items: SavedAnimation[], ignoreId?: string): string {
  const taken = new Set(items.filter(i => i.id !== ignoreId).map(i => i.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const cand = `${base} (${n})`;
    if (!taken.has(cand.toLowerCase())) return cand;
  }
}

export const useSavedStore = create<SavedState>((set, get) => ({
  items: load(),

  save: (timelineJson, name) => {
    let data: TimelineFile;
    try { data = JSON.parse(timelineJson); } catch { return null; }
    if (!Array.isArray(data?.frames) || !data.frames.length) return null;
    const items = get().items;
    const clean = (name || '').trim().slice(0, 60);
    const entry: SavedAnimation = {
      id: uid(),
      name: uniqueName(clean || `Animation ${items.length + 1}`, items),
      savedAt: new Date().toISOString(),
      data,
    };
    const next = [entry, ...items];
    set({ items: next });
    persist(next);
    return entry;
  },

  rename: (id, name) => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return;
    const items = get().items;
    const next = items.map(i => (i.id === id ? { ...i, name: uniqueName(clean, items, id) } : i));
    set({ items: next });
    persist(next);
  },

  remove: (id) => {
    const next = get().items.filter(i => i.id !== id);
    set({ items: next });
    persist(next);
  },
}));
