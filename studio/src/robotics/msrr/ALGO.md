# The MSRR Placement Algorithm

**Author: Nischay Sai D R.** Every rule, condition, and priority in this
document was specified by him — as a numbered if/else rule list, refined over
several rounds against real builds he inspected in the live app. The code in
this folder (`skeleton.ts`, `fitModules.ts`, and the supporting files) is a
transcription of this specification, not the source of it. Where the
implementation had to discover a supporting fact (an exact hardware number, a
geometric proof, a bug) to make a rule work, that is noted as implementation
detail, clearly separated from the rule itself.

This document is the spec. The code is one transcription of it, and could in
principle be re-implemented from this document alone.

---

## 0. The problem this solves

A shape is drawn as a set of unit cubes on a lattice — a diagram, not a robot.
A MODULINK module is a 6-rod bendable chain that, depending on how it folds,
spans anywhere from 1 to 4 cubes of straight-line reach. Turning the diagram
into an actual robot means deciding, for every cube, which module's body
passes through it, where every module bends, and which of its six connectors
(A, B, and four side connectors) welds to which of another module's.

**A cube is not a module, and a module is not a cube.** How many modules a
20-cube diagram takes is an output of this algorithm, never an input (Rule 5).

---

## 1. One or two cubes is too small to say anything about

A diagram of one or two cubes is a statement that *something* is here, not a
statement about how big it is. It gets exactly **one straight module**,
unfolded, however far it overhangs the diagram. Folding it up to hide inside
one or two cubes would be answering a question the diagram never asked.

## 2. A bend goes ON the corner cube

Where the diagram turns, a module's own bend joint lands on that exact cube,
turning the same way the diagram turns. Bending anywhere else rounds the
corner off and reads as a different shape than the one drawn.

*Implementation fact discovered while building this*: the module has exactly
**three** clean single-bend corner forms, forced by where its bend joints
physically sit along the six-rod chain (roughly 0.6, 1.2, and 2.9 cubes from
connector A, with B at 4): an arm split of **1+3**, **2+2**, or **3+1** cubes.
Every other split either needs two bends (a staircase, not a corner) or falls
outside the module's reach entirely. These are not a preference; they were
found by solving the actual kinematics for every 1..3 × 1..3 combination and
keeping only the ones that land a real, single turn on the target cube.

*A second implementation fact, discovered round 8*: which of the three splits
is clean is **not rotationally symmetric**. A module's own side connectors
sit at fixed points along the chain, so a bend that turns toward local +X can
self-clear while the SAME split turning toward local +Y self-collides, purely
because the two turns put the bend's own hemisphere domes at different
distances from those side connectors. A corner therefore has clean splits per
ARM, not per corner — one arm might only have a clean 1-in/3-out form, the
other only a 3-in/1-out. See the round-8 revision-history entry for the bug
this caused and its fix.

## 3. A spine goes ON the junction

Where three or more arms meet, a module's own **spine** — its big rod's
midpoint, where all its side connectors ride — lands exactly on that cube.
That is what lets the other arms have somewhere real to weld onto. The module
is allowed to hang off the diagram to do this (see Rule 6/priority notes
below); centring the spine on the junction is the whole point and is not
traded away for a smaller overhang.

## 4. The silhouette matters more than the exact fit

A run is rarely a whole number of modules long. When the fit isn't exact, the
**surplus is spent as overhang at the end**, not as folding the shape smaller
to make the numbers come out even. Getting the outline right matters more
than landing exactly on the last cube.

*(Refined in round 4 — see "Overshoot has a limit" below: this rule holds
until the overhang gets disproportionate to what it actually buys.)*

## 5. A cube is a point on a diagram, not a width

The cube size is fixed at exactly one quarter of a fully-straight module's
length, so the diagram's scale **is** the module's scale. Nothing in this
algorithm ever packs two modules into one cube, and nothing ever treats a
bigger cube as "more room" — the cube grid has no notion of width at all, only
position.

## 6. The busiest feature is served first

Features are ranked by how much they constrain a module, and served in that
order:

**junction > corner > tip > run.**

A 4-way crossing outranks a 3-way tee, which outranks any corner, which
outranks a plain tip. The reasoning: a low-constraint feature (a corner) can
usually still be satisfied later even if something else goes first, but a
high-constraint feature (a junction, which needs its exact midpoint free)
loses its only chance the moment something else's body passes through that
cube. So the busiest feature gets first claim on its own cube — and, per Rule
3's own extension, on the cubes around it it will need to centre a spine —
before anything lower-priority is allowed to consume them.

*Implementation note*: this is enforced with a **reservation** mechanism —
a pending high-priority feature holds its cube (and, for a junction, the whole
five-cube spine span in every direction that might be needed) so a
lower-priority placement passing through cannot claim it first. Reservations
are advertised on **all six axes** from a junction, not just its occupied
arms, because a spine only needs its *midpoint* on the junction — which
direction the rest of it points, and how far it overhangs to get there, is
free.

## 7. Straight, if at all possible

Between two placements that cover the same ground, the one that stays
straight wins over the one that bends — unless the bend is Rule 2's bend
(landing on a real corner), which costs nothing at all. An invented bend is
priced high enough that it never wins against a straight alternative covering
similar ground, but not so high that it becomes impossible when it is
genuinely the only way to reach real, substantial coverage (see "Stray bends
must be justified" below — this was a real tension discovered in round 4).

## 8. Nothing is ever unconnected

At no point — not in the finished build, and not at any single frame of the
build being revealed one module at a time — does a module exist that is not
welded or at least touching something else already placed. The one exception
is Rule 1's single module, which by definition has nothing yet to attach to.

This is enforced two ways:
- Every module after the first is placed anchored on a connector (or, failing
  that, physically touching the built structure) that already exists — never
  floating free.
- The build's own **reveal order** is re-sorted, after the fact, along the
  real connection graph (welds first, then body-adjacency), so that watching
  the build assemble one module at a time never shows a piece appearing next
  to nothing.

---

## Priorities and trade-offs, as a hierarchy, not a blend

Rules 6, 4, and 7 interact, and the order they resolve in matters. From
highest to lowest priority:

1. **Serving a junction or corner** (Rules 2, 3) — worth more than any amount
   of raw coverage one module could otherwise buy.
2. **Real coverage** — how many new cubes of the diagram a placement actually
   covers.
3. **Staying straight** (Rule 7) — a tie-break between placements of similar
   coverage, not something that ever outvotes coverage itself.
4. **Staying inside the diagram** (Rule 4) — the *last* thing given up. A
   placement is allowed to hang outside the drawn shape before it is asked to
   bend where the shape does not.

*Implementation detail — the actual scoring bands, so a future change can be
checked against the intended hierarchy rather than guessed at:*

| band | weight | meaning |
|---|---:|---|
| serving a junction | `100,000 × (degree − 2)` | a 4-way crossing outranks a T outranks a plain 3-way |
| serving a corner | `20,000` | |
| landing where a pending feature wants an approach | `8,000` | phase lookahead, see below |
| per cube of real coverage | `1,000` | |
| closing an extra lock (Rule 8 slack) | `400` (or `30,000` for an otherwise-unattached chain start) | |
| per stray (invented) bend | `−1,500` | a tie-break, not a ban — see below |
| per body cube outside the diagram | `−60` | the cheapest thing to give up |
| per tenth of a cube of lattice snap error | `−10` | |
| how much real shape still waits past this placement's free end | `+50` per cube | tie-break only, see "favour the longer arm" |

These are bands, not a continuous blend: the gaps between them (100,000 vs.
20,000 vs. 1,000 vs. tens) are deliberately large enough that no combination
of lower-priority signals can ever outvote a higher one.

---

## Overshoot has a limit (added round 4)

Rule 4 says the surplus of an inexact fit is spent as overhang. That holds
**up to a ratio**: a placement that stays straight and serves no feature may
not overshoot the diagram by more than **1.5× its own real coverage** (a
gain of 1 real cube licenses at most 2 cubes of overhang, rounded up). Past
that ratio, the cube is left honestly **uncovered** and reported as such,
rather than drawn as a long stick for a sliver of real gain.

*Why this exists*: no straight pose in the module's whole reach table lands
shorter than a full 4-cube reach while still facing forward — finishing off a
1–2 cube remainder without inventing a bend always costs 2–3 cubes of
overshoot, no matter what. Below the ratio, that trade is worth it (the
silhouette stays intact for a small cost). Above it, it stops being worth it,
and an honest gap is better than a build that reads as spikier than the
diagram it was drawn from.

**Exempt from this ratio**: a placement that serves a junction or a corner
(Rules 2/3). Centring a spine on a junction with no matching straight-through
run can legitimately need heavy overshoot for a real coverage gain as low as
1 (the junction cube itself) — that is the entire point of Rule 3, not a
trade to be second-guessed by a ratio built for a different case.

## Stray bends must be justified (added round 4)

A bend the diagram does not itself make is never free (Rule 7), but it is not
an outright ban either — the same "is this actually worth it" judgment the
overshoot ratio applies to a straight finish applies here to a bent one. A
stray bend is only taken if the real coverage it buys — its own gain, plus
whatever real, uncovered shape still waits past where it lands, looking in
every direction — exceeds what the bend cost. A lone stray cube with nothing
beyond it never clears the bar; a genuine run of real coverage does.

*Why the lookahead matters*: judged on a single module's own gain alone, the
**first** module of a worthwhile multi-module detour often looks exactly like
a worthless one — it may reach only one or two cells of a longer stranded run,
with the rest waiting for a second module to pick up from where it lands.
Refusing it on its own low gain loses the whole run, not just an awkward first
step. Crediting it with the real, uncovered shape still reachable from its own
free end (not just its own body) is what tells the two cases apart.

## Favour the longer arm when two compete (added round 4, mostly superseded by Rule 6a)

When two placements would cover the same number of cubes this step and differ
only in which direction they head, the one heading toward more remaining real
shape wins — a small, deliberate tie-break, weighted low enough that it can
never turn a lower-coverage placement into the winner.

## Rule 6a — a hub's side connectors: use as many as physically exist (added round 6)

**All four of a module's side connectors may carry a weld at once — adjacent
to each other or opposite, no restriction beyond the physical count of four.**

*Implementation history worth keeping*: an earlier version of this algorithm
enforced "at most two side connectors, and they must be opposite" — reasoning
that two side connectors 90° apart would physically interpenetrate. Measured
directly: they do not. Two side domes 90° apart sit 0.8485 cube units apart
against a 0.84 requirement — **real clearance of 0.0085 units**, not an
overlap. (A 5% manufacturing-tolerance margin in the original spec made the
idealised geometry read as "too tight" even though nothing actually
intersects; Nischay's own call, after building an adjacent-pair weld and
inspecting it directly in the live app, was to drop that margin's veto here.)

This resolved into a load-bearing consequence for Rule 6: **a hub module now
offers up to six weld directions from one cube — its own two ends, plus all
four sides** — which is the maximum number of face-neighbours any single cube
can ever have. Combined with a simple pigeonhole fact (any cube with 4 or
more occupied neighbours necessarily has at least one pair of them exactly
opposite each other, since 4+ single directions cannot be spread across 3
axis-pairs without repeating one), this means: **every junction, of any
degree from 3 to 6, is now fully servable directly from one hub module.** No
arm is ever structurally stranded into a detour by the hub's own connector
budget any more — the spine absorbs one axis of arms through its own two
ends, and the remaining arms, however many, take the four side connectors.

---

## The pipeline

1. **ANALYSE** — read the cube diagram into a ranked list of features
   (junction, corner, tip, run), per Rule 6's priority order.
2. **ROOT** — place one module aligned to the single most demanding feature.
   Everything else grows off this module's own connectors, which is what
   keeps the whole build connected by construction (Rule 8), not by luck.
3. **GROW** — repeatedly: of every legal pose reachable from every currently
   free connector on the structure, commit whichever single placement scores
   highest under the hierarchy above. Continue until nothing legal covers
   anything new.
4. **RESCUE** — if growth stalls with reservations still held (a
   high-priority feature that turned out unreachable), release them and try
   once more before giving up on those cubes.
5. **WELD** — a final pass catching any pair of free connectors that happen
   to coincide in real space without having been deliberately grown toward
   each other.
6. **ORDER** — re-sort the finished module list along the real connection
   graph (Rule 8), so the build reveal is connected at every single frame.

---

## Revision history

- **Round 1** — Rules 1–8 specified in full, as an if/else list, by Nischay.
  Implemented as a ground-up rewrite of the fitter (previously a
  coverage-maximising greedy walk with no notion of features at all).
- **Round 2** — three refinements after inspecting a real build: the sphere
  rule (every lock must close into an exact, coincident sphere — traced to a
  pose self-collision bug, not the weld logic itself); "extend, don't fold"
  as the standing priority between overshoot and invented bends; junction
  spine anchors extended to all six axes (a junction's midpoint does not care
  which direction the rest of the spine points).
- **Round 3** — a structural bug fix, not a rule change: roughly a quarter of
  the module's precomputed pose table is *mirrored* (held from connector B,
  not A), and every consumer of that table was silently using the wrong
  reference frame for those poses. Fixed once, at the source
  (`chainMoves.anchoredBase` / `bookkeepingConnectors`), rather than patched
  per call site.
- **Round 4** — the overshoot ratio, the stray-bend justification gate (with
  lookahead credit), and the favour-the-longer-arm tie-break, all added after
  a real build showed a module overshooting disproportionately and a shorter
  arm losing a connector race it should have won.
- **Round 5** — a correction, not a rule change: an earlier explanation
  called the adjacent-side-connector gap an "overlap." Direct measurement
  showed it is positive clearance, just thinner than a deliberate safety
  margin. Corrected before Round 6 made a permanent decision on it.
- **Round 6** — Rule 6a: all four side connectors usable at once, permanently
  Nischay's own call after inspecting a forced adjacent-side build directly in
  the live app. Removed the now-impossible "overloaded junction" diagnostic
  entirely, since no junction can be overloaded any more.
- **Round 7** — a rendering bug fix, not a rule change: zoomed screenshots of a
  real 40-cube build showed a visible crack between two supposedly-welded
  domes, at both side welds AND plain end-to-end welds. Measurement traced it
  to the reach table: the bend search samples a continuous joint on a 10-degree
  grid and only needs the free end within a loose ~26 degree cone of the
  target axis to count as "facing that way" (position is snapped tight; the
  facing direction was not), so a bent pose could carry several degrees of
  residual tilt on its own connector normal — invisible to every lattice-level
  check (a module re-anchors on its neighbour's real welded position, not the
  idealised cell, so the tilt never opens a position gap) but visible on
  screen as a wedge where the two hemisphere domes don't quite close into one
  sphere. Fixed at the rendering layer, not the reach table: `buildGeometry`
  (`moduleGeometry.ts`) now forces every welded pair's two dome normals to be
  exactly antiparallel after the geometry is computed, using the host's normal
  as ground truth — a purely cosmetic correction that never touches a
  position, a cell, or which pose was chosen, so it cannot change coverage,
  connectivity, or collision behaviour. (An earlier attempt fixed this inside
  the reach table itself, by numerically refining each bent pose's joint
  angles toward the exact target direction — mathematically sound, and it
  worked, but a shared "which route did we already find a solution for"
  identity meant that pushing on direction accuracy alone could, for some
  routes, either drift the free end's position out of tolerance or silently
  collapse two of the table's alternate body routes onto the same swept
  footprint, which briefly broke coverage on this exact shape. Reverted for
  the render-layer fix instead, which cannot have that failure mode.)
- **Round 8** — a real algorithm bug, caught by Nischay pointing at a clean
  L-shaped corner (from a cube diagram, not a screenshot of the render) that
  was still using a side lock plus an end lock, insisting it should be one
  bend with end-to-end welds on both arms. He was right. Traced to
  `refreshPlan`'s "wanted anchors" — the mechanism that steers a growing chain
  to stop at a distance from a corner where a clean single-bend split exists
  (see rule 2's implementation note on splits not being rotationally
  symmetric). It advertised all three split distances (1, 2, 3) for BOTH of a
  corner's arms without checking that the specific (distance, this-arm)
  combination actually had a catalogue entry — so a chain got steered to stop
  3 cubes short of a corner whose only clean solution, approached from that
  arm, was 1 cube short. `proposeCorner` then legitimately found nothing
  there, and the greedy fallback (`proposeFromTable`) picked whatever
  reach-table pose scored best overall — which turned out to be a pose that
  merely turns at the corner cube (satisfying the loose, generic `pathTurns`
  check that credits ANY pose for "serving" a corner, not just a clean one)
  while its continuing arm drifts off-axis, landing nowhere useful for the
  next module to weld onto end-to-end — so that next module welded onto a
  SIDE connector instead, near the corner but not through it. Fixed by having
  `refreshPlan` check the real catalogue entry for the exact (split, arm)
  pairing before advertising it, so the chain is only ever steered toward a
  distance the corner can actually be served from cleanly. Verified on his
  exact 40-cube shape: both real corners now bend with a single module,
  end-to-end welds on both arms, zero side locks outside the one genuine
  4-arm junction — and the whole build got MORE efficient as a side effect
  (11 modules -> 10) since the old side-lock detour no longer happens. 289/289
  tests still pass.
- **Round 9** — the same symptom on a fresh shape (a "bridge": two corners a
  fixed 22 cubes apart along one straight run), caught by Nischay again, but
  a DEEPER bug than round 8's: this time BOTH corners individually had clean
  bend solutions, yet one still fell back to a side lock. The catalogue split
  that is clean on a given arm's approach can itself depend on the direction
  turned (round 8's implementation note), which for this run meant only
  splits of 1 or 2 cubes ever had a working entry on either side of it — 3
  was always broken here — and 1+2 or 2+2 do not sum with whole 4-cube hops
  to the run's exact 22-cube length; only 1+1 does (`1 + 4×5 + 1 = 22`). A
  corner cannot see this on its own: it only knows its OWN two splits are
  individually clean, not that its neighbour 22 cubes away needs a MATCHING
  one. Fixed with `armParityBonus`, a signed score term checked on both of a
  corner's arms (the one it bends onto and the one it is anchored on):
  scanned the arm's real length (not `skeleton.armLength`, which caps at 8
  cubes and was silently truncating this exact case), and if the far end is
  another corner, rewards a split that leaves it reachable by whole 4-cube
  hops and PENALISES one that does not — a flat bonus for every option would
  have rewarded a dead-end arm (nothing to disagree with) exactly as much as
  the one real solution, erasing the distinction the fix exists to draw.
  Verified on the bridge shape: both corners now pick the 1-cube split, five
  clean reach-4 hops fill the run between them, 10 modules, zero side locks
  anywhere. 289/289 tests pass, and the round-8 shape is unaffected (still
  10 modules, both corners clean).

Every round's reasoning, including the exact numbers behind each decision, is
verified against the live code and its test suite — the description above is
not aspirational, it is what `fitModules.ts` and its neighbours in this
folder actually do, checked by `featureFit.test.ts`, `sphereRule.test.ts`,
and `shapeQuality.test.ts` (one assertion per rule, where a rule can be
pinned to a concrete shape).
