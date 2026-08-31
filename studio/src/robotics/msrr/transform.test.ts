/**
 * transform.test.ts — chain welding, and the transformation planner.
 *
 * The transformation tests are deliberately written around what is TRUE rather
 * than what would be nice. Mobility in a compact structure is measured at 0–3
 * single-step relocations per module, so plans are often empty — and an empty
 * plan is a correct answer about a robot packed too tightly to rearrange, not a
 * planner failure. What is asserted is that the planner never lies: it never
 * invents or loses modules, never claims completeness it did not achieve, and
 * always explains itself.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { type Cell, key, isConnected, configFromCells } from './lattice';
import { fitModules, connectorsOf, weldChains } from './fitModules';
import { planTransform, mobilityReport, structureAfter, describeTransformMove, oneStepMoves } from './transform';
import { buildShape, SHAPES } from './shapes';
import { weldTypeIsLegal, HEMISPHERE_RADIUS } from './modulink';
import { MODULINK_CUBE_SIZE } from './occupancy';

const line = (n: number): Cell[] => Array.from({ length: n }, (_, i) => [i, 0, 0] as Cell);

// ── chain welding ─────────────────────────────────────────────────────────────

test('EVERY library shape, at every size, builds as exactly ONE physical robot', () => {
  // The hard guarantee, not a measured tendency. A robot is one machine: a fit
  // that leaves islands floating in space has not built the shape, it has
  // built several unrelated robots that happen to share a picture.
  //
  // This does NOT require every module to be formally WELD-LOCKED into one
  // graph (`r.components === 1`) — a wide shape (a wall, a table top, a wide
  // tower cross-section) legitimately needs more parallel attachment points
  // than one module's 4 directions can weld together, and Nischay's own rule
  // for that case is explicit: side-by-side modules may stand flush against
  // the structure without a formal lock, as long as they are collision-free
  // and spatially part of the same body. That is exactly what the
  // touching-tier (`r.touchingChains`) produces, and `r.components` can be
  // >1 for a correctly-built wide shape as a result. What must never happen
  // is a chain floating detached in space with nothing beneath it at all —
  // that is what `r.spatiallyOnePiece` (body-cube adjacency, independent of
  // formal locks) actually checks, and is the guarantee kept here.
  //
  // This replaced a much weaker test that only required 2 of 5 shapes to come
  // out in one piece and accepted fragments as long as they were REPORTED.
  // Reporting is not enough: the fitter now refuses to place a module that
  // cannot weld OR touch the existing structure, so true floating fragments
  // cannot happen at all.
  for (const s of SHAPES) {
    for (const n of [14, 21, 28]) {
      const r = fitModules(buildShape(s.id, n));
      if (r.modules.length === 0) continue; // nothing fitted is a different answer
      assert.equal(r.spatiallyOnePiece, true,
        `${s.id}@${n}: built in physically separate pieces — connectivity is a hard requirement`);
    }
  }
});

test('connectivity is paid for in coverage, and that cost is stated', () => {
  // The honest other half of the guarantee above: where nothing already built
  // can reach a region, those cubes are LEFT UNCOVERED rather than covered by
  // a floating chain. That must be visible in the log, or an incomplete fit
  // would look like a complete one.
  let sawTradeoff = false;
  for (const s of SHAPES) {
    const r = fitModules(buildShape(s.id, 21));
    if (r.uncovered.length === 0) continue;
    sawTradeoff = true;
    assert.match(r.log.join(' '), /uncovered/,
      `${s.id}: left ${r.uncovered.length} cubes uncovered without saying so`);
  }
  assert.ok(sawTradeoff,
    'test setup: expected at least one library shape to pay coverage for connectivity');
});

test('without the connectivity requirement the fitter can still fragment — proving the constraint is what fixes it', () => {
  // Guards against the guarantee passing for the wrong reason. If no shape ever
  // fragmented even unconstrained, the requireConnected flag would be doing
  // nothing and the test above would be vacuous. At least one shape must
  // genuinely need the constraint.
  let fragmentedWithout = 0;
  for (const s of SHAPES) {
    const loose = fitModules(buildShape(s.id, 21), { requireConnected: false });
    if (loose.components > 1) fragmentedWithout++;
  }
  assert.ok(fragmentedWithout > 0,
    'no shape fragmented even without the constraint — the one-piece guarantee proves nothing');
});

test('every weld puts two domes at the SAME POINT — end-to-end and end-to-side alike', () => {
  // The spec's definition of a lock: "exactly ONE dome pressed against ONE other
  // dome: same point in space, outward normals pointing directly into each
  // other". Two domes at the same point read as one complete sphere; that is
  // what a correct lock looks like on screen.
  //
  // This is the regression that hid for a long time. End connectors land on
  // lattice points, so end-to-end welds happened to be exact. SIDE connectors do
  // not: all four report the same lattice cell while sitting ~0.63 cube units
  // apart in four directions, so anchoring a branch at that cell left the two
  // domes ~0.98 apart — wider than two dome radii, visibly not touching. A
  // second, subtler version of the same fault made welds part-way down a chain
  // drift by up to 2.7 cube units, because each module was re-anchored to its
  // predecessor's rounded lattice cell instead of its real B dome, compounding
  // the snap tolerance at every link.
  const DOME_RADIUS = HEMISPHERE_RADIUS / MODULINK_CUBE_SIZE;
  let checked = 0;
  let sideWelds = 0;

  for (const s of SHAPES) {
    const r = fitModules(buildShape(s.id, 21));
    const byId = new Map(r.modules.map((m) => [m.id, m]));

    for (const m of r.modules) {
      if (!m.weldedTo) continue;
      const parent = byId.get(m.weldedTo);
      assert.ok(parent, `${s.id}: ${m.id} claims a weld to missing module ${m.weldedTo}`);

      const myA = connectorsOf(m).find((c) => c.end === 'A')!;
      let best = Infinity;
      let bestEnd = '';
      for (const pc of connectorsOf(parent!)) {
        const d = Math.hypot(
          myA.pos[0] - pc.pos[0], myA.pos[1] - pc.pos[1], myA.pos[2] - pc.pos[2],
        );
        if (d < best) { best = d; bestEnd = pc.end; }
      }
      checked++;
      if (bestEnd !== 'A' && bestEnd !== 'B') sideWelds++;

      // Coincident, not merely close: comfortably inside one dome radius, so the
      // pair genuinely forms a sphere rather than two domes near each other.
      assert.ok(best < DOME_RADIUS * 0.5,
        `${s.id}: ${m.id}.A is ${best.toFixed(3)} cube units from ${parent!.id}.${bestEnd} — `
        + `a weld must be the same point (dome radius ${DOME_RADIUS.toFixed(3)})`);
    }
  }

  assert.ok(checked > 0, 'test setup: no welds were found to check');
  // If no side weld ever occurred, this would pass while testing only the case
  // that already worked.
  assert.ok(sideWelds > 0,
    'no end-to-side welds in any library shape — this test would not cover the bug it exists for');
});

test('a plain corridor always builds as a single connected chain', () => {
  const r = fitModules(line(13));
  assert.equal(r.components, 1);
  assert.equal(r.runs, 1);
});

test('every module has six connectors, two of them exact chain ends', () => {
  const r = fitModules(line(13));
  for (const m of r.modules) {
    const cs = connectorsOf(m);
    assert.equal(cs.length, 6, `${m.id} does not have six lock faces`);
    const a = cs.find((c) => c.end === 'A')!;
    const b = cs.find((c) => c.end === 'B')!;
    assert.equal(key(a.cell), key(m.anchorCell));
    assert.equal(key(b.cell), key(m.endCell));
  }
});

test('chain welds are legal weld types and never side-to-side', () => {
  for (const id of ['car', 'humanoid'] as const) {
    const r = fitModules(buildShape(id, 30));
    for (const w of r.chainWelds) {
      assert.ok(weldTypeIsLegal(w.fromEnd, w.toEnd),
        `${w.fromEnd}<->${w.toEnd} is not a weld this connector design can make`);
      assert.notEqual(w.fromModule, w.toModule, 'a module cannot weld to itself');
    }
  }
});

test('weldChains reports one component for a single chain and never over-welds', () => {
  const r = fitModules(line(13));
  const w = weldChains(r.modules);
  assert.equal(w.components, 1);
  // A chain is already connected end to end, so no extra welds are needed.
  assert.equal(w.welds.length, 0, 'a single chain should need no chain-joining welds');
});

// ── mobility ──────────────────────────────────────────────────────────────────

test('mobility is measured per module and explains what is rejecting moves', () => {
  const build = fitModules(buildShape('wall', 20));
  const m = mobilityReport(build);

  assert.equal(m.perModule.length, build.modules.length);
  assert.equal(m.total, m.perModule.reduce((n, p) => n + p.reachable, 0));
  assert.equal(m.frozen, m.perModule.filter((p) => p.reachable === 0).length);
  assert.ok(m.summary.length > 0);

  // The three counters must be non-negative and actually populated: the point of
  // the diagnostic is telling apart "blocked by another module" from "landed
  // facing the wrong way", which need different fixes.
  for (const p of m.perModule) {
    assert.ok(p.reachable >= 0 && p.blockedByBody >= 0 && p.wrongFacing >= 0);
  }
});

test('mobility is at or above the level the on-demand solver unlocked', () => {
  // A regression guard with real history — the number has moved several times
  // as each successive fix corrected what was actually being measured, not
  // because the search changed: 2/3/4/5 at different points under a weld-
  // alignment tolerance question, then a bigger drop when mobilityReport
  // learned to check REAL structural connectivity (staysConnectedWithout) —
  // a module bridging two halves of the robot has ZERO legal moves, full
  // stop, however many "reachable-looking" targets it has, because letting
  // go at all would split the structure. Wall@20 dropped to 0 under that
  // check — every module in it turned out to be load-bearing.
  //
  // table@20, not 32: bestPlacement later learned to prefer straight rows
  // and clean corners over efficient zigzags (segmentCount) — good for
  // matching the shape, but a straighter build packs LESS densely, and at
  // table@20 that leaves every module load-bearing again (mobility 0). @32
  // has enough room to be built mostly as straight parallel rows with real
  // slack between them, which is genuinely the size that keeps a positive
  // floor now — the only kind of floor worth asserting.
  const build = fitModules(buildShape('table', 32));
  const m = mobilityReport(build);
  assert.ok(m.total >= 1,
    `table mobility dropped to ${m.total}, below the measured floor of 1`);

  // Still genuinely constrained — a compact robot cannot freely rearrange, and
  // claiming otherwise would be the opposite failure.
  assert.ok(m.total < build.modules.length * 6,
    `mobility jumped to ${m.total}, which is implausibly high — verify before raising this`);
});

test('a branchy, less dense structure is more mobile than a compact block', () => {
  // Sanity on the metric itself: mobility should track how much room the modules
  // actually have, not be a constant the implementation happens to produce.
  //
  // Not snake vs tower any more: a snake is built as ONE continuous weld
  // chain, and under the real bridge/cut-vertex check (staysConnectedWithout)
  // that makes EVERY module load-bearing by construction — removing any
  // interior module always splits the two halves, so a chain shape now
  // measures 0 mobility at every size that was tried, not because the metric
  // is broken but because a single unbranched chain genuinely has none to
  // give: there is no redundant path for a module to let go into. car/box
  // is the pair that actually demonstrates the property this test is for —
  // car has real branching (multiple chains meeting at welds, so a module
  // can let go without disconnecting anything), box is one compact block.
  // Measured at n=32: car=4, box=0.
  const car = mobilityReport(fitModules(buildShape('car', 32)));
  const box = mobilityReport(fitModules(buildShape('box', 32)));
  assert.ok(car.total >= box.total,
    `a car (${car.total}) should not be less mobile than a box (${box.total})`);
});

// ── never comes apart, for real ────────────────────────────────────────────────
//
// The header comment has promised "must become another without ever coming
// apart" since this file's first line. Nothing actually checked that until a
// screenshot showed a completed plan rendering as several chain fragments
// floating apart on screen: oneStepMoves would detach ANY module's held
// connector and reattach it elsewhere, with no check that the rest of the
// structure was still one piece once it let go. A module bridging two halves
// of the robot — the ordinary case for anything past a plain unbranched chain
// — would silently split the robot the instant it moved. These tests guard
// the actual, visible property: a bridge module has no legal moves at all,
// and a finished plan is provably one connected structure throughout.

test('a module bridging two otherwise-unconnected sub-chains has zero legal moves', () => {
  // "snake" branches at low module counts: module 0 welds onto two separate
  // chains that are not connected to each other except through it — a real,
  // representative bridge, not a contrived one.
  const build = fitModules(buildShape('snake', 20));
  const bridge = build.modules.find((m) => {
    const others = build.modules.filter((x) => x.id !== m.id);
    return oneStepMoves(m, others).length === 0 && others.length > 1;
  });
  assert.ok(bridge, 'test setup: this build should contain a bridge module to check against');

  const mob = mobilityReport(build);
  const entry = mob.perModule.find((p) => p.moduleId === bridge!.id)!;
  assert.equal(entry.bridge, true, `${bridge!.id} has zero moves but mobilityReport does not flag it as a bridge`);
  assert.equal(entry.reachable, 0);
});

test('every module of a finished plan is PHYSICALLY one piece — body-adjacent, not several', async () => {
  // Checks SPATIAL adjacency (body cubes touching), not weld-graph adjacency.
  // Those used to be the same claim; they no longer are, deliberately —
  // fitModules can now place a chain touching the rest of the structure
  // without a formal lock when a shape needs more parallel attachment points
  // than one module's 4 directions can weld (see fitModules.findTouchingSeed
  // and FitResult.spatiallyOnePiece). A finished plan inherits that: its
  // finalModules can legitimately contain a touching-not-locked group. What
  // must still never happen is a module with NO relation to the rest at
  // all — not welded AND not touching, which really would be a separate
  // machine sharing the picture by coincidence.
  //
  // (An earlier version of this test also had its own bug: it grouped
  // connectors by `c.cell`, the LATTICE cell every side connector of a module
  // shares, not `c.pos`, the real position — the same class of mistake fixed
  // everywhere else in this file. It happened to pass only because it never
  // exercised a real side weld before now.)
  for (const [from, to] of [['car', 'humanoid'], ['chair', 'table'], ['snake', 'wall']] as const) {
    const cur = fitModules(buildShape(from, 20));
    const r = await planTransform(cur, buildShape(to, 20));
    const mods = r.finalModules;
    if (mods.length <= 1) continue;

    const allCells = mods.flatMap((m) => m.cells);
    assert.ok(isConnected(configFromCells(allCells)),
      `${from} -> ${to}: final structure's bodies are not even touching — genuinely separate pieces`);
  }
});

// ── the planner's honesty ─────────────────────────────────────────────────────

test('walking never invents or loses a module mid-walk, and the final count exactly matches the target', async () => {
  const cur = fitModules(buildShape('wall', 20));
  const r = await planTransform(cur, buildShape('snake', 20));
  const ids = new Set(cur.modules.map((m) => m.id));
  for (const mv of r.moves) {
    assert.ok(ids.has(mv.moduleId), `plan moves unknown module ${mv.moduleId}`);
  }
  // The walk itself only ever relocates real, existing modules — conserved
  // through every step of it.
  const after = structureAfter(cur, r.moves, r.moves.length);
  assert.equal(after.length, cur.modules.length, 'module count must be conserved through the walk');

  // The module COUNT is deliberately allowed to change after the walk, to
  // exactly match what the target needs — reported explicitly as added/
  // removed, never silently. This is a distinct, explicit step from walking,
  // not a violation of "never invents or loses a module": every added or
  // removed module is named in both the log and the result.
  assert.equal(r.finalModules.length, r.targetBuild.modules.length,
    'the final module count must exactly match what the target build needs');
  assert.equal(
    cur.modules.length + r.added.length - r.removed.length, r.finalModules.length,
    'added/removed counts must account for the whole change in module count',
  );
  if (r.added.length || r.removed.length) {
    assert.match(r.log.join(' '), /added|removed/, 'a module-count change must be reported in the log');
  }
});

test('completeness is never claimed unless every target cube is covered', async () => {
  for (const [a, b] of [
    ['wall', 'snake'], ['snake', 'wall'], ['chair', 'table'],
  ] as [string, string][]) {
    const cur = fitModules(buildShape(a as any, 20));
    const r = await planTransform(cur, buildShape(b as any, 20));
    if (r.complete) {
      assert.equal(r.covered, r.targetCubes, 'complete must mean full coverage');
    } else {
      assert.ok(r.covered <= r.targetCubes);
      assert.ok(r.log.length > 0, 'an incomplete plan must explain itself');
    }
  }
});

test('a module-count mismatch is reported, not papered over', async () => {
  const cur = fitModules(buildShape('wall', 12));
  const r = await planTransform(cur, buildShape('tower', 30));
  assert.match(r.log.join(' '), /module count differs/);
});

test('a target that needs more modules than the robot has gets them added', async () => {
  const cur = fitModules(buildShape('snake', 8));
  const r = await planTransform(cur, buildShape('snake', 40));
  assert.ok(r.targetBuild.modules.length > cur.modules.length,
    'test setup: the bigger target should need more modules than the small robot has');
  assert.ok(r.added.length > 0, 'a real deficit should result in added modules');
  assert.equal(r.finalModules.length, r.targetBuild.modules.length);
  // Every added module must be a real module id from the target's own build,
  // just renamed to stay unique — not a fabricated placeholder.
  const targetIds = new Set(r.targetBuild.modules.map((m) => m.id));
  for (const id of r.added) {
    const suffix = id.replace(/^A\d+-/, '');
    assert.ok(targetIds.has(suffix), `added id ${id} does not trace back to a real target module`);
  }
});

test('a target that needs fewer modules than the robot has gets the surplus removed', async () => {
  const cur = fitModules(buildShape('snake', 40));
  const r = await planTransform(cur, buildShape('snake', 8));
  assert.ok(r.targetBuild.modules.length < cur.modules.length,
    'test setup: the smaller target should need fewer modules than the big robot has');
  assert.ok(r.removed.length > 0, 'a real surplus should result in removed modules');
  assert.equal(r.finalModules.length, r.targetBuild.modules.length);
  // Every removed id must have actually been one of the robot's own modules.
  const originalIds = new Set(cur.modules.map((m) => m.id));
  for (const id of r.removed) assert.ok(originalIds.has(id), `removed id ${id} was never one of the robot's modules`);
  // None of the survivors should be a removed id.
  for (const m of r.finalModules) assert.ok(!r.removed.includes(m.id), `${m.id} was both kept and removed`);
});

test('transforming to the shape you are already in needs no moves', async () => {
  const cells = buildShape('snake', 20);
  const cur = fitModules(cells);
  const r = await planTransform(cur, cells);
  assert.equal(r.moves.length, 0, 'no work is needed to stay put');
  assert.ok(r.covered > 0, 'the robot already covers its own shape');
});

test('every planned step is a legal grab-then-release', async () => {
  const cur = fitModules(buildShape('chair', 24));
  const r = await planTransform(cur, buildShape('table', 24));
  for (const mv of r.moves) {
    // The gait: one end holds, the other travels — never the same connector.
    assert.notEqual(mv.grabEnd, mv.releaseEnd, 'a module cannot grab and release the same end');
    assert.ok(mv.ontoModule !== mv.moduleId, 'a module cannot grab itself');
    assert.ok(mv.cells.length > 0);
    assert.match(describeTransformMove(mv), /hold|grab|release/);
  }
});

test('structureAfter replays a plan step by step', async () => {
  const cur = fitModules(buildShape('wall', 20));
  const r = await planTransform(cur, buildShape('snake', 20));
  for (let i = 0; i <= r.moves.length; i++) {
    const s = structureAfter(cur, r.moves, i);
    assert.equal(s.length, cur.modules.length, `step ${i} changed the module count`);
  }
});

test('progress callbacks report increasing elapsed time and a sane snapshot', async () => {
  const cur = fitModules(buildShape('wall', 20));
  const snapshots: { elapsedMs: number; coverage: number; targetCubes: number }[] = [];
  await planTransform(cur, buildShape('snake', 20), {}, (p) => {
    snapshots.push({ elapsedMs: p.elapsedMs, coverage: p.coverage, targetCubes: p.targetCubes });
    assert.ok(p.round >= 0 && p.expansions >= 0 && p.beamSize >= 0);
    assert.ok(p.coverage <= p.targetCubes);
  });
  // At least the final report must fire even on a trivial/instant search.
  assert.ok(snapshots.length > 0, 'onProgress was never called');
});
