/**
 * modulink.test.ts — the mod2 module model, and the claim that makes it different
 * from a cube: how many cubes a module fills depends on how it is folded.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  type ModuleAngles,
  ROD_ORDER, RODS_PER_MODULE, BIG_ROD_INDEX, MODULE_CHAIN_LENGTH,
  TWIST_ROD_LENGTH, BEND_ROD_LENGTH, BIG_ROD_LENGTH_SCALE, SEGMENT_GAP,
  HEMISPHERE_RADIUS, SIDE_CONNECTOR_RADIAL_OFFSET, ADJACENT_SIDE_FACES_CLASH,
  ADJACENT_SIDE_CLEARANCE,
  ZERO_ANGLES, rodLength, assertCanonicalRodOrder, moduleFrames, endPose,
  connectorPoses, adjacentSideEnds, oppositeSideEnd, sideWeldsAreLegal,
  clampAngle, spanOf, CONNECTOR_ENDS,
  type ChainWeld, weldTypeIsLegal, weldSetIsLegal, canReleaseEnd,
} from './modulink';
import {
  MODULINK_CUBE_SIZE, CUBES_PER_STRAIGHT_MODULE,
  poseOccupancy, poseLibrary, cubeRange, poseById, MODULINK_POSES, dilate,
} from './occupancy';
import { getModuleTheme, moduleCountEstimate, allModuleThemes, defaultPoseFor } from './moduleThemes';
import { configFromCells, isConnected, key } from './lattice';

const D = (deg: number) => (deg * Math.PI) / 180;

// ── structure ─────────────────────────────────────────────────────────────────

test('the rod alphabet is exactly TWIST·BEND·BEND·TWIST·BEND·TWIST', () => {
  assert.equal(RODS_PER_MODULE, 6);
  assert.deepEqual([...ROD_ORDER], ['twist', 'bend', 'bend', 'twist', 'bend', 'twist']);
  // The big rod is the twist flanked by BEND on both sides.
  assert.equal(ROD_ORDER[BIG_ROD_INDEX], 'twist');
  assert.equal(ROD_ORDER[BIG_ROD_INDEX - 1], 'bend');
  assert.equal(ROD_ORDER[BIG_ROD_INDEX + 1], 'bend');
});

test('assertCanonicalRodOrder rejects anything but the canonical order', () => {
  assert.doesNotThrow(() => assertCanonicalRodOrder(ROD_ORDER));
  assert.throws(() => assertCanonicalRodOrder(['bend', 'twist', 'bend', 'twist', 'bend', 'twist']));
  assert.throws(() => assertCanonicalRodOrder(['twist', 'bend']));
});

test('the big rod is twice the length of a normal twist rod', () => {
  assert.equal(rodLength(BIG_ROD_INDEX), TWIST_ROD_LENGTH * BIG_ROD_LENGTH_SCALE);
  assert.equal(rodLength(0), TWIST_ROD_LENGTH);
  assert.equal(rodLength(1), BEND_ROD_LENGTH);
});

test('MODULE_CHAIN_LENGTH matches the documented sum', () => {
  // 2*0.5 (twists) + 2*0.5 (big) + 3*0.55 (bends) + 7*0.02 (gaps) = 3.79
  const expected = 2 * TWIST_ROD_LENGTH
    + TWIST_ROD_LENGTH * BIG_ROD_LENGTH_SCALE
    + 3 * BEND_ROD_LENGTH
    + 7 * SEGMENT_GAP;
  assert.ok(Math.abs(MODULE_CHAIN_LENGTH - expected) < 1e-12);
  assert.ok(Math.abs(MODULE_CHAIN_LENGTH - 3.79) < 1e-9, `got ${MODULE_CHAIN_LENGTH}`);
});

test('a straight module spans its full chain length; folding shortens it', () => {
  assert.ok(Math.abs(spanOf(ZERO_ANGLES) - MODULE_CHAIN_LENGTH) < 1e-9);
  const coil = poseById('coil')!.angles;
  assert.ok(spanOf(coil) < spanOf(ZERO_ANGLES), 'a coiled module must not reach as far as a straight one');
});

// ── joints ────────────────────────────────────────────────────────────────────

test('BEND clamps to +/-90 degrees, TWIST wraps through a full turn', () => {
  assert.ok(Math.abs(clampAngle(1, D(180)) - D(90)) < 1e-9, 'bend must clamp');
  assert.ok(Math.abs(clampAngle(1, -D(180)) + D(90)) < 1e-9, 'bend must clamp negative');
  // index 0 is a twist: 450° wraps to 90°, it does not clamp.
  assert.ok(Math.abs(clampAngle(0, D(450)) - D(90)) < 1e-9, 'twist must wrap');
});

test('forward kinematics produces one frame per rod, end to end', () => {
  const frames = moduleFrames(ZERO_ANGLES);
  assert.equal(frames.length, RODS_PER_MODULE);
  for (let i = 0; i < frames.length; i++) {
    assert.equal(frames[i].kind, ROD_ORDER[i]);
    assert.equal(frames[i].length, rodLength(i));
  }
});

test('a straight module runs along one axis and ends at its chain length', () => {
  const e = endPose(ZERO_ANGLES).position;
  // FLIP_X_180 sends the chain down -Z; magnitude is what matters here.
  assert.ok(Math.abs(Math.abs(e[2]) - MODULE_CHAIN_LENGTH) < 1e-9, `end at ${e}`);
  assert.ok(Math.abs(e[0]) < 1e-9 && Math.abs(e[1]) < 1e-9, 'a straight module must not drift off-axis');
});

// ── connectors ────────────────────────────────────────────────────────────────

test('a module has exactly six lock faces', () => {
  const cs = connectorPoses(ZERO_ANGLES);
  assert.equal(cs.length, 6);
  assert.deepEqual(cs.map((c) => c.end).sort(), [...CONNECTOR_ENDS].sort());
});

test('A and B face opposite ways along a straight chain', () => {
  const cs = connectorPoses(ZERO_ANGLES);
  const a = cs.find((c) => c.end === 'A')!;
  const b = cs.find((c) => c.end === 'B')!;
  const dot = a.normal[0] * b.normal[0] + a.normal[1] * b.normal[1] + a.normal[2] * b.normal[2];
  assert.ok(dot < -0.999, `A and B normals should oppose, dot = ${dot}`);
});

test('side connectors ride the big rod midpoint at the radial offset', () => {
  const cs = connectorPoses(ZERO_ANGLES);
  const frames = moduleFrames(ZERO_ANGLES);
  const big = frames[BIG_ROD_INDEX];
  const mid: [number, number, number] = [
    (big.start.position[0] + big.end.position[0]) / 2,
    (big.start.position[1] + big.end.position[1]) / 2,
    (big.start.position[2] + big.end.position[2]) / 2,
  ];
  for (const end of ['UP', 'RIGHT', 'DOWN', 'LEFT'] as const) {
    const c = cs.find((x) => x.end === end)!;
    const d = Math.hypot(c.position[0] - mid[0], c.position[1] - mid[1], c.position[2] - mid[2]);
    assert.ok(
      Math.abs(d - SIDE_CONNECTOR_RADIAL_OFFSET) < 1e-9,
      `${end} sits ${d} from the big rod midpoint, expected ${SIDE_CONNECTOR_RADIAL_OFFSET}`,
    );
  }
});

test('adjacent side faces clash at this geometry, so only opposite pairs may weld', () => {
  assert.equal(ADJACENT_SIDE_FACES_CLASH, true);
  // The source spec says these sit "0.6*sqrt(2) ~= 0.707" apart. That is stale
  // arithmetic — 0.6*sqrt(2) is 0.8485; 0.707 is 0.5*sqrt(2). Against the 0.84
  // dome requirement the true margin is about 1%, i.e. nothing, which is why the
  // clash test carries an explicit tolerance instead of a bare inequality.
  const sep = SIDE_CONNECTOR_RADIAL_OFFSET * Math.SQRT2;
  assert.ok(Math.abs(sep - 0.8485) < 1e-3, `separation is ${sep}, not the spec's 0.707`);
  assert.ok(Math.abs(ADJACENT_SIDE_CLEARANCE) < 0.02 * (2 * HEMISPHERE_RADIUS),
    'the adjacent-face margin is within tolerance of zero — treat as clashing');

  assert.deepEqual(adjacentSideEnds('UP').sort(), ['LEFT', 'RIGHT']);
  assert.deepEqual(adjacentSideEnds('RIGHT').sort(), ['DOWN', 'UP']);
  assert.deepEqual(adjacentSideEnds('A'), []);
  assert.equal(oppositeSideEnd('UP'), 'DOWN');
  assert.equal(oppositeSideEnd('A'), null);
});

test('side weld legality: at most two, and they must be opposite', () => {
  assert.equal(sideWeldsAreLegal(['UP']), true);
  assert.equal(sideWeldsAreLegal(['UP', 'DOWN']), true);
  assert.equal(sideWeldsAreLegal(['LEFT', 'RIGHT']), true);
  assert.equal(sideWeldsAreLegal(['UP', 'RIGHT']), false, 'adjacent side welds must be rejected');
  assert.equal(sideWeldsAreLegal(['UP', 'DOWN', 'LEFT']), false, 'three side welds must be rejected');
  // A and B are on the chain axis and never count against the side budget.
  assert.equal(sideWeldsAreLegal(['A', 'B', 'UP', 'DOWN']), true);
});

// ── the locomotion gait's weld rules ─────────────────────────────────────────

test('side-to-side welds are impossible; end-to-end and end-to-side are fine', () => {
  assert.equal(weldTypeIsLegal('A', 'B'), true, 'end to end');
  assert.equal(weldTypeIsLegal('B', 'UP'), true, 'a free end grabbing a flank');
  assert.equal(weldTypeIsLegal('UP', 'A'), true, 'same weld from the other side');
  assert.equal(weldTypeIsLegal('UP', 'DOWN'), false, 'side to side must never be legal');
  assert.equal(weldTypeIsLegal('LEFT', 'RIGHT'), false);
  // Every legal weld therefore contains at least one end connector.
  for (const a of CONNECTOR_ENDS) {
    for (const b of CONNECTOR_ENDS) {
      if (!weldTypeIsLegal(a, b)) continue;
      assert.ok(a === 'A' || a === 'B' || b === 'A' || b === 'B',
        `${a}<->${b} was allowed but has no end connector in it`);
    }
  }
});

test('a weld set is rejected for side-to-side or for adjacent side faces', () => {
  assert.equal(weldSetIsLegal([{ own: 'A', toModuleId: 'm1', toEnd: 'UP' }]).ok, true);
  assert.equal(weldSetIsLegal([
    { own: 'A', toModuleId: 'm1', toEnd: 'B' },
    { own: 'B', toModuleId: 'm2', toEnd: 'LEFT' },
  ]).ok, true, 'both ends welded, one to a flank');

  const sideToSide = weldSetIsLegal([{ own: 'UP', toModuleId: 'm1', toEnd: 'DOWN' }]);
  assert.equal(sideToSide.ok, false);
  assert.match(sideToSide.reason, /side-to-side/);

  const adjacent = weldSetIsLegal([
    { own: 'UP', toModuleId: 'm1', toEnd: 'A' },
    { own: 'RIGHT', toModuleId: 'm2', toEnd: 'B' },
  ]);
  assert.equal(adjacent.ok, false, 'adjacent side faces cannot both carry a weld');
  assert.match(adjacent.reason, /opposite/);

  // Opposite side faces are fine, and so is adding both ends on top.
  assert.equal(weldSetIsLegal([
    { own: 'UP', toModuleId: 'm1', toEnd: 'A' },
    { own: 'DOWN', toModuleId: 'm2', toEnd: 'B' },
    { own: 'A', toModuleId: 'm3', toEnd: 'B' },
  ]).ok, true);
});

test('a module may never release its last weld — grab first, then let go', () => {
  const only: ChainWeld[] = [{ own: 'A', toModuleId: 'm1', toEnd: 'UP' }];
  const lastOne = canReleaseEnd(only, 'A');
  assert.equal(lastOne.ok, false, 'releasing the only weld would drop the module out of the structure');
  assert.match(lastOne.reason, /Grab the next connector first/);

  // After the free end has grabbed the next target, the old anchor may release.
  const bothHeld: ChainWeld[] = [
    { own: 'A', toModuleId: 'm1', toEnd: 'UP' },
    { own: 'B', toModuleId: 'm2', toEnd: 'LEFT' },
  ];
  assert.equal(canReleaseEnd(bothHeld, 'A').ok, true, 'this is step 4 of the gait');
  assert.equal(canReleaseEnd(bothHeld, 'B').ok, true);

  assert.equal(canReleaseEnd(bothHeld, 'UP').ok, false, 'UP is not welded here');
});

// ── the headline claim: cubes per module varies with pose ────────────────────

test('a fully extended module is worth exactly four cubes', () => {
  const occ = poseOccupancy(ZERO_ANGLES);
  assert.equal(occ.cubes, CUBES_PER_STRAIGHT_MODULE,
    `straight module reached ${occ.cubes} cubes, expected ${CUBES_PER_STRAIGHT_MODULE}`);
});

test('folding a module strictly reduces how many cubes it is worth', () => {
  const straight = poseOccupancy(poseById('straight')!.angles).cubes;
  const coil = poseOccupancy(poseById('coil')!.angles).cubes;
  assert.ok(coil < straight, `coil reached ${coil} cubes, straight reached ${straight} — folding must cost reach`);
  assert.ok(coil >= 1, 'a module is always worth at least one cube');
});

test('the pose library covers the full 4-down-to-1 range', () => {
  const [min, max] = cubeRange();
  assert.equal(max, 4, `most extended pose should be worth 4 cubes, got ${max}`);
  assert.equal(min, 1, `most folded pose should be worth 1 cube, got ${min}`);
  // 3 and 2 must both be reachable too, or the range is a gap not a scale.
  const counts = new Set(poseLibrary().map((p) => p.cubes));
  for (const n of [1, 2, 3, 4]) assert.ok(counts.has(n), `no pose is worth ${n} cubes`);
});

test('reach falls monotonically as the poses fold up', () => {
  const counts = poseLibrary().map((p) => p.cubes);
  for (let i = 1; i < counts.length; i++) {
    assert.ok(counts[i] <= counts[i - 1],
      `pose ${MODULINK_POSES[i].id} is worth ${counts[i]} cubes, more than the previous ${counts[i - 1]}`);
  }
});

test('body sweep is tracked separately and may exceed reach', () => {
  // A bent chain snakes diagonally and can clip MORE cubes than a straight one
  // even while reaching less far. Conflating the two would make a folded module
  // look bigger than an extended one, which is backwards — hence two numbers.
  for (const p of poseLibrary()) {
    assert.ok(p.sweptCount >= 1, `${p.id} sweeps no cubes`);
    assert.equal(p.sweptCells.length, p.sweptCount);
    // The centreline is continuous, so the cubes it passes through form one piece.
    assert.equal(isConnected(configFromCells(p.sweptCells)), true, `${p.id} sweep is disconnected`);
    assert.equal(key(p.sweptCells[0]), key([0, 0, 0]), `${p.id} sweep is not normalised`);
  }
  const coil = poseLibrary().find((p) => p.id === 'coil')!;
  assert.ok(coil.sweptCount > coil.cubes,
    'the coil pose is the case that proves the two numbers are different questions');
});

test('cube size is pinned so a straight module is exactly four cubes long', () => {
  assert.ok(Math.abs(MODULINK_CUBE_SIZE * CUBES_PER_STRAIGHT_MODULE - MODULE_CHAIN_LENGTH) < 1e-12);
});

test('dilate grows a footprint without disconnecting it', () => {
  const straight = poseOccupancy(ZERO_ANGLES).sweptCells;
  const grown = dilate(straight, 1);
  assert.ok(grown.length > straight.length);
  assert.equal(isConnected(configFromCells(grown)), true);
});

test('a bent module reaches less far than a straight one', () => {
  const elbow = poseById('elbow')!.angles as ModuleAngles;
  assert.ok(spanOf(elbow) < spanOf(ZERO_ANGLES));
});

// ── themes ────────────────────────────────────────────────────────────────────

test('both themes exist and disagree about cubes per module', () => {
  const themes = allModuleThemes();
  assert.equal(themes.length, 2);

  const mod1 = getModuleTheme('mod1');
  assert.equal(mod1.singleCube, true);
  assert.deepEqual(mod1.cubeRange, [1, 1]);
  assert.equal(mod1.plannerIsExact, true, 'the cube planner is exactly correct for mod1');

  const mod2 = getModuleTheme('mod2');
  assert.equal(mod2.singleCube, false);
  assert.deepEqual(mod2.cubeRange, [1, 4]);
  assert.equal(mod2.dof, RODS_PER_MODULE);
  assert.equal(mod2.plannerIsExact, false, 'mod2 must declare the planner is only approximate for it');
});

test('mod2 surfaces the adjacent-side-connector clash as a constraint', () => {
  const mod2 = getModuleTheme('mod2');
  assert.ok(mod2.constraints.some((c) => /opposite/i.test(c) && /side/i.test(c)),
    'the two-opposite-side-welds rule must be surfaced');
});

test('module count from cube count is exact for mod1 and a range for mod2', () => {
  const a = moduleCountEstimate('mod1', 12);
  assert.equal(a.exact, true);
  assert.equal(a.min, 12);
  assert.equal(a.max, 12);

  const b = moduleCountEstimate('mod2', 12);
  assert.equal(b.exact, false);
  assert.equal(b.min, 3, '12 cubes at 4 cubes/module = 3 modules minimum');
  assert.equal(b.max, 12, '12 cubes at 1 cube/module = 12 modules maximum');
});

test('each theme names a default pose that exists in its own library', () => {
  for (const id of ['mod1', 'mod2'] as const) {
    const theme = getModuleTheme(id);
    const poseId = defaultPoseFor(id);
    assert.ok(theme.poses.some((p) => p.id === poseId), `${id} default pose ${poseId} is not in its library`);
  }
});
