# P5: one undo history

## Problem

There were two histories. The buttons used SimCanvas's: a text copy of the whole project (`JSON.stringify`, mesh data included) on each settled change, up to 30 of them. The command bus also kept 50 commands with hand-written inverses that nothing called.

## Chosen approach

`core/commands/undoStack.ts` holds `{ document reference, animation text }` steps, 100 at most. The document is immutable, so unchanged bodies and assets are shared between steps. The existing 700 ms settle timer still decides what counts as one step, so a drag remains one undo. The command bus is created with its stack capped at 0 and `modelStore` no longer offers `undo` or `redo`.

Autosave stays a separate file write, using the same settle timer.

## Rejected alternatives

| Alternative | Why not |
|---|---|
| Undo through the bus's inverse functions | Each command needs a correct hand-written inverse, physics and animation edits don't produce commands, and the buttons never used it |
| Keep JSON and compress it | Still copies all mesh data at every step |

## How to verify

- Unit test: 100 edits on 300 bodies create exactly 100 new body objects, and undo returns the exact original document.
- `tools/ui_baseline.py`: add a module, undo, redo; the body count follows.
