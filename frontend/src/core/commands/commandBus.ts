/**
 * commandBus.js — the heart of "everything is undoable".
 *
 * Every edit to the model is a Command: { label, redo(doc)->doc, undo(doc)->doc }.
 * The bus holds the current (immutable) document and two stacks. Backends (viewport,
 * physics, exporters, hardware) READ the document and DISPATCH commands — they never
 * mutate the model directly. This single chokepoint gives the whole platform uniform
 * undo/redo, history, and (later) collaboration/scripting for free.
 *
 * A Command captures whatever it needs to invert itself (see commands.js). Commands
 * are framework-free; React integration lives in state/modelStore.js.
 */

const DEFAULT_CAP = 100;

export class CommandBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _doc: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _undo: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _redo: any[];
  _cap: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _listeners: Set<any>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(doc: any, { cap = DEFAULT_CAP }: { cap?: number } = {}) {
    this._doc = doc;
    this._undo = [];
    this._redo = [];
    this._cap = cap;
    this._listeners = new Set();
  }

  get doc() { return this._doc; }
  get canUndo() { return this._undo.length > 0; }
  get canRedo() { return this._redo.length > 0; }
  get history() {
    return {
      undo: this._undo.map(c => c.label),
      redo: this._redo.map(c => c.label),
    };
  }

  /** Apply a command, push it on the undo stack, clear the redo stack. */
  dispatch(command: any) {
    if (!command || typeof command.redo !== 'function') {
      throw new Error('dispatch() requires a command with redo()/undo()');
    }
    this._doc = command.redo(this._doc);
    this._undo.push(command);
    if (this._undo.length > this._cap) this._undo.shift();
    this._redo.length = 0;
    this._emit('dispatch', command);
    return this._doc;
  }

  undo() {
    const cmd = this._undo.pop();
    if (!cmd) return this._doc;
    this._doc = cmd.undo(this._doc);
    this._redo.push(cmd);
    this._emit('undo', cmd);
    return this._doc;
  }

  redo() {
    const cmd = this._redo.pop();
    if (!cmd) return this._doc;
    this._doc = cmd.redo(this._doc);
    this._undo.push(cmd);
    this._emit('redo', cmd);
    return this._doc;
  }

  /** Replace the document and clear history (e.g. on file open / new project). */
  reset(doc: any) {
    this._doc = doc;
    this._undo.length = 0;
    this._redo.length = 0;
    this._emit('reset', null);
    return this._doc;
  }

  /** Subscribe to any change. Returns an unsubscribe fn. */
  subscribe(fn: any) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit(action: any, command: any) {
    for (const fn of this._listeners) fn({ action, command, doc: this._doc });
  }
}

/**
 * Helper to build a command from a forward op + its inverse. `capture` runs at
 * apply time so the command can record state needed to undo (e.g. the prior value).
 */
export function command(label: any, redo: any, undo: any) {
  return { label, redo, undo };
}