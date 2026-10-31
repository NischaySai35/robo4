# P6: operators and keymap

## Problem

The same action was written several times: a `keydown` branch in `App.tsx`, a menu entry, a palette entry. They drifted. The help screen listed shortcuts that didn't match the code, Esc could never deselect because `cancelAxisModal` always exists, and Ctrl+R loop cut was unreachable because the Ctrl block returned first. Scripts had no way in.

## Chosen approach

- `core/ops/registry.ts`: `defineOperator({ id, label, group, poll, exec })` and one `runOperator(id, props)`, which never throws and whose error says what to do.
- `features/ops/appOps.ts`: the operators, plus `KEYMAP`, the one shortcut table. One key can list several operators, and the first whose `poll` passes runs. So X means delete in Edit Mode, axis-move with a body selected, and delete with a joint selected.
- The palette and the help screen are generated from these. `window.tetrobotOps` exposes it to scripts, which GOS G5 builds on.

Typed-number entry during an axis move, and tools that capture keys while active (Measure, Pivot Pick, Manual tab, context menus), stay as they are: Blender treats these as modal handlers that see events first. Listing them as a future modal layer is enough for now.

Undo stays in `undoStack.ts` and isn't pushed by operators. The settle timer already groups edits into one step, including edits from sliders and panels that aren't operators yet.

## Not done in this phase

Panel buttons such as Inspector fields still dispatch commands directly. Those are not converted one by one; `P7` touches each panel and converts actions when it restyles them. Say so plainly rather than treat P6 as covering every button.

## Rejected alternatives

| Alternative | Why not |
|---|---|
| The plan's `invoke` and `modal` stages now | Nothing needs them until a modal tool is converted |
| Pushing undo from operators | Would miss edits from non-operator paths during migration and disagree with the settle timer |

## How to verify

- Unit tests for run results and key matching.
- Browser test: run every non-interactive operator on an empty document and on the default module; none may throw.
- Browser test: Esc deselects, X on a body starts an axis move, Ctrl+Z undoes.
