# GOS G0: measured baseline (31 Oct 2026)

Machine: Ryzen 7 260 (8 cores, 16 threads), 23 GB RAM, RTX 5050 Laptop 8 GB, Windows 11, Node 26.13, Python 3.12.10, MuJoCo 3.17.0, mink 1.3.0, Zenoh Python 1.10.2. Another Claude session was working at the same time, so treat small differences as noise. Not measured on Ubuntu 24.04 yet.

Rerun:

```powershell
cd D:\robo4-restructure\studio; npx tsx tools/bench/g0.ts; cd ..; py -3.12 tools/bench/g0_mujoco.py; $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/bench/g0_idle.py
```

## Against the §10.8 budget

| Path | Target | Measured today | Verdict |
|---|---|---|---|
| Topic, same machine, small message | under 100 µs native | **Zenoh, Python to Python, 2 processes, 217 B: 89 µs round trip** (p99 169). Plain TCP in Python: 19 µs round trip. In-process TS bus: 0.18 µs. | Python already fits. Native not measured. |
| Large data, no copy | no copy | Not measured. PyPI Zenoh needs a source build for shared memory, so not tested on Windows. | **Open** |
| Studio view of joint state | every frame at 60 Hz, no JSON | JSON for 21 joints costs 1.7 µs, so JSON is not the limit at this size. The Studio view has no live GOS link yet. | **Open** |
| GraphIK step, 3 modules | under 5 ms in Python, under 1 ms native | **mink with a closed ring of 21 joints: 0.17 ms** (p99 0.37). Today's `solveModelIK`, full solve: 1.4 ms, in JS. | Speed met, **accuracy not: see below** |
| Topology change (lock) | under 50 ms | Lock already in the model, `eq_active` + `mj_forward`: **10 µs**. New lock, `MjSpec.recompile`: **0.81 ms**, joint positions kept. Abstract capsule robot, not the meshes. | Met on the abstract robot |
| Laptop to servo round trip | measure first | **Not measured**: needs the robot and I don't move motors without you. | **Open** |
| Idle with no window | near 0% CPU | Nothing to measure until `gosd` exists. | **Open** |
| Installer and app size | find out why | See below. | Explained |

## Other numbers

| Operation | 1 module | 3 modules | 6 modules |
|---|---|---|---|
| `computeFK` (TS) | 13 µs | 22 µs | 25 µs |
| `spreadScore` VSEPR (TS) | 12 µs | 18 µs | 50 µs |
| `mj_kinematics` | 0.5 µs | 0.9 µs | 1.6 µs |
| `mj_step` | 3.8 µs | 9.5 µs | 25 µs |
| Compile from XML | 0.85 ms | 1.0 ms | 1.4 ms |

The TS row uses unconnected modules in one document. The MuJoCo rows use an abstract chain of capsules with no contact, so `mj_step` will be slower on the real model.

## IK: speed is fine, accuracy is not proven

| Test | Result |
|---|---|
| mink, open chain, 800 steps | goal error 58.3 → 34.8 mm, end gap 0 → **23.9 mm** |
| mink, closed ring, 800 steps | goal error 58.3 → 38.2 mm, end gap 0 → **0.003 mm** |
| `solveModelIK`, 7-joint chain | ends **82 mm** from the goal, and returns only joint values, with no flag saying it failed |

mink holds a closed loop while moving, which is the thing nothing else here can do. It did not reach the goal in this test, and I don't know yet whether the goal is out of reach or the solver stalls. That is GOS G4 stage A. `solveModelIK` giving no failure signal is a silent failure and should be fixed in the same stage.

## Idle drawing per page

**Correction:** the first version of this table showed 949 draw calls/s on an idle Editor. That was wrong: the test waited only 2.5 s, and was counting the end of the 90-frame redraw burst after a click. With time to settle, only MSRR drew while idle.

Renders/s, default module loaded, nothing touched, measured on the real GPU after 3.5 s of settling:

| Page | Before P3 | After P3 |
|---|---|---|
| Editor, Analysis, Training, Animation, ESP-TTL, Motor Control | 0 | **0** |
| MSRR | every frame it could draw (7 to 21/s on software rendering) | **0** |

Browser frame requests are now one per frame, about 60/s, for the loops that still tick. Those loops do no drawing while idle. `tools/bench/g0_idle.py` counts raw draw calls on software rendering and settles more slowly, so it can still show a burst on the first page visited.

## Why `app.asar` is 320 MB

Measured from the header of the v1.0.4 build, `studio/release2/win-unpacked`. The real install is bigger than the plan said: **320 MB inside plus 307 MB unpacked next to it**. The installer is 246 MB.

| Where | Size | What |
|---|---|---|
| Inside `app.asar` | 145 MB | `onnxruntime-web` |
| | 78 MB | `dist`, the actual app, which already includes its own copy of the WASM files |
| | 46 MB | `jolt-physics` |
| | 9 MB | `@huggingface/transformers` |
| | 8 MB each | `@dimforge/rapier3d-compat` (not imported by the app, only named in old comments; it comes with a dependency), `occt-import-js` |
| Unpacked | 301 MB | `onnxruntime-node`, with binaries for **every OS and CPU**, on a Windows install |
| | 20 MB | `@img/sharp-win32-x64` |

**Cause:** Vite already bundles the app into `dist`, yet electron-builder also packs everything under `dependencies`. `studio/electron/` needs only `electron-updater` from them. Moving the bundled packages to `devDependencies` should remove about 540 MB. That is an estimate until a build confirms that voice and the AI model still work. The current `dist` is already 106 MB. Packaging work, GOS G7.

## Exporters

`exportMJCF` on real inputs:

| Input | Result |
|---|---|
| Closed ring A-B-C-D-A | **Empty `<worldbody>`: the whole robot is lost**, no warning |
| Diamond R-A-C, R-B-C | Closing joint `BC` **silently dropped**, no `<equality>` |
| Default module | **MuJoCo refuses to load it**: `mesh 'asset_...' not found`, because no `<asset>` section is written |

The URDF exporter warns about dropped joints, but a pure ring also has no root there. Fix in GOS G1, whose "done when" already requires loops to survive export.
