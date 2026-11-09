# TETROBOT — Shape Intelligence: Design

Status: **proposal, 9 Nov 2026.** Owner: Nischay. Builds on [TRANSFORM_PLANNER_V2_PROGRESS.md](TRANSFORM_PLANNER_V2_PROGRESS.md),
[idea.md §13](idea.md), [RESTRUCTURING.md §10 (GOS)](RESTRUCTURING.md), [PLAN-INDUSTRIAL.md Track 1](PLAN-INDUSTRIAL.md),
[realtime_errors.md](realtime_errors.md). Current results: [CURRENT_STATE.md](CURRENT_STATE.md).

## 1. Problem

A person says what they want ("become a car", then "no, a real car with wheels"). The robot must work out
a body that does it, check it can really build that body with the parts it has, tell the person what it will do
(or why it can't), transform itself, and recover from things going wrong — without a hand-made entry per shape.

## 2. Goals and non-goals

Goals
- G1 **Open-ended requests.** Any sentence, multi-turn, with edits ("taller", "no, with wheels", "use only 3").
- G2 **No per-shape code.** Shapes are generated and judged by physics; the library is a cache, not the source.
- G3 **Honest feasibility.** Before acting: enough modules? accessories present? physically stable? Say so plainly.
- G4 **Every failure is caught, classified, and answered** (retry, re-plan, degrade, ask, or stop safely).
- G5 **Scales with the work.** Heavy steps fan out over CPU/GPU workers; the person sees progress and time left.
- G6 **Reviewable engineering.** Typed contracts between layers, tests per layer, measured numbers only.

Non-goals (for now)
- Letting an LLM output joint angles or plans. The LLM works only at the language edge.
- Lattice/cellular reconfiguration (our modules are chains, not cubes).
- More than one external camera ([blind-first rule](CURRENT_STATE.md)).

## 3. Architecture

```
 person ──► L1 Conversation ──► GoalSpec(v_n) ──► L2 Feasibility ──► L3 Shape designer ──► ShapeGraph
              ▲   (LLM, TS)        (typed,          (inventory +        (search + GPU physics,
              │                     versioned)       quick physics)      learned proposer later)
              │                                                              │
              │      report / warnings / questions                           ▼
              └──────────────────────────────────────────────── L4 Transformation planner ──► Plan
                                                                  (graph search over lock moves,     │
                                                                   costs = measured skill success)   ▼
                                                         L5 Skills: dock · undock · crawl · roll · lift
                                                         (teacher controller → imitation → RL policy)
                                                                                                     │
                                                         L6 Execution supervisor ◄───────────────────┘
                                                         (sim twin first, then the real robot; monitors,
                                                          catches errors, triggers re-plan)
 cross-cutting:  Orchestrator (jobs, workers, budgets, progress) · Error model · Telemetry/recording
```

Each layer is a separate component with one input contract and one output contract (§4). A layer never reaches
into another's internals; it can be replaced (hand-written → learned) without touching its neighbours.

### L1 Conversation (exists: `studio/src/robotics/msrr2/intent.ts`)
- The local LLM (Ollama `qwen3.5:9b`, JSON-schema-constrained) turns each turn into a **GoalSpec patch**, never a plan.
- The GoalSpec is **versioned**. "No, a real car with wheels" produces v2 = v1 + `{requires_accessory: wheels, ...}`;
  the reply shows the change in plain words ("Changed: wheels added, still low and fast").
- Only the layers downstream of what changed re-run (a pure height change does not redo feasibility of accessories).
- Fallback without the LLM: the existing keyword reader. Contradictions ("tall and under 10 cm") are detected by
  validating the spec, not by the LLM, and returned as a question.
- **New:** vocabulary for accessories and functions (wheels, gripper, payload) beyond today's 13 capability tags.

### L2 Feasibility (new)
- Inputs: GoalSpec, **Inventory** (live: modules online, health, battery, faults; accessories fitted), Environment
  (floor, wall, obstacles if known).
- Checks, cheapest first: resources (module count, accessories) → known limits (reach, torque from the measured
  servo model) → a quick physics check of the best library candidate.
- Output: `Feasible` | `FeasibleWithSubstitution(reason, closest)` | `Infeasible(reason, what_would_fix_it)`.
  Example: wheels requested, none fitted → "No wheels are fitted. Closest: a low 3-module crawler, ~40 mm/s.
  Fit 4 wheels to make a wheeled car." The person confirms before anything moves.

### L3 Shape designer (replaces the hand-made library)
- A shape is a **ShapeGraph**: modules, port-to-port locks, floor/accessory contacts, 7 joint angles per module.
- Generate: enumerate topologies for N modules (canonical forms remove duplicates; reuse `canonical.ts`,
  `topology.ts`), then optimise joint angles per topology (reuse `optimise.ts` statics as the fast filter).
- Judge: GPU physics (MuJoCo Warp, thousands of variants per batch, ≤ 2 min per batch) measures the capability tags
  with the real-robot errors on (servo model, sag, play — `realtime_errors.md`). Physics decides; nothing is assumed.
- Store: every measured shape goes into the library with its tags, margins and measurement provenance.
- Later: a learned proposer (trained on the library) suggests candidates instantly; physics still verifies.

### L4 Transformation planner (exists in part: `planner.ts`, `tf_plan.py`)
- State = ShapeGraph; action = one skill call (undock, dock, crawl to, lift). Search: assignment first
  (Hungarian: which module goes where), then ordering under the connectivity rule (articulation points) — idea.md §13.
- Edge cost = measured success rate and time of that skill in that situation (from L5's records), not guesses.
- The plan is rehearsed on the GPU sim twin before the real robot moves; failures feed back as higher costs.
- **Unify:** today there are two planners (TS `planner.ts`, Python `tf_plan.py`, older module). Keep one (§8).

### L5 Skills
- Each skill has one interface: `run(skill, args, world) → SkillResult` with success, time, final error, events.
- Docking: today's DIK + VSEPR controller is the **teacher**; imitation (`teacher_bc.py`) then RL improve it.
  Current: standing docking 8/16 over all surfaces with robot errors (sweep 5), ideal robot locks everywhere tested.
- Movement: gaits found per shape by RL on the GPU; later one shape-conditioned policy for any shape.

### L6 Execution supervisor (exists in part: `manual.py` jobs, `real_sync`)
- Runs a plan step by step on the sim twin, then the real robot (one sender, `real_sync`), watching telemetry.
- Each step has a **contract**: expected end state + tolerance + time budget. Violation → error event (§5).

## 4. Contracts (JSON Schema, shared by TS and Python)

| Contract | Produced by | Key fields |
|---|---|---|
| `GoalSpec` | L1 | version, parent_version, required_tags, accessories, constraints, preferences, source_text |
| `Inventory` | robot / sim | modules[id, online, health, battery, faults], accessories[type, count, mounted_on] |
| `FeasibilityReport` | L2 | verdict, reasons[], substitution?, fixes[] |
| `ShapeGraph` | L3 | modules, locks[port,port], contacts, joints, measured tags + provenance |
| `Plan` | L4 | steps[skill, args, expected_end, tolerance, budget_s], est_success, est_time |
| `SkillResult` | L5 | ok, time_s, final_error, events[], recording ref |
| `ErrorEvent` | any | code, layer, severity, context, suggested_response |

One schema file per contract under `data/schemas/`, validated at every boundary; version field on each.

## 5. Error model

Every failure becomes an `ErrorEvent` with a stable code. The supervisor's response table is data, not scattered `if`s.

| Class | Examples | Detection | Response |
|---|---|---|---|
| Input | unclear, contradictory, unknown word | spec validation, LLM `clarifying_question` | ask one question |
| Resource | too few modules, no wheels, module offline/low battery | Inventory vs GoalSpec | warn + offer closest shape |
| Feasibility | no shape meets the tags, unstable | L3 search exhausted, physics tip test | report best effort + what's missing |
| Planning | no move order, deadlock, timeout | search budget | parking move, then relax goal, then report |
| Skill | dock stalls, drift, rotor jam | step contract (error, time) | retry (bounded) → re-plan → abort safe |
| Hardware | servo overload, lock jam, brown-out, comms loss | firmware guard, telemetry heartbeat | freeze to safe pose, mark module faulty, re-plan without it |
| World | fall, push, unseen obstacle | IMU, contact model vs encoders | stop, recover pose or re-plan |
| Perception | camera absent / shaking / disagrees | judge confidence | continue blind (camera is optional) |
| System | worker crash, GPU out of memory, sim divergence | orchestrator watchdog | restart job from checkpoint, smaller batch |

Rules: never retry without a bound; every abort ends in a known safe pose; every error reaches the person in plain words.

## 6. Orchestration

- Work is a **job graph** (DAG): understand → feasibility → design → plan → rehearse → execute.
- Workers by kind: LLM (1, GPU-shared), shape judging (GPU batches), planning and rehearsal (CPU process pool),
  execution (exactly one, real-time). The orchestrator sizes pools from queue length and measured job time.
- Each job has a budget (time, compute), is cancellable, checkpoints, and is idempotent (safe to restart).
- Progress events carry % done and time left; the Studio shows them.
- Transport: the runtime bus planned in PLAN-INDUSTRIAL Track 1 / GOS (RESTRUCTURING §10); the existing HTTP
  verify service (`verify_service.py`, :8771) is the first worker endpoint.
- "Agents" here are processes with one role each, not chatting LLMs: predictable, testable, cheap.

## 7. Verification

- Unit tests per layer on the contracts (TS `node:test`, Python `pytest`).
- Scenario suite: fixed requests with expected verdicts ("car with wheels, none fitted" → substitution warning).
- Physics benchmarks with seeds and surfaces (today's `sweep.py`), tracked per commit.
- Front-end check with screenshots (Studio) for every user-facing change.
- Numbers are only reported from runs; estimates are labelled as such.

## 8. Milestones (each ends with a measured exit check)

1. **Contracts + error model** — schemas, ErrorEvent table, validation at boundaries. Exit: all layers exchange typed messages in tests.
2. **Inventory + feasibility** — live inventory from sim/robot, L2 verdicts with substitutions. Exit: scenario suite passes.
3. **Versioned goals** — GoalSpec patches and diffs in the Ask tab. Exit: 20 multi-turn edit scenarios correct.
4. **Shape designer v1** — topology enumeration + GPU judging for the current module. Exit: finds the library's shapes unaided, plus new ones.
5. **One planner** — merge `planner.ts` / `tf_plan.py` behind one service; skill costs from measurements. Exit: plans rehearse in sim.
6. **Skills** — docking (standing, lying, any surface) and crawl as learned policies. Exit: success rates per skill published.
7. **Supervisor + orchestrator** — job graph, budgets, retries, re-plan. Exit: injected faults (module offline, dock fail) recover or stop safely.
8. **End to end** — "become a snake", then "a car", in sim, then the real robot.

## 9. Open questions (only Nischay can answer)

- Accessories: will wheels/grippers exist? How do they attach (a port like a module end)?
- How many modules will the real robot have?
- Should feasibility always ask before moving, or act directly when confident?
