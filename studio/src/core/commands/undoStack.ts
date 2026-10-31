/**
 * UndoStack — the app's one undo history (P5, docs/design/p5-one-undo.md).
 *
 * Steps hold references, not copies. The document is immutable, so unchanged bodies are the
 * same objects in every step and a step costs only what changed. Blender's memfile undo gets
 * the same sharing by comparing chunks.
 */
export class UndoStack<T> {
  private past: T[] = [];
  private future: T[] = [];
  private present: T | null = null;

  constructor(private same: (a: T, b: T) => boolean, private cap = 100) {}

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }

  /** Record a settled state. The first call only sets the starting point, and an unchanged state adds no step. */
  record(state: T) {
    if (this.present !== null) {
      if (this.same(this.present, state)) { this.present = state; return; }
      this.past.push(this.present);
      if (this.past.length > this.cap) this.past.shift();
      this.future = [];
    }
    this.present = state;
  }

  /** Accept a state without adding a step: for what undo or redo itself just restored. */
  sync(state: T) { this.present = state; }

  undo(): T | null {
    const prev = this.past.pop();
    if (prev === undefined) return null;
    if (this.present !== null) this.future.push(this.present);
    this.present = prev;
    return prev;
  }

  redo(): T | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    if (this.present !== null) this.past.push(this.present);
    this.present = next;
    return next;
  }
}
