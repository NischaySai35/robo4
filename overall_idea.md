# MODULINK — where this goes next

A working plan, and the background needed to follow it. Written 2026-08-26
(software-side plan). Hardware section (§10) added 2026-08-27 from a
description of the physical modules as actually built — read that section
for the real connector/servo/power model; the L0–L1 hardware assumptions
made earlier in this doc (§3) were written without it and should be checked
against §10 rather than trusted blind.

---

## 0. The one reframe that matters most

You asked: *"I might train it to become a chair, but I can't train it to become a car from a chair… how do I achieve all these?"*

**You are not supposed to train that. It is not a learning problem.**

"Rearrange N connected modules from configuration A into configuration B, without
falling apart and without collisions" is a **search/planning** problem with a
25-year-old research literature behind it. The field is called **Modular
Self-Reconfigurable Robots (MSRR)**. It has named models (sliding-cube,
pivoting-cube), known algorithms, and known complexity results — universal
reconfiguration algorithms exist that transform *any* connected configuration
into *any* other in O(n²) or O(n³) moves.

That is the single biggest course correction available to you right now. Every
hour spent trying to make an RL agent "learn to become a car" is an hour spent
re-deriving, badly, something that graph search does exactly and provably.

Reinforcement learning is the right tool for *continuous control under physics*
— walking, balancing, grasping. It is the wrong tool for *discrete structural
rearrangement*. Your project needs both, in different layers, and the mistake
that would cost you the most is using one where the other belongs.

---

## 1. Where the project actually is

Honest read of the current codebase.

**Solid:**
- A real module model: 6 rods/joints, connector A/B plus 4 side connectors, joint limits.
- A curve fitter that runs module chains along a path (`curveFit.ts`).
- A branch-anchoring rule that knows adjacent side faces physically clash (`branchAnchor.ts`).
- A genuine closed-loop IK solver — Levenberg–Marquardt over the whole assembly,
  reporting mobility from Jacobian rank and honest infeasibility (`loopClosure.ts`).
- A self-collision checker (`collision.ts`).
- Four input routes: manual, drawn strokes, cubes, and text→structure.

That IK solver is not student-grade work. It is the same technique real multibody
engines use, including the cut-edge/loop-constraint formulation.

**Known limits, measured not guessed:**

| Thing | Measured | Where |
|---|---|---|
| Line-skeleton chair, closed loops | ~0.75 units mean drift from target | `[fit]` console trace |
| Cube chair, spanning tree | fits the grid essentially exactly | same |
| Unbranched chain, any length/corners | **0 self-collisions** | `voxelFitDiagnostic.test.ts` |
| Single T junction, 5 modules | **10 overlapping pairs, 0.642 deep** | same |
| Cube cell = 2.2 (hand grid) vs = 1 module | 88 pairs vs 33 pairs | same |

**Two findings you should not lose:**

1. **All self-collision comes from branching.** A chain that never branches never
   collides, at any length, through any number of corners. Every overlap in every
   structure so far is created at a junction, by the geometry of welding an arm
   onto a side connector.
2. **The Cube Builder tab never ran a collision check.** Only Prompt-to-Build does.
   So "cube builder looks nice" partly means "nothing was telling you about the
   overlaps that were already there." They are the same code path.

That second one matters enormously for hardware, and leads directly to the next section.

---

## 2. The hardware blocker to fix before spending money

You said: *"later I have to integrate this to my real modules which I have made
exactly like these and it's costly so no collision or error should happen."*

Right now **a single 3-way junction produces modules interpenetrating by up to
0.64 units** — with a hemisphere radius of 0.42, that is parts passing through
each other by more than a whole connector dome. In simulation that renders fine.
In aluminium and PLA it is a stall, a stripped gear, or a snapped joint.

This is the highest-priority engineering problem in the project, ahead of any AI work.

**Why it happens:** `SIDE_CONNECTOR_RADIAL_OFFSET` is boxed into a 0.594–0.620
window by three constraints already documented in `constants/geometry.ts`. Two
modules on *adjacent* side faces of the same hub interpenetrate; only *opposite*
faces clear. `branchAnchor.ts` knows this and tries to steer around it, but with
3+ arms at one junction there are not enough opposite-face pairs to go around.

**Options, cheapest first:**
1. **Constrain the generator, not the geometry.** Never emit a structure with a
   4+ way junction; prefer chains and T's. Cheap, immediate, costs expressiveness.
2. **Add a junction/hub part.** A dedicated passive connector block with proper
   angular spacing. This is what most real MSRR systems do. Changes your BOM.
3. **Re-space the side connectors.** Move them apart along the big rod instead of
   all riding its midpoint, so adjacent faces no longer share a plane.
4. **Make the planner collision-aware.** Feed `checkSelfCollision` back into
   `findWeldAnchor` as a rejection test rather than only reporting after the fact.

**Do this before ordering parts.** A CAD-level fix now is free; a re-machine later is not.

---

## 3. The architecture you actually need

Five layers. Each has a different right tool. Most of your confusion dissolves
once these are separated.

```
L4  INTENT          "become a chair"  →  target structure
    tool: LLM (Claude / local model). You have this.
    rate: once per command. Latency budget: seconds.

L3  RECONFIGURATION PLANNER      current config → target config
    tool: GRAPH SEARCH (A*, MSRR algorithms). ← YOU DO NOT HAVE THIS. It is the gap.
    output: an ordered list of moves — detach X from Y, rotate, attach X to Z.
    rate: once per command. Latency budget: seconds.

L2  MOTION / IK                   one move → joint trajectories
    tool: your loopClosure.ts + trajectory interpolation + collision check.
    rate: per move. Latency: ms.

L1  COORDINATION                  trajectories → per-module commands
    tool: your own protocol over WiFi/ESP-NOW. Sync, sequencing, acks.
    rate: 10–100 Hz.

L0  FIRMWARE                      ESP32-C3 → ST3215 serial bus
    tool: C/C++. Position control, current limits, safety stops.
    rate: 100–1000 Hz.
```

**The gap is L3.** Everything you described as "it will think which module to move
where, shortest path, which joints, whether simultaneous moves are possible" — that
is exactly, precisely, the textbook definition of an MSRR reconfiguration planner.
It is a solved *category* of problem. Not solved for *your* connector geometry, but
you would be adapting known algorithms, not inventing.

---

## 4. Your questions, answered directly

### "It should move and bend and restructure, not disappear and reappear"

Right, and that is L3 + L2. Concretely:

1. L3 emits a move list: `[detach(m7,m3), rotate(m7, +90° about j2), attach(m7,m11), …]`
2. For each move, L2 checks: does the structure stay **connected**? Does anything
   **collide** along the path? Are the joints **within limits**? Does it stay
   **statically stable** under gravity?
3. Render/execute the moves in sequence. That is your animation *and* your robot command stream — same list.

**Connectivity is the hard constraint** that makes this interesting. You cannot
simply teleport a module; detaching it must not split the structure into two
pieces, and it must have a physically reachable path to its destination. This is
why the literature cares so much about "connectivity-preserving" moves.

**Simultaneous moves:** yes, possible, and it is the standard optimization — build
a dependency graph over moves and execute independent ones in parallel. Do this
*second*. Get sequential correct first.

### "Do I need a camera in every module?"

**No.** And this is the most expensive wrong turn available to you.

You already know your own configuration. Every module knows its joint angles
(ST3215 servos report position), and you know the connection graph because *you
commanded every attach and detach*. That is full proprioceptive state. Forward
kinematics gives you every module's pose in space. `assemblyGraph.ts` already does this.

A camera answers a question you do not have: *"what shape am I?"* You know. What
you might eventually want a camera for:
- Verifying a connection actually latched (a limit switch or hall sensor is cheaper and better)
- Perceiving the *external world* — where is the cup to grip
- Recovering from desync after a fault

One external camera is enough for all of those, later. Per-module cameras mean
per-module bandwidth, power, compute, and calibration. Skip it.

### "Can I just use Claude as the API? Is local AI enough?"

For **L4**, yes, either works. That is what Prompt-to-Build already proves — it is
a genuine A/B harness across Anthropic, Ollama, and a no-AI keyword baseline. Keep it.

For **L3**, mostly no. Reconfiguration planning needs a *guaranteed correct,
verifiable* move sequence. An LLM will confidently emit a plan that disconnects
your robot. Where an LLM *can* help at L3: proposing a good decomposition or
ordering heuristic that a real search then validates. LLM proposes, solver disposes
— which is precisely the design principle already written at the top of `skeletonFit.ts`.

For **L2/L1/L0**, no. Wrong latency class by three orders of magnitude.

### "1 million iterations just to learn 'walk' — how do I define infinite tasks?"

You do not, and this is the key insight.

**Those million iterations are not learning what "walk" means. They are searching
for how.** The reward function that defines walking is about five lines: forward
velocity, stay upright, do not waste energy, do not fall. A human wrote that in
ten minutes. The million iterations are the agent exploring *motor patterns* that
maximize it. The definition was cheap; the search was expensive.

So the real question is not "how do I define infinite tasks" but "how many
distinct *skill families* do I need?" And the answer is small:

- **Structural reconfiguration** → not learned at all. Planned. (L3)
- **Locomotion** → maybe 2–3 rewards (crawl, roll, walk). Each ~10 lines.
- **Manipulation** → this is where it gets genuinely hard, and where modern
  foundation models earn their keep.

"Pick that up and throw it" is not one task to train. It is an LLM/VLM decomposing
a sentence into a sequence of skills you already have. Composition happens at L4,
not in the policy.

### "Who will tell it that what it's doing is called walking and it's correct?"

Three answers used in practice, and it is worth knowing all three:

1. **Reward function** — you write the success criterion in code. Works when
   success is measurable (moved forward, stayed upright). This is classic RL.
2. **Demonstrations** — you show it, it imitates. Works when success is obvious to
   a human but hard to write down. This is imitation learning / behavior cloning.
3. **Learned reward from language** — recent work (e.g. ReWiND, 2025) trains a
   *reward model* from a small demo set that then generalizes to unseen
   instructions, so new tasks need no new demos. This is the current frontier.

For your project: (1) for locomotion, and you probably do not need (2) or (3) at all
until you are doing manipulation with tools.

---

## 5. Isaac Sim / Isaac Lab — your "loophole", corrected

Your instinct was right that the tree-structure limit matters, and right that there
is a way around it. But the actual mechanism is different from reparenting, and it
is worth getting exact.

**How PhysX really handles closed loops:** an articulation *must* be a kinematic
tree. To build a loop, you author the loop-closing joint and mark it **"Exclude
From Articulation."** PhysX then treats it as a maximal-coordinate constraint
outside the tree, while the articulation itself stays a tree. The constraint is
still enforced physically.

**This is exactly what your own `loopClosure.ts` already does.** It walks a spanning
tree, identifies the leftover "cut edges", and solves them as 6-DOF constraints.
You independently arrived at the industry-standard formulation. That is a genuinely
good sign about the codebase.

**On dynamic reparenting mid-simulation:** possible, but fragile. Known issues
exist around articulations with closed loops exploding on environment reset, and
Isaac Lab's `Articulation` wrapper can fight USD-authored joint settings. Structure
changes are much safer done at reset boundaries than mid-rollout. Plan your
reconfiguration as *discrete episodes*, not as continuous within-episode topology
edits, and this stops being a problem.

**Should you move to Isaac Sim?** Not yet, and not entirely.

What you gain: gravity, contact, torque limits, actuator dynamics. That matters
enormously — a chair that is kinematically perfect may simply collapse, and your
ST3215 servos have finite torque with modules cantilevered off each other. **You
currently have no idea whether any structure you have generated can physically
hold itself up.** That is a real gap.

What you lose: iteration speed, and the browser tooling you have built.

**Recommendation:** keep the browser app as your *design and planning* tool. Add
Isaac Sim as a *validation* stage. Export a structure → simulate under gravity →
report whether it stands and what the peak joint torques are. Two tools, one
pipeline. Do not port everything.

---

## 6. The 2026 tool landscape, and what actually applies to you

Straight assessment, because most of it does not apply yet.

| Tool | What it is | Relevant to you? |
|---|---|---|
| **Isaac Sim / Isaac Lab** | GPU physics sim, USD-based, RL training | **Yes** — for gravity/torque validation. Start here. |
| **Isaac GR00T N1.x** | Open VLA foundation model, dual-system (fast action / slow reasoning), for humanoids | **Not yet.** Trained on humanoid embodiments. Your morphology changes shape — nothing in its training distribution. Revisit if you get to manipulation. |
| **NVIDIA Cosmos** | World foundation models; generates photorealistic synthetic video for training | **No, for now.** Its value is synthetic *visual* data. Your bottleneck is planning and torque, not vision data. |
| **VLA models** (OpenVLA, π0, GR00T) | vision+language → robot actions | **No, for now.** They map pixels+text to actions for a *fixed* body. Yours is not fixed. |
| **MSRR literature** | Sliding-cube / pivoting-cube reconfiguration planning | **Yes — this is your field.** Start reading here, not at VLA papers. |
| **Claude / LLM API** | text → structured output | **Yes** — L4, already working. |

The honest summary: **the flashy 2026 AI tools solve problems you do not have yet,
and the problem you do have was solved by robotics researchers between 2000 and 2015.**
Read the older literature first. It is less exciting and far more useful.

---

## 7. Phased roadmap

### Phase 1 — Make the simulator trustworthy (weeks)
Nothing else is worth building on an untrustworthy sim.

- [ ] **Fix branch-junction collisions.** See §2. Highest priority in the project.
- [ ] Run `checkSelfCollision` in Cube Builder and Draw-to-Build too, not just Prompt-to-Build.
- [ ] Make collision a **hard gate**: refuse to emit a colliding structure, don't just warn.
- [ ] Add a static stability check: centre of mass over support polygon.
- [ ] Add a **torque estimate** per joint under gravity. Compare against the ST3215 datasheet stall torque with a safety factor. This will likely surprise you.

**Milestone:** every structure the app produces is one you'd be willing to build in metal.

### Phase 2 — The reconfiguration planner (the real work; months)
This is L3, the actual gap.

- [ ] Define the **move set** your hardware can really do. Not "any module teleports"
      — what can one module physically do, given its neighbours? Detach one
      connector, rotate about a joint, re-attach elsewhere. Write this down precisely.
      Everything downstream depends on it.
- [ ] Implement a **configuration-space search**: state = (connection graph + joint
      angles), transitions = legal moves, goal = target structure.
- [ ] Constrain every move: connectivity preserved, no collision along the path,
      joint limits respected, statically stable throughout.
- [ ] Start with A*/BFS on small structures (5–10 modules). Accept that it will be slow.
- [ ] Then add heuristics: match subconfigurations between start and goal, move only
      what differs. The literature calls this maximum-commonality decomposition and
      it is the single biggest speedup available.
- [ ] Only then: parallel/simultaneous moves via a dependency graph.

**Milestone:** chair → table, animated move by move, every intermediate state
verified connected, collision-free, and self-supporting.

This is also, by itself, a publishable-quality piece of work if you do it well.

### Phase 3 — Physics validation (parallel with Phase 2)
- [ ] Export structures to USD.
- [ ] Isaac Sim scene: gravity, ground plane, ST3215 actuator model (torque limits, PD gains).
- [ ] Close loops via **Exclude From Articulation**, not reparenting (§5).
- [ ] Replay Phase-2 move sequences under physics. Does it stay standing throughout?
- [ ] Feed failures back as new constraints in the planner.

**Milestone:** a plan that survives gravity, not just kinematics.

### Phase 4 — Hardware bring-up (start small, early)
Do not wait for Phases 2–3 to finish. Start this at 2 modules.

- [ ] Two modules. ESP32-C3 ↔ ST3215 serial bus. Command a known angle, read it back.
- [ ] Characterize reality: actual torque under load, backlash, repeatability, thermal drift.
- [ ] Connector latch **sensing**. You must know a connection succeeded. Hall sensor or limit switch.
- [ ] Time sync across modules. ESP-NOW is lower-latency than WiFi/TCP for this.
- [ ] Failure behaviour: what happens on dropped packet mid-move? Define it before it happens.
- [ ] Then 3 modules, and attempt one real reconfiguration move.

**Milestone:** one physical detach-rotate-attach, commanded from the planner.

### Phase 5 — Tools and intelligence (later)
Only once 1–4 are real.
- [ ] Detachable end-effectors (gripper, wheel, driver) as typed connector payloads.
- [ ] External camera for world perception.
- [ ] LLM task decomposition: "pick that up" → plan a reach → grip → move.
- [ ] Consider a learned policy *only* for continuous skills where planning is a poor fit.

---

## 8. What to learn, in order

You said you are still a student. This is the order that actually pays off.

1. **Kinematics & IK** — you are already doing this. Understand *why* your LM solver
   damps, and what Jacobian rank means physically. (It is your `mobility` number.)
2. **Graph search & planning** — A*, BFS, heuristics, admissibility. This is Phase 2.
   Most valuable single topic for you right now.
3. **MSRR literature** — sliding-cube and pivoting-cube models, connectivity-preserving
   moves, universal reconfiguration algorithms. Your field. Read the surveys first.
4. **Rigid-body dynamics** — forces, torques, static equilibrium. Enough to know
   whether a structure stands and whether your servos can hold it.
5. **Embedded/real-time** — serial bus protocols, timing, control loops, failure modes.
6. **RL** — *last*, and only for continuous control. Skipping ahead to this is the
   most common and most expensive mistake in exactly your situation.

---

## 9. The blunt summary

- Your **simulator is good** — the IK is real engineering, and it independently
  matches how commercial physics engines formulate loop closure.
- Your **branch junctions physically collide**, and that will break real hardware.
  Fix it before spending money. It is the top priority.
- Your **transformation problem is planning, not learning.** It has a literature.
  Read it. Do not train it.
- The **gap in your architecture is L3**, the reconfiguration planner. That is the
  next real build, and it is months of work.
- **You have no gravity anywhere.** Until you do, you do not know if any of this stands up.
- **The 2026 AI tools are not your bottleneck.** GR00T, Cosmos, and VLAs assume a
  fixed body. Yours changes shape — that is the novel part of your project, and it
  is also why off-the-shelf models will not do it for you.

The interesting research contribution here is not "LLM makes a robot." It is
**shape-changing robots that plan their own reconfiguration.** That is a real,
open, hard problem, and you already have an unusually good simulator for attacking it.

---

## 10. Current hardware — the physical module (as built, 2026-08-27)

This is the real, current design of the physical Tetrobot module — separate from
and more current than the abstract "6 rods/joints, connector A/B + 4 side
connectors" model the simulator (§1) works from. The two should be reconciled;
the simulator's geometry (§2, `constants/geometry.ts`) was written without this.

### Module structure

- **6 DOF per module**: 3 bend joints (0°–180°) + 3 twist joints (0°–360°
  continuous, but position-controlled — **no CW/CCW spin mode**, that idea from
  earlier ([[project_motor_spin]]) is dropped for this module).
- **8× ST3215 30kg servos per module**: 6 drive the joints, 2 drive the end
  lockers (one per end connector). All limited-rotation, position-control servos
  — nothing free-spinning.
- **Controller**: ESP32-C3 mini per module, OTA-flashable (no USB needed for
  firmware updates after initial flash).
- **Power**: each module carries its own 12V battery, stepped down to 5V for
  its own ESP32-C3. Battery powers that module's own servos directly.

### Connectors — mechanical lock is primary, magnets are alignment-only

This is a change from earlier designs: **magnets are no longer the mechanism
that holds a docked joint together** — they only help align two faces during
approach. The actual holding force is a **mechanical lock**: a locker element
that rotates into place after docking and physically retains the fit.

A module has **6 connector faces**:
- **2 end connectors** (the two ends of the module's kinematic chain) — each
  has **both a holder and a locker**. The locker is what actively rotates to
  lock after docking.
- **4 side connectors** (center of the module, one per remaining direction) —
  **holder only, no locker**. A side face can be docked into, but cannot itself
  actuate a lock.

Locking behavior:
- **End ↔ End**: both sides have a locker, so both engage → **2 holders + 2
  lockers** on one joint. This is the strongest, most rigid connection type.
- **End ↔ Side**: the side face contributes a holder only; the end connector's
  locker does the actual locking. One active locker per joint.
- **Side ↔ Side**: **impossible** — neither face has a locker, so nothing can
  actuate the lock. The mechanical design deliberately prevents this pairing.

This means every stable joint in an assembled structure has at least one
locker engaged, and a fully end-to-end joint is measurably stronger than one
anchored through a side face. **The planner (§3, L3) should treat end↔end and
end↔side joins as different strength/rigidity classes when reasoning about
structural stability**, not as interchangeable edges in the connection graph.

### Sensing a connection: pogo pins, not just "we think it's locked"

Every connector face — end, side, and (later) tool-tip — carries **3 pogo
pins**: power+, power−, and a bidirectional signal pin. Ground is common
(shared across the whole assembly; not switched or diode-isolated).

- **Diodes sit only on the power+ line**, at every connector, for reverse-power
  safety when multiple modules' batteries could otherwise contend on a shared
  rail. The signal pin is *not* diode-protected, because it must both transmit
  and receive (a diode would make it one-directional).
- Pogo pins only make contact when a connector is **fully, correctly seated** —
  so signal continuity is itself the "are we actually locked" proof. Two
  ESP32-C3s on either side of a joint can handshake over that signal line: if
  software's connection-graph state says "connected" but no signal handshake is
  coming through, that is a hard mismatch flag → physically check that joint.
  This directly answers the "connector latch sensing" TODO already logged in
  §4 (Phase 4) and [[project_electromagnet_locks]] — hall sensors/limit
  switches are no longer the plan; **pogo signal continuity is**.
- Because every module can see, per face, whether it has a live pogo handshake,
  each module can locally answer: how many things are attached to me, on which
  faces, and (by talking to the neighbor's ESP32-C3) what is on the other end —
  another module, or a tool tip. This is a distributed alternative/supplement
  to a centrally-tracked connection graph, worth considering for L1 (§3).

### Tool-tip modules (end effectors)

A separate, unpowered class of module: gripper, wheel, screwdriver, and
(planned) sensor tips — lidar, camera, distance/rangefinder, laser.

- **5-face connector body**: one face has a **locker** (so it can dock onto any
  module's holder-only side connector, or an end connector); the **opposite
  face is the functional tip** (gripper jaws, wheel, driver bit, sensor
  aperture); the remaining faces are plain connectors so a module can pick the
  tool up and carry it, or so it can be handed between modules.
- **No onboard battery.** A tool tip only has an ESP32-C3 (5V, stepped down
  from whatever 12V it is currently receiving) plus, e.g. one 12V motor for its
  own locker. It is fully dependent on whatever module it is currently docked
  to for power — by design, since it is always attached to something.
- **Carrying**: since a module's 4 side connectors are usually free, a module
  is expected to carry 1–2 tool tips docked to its own side connectors as
  cargo, not just as an attached end effector.

### Hot-swap handoff between modules (the interesting case)

Worked example from the source description, worth keeping verbatim as a
design spec:

1. Module A has a gripper tool-tip docked on one of its side connectors. The
   gripper's locker is engaged against A's holder (side connectors have no
   locker of their own, remember). A and the gripper's ESP32-C3s handshake
   over the pogo signal pin — A now knows "I have a gripper, here."
2. Module B approaches to take the gripper. B docks onto a *different* free
   face of the gripper's 5-face body and engages **its own** locker there.
3. At this point the gripper is mechanically locked to **both** A and B
   simultaneously, and is receiving 12V from both. Because the tool tip's
   internal power distribution is **wired in parallel** (not summed) and every
   power+ line is diode-protected, the gripper still only sees 12V, not 24V,
   regardless of how many modules are feeding it.
4. A then **disengages its locker** and undocks. The gripper stays live —
   powered by B alone now — mid-handoff, with no power gap.
5. Ownership has moved from A to B with no power interruption and no shared
   compute state to migrate, because the tool tip never depended on which
   module it was talking to.

The same detach/rotate/attach/handshake sequence is exactly the **atomic move
primitive** the L3 reconfiguration planner (§3, §4 "It should move and bend
and restructure") needs to define formally — this hot-swap case is really just
that primitive applied to a tool tip instead of another structural module, and
the "still gets power from the other side while transitioning" property is
what makes it a **connectivity-preserving move** rather than a drop-and-lose
event.

### External perception, reaffirmed

Per-module cameras are still off the table (§4 already argued this from the
proprioception side). The hardware side now reinforces it independently: the
plan is one external camera (e.g. a phone), used by the shape-changing
software to (a) verify the assembled structure visually matches the commanded
shape, (b) confirm a transformation completed correctly, and (c) detect a fall
— not to give any individual module scene awareness. Sensor tool-tips (lidar,
camera, distance) are a separate, later, opt-in payload a module can pick up
when a task needs it, not a standing per-module feature.

### Open items this raises for the software side

- `constants/geometry.ts` and the simulator's connector model (§1–§2) assume a
  connector-A/connector-B pair per module plus 4 undifferentiated side
  connectors, with no locker/holder distinction and no end↔end vs end↔side
  strength difference. That should be reconciled with this section before the
  branch-junction collision fix (§2) is finalized, since the real hardware's
  "side↔side is impossible" rule may already rule out the junction geometries
  causing the worst overlaps.
- The connection graph (`assemblyGraph.ts`, §4) currently has no notion of
  joint strength/rigidity class (end↔end vs end↔side) or of tool-tip payloads
  as graph nodes. Both now matter for stability reasoning (§7 Phase 1's static
  stability check) and for planning (§7 Phase 2's move set).
- Pogo-signal handshake state is a real per-joint sensor value the eventual L1
  coordination layer (§3) should be treating as ground truth over the
  software-tracked connection graph, not merely a confirmation of it.

---

## Sources

- [A Graph-Based Hybrid Reconfiguration Deformation Planning for Modular Robots](https://pmc.ncbi.nlm.nih.gov/articles/PMC10534630/)
- [New path-planning algorithm for lattice-based self-reconfigurable modular robots with pivoting cube modules (2025)](https://www.sciencedirect.com/science/article/abs/pii/S0921889025000417)
- [Reconfiguration planning for pivoting cube modular robots (IEEE)](https://ieeexplore.ieee.org/document/7139451/)
- [A Universal In-Place Reconfiguration Algorithm for Sliding Cube-Shaped Robots](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.SoCG.2024.1)
- [Rig Closed-Loop Structures — Isaac Sim Documentation](https://docs.isaacsim.omniverse.nvidia.com/4.5.0/robot_setup/rig_closed_loop_structures.html)
- [Isaac Lab — Articulation object with mechanical closed loops (discussion)](https://github.com/isaac-sim/IsaacLab/discussions/5157)
- [Isaac Lab: A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning](https://arxiv.org/html/2511.04831v1)
- [GR00T N1: An Open Foundation Model for Generalist Humanoid Robots](https://arxiv.org/abs/2503.14734)
- [NVIDIA Isaac GR00T](https://developer.nvidia.com/isaac/gr00t)
- [NVIDIA Cosmos: World Foundation Models for Physical AI](https://www.nvidia.com/en-us/ai/cosmos/)
- [ReWiND: Language-Guided Rewards Teach Robot Policies without New Demonstrations](https://arxiv.org/html/2505.10911)
