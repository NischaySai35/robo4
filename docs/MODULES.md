# Modules: where things live and what to run when they change

Always run `npm run typecheck` and `npm run depcruise` from `studio/`, and the tab checklist before a commit that changes a screen.

| Module | Files | Run when it changes |
|---|---|---|
| Core model | `studio/src/core/model`, `core/commands`, `core/serialization` | `npx tsx --test "src/core/**/*.test.ts"` |
| Kinematics | `studio/src/kinematics`, `assembly/connectorSnap.ts` | `npx tsx --test src/kinematics/modelIK.test.ts`; check the VSEPR score is still shown |
| Runtime | `studio/src/runtime` | `npx tsx --test src/runtime/runtime.test.ts` |
| Viewport | `studio/src/viewport`, `bridge`, `features/canvas`, `features/viewport-ui` | `npx tsx --test "src/viewport/*.test.ts"`, tab checklist, `tools/bench/g0_idle.py` |
| State | `studio/src/state` | Tab checklist |
| Physics in the browser | `studio/src/physics`, `viewport/PhysicsSim.ts`, `features/gravity` | `npx tsx --test "src/features/gravity/*.test.ts"` and the viewport tests |
| MSRR and planner | `studio/src/robotics/msrr`, `robotics/msrr2`, `features/msrr`, `features/msrr2`, `state/msrr*` | The `robotics/msrr2` tests; the `msrr` tests in pieces, because `transform.test.ts` is over 105 s |
| GOS core and package | `gos/core`, `gos/python` | `cargo test` in `gos/`, `py -3.12 -m pytest gos/python/tests`, `tools/test_mjcf.py` |
| Physics service | `sim/` | Short service endpoints only, 120 s at most |
| Hardware | `studio/src/hardware`, `features/espttl`, `features/servo`, `firmware/` | `features/espttl/motion.test.ts`. Do not change `firmware/` without asking. |
| Packaging | `studio/package.json` `build`, `.github/workflows` | `docs/RELEASING.md` |
| Benchmarks | `studio/tools/bench`, `tools/bench` | `docs/design/gos-g0-baseline.md` |
