# GOS G0: API and message design note

Status: **proposal.** The core language and licence are Nischay's decisions, and the physics engine depends on §7.

## Problem

Today the graph, runtime and IK live inside the Studio window, so nothing outside it can reach them. GOS must work with the full Studio, with only the animation view, or with no window from a terminal or Python, and it must treat loops and changing topology as normal cases.

## Chosen approach

**One engine, many clients.** A script, the CLI, the Studio and the ROS 2 bridge all use the same API. There is one implementation of the graph and the topology compiler. A second copy per language would break the no-duplicates rule, so bindings stay thin.

```text
Core nouns:   Graph, Body, Joint, Lock, Frame, Component
Runtime:      Node, Topic, Service, Action, Parameter, Clock, Recording
Operations:   every Studio operator (P6) is callable by name, same undo path
```

### API contract, first version

```python
import gos

with gos.App(headless=True, seed=1) as app:     # no gosd needed: engine runs in-process
    g = app.load("three_modules.nischay")
    app.lock("M1.B", "M2.A")                    # Result with event id; undoable; recompiles solver and physics
    r = g.ik("M3.B", pose=target, keep_closed=True)
    r.ok, r.goal_error_m, r.closure_error_m     # always reported, never just joint values
    app.run(seconds=5)
    app.topic("/joints").echo(n=1)
```

Rules every call follows, taken from what the baseline found wrong today:

1. **No silent failure.** A call returns a result with `ok`, numbers and a message saying what to do, or raises. `solveModelIK` returning joint values 82 mm from the goal with no flag is the example to avoid.
2. **Lossy conversions say so.** Export returns the file plus a list of what could not be represented. A tree view of a graph lists the cut joints.
3. **Real hardware is explicit.** `app.arm()` is required before motion, `app.stop()` always works, and the default binding is localhost plus a token.
4. **Same script, sim or real.** The backend is chosen by a setting, not by different calls.
5. **Topology is data.** `lock` and `unlock` emit events on `/graph/events`, are undoable, and keep joint positions.

The CLI is the same API: `gos run`, `gos topic list|echo`, `gos graph show|lock`, `gos ik`, `gos record`, `gos play`, `gos view`, `gos studio --attach`. `gos` is not yet checked for name conflicts.

### Messages

| Path | Format | Why |
|---|---|---|
| Hot state (joints, poses, IMU) | Fixed binary layout: `{seq u64, t_ns u64, topology_id u32, n u32, values f64[n]}`, little-endian. Names travel separately in the latched `/graph/layout` topic, keyed by `topology_id`. | Avoids sending names each frame. A lock changes `topology_id`, so a reader can't misread old layouts. |
| Everything else (services, actions, parameters, events) | One schema, generated for TS, Python, C++ and Rust. Candidate: ROS 2 `.msg` syntax, so the bridge maps types directly. | Saves users learning a second syntax and makes the bridge easy. To confirm in G2. |
| Batches (thousands of robots) | Arrow or raw GPU buffers | Decide when the batch path exists |
| Recordings | MCAP. `.nischaybag` gets a converter so old recordings still load. | Open container, independent of the encoding |

The data decision is made on evidence: JSON for 21 joints costs 1.7 µs here, so JSON is **not** today's bottleneck at this size. The binary layout is chosen for fixed layouts, topology safety and growth to large robots, not because JSON was measured as too slow.

### Transport

Interface first, like ROS `rmw`: in-process, then Zenoh, plus WebSocket for a browser. Zenoh passes the first test: 89 µs round trip between Python processes on Windows, no daemon needed. Shared memory stays open, because the PyPI build doesn't enable it.

## Rejected alternatives

| Alternative | Why not |
|---|---|
| Keep the engine in the Studio and add an API to the window | A script would need a window, which fails the no-window requirement |
| A rewrite of `graph.ts` per language | Two copies drift. This is exactly what the reuse rule forbids. |
| Own kernel driver | See §10.2 |
| DDS as the transport | Heavier setup. Reached through the bridge instead. |

## Core language: evidence for the decision

**History.** The Rust core `rtcore/` (8 crates, 2,446 lines of `.rs`, 45 tests, 1 kHz loop, CiA 402, ROS bridge, telemetry) was deleted in `f566107` on 12 Jul 2026. That commit's only message is "jolt physics1". `STATUS.md` then says a C++ port exists in `native/`.

**`native/` is gone.** No commit in any branch ever contained it, no other copy turned up in the folders searched, and `STATUS.md` itself says it was never compiled. Only the Rust version is recoverable, with `git archive f566107^ rtcore`.

**Why it moved from Rust to C++: not recorded.** `native/MIGRATION.md` was never committed and no transcript I could search holds the reason. The commit added a `zenoh-c` install to `.build-deps`, and `STATUS.md` lists MuJoCo, Zenoh, nlohmann_json and IXWebSocket as the port's dependencies, so wanting direct MuJoCo and Zenoh C APIs is a plausible reason, but that is a **guess**. Nischay may remember the real one.

**This machine.** No `rustc`, `cargo`, `cmake`, `cl`, `g++`, `clang` or `conda` on PATH, so neither old core can be built or run here until a toolchain is installed.

| | Rust + C API | C++ | TypeScript engine, native later |
|---|---|---|---|
| Browser and Studio use | Good: compiles to WASM | Works: Emscripten | Already there |
| MuJoCo | Through its C API, needs bindings | Direct | Through a service |
| Zenoh, iceoryx2 | Native | Wrappers over the Rust core | Through a client |
| Python binding | PyO3 and maturin build wheels for all 3 OS | pybind11 or nanobind; more CI work | Python talks over the transport |
| Memory safety near real motors | Enforced by the compiler | By discipline | Managed, but garbage-collection pauses |
| Previous attempt here | 2,446 lines and 45 tests recoverable, not rebuilt here | Lost, never compiled | 967 lines of `runtime/` in daily use |
| Effort to start | Install Rust | Install CMake and a compiler | None |

**What the numbers say:** nothing measured here *needs* native code yet. MuJoCo already is native, mink in Python meets the budget 30 times over, and Zenoh in Python is under target. The reason for a native core is one shared implementation for Python, the Studio and the robot, not speed.

**Recommendation: Rust**, for a small core only: graph store, topology compiler, message layouts, transport interface. MuJoCo and mink stay as they are, Python and TypeScript are thin bindings, and the Studio loads the same core through WASM. It reaches both the browser and Python from one source. If you remember a real reason Rust failed before, that could change this.

## Bringing `C:\TETROBOT\sim` into the repo (proposal, not done)

Backup made and checked: `D:\TETROBOT-sim-backup-2026-10-31.zip`, 340 of 340 files, 7 MB, SHA-256 starts `3EE2EA7C1C2FED6E`. Nothing was moved.

| Part | Size | Proposal |
|---|---|---|
| 176 working `.py` | 1.3 MB for all 250 | `sim/` in the repo |
| 50 `_*.py` throwaway scripts | included above | Keep out; they stay in the backup, unless you want one |
| `backup_*`, `__pycache__` | about 11 MB | Keep out |
| `.xml` models, `.stl`, small `.json` | the rest | In the repo if a script can't regenerate them |
| `deploy/` | 181 KB | `sim/deploy/`. Overlaps `brain/`; compare first, keep one copy. |
| `logs/` 1.1 GB, `lessons/` 11 GB, `runs/` 22 MB | too big for git | Stay outside, found through a setting. Exception: the trained `runs/dock_v3/brain.npz` the code loads. |

**The real work is paths.** 210 of the Python files hard-code `C:\TETROBOT`, and 10 or more repo files name it too (`vite-plugin-physics.cjs`, `state/msrrV2Store.ts`, the `msrr2` planner).

Steps: (1) add one `paths.py` reading `TETROBOT_DATA`, defaulting to `C:\TETROBOT`, so nothing breaks on this PC; (2) copy to `sim/` and change the paths mechanically; (3) run the same `/health`, `/check_static` and one short `/simulate` from both copies and compare; (4) point the Studio plugin at `sim/`; (5) retire the old folder only when you say. Your long GPU commands keep working the whole time, since the old folder stays.

## How to verify

- G1: the same document gives identical compiler output from Node and Python, and a ring survives export and loads in MuJoCo.
- G2: rerun `tools/bench/g0_mujoco.py transport` through the GOS interface; added cost is measured.
- G3: a Python script opens, runs and closes a simulation with no window.
