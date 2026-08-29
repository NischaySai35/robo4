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

import { type Cell, key } from './lattice';
import { fitModules, connectorsOf, weldChains } from './fitModules';
import { planTransform, mobilityReport, structureAfter, describeTransformMove, oneStepMoves } from './transform';
import { buildShape } from './shapes';
import { weldTypeIsLegal } from './modulink';

const line = (n: number): Cell[] => Array.from({ length: n }, (_, i) => [i, 0, 0] as Cell);

// ── chain welding ─────────────────────────────────────────────────────────────

test('growing chains off existing connectors gives one connected robot', () => {
  // Chains are started ON a free connector wherever possible, so they are welded
  // on from their first module rather than floating. That makes one piece the
  // normal outcome — but it is not guaranteed: if nothing already built can reach
  // the remaining cubes, a detached chain is the only way to cover them.
  let oneP = 0;
  const ids = ['chair', 'car', 'snake', 'humanoid', 'table'] as const;
  for (const id of ids) {
    const r = fitModules(buildShape(id, 28));
    assert.ok(r.modules.length > 0, `${id}: nothing built`);
    if (r.components === 1) oneP++;
    else {
      // A robot in pieces must say so — silently returning fragments as if they
      // were one machine is the failure worth guarding against.
      assert.match(r.log.join(' '), /unattached|reach those cubes/,
        `${id}: left ${r.components} pieces without reporting it`);
    }
  }
  // Measured baseline, not an aspiration: at this cube count 2 of these 5 shapes
  // come out as a single piece. Whether a chain can be started on an existing
  // connector depends on whether any fold reaches the remaining cubes from one,
  // which varies with the shape and how many cubes it was generated at. The bar
  // guards against regression; raise it when the fit genuinely improves.
  assert.ok(oneP >= 2,
    `only ${oneP} of ${ids.length} shapes built as one piece — chain joining regressed`);
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
  // check — every module in it turned out to be load-bearing. Table@20 is
  // used here instead because it genuinely keeps a positive floor, which is
  // the only kind of floor worth asserting.
  const build = fitModules(buildShape('table', 20));
  const m = mobilityReport(build);
  assert.ok(m.total >= 1,
    `table mobility dropped to ${m.total}, below the measured floor of 1`);

  // Still genuinely constrained — a compact robot cannot freely rearrange, and
  // claiming otherwise would be the opposite failure.
  assert.ok(m.total < build.modules.length * 6,
    `mobility jumped to ${m.total}, which is implausibly high — verify before raising this`);
});

test('a longer, less dense structure is more mobile than a compact one', () => {
  // Sanity on the metric itself: mobility should track how much room the modules
  // actually have, not be a constant the implementation happens to produce.
  const snake = mobilityReport(fitModules(buildShape('snake', 24)));
  const tower = mobilityReport(fitModules(buildShape('tower', 20)));
  assert.ok(snake.total >= tower.total,
    `a snake (${snake.total}) should not be less mobile than a tower (${tower.total})`);
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

test('every module of a finished plan is reachable from every other — one piece, not several', async () => {
  for (const [from, to] of [['car', 'humanoid'], ['chair', 'table'], ['snake', 'wall']] as const) {
    const cur = fitModules(buildShape(from, 20));
    const r = await planTransform(cur, buildShape(to, 20));
    const mods = r.finalModules;
    if (mods.length <= 1) continue;

    // Real weld adjacency among the FINAL modules — the same geometric
    // coincidence check the planner itself uses, applied independently here
    // as a check on the OUTPUT rather than trusted from how it was produced.
    const byCell = new Map<string, { id: string; dir: Cell }[]>();
    for (const m of mods) for (const c of connectorsOf(m)) {
      const k = key(c.cell);
      const list = byCell.get(k);
      const entry = { id: m.id, dir: c.dir };
      if (list) list.push(entry); else byCell.set(k, [entry]);
    }
    const adj = new Map<string, Set<string>>(mods.map((m) => [m.id, new Set<string>()]));
    for (const entries of byCell.values()) {
      for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i]; const b = entries[j];
        if (a.id === b.id) continue;
        if (a.dir[0] === -b.dir[0] && a.dir[1] === -b.dir[1] && a.dir[2] === -b.dir[2]) {
          adj.get(a.id)!.add(b.id); adj.get(b.id)!.add(a.id);
        }
      }
    }
    const seen = new Set<string>([mods[0].id]);
    const queue = [mods[0].id];
    while (queue.length) {
      const cur2 = queue.shift() as string;
      for (const n of adj.get(cur2) ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
    assert.equal(seen.size, mods.length,
      `${from} -> ${to}: final structure is in ${mods.length - seen.size + 1}+ piece(s), `
      + `not one — ${mods.map((m) => m.id).filter((id) => !seen.has(id)).join(', ')} unreachable from the rest`);
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
