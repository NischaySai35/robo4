# Tab checklist (P0 safety net)

Run after every restructuring step. Automated part, with the dev server running:

```powershell
cd D:\robo4-restructure\studio; npx vite --port 5183
$env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/ui_baseline.py $env:TEMP\new; py -3.12 tools/ui_baseline.py --compare docs/baseline/p0 $env:TEMP\new
```

Restart the dev server first: after edits Vite serves changed files with a `?t=` stamp, and the script's imports then get a second, empty copy of the stores. The script loads the default module, screenshots every page, then does the round trip. It never presses Connect, Scan or Stream, so no motor moves.

| Page | Expected on screen with a module loaded | Automated | By hand |
|---|---|---|---|
| Editor | Canvas, stats, FIT, Home, VSEPR score | Yes | Orbit, pan, zoom, gizmo click, WIRE, engine switch |
| Analysis | Top and bottom view, stats, FIT, Home, VSEPR score | Yes | Bottom view follows top with Sync, stress overlay |
| Training | Canvas, stats, FIT, Home, VSEPR score | Yes | Task buttons |
| Animation | Canvas, stats, FIT, Home, VSEPR score, timeline | Yes | Play and scrub |
| MSRR: Robot, Shapes, Plan, Ask, Run, Manual | Canvas, stats, FIT, Home | Yes | Gravity run through the physics service |
| ESP-TTL | Tabs, E-STOP, offline message | Yes | Needs the robot for anything else |
| Motor Control | Panel, no canvas | Yes | Needs the robot |
| Round trip | Editor camera survives MSRR open and close, FIT still moves it, undo and redo change the body count | Yes | Gizmo in both tabs |

## Known failures and gaps at the baseline (31 Oct 2026)

| # | What | Evidence | Fix in |
|---|---|---|---|
| 1 | ~~VSEPR score not shown on any MSRR tab.~~ **Fixed in P2**, scoring the robot on screen. | `vsepr: 1` on all six; same module scores the same in Editor and MSRR | Done |
| 1b | The MSRR scene is drawn about 2.1× too big against its grid: `scene.scale` is `1 / UNITS_PER_M` and ignores `MODULINK_CUBE_SIZE`. A 0.67 m module spans 1.42 m of grid. | Measured from body centres, 31 Oct | When MSRR moves to the shared scene (P9) |
| 2 | Pages draw while idle: no page reaches 0 draw calls/s, and ESP-TTL and Motor still draw with no visible canvas. | `docs/design/gos-g0-baseline.md` | P3 |
| 3 | The app polls `http://mod1.local/api/telemetry` from startup on every page, so the console fills with `NAME_NOT_RESOLVED` when no robot is on. | Request log, `report.json` | Poll only when a connection is wanted (P4) |
| 4 | `texImage3D: FLIP_Y ... isn't allowed` on opening MSRR. | `report.json` | Check with the renderer work (P9) |
| 5 | ~~Rajdhani and Share Tech Mono came from Google, so some panels looked different with no network.~~ **Fixed in P1:** self-hosted. | Build has 13 `woff2` files and no Google link | Done |
| 6 | `npm test` takes over 120 s here: `transform.test.ts` was still running at 105 s. The other 51 files pass (337 tests). | Timed per file | Split the slow file |

Not automated yet: everything in the "By hand" column. The screenshots use software rendering, so they check layout and content, not GPU behaviour or real frame rates.
