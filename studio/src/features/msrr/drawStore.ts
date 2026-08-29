/**
 * drawStore — transient UI state for the MSRR page's input tools.
 *
 * Split out of msrrStore because none of it is part of an experiment: a half-drawn
 * stroke is interaction state, and mixing it into the structure store would make
 * every pointer move invalidate planner state.
 */
import { create } from 'zustand';
import type { Point3 } from '@/robotics/msrr/strokeToShape';

interface DrawState {
  /** strokes authored in the Draw tab, in lattice coordinates */
  strokes: Point3[][];
  /** the stroke currently being drawn, if any */
  current: Point3[];
  /** dilation radius applied when the strokes are converted to modules */
  thickness: number;
  /** the y layer new stroke points land on (drawing happens on a plane) */
  layer: number;

  setThickness: (n: number) => void;
  setLayer: (n: number) => void;
  beginStroke: (p: Point3) => void;
  extendStroke: (p: Point3) => void;
  endStroke: () => void;
  /** remove the last point of the in-progress stroke — fixes a misclick without losing the whole line */
  undoPoint: () => void;
  undoStroke: () => void;
  clearStrokes: () => void;
  setStrokes: (s: Point3[][]) => void;
}

const samePoint = (a: Point3, b: Point3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export const useMsrrDrawStore = create<DrawState>((set, get) => ({
  strokes: [],
  current: [],
  thickness: 0,
  layer: 0,

  setThickness: (thickness) => set({ thickness: Math.max(0, Math.min(3, Math.round(thickness))) }),
  setLayer: (layer) => set({ layer: Math.max(0, Math.round(layer)) }),

  beginStroke: (p) => set({ current: [p] }),
  extendStroke: (p) => {
    const { current } = get();
    if (current.length && samePoint(current[current.length - 1], p)) return;
    set({ current: [...current, p] });
  },
  endStroke: () => {
    const { current, strokes } = get();
    // A single click is a dot, not a stroke — keeping it would add an isolated
    // module the planner would then refuse to work with.
    if (current.length < 2) { set({ current: [] }); return; }
    set({ strokes: [...strokes, current], current: [] });
  },
  undoPoint: () => set({ current: get().current.slice(0, -1) }),
  undoStroke: () => set({ strokes: get().strokes.slice(0, -1) }),
  clearStrokes: () => set({ strokes: [], current: [] }),
  setStrokes: (strokes) => set({ strokes, current: [] }),
}));
