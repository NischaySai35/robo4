/**
 * modulink.test.ts — the TETROBOT module (try8) model, and the claim that makes it
 * different from a cube: how many cubes a module fills depends on how it is folded.
 *
 * The kinematics are cross-checked against the Studio's own forward kinematics of
 * the default module document (core/factory/single-module-demo.json), which is
 * what the Editor shows. If the two ever disagree, one of them is wrong.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type ModuleAngles,
  ROD_ORDER, RODS_PER_MODULE, SPINE_ROD_INDICES, PREFIX_LENGTH, MODULE_CHAIN_LENGTH, UNITS_PER_M,
  HEMISPHERE_RADIUS, SIDE_CONNECTOR_RADIAL_OFFSET, SIDE_ALONG_ROD, REQUIRED_DOME_CLEARANCE,
  SPINE_SIDE_SEPARATION, TWIST_LIMIT, BEND_LIMIT, LOCK_LIMIT, JOINT_NAMES, CONNECTOR_IDS,
  ZERO_ANGLES, rodLength, assertCanonicalRodOrder, moduleFrames, endPose,
  connectorPoses, adjacentSideEnds, oppositeSideEnd, spineOf, sideWeldsAreLegal,
  connectorsMayShareBody, clampAngle, spanOf, CONNECTOR_ENDS, SIDE_ENDS, isSideEnd,
  type ChainWeld, type ConnectorEnd, weldTypeIsLegal, weldSetIsLegal, canReleaseEnd,
} from './modulink';
import {
  MODULINK_CUBE_SIZE, CUBES_PER_STRAIGHT_MODULE,
  poseOccupancy, poseLibrary, cubeRange, poseById, MODULINK_POSES, dilate,
} from './occupancy';
import { getModuleTheme, moduleCountEstimate, allModuleThemes, defaultPoseFor } from './moduleThemes';
import { configFromCells, isConnected, key, type Cell } from './lattice';
import { computeFKGraph } from '@/kinematics/modelFK';
import { getConnectorWorld } from '@/assembly/connectorSnap';

const D = (deg: number) => (deg * Math.PI) / 180;
const here = path.dirname(fileURLToPath(import.meta.url));

// ── structure ─────────────────────────────────────────────────────────────────

test('the joint alphabet is exactly T1 B1 B2 T2 B3 B4 T3 (7 DOF)', () => {
  assert.equal(RODS_PER_MODULE, 7);
  assert.deepEqual([...ROD_ORDER], ['twist', 'bend', 'bend', 'twist', 'bend', 'bend', 'twist']);
  assert.deepEqual([...JOINT_NAMES], ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']);
  // Each spine is the body between the two bends of a pair.
  assert.deepEqual([...SPINE_ROD_INDICES], [1, 4]);
  for (const i of SPINE_ROD_INDICES) {
    assert.equal(ROD_ORDER[i], 'bend');
    assert.equal(ROD_ORDER[i + 1], 'bend', 'a spine runs from one bend to the next');
  }
});

test('assertCanonicalRodOrder rejects anything but the canonical order', () => {
  assert.doesNotThrow(() => assertCanonicalRodOrder(ROD_ORDER));
  assert.throws(() => assertCanonicalRodOrder(['bend', 'twist', 'bend', 'twist', 'bend', 'twist', 'bend']));
  assert.throws(() => assertCanonicalRodOrder(['twist', 'bend']));
  // The discarded 6-DOF module must not pass for this one.
  assert.throws(() => assertCanonicalRodOrder(['twist', 'bend', 'bend', 'twist', 'bend', 'twist']));
});

test('the two halves of the module match: A-T1-B1-B2 mirrors B-T3-B4-B3', () => {
  // prefix (A -> T1) = last rod (T3 -> B), T1->B1 = B4->T3, and the two spines are
  // the same part. The middle (B2 -> T2 -> B3) is NOT symmetric: T2 sits right
  // next to B3 (the T2 housing and its ring are different parts).
  const tol = 1e-4 * UNITS_PER_M;
  assert.ok(Math.abs(PREFIX_LENGTH - rodLength(6)) < tol);
  assert.ok(Math.abs(rodLength(0) - rodLength(5)) < tol);
  assert.ok(Math.abs(rodLength(1) - rodLength(4)) < tol);
});

test('connector-to-connector length matches the module spec (0.687 m)', () => {
  const spec = JSON.parse(fs.readFileSync(
    path.resolve(here, '../../../../assets/tetrobot-module/module_spec.json'), 'utf-8'));
  const metres = MODULE_CHAIN_LENGTH / UNITS_PER_M;
  assert.ok(Math.abs(metres - spec.end_to_end_pad_tip_m) < 0.0005,
    `chain is ${metres} m, the spec says ${spec.end_to_end_pad_tip_m} m`);
});

test('a straight module spans its full chain length; folding shortens it', () => {
  assert.ok(Math.abs(spanOf(ZERO_ANGLES) - MODULE_CHAIN_LENGTH) < 1e-9);
  const coil = poseById('coil')!.angles;
  assert.ok(spanOf(coil) < spanOf(ZERO_ANGLES), 'a coiled module must not reach as far as a straight one');
});

// ── joints ────────────────────────────────────────────────────────────────────

test('limits: twist +-180, bend +-90, lock +-45 degrees', () => {
  assert.ok(Math.abs(TWIST_LIMIT[1] - Math.PI) < 1e-12 && Math.abs(TWIST_LIMIT[0] + Math.PI) < 1e-12);
  assert.ok(Math.abs(BEND_LIMIT[1] - D(90)) < 1e-12 && Math.abs(BEND_LIMIT[0] + D(90)) < 1e-12);
  assert.ok(Math.abs(LOCK_LIMIT[1] - D(45)) < 1e-12 && Math.abs(LOCK_LIMIT[0] + D(45)) < 1e-12);
});

test('BEND clamps to +/-90 degrees, TWIST wraps through a full turn', () => {
  assert.ok(Math.abs(clampAngle(1, D(180)) - D(90)) < 1e-9, 'bend must clamp');
  assert.ok(Math.abs(clampAngle(1, -D(180)) + D(90)) < 1e-9, 'bend must clamp negative');
  assert.ok(Math.abs(clampAngle(1, D(95)) - D(90)) < 1e-9, '95 is past the limit and clamps to 90');
  // index 0 is a twist: 270 deg is the same pose as -90, it does not clamp.
  assert.ok(Math.abs(clampAngle(0, D(270)) + D(90)) < 1e-9, 'twist must wrap');
  assert.ok(Math.abs(clampAngle(0, D(170)) - D(170)) < 1e-9, 'twist inside +-180 is untouched');
});

test('forward kinematics produces one frame per joint, end to end', () => {
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

test('a module has exactly six connectors: two ends and four side receivers', () => {
  const cs = connectorPoses(ZERO_ANGLES);
  assert.equal(cs.length, 6);
  assert.deepEqual(cs.map((c) => c.end).sort(), [...CONNECTOR_ENDS].sort());
  assert.deepEqual([...SIDE_ENDS], ['S1A', 'S1B', 'S2A', 'S2B']);
  assert.deepEqual(CONNECTOR_ENDS.map((e) => CONNECTOR_IDS[e]),
    ['conn-endA', 'conn-endB', 'conn-s1a', 'conn-s1b', 'conn-s2a', 'conn-s2b']);
  assert.equal(spineOf('S1A'), 1);
  assert.equal(spineOf('S2B'), 2);
  assert.equal(spineOf('A'), null);
});

test('A and B face opposite ways along a straight chain', () => {
  const cs = connectorPoses(ZERO_ANGLES);
  const a = cs.find((c) => c.end === 'A')!;
  const b = cs.find((c) => c.end === 'B')!;
  const dot = a.normal[0] * b.normal[0] + a.normal[1] * b.normal[1] + a.normal[2] * b.normal[2];
  assert.ok(dot < -0.999, `A and B normals should oppose, dot = ${dot}`);
});

test('the two receivers of a spine sit at its midpoint, on opposite faces, at the radial offset', () => {
  const cs = connectorPoses(ZERO_ANGLES);
  const frames = moduleFrames(ZERO_ANGLES);
  for (const [spineRod, pair] of [[SPINE_ROD_INDICES[0], ['S1A', 'S1B']], [SPINE_ROD_INDICES[1], ['S2A', 'S2B']]] as const) {
    const f = frames[spineRod];
    const mid = [
      (f.start.position[0] + f.end.position[0]) / 2,
      (f.start.position[1] + f.end.position[1]) / 2,
      (f.start.position[2] + f.end.position[2]) / 2,
    ];
    const [a, b] = pair.map((e) => cs.find((x) => x.end === e)!);
    for (const c of [a, b]) {
      const d = Math.hypot(c.position[0] - mid[0], c.position[1] - mid[1], c.position[2] - mid[2]);
      assert.ok(Math.abs(d - SIDE_CONNECTOR_RADIAL_OFFSET) < 1e-6,
        `${c.end} sits ${d} from its spine midpoint, expected ${SIDE_CONNECTOR_RADIAL_OFFSET}`);
    }
    const dot = a.normal[0] * b.normal[0] + a.normal[1] * b.normal[1] + a.normal[2] * b.normal[2];
    assert.ok(dot < -0.999, 'the two receivers of a spine face opposite ways');
    const sep = Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]);
    assert.ok(Math.abs(sep - SPINE_SIDE_SEPARATION) < 1e-6);
  }
  assert.ok(Math.abs(SIDE_ALONG_ROD - rodLength(SPINE_ROD_INDICES[0]) / 2) < 1e-3, 'receivers ride the middle of the spine');
});

test('the receivers face along the bend axis, so bending never swings them', () => {
  // Bend B1 hard: the receivers of spine 1 only translate, they do not change facing.
  const straight = connectorPoses(ZERO_ANGLES).find((c) => c.end === 'S1A')!;
  const bent = connectorPoses([0, D(80), 0, 0, 0, 0, 0] as ModuleAngles).find((c) => c.end === 'S1A')!;
  assert.deepEqual(bent.normal.map((x) => +x.toFixed(9)), straight.normal.map((x) => +x.toFixed(9)));
  // Twisting T1 DOES swing them, because T1 is upstream of both spines.
  const twisted = connectorPoses([D(90), 0, 0, 0, 0, 0, 0] as ModuleAngles).find((c) => c.end === 'S1A')!;
  assert.ok(Math.abs(twisted.normal[0]) < 1e-9 && Math.abs(twisted.normal[1]) > 0.999);
});

test('side receivers are far apart along the chain and the module is lattice-friendly', () => {
  const cs = connectorPoses(ZERO_ANGLES);
  const z = (e: ConnectorEnd) => Math.abs(cs.find((c) => c.end === e)!.position[2]) / MODULINK_CUBE_SIZE;
  // 0.2158 m and 0.4712 m of 0.6869 m from connector A: 31% and 69% of the way along.
  const n = CUBES_PER_STRAIGHT_MODULE;
  assert.ok(Math.abs(z('S1A') - 0.3142 * n) < 0.05 * n, `spine 1 at ${z('S1A')} cubes`);
  assert.ok(Math.abs(z('S2A') - 0.6858 * n) < 0.05 * n, `spine 2 at ${z('S2A')} cubes`);
  assert.ok(Math.abs(z('B') - n) < 1e-9);
});

// ── the model agrees with the Studio's own FK ────────────────────────────────

test('connector geometry matches the Studio forward kinematics at random poses', () => {
  (globalThis as any).localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const doc: any = JSON.parse(fs.readFileSync(
    path.resolve(here, '../../core/factory/single-module-demo.json'), 'utf-8'));
  const bodyByName = (n: string) => Object.values(doc.bodies).find((b: any) => b.name === n) as any;
  const joint = (n: string) => Object.values(doc.joints).find((j: any) => j.name === n) as any;
  const root = bodyByName('EndA_LockModule').id;
  const owner: Record<ConnectorEnd, [string, string]> = {
    A: ['EndA_LockModule', 'conn-endA'], B: ['EndB_LockModule', 'conn-endB'],
    S1A: ['Spine1_B1B2', 'conn-s1a'], S1B: ['Spine1_B1B2', 'conn-s1b'],
    S2A: ['Spine2_B3B4', 'conn-s2a'], S2B: ['Spine2_B3B4', 'conn-s2b'],
  };
  const names = ['J_T1_twist', 'J_B1_bend', 'J_B2_bend', 'J_T2_twist', 'J_B3_bend', 'J_B4_bend', 'J_T3_twist'];

  const studio = (q: number[]) => {
    names.forEach((n, i) => { joint(n).state.value = q[i]; });
    const fk = computeFKGraph(doc, root);
    const out = new Map<ConnectorEnd, { p: number[]; n: number[] }>();
    for (const e of CONNECTOR_ENDS) {
      const [body, cid] = owner[e];
      const w = getConnectorWorld(doc, bodyByName(body).id, cid, fk)!;
      out.set(e, { p: [w.position.x, w.position.y, w.position.z], n: [w.normal.x, w.normal.y, w.normal.z] });
    }
    return out;
  };
  const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  // deterministic pseudo-random poses, inside the joint limits
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let trial = 0; trial < 12; trial++) {
    const q = names.map((_, i) => (ROD_ORDER[i] === 'twist' ? (rnd() * 2 - 1) * Math.PI : (rnd() * 2 - 1) * D(90)));
    const s = studio(q);
    const mine = connectorPoses(q as ModuleAngles);
    const m = new Map(mine.map((c) => [c.end, { p: [...c.position].map((x) => x / UNITS_PER_M), n: [...c.normal] }]));
    for (const e of CONNECTOR_ENDS) {
      for (const f of CONNECTOR_ENDS) {
        const dm = Math.hypot(...sub(m.get(e)!.p, m.get(f)!.p));
        const ds = Math.hypot(...sub(s.get(e)!.p, s.get(f)!.p));
        assert.ok(Math.abs(dm - ds) < 6e-3,
          `trial ${trial} ${e}-${f}: model ${dm.toFixed(4)} m vs Studio ${ds.toFixed(4)} m (q=${q.map((x) => Math.round((x * 180) / Math.PI))})`);
        const nm = dot(m.get(e)!.n, m.get(f)!.n);
        const ns = dot(s.get(e)!.n, s.get(f)!.n);
        assert.ok(Math.abs(nm - ns) < 0.02, `trial ${trial} normals ${e}.${f}: ${nm.toFixed(3)} vs ${ns.toFixed(3)}`);
      }
    }
    // Chirality: a mirror image has the same distances but the opposite handedness.
    for (const [a, b, c] of [['A', 'B', 'S1A'], ['B', 'S2A', 'S1B'], ['A', 'S1A', 'S2A']] as const) {
      const vm = dot(cross(sub(m.get(b)!.p, m.get(a)!.p), sub(m.get(c)!.p, m.get(a)!.p)), m.get('S1A')!.n);
      const vs = dot(cross(sub(s.get(b)!.p, s.get(a)!.p), sub(s.get(c)!.p, s.get(a)!.p)), s.get('S1A')!.n);
      if (Math.abs(vm) > 1e-5 && Math.abs(vs) > 1e-5) assert.equal(Math.sign(vm), Math.sign(vs), `trial ${trial} handedness ${a}${b}${c}`);
    }
  }
  names.forEach((n) => { joint(n).state.value = 0; });
});

// ── weld rules ────────────────────────────────────────────────────────────────

test('end-end and end-side are legal; side-side never is (only ends have a lock rotor)', () => {
  assert.equal(weldTypeIsLegal('A', 'B'), true, 'end to end');
  assert.equal(weldTypeIsLegal('B', 'S1A'), true, 'a free end grabbing a spine receiver');
  assert.equal(weldTypeIsLegal('S2B', 'A'), true, 'the same weld seen from the receiver');
  assert.equal(weldTypeIsLegal('S1A', 'S2B'), false, 'side to side: two passive receivers cannot lock');
  for (const a of CONNECTOR_ENDS) {
    for (const b of CONNECTOR_ENDS) {
      assert.equal(weldTypeIsLegal(a, b), a === 'A' || a === 'B' || b === 'A' || b === 'B', `${a}-${b}`);
    }
  }
});

test('only the two receivers of one spine may share a body closer than a pad diameter', () => {
  assert.equal(connectorsMayShareBody('S1A', 'S1B'), true);
  assert.equal(connectorsMayShareBody('S2B', 'S2A'), true);
  assert.equal(connectorsMayShareBody('S1A', 'S2A'), false);
  assert.equal(connectorsMayShareBody('A', 'B'), false);
  assert.equal(oppositeSideEnd('S1A'), 'S1B');
  assert.equal(oppositeSideEnd('A'), null);
  assert.deepEqual(adjacentSideEnds('S1A'), [], 'faces are 180 deg apart, never 90');
  assert.ok(SPINE_SIDE_SEPARATION < REQUIRED_DOME_CLEARANCE,
    'back-to-back receivers are closer than a pad diameter — that is why the exemption exists');
  assert.ok(HEMISPHERE_RADIUS * 2 === REQUIRED_DOME_CLEARANCE);
  for (const e of SIDE_ENDS) assert.equal(isSideEnd(e), true);
});

test('a weld set: each receiver carries one weld, both ends may weld too', () => {
  assert.equal(sideWeldsAreLegal(['S1A', 'S1B', 'S2A', 'S2B']), true, 'all four receivers at once');
  assert.equal(sideWeldsAreLegal(['S1A', 'S1A']), false, 'one receiver cannot carry two welds');
  assert.equal(weldSetIsLegal([{ own: 'A', toModuleId: 'm1', toEnd: 'S1A' }]).ok, true);
  assert.equal(weldSetIsLegal([
    { own: 'S1A', toModuleId: 'm1', toEnd: 'B' },
    { own: 'S1B', toModuleId: 'm2', toEnd: 'A' },
    { own: 'S2A', toModuleId: 'm3', toEnd: 'A' },
    { own: 'S2B', toModuleId: 'm4', toEnd: 'B' },
    { own: 'A', toModuleId: 'm5', toEnd: 'S2A' },
    { own: 'B', toModuleId: 'm6', toEnd: 'A' },
  ]).ok, true, 'all six connectors welded is the physical maximum');
  const twice = weldSetIsLegal([
    { own: 'A', toModuleId: 'm1', toEnd: 'B' },
    { own: 'A', toModuleId: 'm2', toEnd: 'B' },
  ]);
  assert.equal(twice.ok, false);
  assert.match(twice.reason, /only one weld/);
});

test('a module may never release its last weld — grab first, then let go', () => {
  const only: ChainWeld[] = [{ own: 'A', toModuleId: 'm1', toEnd: 'S1A' }];
  const lastOne = canReleaseEnd(only, 'A');
  assert.equal(lastOne.ok, false, 'releasing the only weld would drop the module out of the structure');
  assert.match(lastOne.reason, /Grab the next connector first/);

  // After the free end has grabbed the next target, the old anchor may release.
  const bothHeld: ChainWeld[] = [
    { own: 'A', toModuleId: 'm1', toEnd: 'S1A' },
    { own: 'B', toModuleId: 'm2', toEnd: 'S2B' },
  ];
  assert.equal(canReleaseEnd(bothHeld, 'A').ok, true, 'this is step 4 of the gait');
  assert.equal(canReleaseEnd(bothHeld, 'B').ok, true);

  assert.equal(canReleaseEnd(bothHeld, 'S1A').ok, false, 'S1A is not welded here');
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

test('the pose library spans from a whole module down to a tight coil', () => {
  const [min, max] = cubeRange();
  assert.equal(max, CUBES_PER_STRAIGHT_MODULE, `most extended pose should be worth a whole module, got ${max}`);
  // The tightest coil is a quarter of a module or less (about 2 cubes at 8 per
  // module; it was 1 of 4 on the old lattice) and never below one cube.
  assert.ok(min >= 1 && min <= CUBES_PER_STRAIGHT_MODULE / 3, `most folded pose is worth ${min} cubes`);
  // The scale must not be a gap: poses between the two extremes exist.
  const counts = new Set(poseLibrary().map((p) => p.cubes));
  assert.ok(counts.size >= 4, `only ${counts.size} distinct reach values across the library`);
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
    // The centreline is continuous, so the cubes it passes through form one piece
    // (26-neighbour: a fold that crosses the lattice diagonally touches along an
    // edge or a corner, which the finer cubes make common).
    assert.equal(connected26(p.sweptCells), true, `${p.id} sweep is disconnected`);
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

/** Are these cubes one piece when edge and corner contact count? */
function connected26(cells: Cell[]): boolean {
  if (!cells.length) return true;
  const set = new Set(cells.map(key));
  const seen = new Set<string>([key(cells[0])]);
  const stack = [cells[0]];
  while (stack.length) {
    const c = stack.pop()!;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const n: Cell = [c[0] + dx, c[1] + dy, c[2] + dz];
      const k = key(n);
      if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push(n); }
    }
  }
  return seen.size === set.size;
}

test('both themes exist and disagree about cubes per module', () => {
  const themes = allModuleThemes();
  assert.equal(themes.length, 2);

  const mod1 = getModuleTheme('mod1');
  assert.equal(mod1.singleCube, true);
  assert.deepEqual(mod1.cubeRange, [1, 1]);
  assert.equal(mod1.plannerIsExact, true, 'the cube planner is exactly correct for mod1');

  const mod2 = getModuleTheme('mod2');
  assert.equal(mod2.singleCube, false);
  assert.deepEqual(mod2.cubeRange, cubeRange());
  assert.equal(mod2.dof, 7);
  assert.equal(mod2.dof, RODS_PER_MODULE);
  assert.equal(mod2.plannerIsExact, false, 'mod2 must declare the planner is only approximate for it');
});

test('mod2 surfaces the side-receiver geometry as a constraint', () => {
  const mod2 = getModuleTheme('mod2');
  assert.ok(mod2.constraints.some((c) => /side/i.test(c) && /back to back|clear/i.test(c)),
    'the side-receiver spacing must be surfaced');
  assert.ok(mod2.constraints.some((c) => /90/.test(c) && /180/.test(c)), 'the joint limits are surfaced');
});

test('module count from cube count is exact for mod1 and a range for mod2', () => {
  const a = moduleCountEstimate('mod1', 12);
  assert.equal(a.exact, true);
  assert.equal(a.min, 12);
  assert.equal(a.max, 12);

  const [lo, hi] = cubeRange();
  const b = moduleCountEstimate('mod2', 12);
  assert.equal(b.exact, false);
  assert.equal(b.min, Math.ceil(12 / hi), '12 cubes at the longest reach per module = the fewest modules');
  assert.equal(b.max, Math.ceil(12 / lo), '12 cubes at the shortest reach per module = the most modules');
});

test('each theme names a default pose that exists in its own library', () => {
  for (const id of ['mod1', 'mod2'] as const) {
    const theme = getModuleTheme(id);
    const poseId = defaultPoseFor(id);
    assert.ok(theme.poses.some((p) => p.id === poseId), `${id} default pose ${poseId} is not in its library`);
  }
});
