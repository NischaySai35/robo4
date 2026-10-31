# P9: render engines

## Problem

Eevee, Cycles and Raycast were one long `switch` plus `if (mode === 'cycles')` checks inside `SceneManager`. The Analysis page's bottom view also has its own WebGL renderer, so every mesh is uploaded to the GPU twice.

## Done

`viewport/engines.ts` holds one entry per engine. `SceneManager` looks the engine up by id, and an unknown id is refused with a warning. Each `SceneManager` holds its own engine, so each viewport picks its own. Adding an engine is one new entry.

## Not done: one GPU context for the Analysis page

WebGL can't draw into another canvas, so sharing means one canvas covering both views, drawn with scissor rectangles. The two views are separate dock panels, and picking, orbit and gizmos all read the canvas position, so this touches every mouse interaction. Copying pixels between canvases works, but reads back from the GPU every frame.

Deferred on purpose: the cost is memory on one page only, and the risk falls on the code used for shape-changing work. Do it when two editable viewports are wanted, and measure the memory first.

## How to verify

`tools/test_engines.py` switches engines on the real GPU, checks each one takes effect and that Cycles reaches samples and its overlay goes away afterwards. An unknown engine must leave the current one running.
