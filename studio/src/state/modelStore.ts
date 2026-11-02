/**
 * modelStore.js — React (zustand) binding for the core model + command bus.
 *
 * This is the ONLY bridge between the framework-free core (@/core) and the UI.
 * Components read `doc` and call `dispatch(command)`. The store mirrors the bus' current document.
 *
 * Phase 0: the store exists and is self-contained. It does not yet drive the
 * viewport (that's Phase 1's generic renderer) — the legacy arm rendering keeps
 * working unchanged in the meantime.
 */
import { create } from 'zustand';
import { CommandBus } from '@/core/commands/index';
import { makeDocument } from '@/core/model/index';
import type { Document } from '@/core/model/index';
import { stabilizeLoops } from '@/assembly/connectorSnap';
import { setModelPort } from '@/core/model/modelPort';

// cap 0: the one undo history is core/commands/undoStack.ts, see docs/design/p5-one-undo.md.
const bus = new CommandBus(makeDocument({ name: 'Untitled' }), { cap: 0 });
// Closed lock loops are a first-class invariant: after ANY mutation (drag, gizmo, sliders,
// animation), the bus re-projects the config so every lock stays shut. Graph FK is a spanning
// tree that drops loop-closing edges, so without this any edit could silently open a loop.
bus.setStabilizer(stabilizeLoops);
// applyTransient() is the 60Hz hot path (motor spin, physics, IK-drag, animation playback) —
// stabilizeLoops's full solve (up to 40 LM iterations, each costing several full FK passes) is
// fine for a rare discrete dispatch() but was running unconditionally on every transient frame,
// which is what turned "spin one wheel" into 30fps and "spin two" into 3-4fps (confirmed via
// frameProfiler + code trace, not a guess). A transient call's doc is already near-converged
// frame to frame, so a few iterations closes normal per-frame drift fine; once under
// stabilizeLoops's own 2mm threshold, later frames skip the solve entirely.
bus.setTransientStabilizer((doc) => stabilizeLoops(doc, { iterations: 4 }));

interface ModelState {
  /** True while the view shows a simulated pose that is not the saved design. */
  showingSimulation: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bus: any;
  doc: Document;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: (command: any) => void;
  loadDocument: (doc: Document) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTransient: (fn: (doc: Document) => Document) => void;
}

export const useModelStore = create<ModelState>((set) => {
  const sync = () => set({
    doc: bus.doc,
    showingSimulation: bus.showingSimulation,
  });

  bus.subscribe(sync);

  return {
    bus,
    doc: bus.doc,
    showingSimulation: false,

    /** Apply a command (from @/core/commands). */
    dispatch: (command) => { bus.dispatch(command); },
    /** Replace the document (file open / new project) and clear history. */
    loadDocument: (doc) => { bus.reset(doc); sync(); },
    /** High-frequency update that bypasses undo history (action playback). */
    applyTransient: (fn) => { bus.applyTransient(fn); },
  };
});

// Hand engine-side services the live document. Registered HERE so modules like the motion
// executor can ask for the current doc without importing this store — see core/model/modelPort
// for why they need "current" rather than a per-call snapshot, and why that must not be a
// store import.
setModelPort({
  getDoc: () => useModelStore.getState().doc,
  applyTransient: (fn) => useModelStore.getState().applyTransient(fn),
});

/** What a tree or list shows: parts, joints, components, their names and grouping, hidden and locked state. Not joint values or poses. */
function structureKey(doc: any): string {
  let k = '';
  for (const b of Object.values<any>(doc.bodies)) k += `${b.id}:${b.name}:${b.componentId ?? ''}:${b.meta?.hidden ? 'h' : ''}:${(b.meta?.connectors ?? []).length}|`;
  for (const j of Object.values<any>(doc.joints)) k += `${j.id}:${j.name}:${j.type}:${j.componentId ?? ''}:${j.parentBodyId}:${j.childBodyId}:${j.state?.disabled ? 'd' : ''}|`;
  for (const c of Object.values<any>(doc.components ?? {})) k += `${c.id}:${c.name}:${c.collapsed ? 'c' : ''}|`;
  return k;
}

/** The document for trees and lists: re-renders when the structure changes, not on every pose during playback or physics (P8 measurement). */
export function useDocStructure() {
  useModelStore((s) => structureKey(s.doc));
  return useModelStore.getState().doc;
}
