# P2: viewport context

## Problem

`bridge` is one global object. `SceneManager`, `SimCanvas` and `ModelEditor` write about 45 functions into it, and 27 files read them. `MsrrCanvas` overwrites parts of it and has to save and restore the whole thing on close ("not restoring broke the other tabs", 30 Oct). Two visible viewports can't work like this, and Dockview (P4) needs them. Blender's answer is that a camera belongs to its region, and context comes from the region under the mouse.

## Chosen approach

Each `SceneManager` owns a `ViewportHandle`. Writers write to their own handle. `bridge` stays, as a read-through forwarder, so the 27 readers need no change yet.

- **Read order:** active viewport, then the Editor viewport, then the defaults. The fallback is what keeps today's behaviour: on MSRR, `bridge.undo` or `bridge.loadScene` still reach the Editor, as they did when MSRR copied the Editor's entries.
- **Active viewport:** the newest non-Editor viewport when it opens, then whichever canvas the pointer enters or presses. Closing a viewport returns control to the Editor. An Editor that opens while MSRR is on screen doesn't steal focus.
- **Location:** in `bridge/cameraBridge.ts`, not `viewport/` as the older plan said. `core/serialization` reads the bridge, and the layer rules don't let it import `viewport/`.

**VSEPR on MSRR** comes with this phase, since a viewport now reports what it shows. `spreadScore` splits out `spreadFromPoints`, one definition for both. `SpreadHud` gains `source="viewport"`, which reads `getBodyCentres` from the active viewport, and MSRR reports its drawn bodies in metres. So the number is for the robot on screen. Mounting the old `SpreadHud` there would have scored the Editor's document instead.

## Rejected alternatives

| Alternative | Why not |
|---|---|
| Forward reads to the active viewport only (the older plan) | MSRR would lose `undo`, `loadScene` and others that it inherits today |
| Keep save and restore in `MsrrCanvas` | The bug this phase removes |
| Change all 27 readers now (plan step 2) | **Deferred to P4.** Nothing shows two viewports at once until Dockview, so it can't be tested by eye yet, and the forwarder keeps readers correct. The rule "no new imports of bridge" starts with that migration. |

## How to verify

- Unit test: two handles, activation order, fallback, release, an Editor not stealing focus.
- `tools/ui_baseline.py`: the round trip keeps camera identity and pose, FIT and undo work, MSRR shows the VSEPR score, and screenshots match the baseline except for the new readout.
- The MSRR score for one straight module should be close to the Editor's for the same bodies. If not, one of them is measuring something else.
