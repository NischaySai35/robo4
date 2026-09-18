/**
 * manualBuild.test.ts — structures placed by hand.
 *
 * The load-bearing test is the first one. A hand-placed module is welded to a
 * connector of the one before it, and "welded" means exactly what it means
 * everywhere else in this folder: the two domes at the SAME point in space with
 * opposed normals — the sphere rule. If that is even slightly off, every
 * structure built in the Compose tab is a lie, and it is a lie that looks fine
 * on screen right up until it is used to argue about what the fitter should do.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { connectorPoses } from './modulink';
import { MODULINK_CUBE_SIZE } from './occupancy';
import { key } from './lattice';
import {
  ALL_ENDS, JOINTS, STRAIGHT,
  addRoot, attachTo, setAngle, setRoll, removeModule, emptyManual,
  placeManual, manualToFitted, manualCells, checkManual,
  manualToJSON, manualFromJSON,
} from './manualBuild';

const S = 1 / MODULINK_CUBE_SIZE;

/** Every connector of a placed module, in world cube units. */
function worldConnectors(p: ReturnType<typeof placeManual>[number]) {
  return connectorPoses(p.module.angles, { position: [0, 0, 0], quaternion: p.quaternion })
    .map((c) => ({
      end: c.end,
      pos: [
        p.anchorPos[0] + c.position[0] * S,
        p.anchorPos[1] + c.position[1] * S,
        p.anchorPos[2] + c.position[2] * S,
      ] as [number, number, number],
      normal: c.normal,
    }));
}

test('a hand-attached module welds EXACTLY — same point, opposed normals', () => {
  // Every connector, every roll, and a bent parent as well as a straight one:
  // the whole point is that this holds for arbitrary hand-set joints, not just
  // the tidy lattice-aligned cases the fitter happens to produce.
  for (const parentAngles of [
    STRAIGHT,
    [0, Math.PI / 6, -Math.PI / 4, Math.PI / 2, Math.PI / 3, 0],
  ] as const) {
    for (const end of ALL_ENDS) {
      for (const roll of [0, 1, 2, 3] as const) {
        let build = addRoot(emptyManual());
        const rootId = build.modules[0].id;
        for (const [i, a] of parentAngles.entries()) build = setAngle(build, rootId, i, a);
        build = attachTo(build, rootId, end, roll);

        const placed = placeManual(build);
        assert.equal(placed.length, 2, `${end}/roll${roll}: both modules should place`);
        const parent = placed.find((p) => p.module.id === rootId)!;
        const child = placed.find((p) => p.module.id !== rootId)!;

        const host = worldConnectors(parent).find((c) => c.end === end)!;
        const a = worldConnectors(child).find((c) => c.end === 'A')!;

        const gap = Math.hypot(
          a.pos[0] - host.pos[0], a.pos[1] - host.pos[1], a.pos[2] - host.pos[2],
        );
        assert.ok(gap < 1e-9,
          `${end}/roll${roll}: child's A sits ${gap.toFixed(6)} cubes from the connector it welds to`);

        const dot = a.normal[0] * host.normal[0]
          + a.normal[1] * host.normal[1]
          + a.normal[2] * host.normal[2];
        assert.ok(dot < -1 + 1e-9,
          `${end}/roll${roll}: normals are not opposed (dot ${dot.toFixed(6)}, want -1)`);
      }
    }
  }
});

test('roll turns the child about the lock without moving the weld', () => {
  // A connector is four-fold symmetric, so all four rolls are legal seatings of
  // the same weld: the joint must not move, only what hangs off it.
  let build = addRoot(emptyManual());
  const rootId = build.modules[0].id;
  build = attachTo(build, rootId, 'B', 0);
  const childId = build.modules[1].id;
  // Bend the child so its far end actually swings when rolled — a straight
  // child is symmetric about its own axis and would pass this trivially.
  build = setAngle(build, childId, 1, Math.PI / 3);

  const farEnd = (b: typeof build) => {
    const child = placeManual(b).find((p) => p.module.id === childId)!;
    return worldConnectors(child).find((c) => c.end === 'B')!.pos;
  };
  const anchorOf = (b: typeof build) => placeManual(b)
    .find((p) => p.module.id === childId)!.anchorPos;

  const before = farEnd(build);
  const anchorBefore = anchorOf(build);
  const rolled = setRoll(build, childId, 2);
  const after = farEnd(rolled);
  const anchorAfter = anchorOf(rolled);

  const moved = Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]);
  assert.ok(moved > 0.5, `rolling should swing the child's far end, moved only ${moved.toFixed(3)}`);
  const anchorMoved = Math.hypot(
    anchorAfter[0] - anchorBefore[0],
    anchorAfter[1] - anchorBefore[1],
    anchorAfter[2] - anchorBefore[2],
  );
  assert.ok(anchorMoved < 1e-9, 'rolling moved the weld itself, which it must never do');
});

test('deleting a module takes everything hanging off it', () => {
  // Nothing may be left floating with a parent that no longer exists.
  let build = addRoot(emptyManual());
  const a = build.modules[0].id;
  build = attachTo(build, a, 'B');
  const b = build.modules[1].id;
  build = attachTo(build, b, 'B');
  build = attachTo(build, a, 'UP');
  assert.equal(build.modules.length, 4);

  const pruned = removeModule(build, b);
  assert.equal(pruned.modules.length, 2, 'the child of the deleted module should go too');
  for (const m of pruned.modules) {
    if (!m.attach) continue;
    assert.ok(pruned.modules.some((x) => x.id === m.attach!.parentId),
      `${m.id} is left hanging off ${m.attach.parentId}, which is gone`);
  }
});

test('a module whose parent vanished is skipped, not guessed at', () => {
  // placeManual is called on every render; an inconsistent tree must not throw
  // and must not invent a position.
  const build = {
    nextId: 2,
    modules: [
      { id: 'H1', angles: [...STRAIGHT] as typeof STRAIGHT, attach: { parentId: 'GONE', end: 'B' as const, roll: 0 as const }, rootCell: [0, 0, 0] as [number, number, number], rootDir: [0, 0, 1] as [number, number, number] },
    ],
  };
  assert.deepEqual(placeManual(build), []);
  assert.deepEqual(manualToFitted(build), []);
});

test('a cycle cannot hang the placer', () => {
  const build = {
    nextId: 2,
    modules: [
      { id: 'H0', angles: [...STRAIGHT] as typeof STRAIGHT, attach: { parentId: 'H1', end: 'B' as const, roll: 0 as const }, rootCell: [0, 0, 0] as [number, number, number], rootDir: [0, 0, 1] as [number, number, number] },
      { id: 'H1', angles: [...STRAIGHT] as typeof STRAIGHT, attach: { parentId: 'H0', end: 'B' as const, roll: 0 as const }, rootCell: [0, 0, 0] as [number, number, number], rootDir: [0, 0, 1] as [number, number, number] },
    ],
  };
  assert.deepEqual(placeManual(build), [], 'a cycle should place nothing rather than spin');
});

test('a straight chain of hand-placed modules reads as a straight line of cubes', () => {
  // The sanity check that the whole coordinate conversion is right: three
  // straight modules welded end to end should lie along one lattice axis.
  let build = addRoot(emptyManual());
  for (let i = 0; i < 2; i++) build = attachTo(build, build.modules[build.modules.length - 1].id, 'B');

  const cells = manualCells(build);
  assert.ok(cells.length >= 12, `expected a long run of cubes, got ${cells.length}`);
  const varying = [0, 1, 2].filter((ax) => new Set(cells.map((c) => c[ax])).size > 1);
  assert.deepEqual(varying, [2], `a straight chain should vary on one axis only, varies on ${varying}`);
});

test('it is drawn, not judged — collisions and over-bends are notes, never refusals', () => {
  // Fold a module hard back on itself. The fitter would reject this outright;
  // here it must still place, still draw, and simply say so.
  let build = addRoot(emptyManual());
  const id = build.modules[0].id;
  build = setAngle(build, id, 1, Math.PI / 2);
  build = setAngle(build, id, 2, Math.PI / 2);
  build = setAngle(build, id, 4, Math.PI / 2);
  assert.equal(placeManual(build).length, 1, 'a folded module must still be placed');
  assert.equal(manualToFitted(build).length, 1, 'a folded module must still be drawable');

  // And a joint past its limit is reported rather than clamped away.
  const past = setAngle(build, id, 1, Math.PI); // 180 degrees, well past +-90
  const notes = checkManual(past);
  assert.ok(notes.some((n) => n.text.includes('limit')),
    `expected a note about the joint limit, got ${JSON.stringify(notes)}`);
  assert.equal(placeManual(past).length, 1, 'an over-bent module must still be placed');
});

test('saving and loading returns the same structure', () => {
  let build = addRoot(emptyManual());
  const a = build.modules[0].id;
  build = setAngle(build, a, 1, Math.PI / 4);
  build = attachTo(build, a, 'RIGHT', 3);
  build = setAngle(build, build.modules[1].id, 4, -Math.PI / 6);

  const back = manualFromJSON(manualToJSON(build));
  assert.equal(back.modules.length, build.modules.length);
  const placedA = placeManual(build);
  const placedB = placeManual(back);
  for (let i = 0; i < placedA.length; i++) {
    for (let k = 0; k < 3; k++) {
      assert.ok(Math.abs(placedA[i].anchorPos[k] - placedB[i].anchorPos[k]) < 1e-6,
        'a saved structure came back in a different place');
    }
  }
  assert.deepEqual(
    manualCells(back).map(key).sort(),
    manualCells(build).map(key).sort(),
  );
});

test('loading something that is not a hand-built structure fails clearly', () => {
  assert.throws(() => manualFromJSON('{"kind":"tetrobot.msrr.shape","cells":[]}'), /not a hand-built/);
});

test('the joint list matches the module the hardware actually has', () => {
  assert.equal(JOINTS.length, STRAIGHT.length);
  assert.deepEqual(JOINTS.map((j) => j.kind), ['twist', 'bend', 'bend', 'twist', 'bend', 'twist']);
  assert.equal(ALL_ENDS.length, 6, 'two ends and four sides');
});
