
# TetraSim — Custom Physics Engine Architecture

### CPU-first, GPU-optional, graph-native simulation core (Isaac Sim alternative for microbot dev)

---

## 0. Design Philosophy

- **No parent-child tree.** Scene is a **graph**: nodes = rigid bodies, edges = constraints/joints. Same reasoning as the Tetrobot runtime — modular topology can change at runtime without re-rooting a tree.
- **CPU-first, cache-aware.** Runs on any laptop, no CUDA lock-in. Structure-of-Arrays (SoA) memory layout from day one so the GPU port later is a data-layout non-event, not a rewrite.
- **GPU-optional via compute shaders.** Vulkan compute or WebGPU compute — vendor-agnostic (AMD/Intel/Apple/Nvidia all work), unlike PhysX/Isaac's CUDA dependency.
- **General-purpose, not scale-locked.** Built for macro-scale modular robots (arms, walkers, reconfigurable systems) — same engine, just needs correct units and force models for whatever scale you point it at.
- **Engineering analysis, not just motion.** A robotics sim that only tells you *where things move* is half an engine. This one also needs to tell you *whether the parts survive* — stress, torque, load, pressure, current/thermal — so it doubles as a design-verification tool, not just a visualizer.

---

## 1. Layered Architecture

```
┌─────────────────────────────────────────┐
│  Layer 5: Scripting / API (Python bind)  │
├─────────────────────────────────────────┤
│  Layer 4: Scene Graph & Simulation Loop  │
├─────────────────────────────────────────┤
│  Layer 3: Constraint Solver (XPBD)       │
├─────────────────────────────────────────┤
│  Layer 2: Collision (Broad + Narrow)     │
├─────────────────────────────────────────┤
│  Layer 1: Mesh & Geometry (half-edge)    │
├─────────────────────────────────────────┤
│  Layer 0: Math Core (SIMD vec/mat/quat)  │
└─────────────────────────────────────────┘
        ↕ (optional, later)
┌─────────────────────────────────────────┐
│  GPU Compute Backend (Vulkan/WebGPU)     │
│  — mirrors Layer 2/3 kernels only        │
└─────────────────────────────────────────┘
```

Build bottom-up. Each layer only depends on layers below it. This lets you swap the solver or add GPU compute later without touching the math core.

---

## 2. Layer 0 — Math Core

- `Vec3`, `Quat`, `Mat3`, `Mat4` — plain structs, no inheritance, no virtual functions (kills cache locality + vtable overhead)
- SIMD via intrinsics: AVX2 on x86 (`__m256`), NEON on ARM (Apple Silicon / Jetson) — abstract behind a thin `simd_ops.h` so kernels don't care which
- Quaternion-based orientation (no gimbal lock, no Euler angle drift)
- Fixed-point option flag for future embedded/microcontroller port — floats are fine for sim, but if you ever push physics onto an ESP32-class MCU for a real-time microbot, you'll want this ready

**Language:** C++20 (or Rust if you want memory safety without GC — either is fine, don't overthink this choice).

---

## 3. Layer 1 — Mesh & Geometry

- **Half-edge data structure** for all meshes: each edge knows its twin, next, prev, and owning face. This makes adjacency queries (needed for collision + deformation) O(1) instead of O(n) linear scans.
- Vertex buffer = SoA (`float* x, y, z` arrays, not `struct{x,y,z}[]`) — this is the single biggest cache-performance decision in the whole engine
- Convex hull decomposition for complex meshes (V-HACD algorithm) — narrow-phase collision only works cleanly on convex shapes, so concave meshes get pre-split at load time, not at runtime

---

## 4. Layer 2 — Collision Detection

**Broad phase** (cheap, finds *candidate* pairs):

- Spatial hash grid (simplest, best for uniform microbot swarm sizes) or BVH (better for mixed scale scenes)
- Output: list of AABB-overlapping pairs, cheap to compute every frame

**Narrow phase** (expensive, exact contact):

- **GJK** (Gilbert-Johnson-Keerthi) for convex-convex distance/overlap test
- **EPA** (Expanding Polytope Algorithm) for penetration depth + contact normal once GJK confirms overlap
- Contact manifold generation (up to 4 contact points per pair, for stable resting contact — single-point contact makes stacked objects jitter)

This is the part most people get wrong on first attempt — budget real time here. GJK+EPA correctness bugs are the #1 source of "objects explode/tunnel through floor" bugs.

---

## 5. Layer 3 — Constraint Solver: **XPBD** (recommended over classic sequential impulse)

Why XPBD (Extended Position Based Dynamics) over the Bullet/PhysX-style impulse solver:

- Unconditionally stable at large timesteps (matters for real-time viz)
- Naturally parallelizable → **this is what makes the GPU port later actually feasible**, impulse solvers have sequential dependency chains that fight parallelization
- Used by Jolt Physics (Horizon Forbidden West) and Nvidia Flex for exactly this reason

XPBD covers, uniformly, as generalized position constraints:

- Rigid body collision response
- Joints (your Tetrobot module connectors — hinge, ball, prismatic — are just constraint types here)
- Friction (Coulomb friction as a constraint, not a post-process hack)
- Soft/deformable bodies later, if you ever need cable/tendon simulation, for free — same solver

Gravity + external forces (thrust, magnetic lock forces for your electromagnet pogo-pins) applied as simple external accelerations before the constraint projection step.

---

## 6. Layer 4 — Scene Graph & Sim Loop

```
Graph {
  nodes: Vec<RigidBody>        // SoA: position[], velocity[], mass[], inertia[]
  edges: Vec<Constraint>       // joint type, node_a, node_b, params
}

loop (fixed timestep, e.g. 1/120s):
  1. apply external forces (gravity, thrust, drag)
  2. predict positions (semi-implicit Euler)
  3. broad-phase collision → candidate pairs
  4. narrow-phase collision → contact constraints (added as temp edges)
  5. XPBD solve iterations (constraints + contacts together)
  6. update velocities from position deltas
  7. apply damping (air resistance)
```

No root node. No re-parenting logic. A module detaching from your Tetrobot mid-sim is just an edge removal from the graph — same operation your Tetrobot runtime already does.

---

## 7. Layer 5 — Scripting API

Python bindings (pybind11) so you can drive scenes from notebooks like Isaac Sim, without touching the C++ core. This is also your path to eventually open-sourcing it with an approachable surface (matches your GitHub-first visibility strategy).

---

## 8. GPU Compute Path (later, optional)

Once XPBD is stable on CPU:

- Port broad-phase spatial hash + narrow-phase GJK/EPA + XPBD iteration loop to compute shaders
- Vulkan compute (portable) or WebGPU compute (portable + runs in browser — huge for demo-video/inbound-visibility purposes, people can try your sim in a tab)
- CPU stays the "orchestrator," GPU just crunches the parallel contact-solve kernel — you don't need CUDA, you don't need Nvidia hardware

---

## 9. Realistic Milestones

| Milestone | What "done" looks like                                                                         |
| --------- | ---------------------------------------------------------------------------------------------- |
| M1        | Math core + single falling sphere, no collision, prints position each frame                    |
| M2        | Sphere hits infinite ground plane, bounces, settles (validates integration + basic contact)    |
| M3        | Two convex shapes collide via GJK/EPA, correct contact normal                                  |
| M4        | XPBD solver handles stacked boxes without jitter                                               |
| M5        | Graph joints — hinge + ball joint between two bodies (this is your Tetrobot module connector) |
| M6        | Actuator/motor model — torque, current, thermal (section 12.3) plugged into joint constraints |
| M7        | Python bindings + basic viewer (even just matplotlib/three.js point cloud)                     |
| M8        | GPU compute port of solver loop                                                                |
| M9        | Structural stress checker — beam/truss FEA on module bodies (section 12.1)                    |

M1–M4 is the real engine. Everything after M4 is domain-specific value-add — and M4 alone, working correctly, is already a legitimate portfolio/demo artifact.

---

## 10. What to steal vs. build

Genuinely fine to read (not copy) for reference while building:

- **Jolt Physics** (C++, open source, MIT license) — best modern reference for XPBD-style solver architecture
- **Box2D** (2D, but Erin Catto's contact solver writeups are the clearest explanations of constraint solving that exist)
- Nothing wrong with reading these to understand the "why" behind a design choice before writing your own version — that's not cutting corners, that's how every physics engine author has learned.

---

---

## 11. What Actually Makes PhysX / MuJoCo "Advanced" — and a Real Plan to Get There

Worth being precise about this, because "advanced" isn't one thing — it's three separate engineering achievements stacked on top of each other. Knowing which one you're chasing changes what you build next.

### 11.1 The three pillars (as of 2026)

**Pillar 1 — Raw solver correctness & fidelity.** MuJoCo's actual physics — full friction-cone constraints solved as a convex optimization (cone complementarity), not the simplified approximations older engines like Bullet/PhysX historically used for games. This is *math quality*, not hardware. You already get most of this for free by choosing XPBD correctly and being careful with your friction cone implementation in Layer 3. This pillar is achievable solo — it's the M1–M4 milestones in section 9, done rigorously.

**Pillar 2 — Massive parallel batching.** This is the actual headline number people quote: MuJoCo Warp (Google DeepMind + NVIDIA, released 2025 on top of NVIDIA Warp) runs **thousands of environments simultaneously** on one GPU by giving every simulation state array a leading "world" dimension — one kernel launch steps N independent sims at once. Recent NVIDIA Newton benchmarks show this hitting **252x–475x speedups** over MJX's original JAX path, and roughly 50 million steps/sec on a single RTX 4090 vs ~50,000 steps/sec for single-threaded CPU MuJoCo — a ~1000x gap. That gap is *entirely* about batched parallel execution, not fundamentally different physics.

**Pillar 3 — Differentiability.** MJX (MuJoCo-XLA) re-expresses the whole simulator as JAX/XLA compute graphs, meaning you can backpropagate gradients *through* physics itself — used for gradient-based system identification and end-to-end policy learning, not just forward rollout. This is the hardest pillar and the most research-flavored — it's why teams cite MJX as the standard for gradient-based RL work.

### 11.2 The honest gap assessment

Nvidia and Google DeepMind have dedicated teams (Newton is a joint NVIDIA/DeepMind project, GTC-announced 2026) with years of dedicated engineering headcount, chip-level co-design, and a decade of prior art (Isaac Gym → Isaac Lab → Newton lineage) behind them. Realistically, solo, you are not going to out-parallelize NVIDIA on NVIDIA's own silicon in this lifetime, and pretending otherwise would be the kind of overpromise that gets ambitious projects laughed out of a room. That's the straight answer.

**But here's the actual strategic move — you don't need to beat them at their game, you need to be the *only* one playing yours:** none of PhysX, MuJoCo, or Newton do **engineering verification** — they simulate motion and contact, not whether your servo bracket survives the torque it just computed, or whether your motor current draw exceeds the driver's rating mid-motion. That's section 12 below, and it's a real gap: motion sim and structural/electrical analysis live in completely separate tool silos today (you'd normally export loads from a sim into ANSYS by hand). An engine that closes that loop *in the same timestep* is a real, defensible thing to build that isn't "PhysX but worse."

### 11.3 A staged plan toward each pillar

| Stage                                                | Target                            | What it takes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Correctness** (solo-achievable, do first) | Match Pillar 1                    | Rigorous XPBD + friction cone + stable contact manifolds. This is sections 5–6 of this doc, done carefully. No exotic hardware needed.                                                                                                                                                                                                                                                                                                                                                                     |
| **B. Batched CPU parallelism**                 | Cheap partial win toward Pillar 2 | Run N independent sim instances across CPU threads (`std::thread` pool / Rust `rayon`). SoA layout you already committed to in Layer 0 makes this close to free — same data layout, just launched N times. Gets you 10s–100s of parallel envs on a laptop, not thousands, but real and immediately useful for testing swarm behaviors.                                                                                                                                                                |
| **C. GPU compute batching**                    | Real shot at Pillar 2             | Port the XPBD solve loop + narrow-phase to**compute shaders** (Vulkan compute or WebGPU compute) using the exact same "leading world dimension" trick MuJoCo Warp uses — this is a documented, copyable pattern, not a secret. Portable across AMD/Intel/Apple/Nvidia, unlike Warp which is CUDA-only. Won't hit NVIDIA's raw throughput, but doesn't need to — microbot swarm sizes (10s–1000s of units) are a different scale problem than humanoid RL training (needing millions of steps/sec). |
| **D. Differentiability**                       | Stretch goal, Pillar 3            | Implement forward-mode or reverse-mode autodiff (dual numbers or a small tape-based autograd) over the XPBD constraint projection step specifically — you don't need to differentiate the whole engine, just the parts relevant to system identification of your servo/actuator models. This is genuinely research-level work; treat it as a "someday, for a specific paper" goal, not a v1 requirement.                                                                                                   |

### 11.4 The realistic pitch, if this becomes part of your narrative

Not "I built a PhysX competitor" — that invites an unwinnable comparison. The honest and much stronger framing: **"I built a physics engine for a scale regime nobody else's engine addresses, because I needed it for real hardware nobody else is building."** That's the TETROBOT playbook applied to simulation — underserved niche, not head-on competition with Boston Dynamics-tier players.

---

## 12. Engineering Analysis Layer — Stress, Torque, Load, Pressure, Current

This is the part that turns "a physics sim" into "a design tool." None of PhysX/MuJoCo/Newton do this — they answer "how does it move," not "does it survive." Each subsection below: what it is, the actual math, and whether you write it from scratch or wrap an existing solver.

### 12.1 Stress Analysis (structural — will a part break?)

**What it needs:** Finite Element Analysis (FEA). Break a solid body into small elements (tetrahedra/hexahedra), each with a **stiffness matrix**, assemble into one global system, solve for displacement, derive stress from displacement gradients.

**Core equation:**

```
[K]{u} = {F}
```

`K` = global stiffness matrix (assembled from each element's material stiffness + geometry), `F` = applied forces/loads, `u` = resulting displacement vector. Solve for `u`, then:

```
strain: ε = ∂u/∂x   (strain-displacement relation)
stress: σ = D·ε      (D = material stiffness matrix, from Young's modulus E + Poisson's ratio ν)
von Mises stress: σ_vm = √( ½[(σ1-σ2)² + (σ2-σ3)² + (σ3-σ1)²] )   ← the single number you compare against yield strength
```

`σ_vm > material yield strength` = part fails. This is the number every mechanical engineer actually looks at first.

**From scratch or wrap existing?** Full nonlinear FEA (large deformation, contact, plasticity, mesh generation with proper element quality) is its own decade-old field — **do not write a general FEA solver from scratch**, that's genuinely a multi-year PhD-adjacent undertaking on its own. Real options, in order of what you actually want:

- **CalculiX** (open source, MIT-adjacent license, industry-credible, used commercially) — call it as an external solver: your engine exports geometry + loads → CalculiX solves → you read stress results back in. This is the standard "don't reinvent FEA" move.
- **Code_Aster** (EDF's open-source FEA, very mature, French nuclear industry pedigree) — similar wrap-it approach.
- **FEniCSx** (Python-based, if you want programmable FEA you can call from your Python bindings layer directly — nice fit since you already planned pybind11 in Layer 5)
- **From-scratch, but scoped down:** write your *own* simple **beam/truss element FEA** (1D elements, not full 3D solid) for quick real-time "is this arm link about to snap" checks during sim. This is genuinely feasible solo — beam element stiffness matrices are a few lines of linear algebra, well documented, and good enough for fast design-iteration feedback. Use CalculiX offline for final verification-grade analysis, your own beam FEA for real-time in-loop checks.

### 12.2 Torque & Load Analysis (will the joint/motor handle it?)

**Good news: you already have most of this.** Joint torque is a direct output of your rigid-body dynamics (section 5–6), computed via **inverse dynamics** — same math robotics uses to compute required motor torques from desired motion.

**Core equation — recursive Newton-Euler (per link/joint):**

```
τ = M(q)·q̈ + C(q,q̇)·q̇ + G(q)
```

`τ` = required joint torque, `M(q)` = mass/inertia matrix (configuration-dependent), `C(q,q̇)` = Coriolis/centrifugal terms, `G(q)` = gravity load term, `q,q̇,q̈` = joint position/velocity/acceleration.

For a **graph** (not a serial chain), this is the **recursive Newton-Euler algorithm (RNEA)** generalized: propagate velocities/accelerations outward along graph edges from a chosen reference node, then propagate forces/torques back inward — same two-pass structure as the classic tree version, just walking your graph edges instead of a fixed parent-child hierarchy. This is genuinely a natural extension of what you're already building in Layer 4, not a new subsystem.

**Load analysis** (static — is a support/bracket overloaded at rest) is just the `G(q)` term alone plus any applied external forces, fed into section 12.1's stress solver as the `{F}` vector. Torque analysis and stress analysis are pipeline stages, not separate engines: **dynamics → joint torque → reaction forces at mount points → FEA load input.**

### 12.3 Motor / Current / Thermal Analysis

Three coupled equations, standard DC/BLDC motor model — this is 100% write-from-scratch, it's simple ODEs, no existing library really fits cleanly into a real-time sim loop anyway:

**Electrical (voltage-current relation):**

```
V = I·R + L·(dI/dt) + Ke·ω
```

`V` = applied voltage, `I` = current, `R` = winding resistance, `L` = winding inductance, `Ke` = back-EMF constant, `ω` = angular velocity. `Ke·ω` is the back-EMF term — this is *why* current draw depends on how fast the motor is already spinning, and it's the term people forget.

**Mechanical (torque-current relation):**

```
τ_motor = Kt·I
```

`Kt` = torque constant (numerically equal to `Ke` in SI units for an ideal motor — same physical constant, different unit context).

**Thermal (heating from resistive loss):**

```
P_loss = I²·R          (joule heating)
dT/dt = (P_loss - h·A·(T - T_ambient)) / (m·c)     (lumped thermal capacitance model)
```

`h` = convective heat transfer coefficient, `A` = surface area, `m` = mass, `c` = specific heat capacity. This tells you if a motor is about to thermally throttle or cook itself under sustained load — directly relevant to your ST3215 servos under continuous duty.

**How it plugs in:** at M6, wrap this as an "actuator model" attached to graph edges (joints). Each timestep: solver computes required `τ` (section 12.2) → invert the motor equation to get required `I` → check `I` against driver current limit (your TB6612FNG H-bridge rating, directly relevant to your real hardware) → integrate thermal state → feed back into torque available next step if it's overheating (real motors derate under thermal stress — free realism win).

### 12.4 Pressure Analysis

Two genuinely different problems hiding under one word — pick based on what you're actually checking:

**Contact pressure (solid-on-solid, e.g. servo horn against bracket, pogo-pin contact force distribution):** — **Hertzian contact theory**, closed-form, no CFD needed:

```
p_max = (3F) / (2π·a²)      where a = contact radius from Hertz's equations (function of F, material E, geometry)
```

Cheap to compute, plugs directly into your existing collision contact points from Layer 2 — you already have contact force from the XPBD solver, this just converts force → pressure at the contact patch.

**Fluid pressure (if you ever need aero/hydro — propellers, ducted fans, submersible modules):** this is full **Navier-Stokes CFD**, a genuinely separate and enormous field from rigid body dynamics. **Do not build this from scratch alongside everything else** — if/when you actually need it:

- **OpenFOAM** (open source, industry-standard CFD, the correct wrap-it choice)
- **SU2** (Stanford, open source, aerodynamics-focused, lighter weight than OpenFOAM)

Treat fluid CFD as an optional external module you call into only if a specific project needs it (e.g., a propeller-driven module) — bolting a full CFD solver onto the core engine roadmap now would blow the scope.

### 12.5 Updated Layer Diagram

```
┌───────────────────────────────────────────────┐
│  Layer 6: Engineering Analysis (stress/torque/  │
│  load/current/thermal/pressure) — section 12    │
├───────────────────────────────────────────────┤
│  Layer 5: Scripting / API (Python bind)         │
├───────────────────────────────────────────────┤
│  Layer 4: Scene Graph & Simulation Loop         │
├───────────────────────────────────────────────┤
│  Layer 3: Constraint Solver (XPBD)              │
├───────────────────────────────────────────────┤
│  Layer 2: Collision (Broad + Narrow)            │
├───────────────────────────────────────────────┤
│  Layer 1: Mesh & Geometry (half-edge)           │
├───────────────────────────────────────────────┤
│  Layer 0: Math Core (SIMD vec/mat/quat)         │
└───────────────────────────────────────────────┘
```

Layer 6 is a *consumer* of Layers 3–4's output (contact forces, joint torques), plus an *external solver bridge* (CalculiX, OpenFOAM) for the heavy structural/fluid cases. It doesn't sit inside the real-time loop for the expensive stuff — only the cheap in-loop checks (motor thermal, beam FEA, Hertzian contact pressure) run every timestep; full FEA/CFD runs offline/on-demand as a "verify this design" button, not every frame.

### 12.6 Library Summary — what to wrap vs. write

| Analysis                                      | From scratch?                                       | Existing tool to wrap                                                                                                   |
| --------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Rigid body dynamics, joint torque             | **From scratch** (it's your core engine)      | —                                                                                                                      |
| Beam/truss FEA (real-time, approximate)       | **From scratch** (well-documented, tractable) | —                                                                                                                      |
| Full 3D solid FEA (verification-grade stress) | Wrap                                                | CalculiX / Code_Aster / FEniCSx                                                                                         |
| Motor electrical/thermal model                | **From scratch** (simple ODEs)                | —                                                                                                                      |
| Contact pressure (Hertzian)                   | **From scratch** (closed-form)                | —                                                                                                                      |
| Fluid pressure / CFD                          | Wrap (only if/when needed)                          | OpenFOAM / SU2                                                                                                          |
| Sparse linear solver (needed for FEA`Ku=F`) | Wrap                                                | Eigen (C++) / SuiteSparse — don't write your own sparse solver, this is a solved problem with excellent free libraries |

---

**Next step:** M1 — math core + single falling body, with Layer 0 written SoA/thread-friendly from day one so Stage B (batched CPU) is a near-zero-cost add later. Say the word and I'll write the actual C++ (or Rust) starting code.

---

## 13. In Case of Shape-Changing Robots — Use This Concept

This is the planning layer that sits **on top of** the graph scene representation from sections 0/6 — it answers "given the robot is currently shape A, what sequence of module moves gets it to shape B?" This is a **self-reconfigurable modular robot** problem, a well-studied subfield of robotics (Claytronics, M-Blocks, SMORES, ATRON, Molecube lineage). Same graph-native philosophy as the rest of this doc — no tree, no re-rooting, just a graph that mutates.

### 13.1 Problem formulation

Represent both the **current shape** and the **goal shape** as graphs, same structure as Layer 4:

```
G_current = (V, E)   // V = modules, E = physical connections between them
G_goal    = (V', E')  // desired final connectivity/shape
```

Reconfiguration = find a sequence of discrete **moves** (module A disconnects from B, moves through free space or along the lattice, reconnects at C) that transforms `G_current` into a graph isomorphic to `G_goal`, subject to:

- **Connectivity constraint** — the graph must stay connected (or satisfy a minimum-connectivity rule) at every intermediate step. A module can't be the only thing holding two halves of the robot together and then move.
- **Collision-free constraint** — a module's path must not intersect another module's body (this is exactly the self-collision checker you already built).
- **Physical reachability** — the move must be executable by real connectors/actuators (hinge range, magnetic pogo-pin engagement distance, etc.)

This is formally graph/state-space search, and in the general case it's **NP-hard** (proven for lattice reconfiguration models) — so real systems don't search for the *provably optimal* move sequence, they use structured heuristics that are fast and good-enough. That's the actual trick worth knowing.

### 13.2 The two dominant algorithmic families

**A. Lattice-based (grid/cellular) reconfiguration** — used when modules snap to a fixed 3D lattice (cube grid), like M-Blocks, ATRON, Molecube.

- Each module only moves via small local primitives: **slide** (translate to adjacent empty lattice cell) or **rotate** (pivot around an edge/corner of a neighboring module — this is literally what M-Blocks' internal flywheel does).
- Classic algorithms: **cellular automaton rules** (Butler et al.) — each module decides its own next move using only local neighbor state, no central planner. Fully distributed, scales to thousands of modules, but can get stuck in local deadlocks without careful rule design.
- **Meta-module method** (Claytronics) — group multiple physical modules into one larger logical "meta-module" so the reconfiguration problem reduces to moving fewer, larger units. Trades some shape resolution for tractability — a very good move if your module count gets large.

**B. Chain/tree-based (graph) reconfiguration** — used when modules connect more freely (not lattice-locked), closer to your Tetrobot/MODULINK topology.

- Central planner treats this as **graph search over configuration space**: each state = a full graph configuration, each edge = one valid module move. Run **A\*** or **greedy best-first search** with a heuristic = graph edit distance to `G_goal` (number of edge insertions/deletions needed).
- This is the natural fit for your existing MODULINK graph-topology work — you already have the graph, you already have shape-change planning started; this section is the formal algorithmic backbone under what you've been building intuitively.

### 13.3 The actual math — assignment + ordering, the two-stage pipeline that matters most

Don't naively search "which module moves next" — that's what makes reconfiguration planning intractable in the first place. Split it into two much easier sub-problems:

**Stage 1 — Target assignment (which physical module ends up at which goal position):**

This is a classic **bipartite minimum-cost matching** problem — solved optimally and cheaply with the **Hungarian algorithm** (O(n³), trivial for realistic module counts):

```
minimize  Σ cost(module_i → target_position_j)
subject to: each module assigned exactly one target, each target gets exactly one module
```

`cost(i, j)` = Euclidean (or graph-hop) distance from module `i`'s current position to target position `j`. This alone — just picking a *good* assignment before planning any moves — is usually the single biggest lever on total move count and total distance traveled. Most naive implementations skip this step and pay for it in move count.

**Stage 2 — Move ordering under the connectivity constraint:**

Given the assignment, you need an order to execute moves in that never disconnects the graph. This is where graph theory does the real work:

- A module is **"free to move"** at a given instant iff removing it from the graph does **not** disconnect the remaining structure — i.e., it is **not an articulation point (cut vertex)**.
- Compute articulation points with a single **DFS pass**, O(V+E), classic algorithm (Tarjan's / Hopcroft's). Recompute (or incrementally update) after every move.
- Greedy loop: at each step, find all modules that (a) are not articulation points right now, and (b) whose move brings them measurably closer to their assigned target. Move whichever is cheapest/safest first. Repeat until goal graph reached.
- If every remaining module *is* an articulation point (a genuine deadlock), fall back to a **"parking" move** — move one module to a temporary free lattice cell/position that doesn't disconnect anything, breaking the deadlock, then resume. This single trick — allowing temporary detours instead of insisting on monotonic progress — is what separates working reconfiguration planners from ones that get stuck.

### 13.4 Full pipeline, concretely

```
1. Parse G_current, G_goal as graphs (same structure as Layer 4)
2. Solve assignment problem (Hungarian algorithm) → module_i maps to target_j
3. Loop:
     a. Compute articulation points of G_current (DFS, O(V+E))
     b. Candidate moves = non-articulation modules not yet at their target
     c. If candidates empty and G_current ≠ G_goal → deadlock, do a parking move
     d. Pick candidate move minimizing remaining distance to target
     e. Validate move: collision-free path check (Layer 2 GJK/EPA), connector reachable
     f. Execute move: update graph edges (disconnect old edge, connect new edge)
     g. If graph isomorphic to G_goal → done
4. Feed move sequence into TetraSim (sections 0–9) to physically simulate/validate
   the transition, not just the topology change — this is why building this on top
   of your own physics engine (rather than a black-box planner) matters: you get to
   verify the moves are physically executable, not just graph-theoretically valid.
```

### 13.5 Why this approach specifically (vs. brute-force search)

- **Assignment first, ordering second** turns an NP-hard joint problem into two tractable ones (polynomial-time matching + linear-time connectivity check per step) — this decomposition is the single highest-leverage idea in this whole section.
- **Articulation-point-based move gating** guarantees you never accidentally split the robot mid-reconfiguration, without needing to simulate every candidate move to check it — it's a pure graph property, computed in O(V+E).
- **Distributed cellular-automaton rules** (13.2A) scale better for very large module counts (100s–1000s) but give up global optimality; **centralized graph search** (13.2B, what's detailed in 13.3–13.4) is the better fit for your module counts and matches the graph-native architecture you've already committed to elsewhere in this doc — same data structure, no separate subsystem needed.
- **Physical validation via the actual physics engine** (13.4 step g) is the thing most academic reconfiguration papers skip — they prove topological correctness on paper and stop. Closing the loop with real GJK/EPA collision checks against real connector geometry is exactly the "engineering verification, not just motion" philosophy from section 11.2, applied to shape-change planning instead of stress analysis.
