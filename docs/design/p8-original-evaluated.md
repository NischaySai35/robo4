# P8: your design vs what the simulation shows

## Problem

Physics, animation, IK dragging, motors and the MSRR mirror write poses into the document with `applyTransient`, in about 39 places. The document is also what gets saved and undone, so a physics run could be saved by autosave over your design pose, and playback created undo steps.

## Chosen approach

The command bus keeps two references: `original`, the design, and `doc`, what is shown. `applyTransient` changes only `doc`. Edits (`dispatch`), file loads and undo set both, and an edit starts from what is shown, so editing during a simulation behaves exactly as before. Saving, autosave and undo read `original`.

None of the 39 writers had to change, which keeps the risk to tomorrow's shape-changing work low. Home and spin motors already commit their final pose with `dispatch`, so they still save it.

A badge in the viewport says "Simulated pose, not saved", with Keep (Blender's Apply Visual Transform) and Back to design. Both are operators: `pose.apply`, `pose.revert`.

## Not done yet

Physics still writes whole documents into the shown copy rather than a separate store of poses (the plan's `EvaluatedScene`), and panels subscribe to the whole store rather than notifiers. Those are bigger, and only worth it once a measurement shows they cost time.

## Rejected alternatives

| Alternative | Why not |
|---|---|
| Change all 39 writers to a new evaluated store now | High risk to the MSRR and transformation code for little user-visible gain |
| Save the shown pose and ask on save | Saving would still depend on when you happen to press it |

## How to verify

- Unit tests in `core/commands/original.test.ts`.
- In the app: move the robot without an edit, then check the saved project and the undo history are unchanged, and that the badge appears with working Keep and Back.
