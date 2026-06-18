/**
 * modelStore.js — React (zustand) binding for the core model + command bus.
 *
 * This is the ONLY bridge between the framework-free core (@/core) and the UI.
 * Components read `doc` and call `dispatch(command)` / `undo()` / `redo()`.
 * The store mirrors the bus' current document and undo/redo flags reactively.
 *
 * Phase 0: the store exists and is self-contained. It does not yet drive the
 * viewport (that's Phase 1's generic renderer) — the legacy arm rendering keeps
 * working unchanged in the meantime.
 */
import { create } from 'zustand';
import { CommandBus } from '@/core/commands/index.js';
import { makeDocument } from '@/core/model/index.js';

const bus = new CommandBus(makeDocument({ name: 'Untitled' }));

export const useModelStore = create((set) => {
  const sync = () => set({
    doc: bus.doc,
    canUndo: bus.canUndo,
    canRedo: bus.canRedo,
  });

  bus.subscribe(sync);

  return {
    bus,
    doc: bus.doc,
    canUndo: false,
    canRedo: false,

    /** Apply a command (from @/core/commands). */
    dispatch: (command) => { bus.dispatch(command); },
    undo: () => { bus.undo(); },
    redo: () => { bus.redo(); },
    /** Replace the document (file open / new project) and clear history. */
    loadDocument: (doc) => { bus.reset(doc); sync(); },
  };
});
