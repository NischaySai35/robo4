/**
 * statics.test.ts — M1: the data model, the connector rules and the static checker.
 *
 * The torque numbers are checked against a HAND calculation done straight from the
 * module document's masses and centres of mass, not against the checker's own maths.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import doc from '@/core/factory/single-module-demo.json';

import { type Config, type Edge, STRAIGHT, CONFIG, TORQUE_BUDGET_NM, PLAN_BEND_DEG, type ModulePose } from './model';
import { edgeProblem, configProblems } from './rules';
import { moduleGeo } from './kin';
import { checkStatic } from './statics';
import { LIBRARY } from './library';
import { connectorPoses, ZERO_ANGLES, UNITS_PER_M } from '@/robotics/msrr/modulink';
import { qaxis, dist, dot } from './vec';

const pose = (p: Partial<ModulePose> = {}): ModulePose => ({ ...STRAIGHT, ...p });
const one = (extra: Partial<Config> = {}, p: Partial<ModulePose> = {}): Config => ({
  modules: ['M1'], unused: [], edges: [], pose: { M1: pose(p) }, ...extra,
});
const floorLock = (port: 'A' | 'B' = 'A', anchor = 'F0'): Edge => ({ a: { floor: anchor }, b: { module: 'M1', port }, slot: 0, locked: true });

// ── rules ─────────────────────────────────────────────────────────────────────

test('connector rules: end↔end and end↔side lock; side↔side never; only an END locks to the floor', () => {
  const e = (ap: string, bp: string): Edge => ({ a: { module: 'M1', port: ap as never }, b: { module: 'M2', port: bp as never }, slot: 0, locked: true });
  assert.equal(edgeProblem(e('A', 'B')), null);
  assert.equal(edgeProblem(e('B', 'S1A')), null);
  assert.equal(edgeProblem(e('S2B', 'A')), null);
  assert.match(edgeProblem(e('S1A', 'S2B'))!, /side↔side/);
  assert.equal(edgeProblem({ a: { floor: 'F0' }, b: { module: 'M1', port: 'B' }, slot: 0, locked: true }), null);
  assert.match(edgeProblem({ a: { floor: 'F0' }, b: { module: 'M1', port: 'S1A' }, slot: 0, locked: true })!, /only an END/);
  assert.match(edgeProblem({ a: { module: 'M1', port: 'A' }, b: { module: 'M1', port: 'S2A' }, slot: 0, locked: true })!, /itself/);
});

test('config rules: one lock per port, one connected piece, parked modules carry no lock', () => {
  const base = { modules: ['M1', 'M2', 'M3'], unused: [], pose: { M1: pose(), M2: pose(), M3: pose() } };
  const ok: Config = { ...base, edges: [
    { a: { module: 'M1', port: 'B' }, b: { module: 'M2', port: 'A' }, slot: 0, locked: true },
    { a: { module: 'M2', port: 'B' }, b: { module: 'M3', port: 'S1A' }, slot: 1, locked: true },
  ] };
  assert.deepEqual(configProblems(ok), []);
  const twice: Config = { ...base, edges: [...ok.edges, { a: { module: 'M3', port: 'A' }, b: { module: 'M1', port: 'B' }, slot: 0, locked: true }] };
  assert.ok(configProblems(twice).some((p) => /M1\.B carries 2 locks/.test(p)));
  const apart: Config = { ...base, edges: [ok.edges[0]] };
  assert.ok(configProblems(apart).some((p) => /2 separate pieces/.test(p)));
  const parked: Config = { ...base, unused: ['M3'], edges: ok.edges };
  assert.ok(configProblems(parked).some((p) => /parked/.test(p)));
});

// ── the module model ──────────────────────────────────────────────────────────

test('one module weighs 1.134 kg and its ports match the verified chain kinematics', () => {
  const g = moduleGeo([0, 0, 0, 0, 0, 0, 0], { p: [0, 0, 0], q: [0, 0, 0, 1] });
  assert.ok(Math.abs(g.mass - 1.134) < 0.001, `mass ${g.mass}`);
  const ref = connectorPoses(ZERO_ANGLES);
  for (const c of ref) {
    const mine = g.ports[c.end];
    const want = c.position.map((v) => v / UNITS_PER_M);
    assert.ok(dist(mine.pos, want as never) < 0.002, `${c.end} at ${mine.pos} vs ${want}`);
    assert.ok(dot(mine.z, c.normal as never) > 0.999, `${c.end} normal`);
  }
});

// ── torque against a hand calculation ────────────────────────────────────────

test('a straight module HELD horizontal at one end fails the torque budget (hand-checked)', () => {
  // Lying along +x, A held rigidly at the origin.
  const held = one({ baseFrame: { held: true, worldPose: { p: [0, 0.5, 0], q: qaxis([0, 1, 0], -Math.PI / 2) } } });
  const r = checkStatic(held);
  assert.equal(r.ok, false, 'it must fail');
  assert.match(r.reasons.join(' | '), /of stall/);

  // Hand calculation for B1, straight from the module doc: every body beyond the B1
  // hinge, weight × horizontal distance to the hinge. Straight, the bodies lie along
  // the Studio +x axis from End A, and A's connector is 39.4 mm behind End A's origin.
  const bodies = Object.values((doc as any).bodies) as any[];
  const endA = bodies.find((b) => b.name === 'EndA_LockModule');
  const ax = endA.transform.position[0] + endA.meta.connectors[0].position[0];
  const hinge = (name: string) => {
    const j = (Object.values((doc as any).joints) as any[]).find((x) => x.name === name);
    const parent = bodies.find((b) => b.id === j.parentBodyId);
    return parent.transform.position[0] + j.origin.position[0] - ax;
  };
  const xB1 = hinge('J_B1_bend');
  const beyond = ['Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule', 'L2_LockRotor_B'];
  let hand = 0;
  for (const n of beyond) {
    const b = bodies.find((x) => x.name === n);
    const x = b.transform.position[0] + b.inertial.com[0] - ax;
    hand += b.inertial.mass * 9.81 * (x - xB1);
  }
  const b1 = r.torques.find((t) => t.joint === 'B1')!;
  assert.ok(Math.abs(b1.nm - hand) / hand < 0.02, `checker says ${b1.nm.toFixed(3)} N·m, hand calc ${hand.toFixed(3)} N·m`);
  assert.ok(hand > TORQUE_BUDGET_NM, `hand calc ${hand.toFixed(2)} N·m must exceed the ${TORQUE_BUDGET_NM.toFixed(2)} N·m budget`);
});

test('a curled stand on a floor receiver passes, with margins reported', () => {
  // End A in floor receiver F0, the module standing up and curled over at the top.
  const curled = one({ edges: [floorLock('A')] }, { B3: 180 + 80, B4: 180 + 80 });
  const r = checkStatic(curled);
  assert.equal(r.ok, true, r.reasons.join(' | '));
  assert.equal(r.supportedBy, 'floor-anchor');
  assert.ok(r.margins.maxTorquePct < CONFIG.limits.torqueBudgetPct);
  assert.ok(r.margins.maxTorquePct > 5, 'curling the top over does load the lower joints a little');
  // standing straight up, gravity runs along the chain: almost no torque
  const straight = checkStatic(one({ edges: [floorLock('A')] }));
  assert.ok(straight.ok && straight.margins.maxTorquePct < 2, `upright straight: ${straight.margins.maxTorquePct}%`);
});

test('a module lying on the floor rests on its two end locks and the joints carry the middle', () => {
  // The end locks are 80 mm across and the body 70 mm, so lying straight it touches
  // the floor only at the two ends and the middle spans between them like a beam.
  const r = checkStatic(one());
  assert.equal(r.supportedBy, 'floor-contact');
  const segs = new Set(r.contacts.map((c) => c.seg));
  assert.ok(segs.has(0) && segs.has(7), `contacts on segments ${[...segs]}`);
  assert.ok(r.margins.maxTorquePct > 10 && r.margins.maxTorquePct < CONFIG.limits.torqueBudgetPct,
    `the span is within budget but not free: ${r.margins.maxTorquePct.toFixed(0)}%`);
  assert.ok(Math.abs(r.contacts.reduce((s, c) => s + c.force, 0) - 1.134 * 9.81) < 0.05, 'the contacts carry the whole weight');
  // the boxy parts give each contact a ~40 mm wide footprint, so lying flat is stable
  assert.ok(r.margins.cogMarginMm >= CONFIG.limits.cogMarginMm, `lying flat: CoG ${r.margins.cogMarginMm.toFixed(0)} mm inside`);
});

test('bends past the ±88.2° planning limit are refused', () => {
  const r = checkStatic(one({ edges: [floorLock('A')] }, { B2: 180 + 89.5 }));
  assert.ok(r.reasons.some((x) => /planning limit/.test(x)), r.reasons.join(' | '));
  assert.ok(Math.abs(PLAN_BEND_DEG - 88.2) < 1e-9);
});

test('a fold that drives the module into itself or the floor is a collision', () => {
  const r = checkStatic(one({ edges: [floorLock('A')] }, { B1: 180 + 88, B2: 180 + 88, B3: 180 + 88, B4: 180 + 88 }));
  assert.ok(r.collisions.length > 0, 'a full coil overlaps itself');
});

// ── sag, PLA flex, touch (Nischay, 26 Oct: "a vertical module falls with just a touch"; the T on a standing module falls) ──
test('a module standing FREE on its pad really stands, but is FRAGILE: well under 1 N at the top tips it', () => {
  const c: Config = { modules: ['M1'], unused: [], edges: [], pose: { M1: { ...STRAIGHT } }, baseFrame: { module: 'M1', worldPose: { p: [0, 0.0063, 0], q: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2] }, dropToFloor: true } };
  const r = checkStatic(c);
  assert.equal(r.ok, true, r.reasons.join('; '));
  assert.equal(r.fragile, true);
  assert.ok(r.margins.tipPushN! < 1, `tip push ${r.margins.tipPushN}`);
  assert.match(r.warnings.join(' '), /touch at the top/);
});

test('the same module standing IN a receiver cannot tip, and a 3 N touch does not make a servo slip', () => {
  const c: Config = { modules: ['M1'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }], pose: { M1: { ...STRAIGHT } } };
  const r = checkStatic(c, undefined, { touch: true });
  assert.equal(r.ok, true, r.reasons.join('; '));
  assert.ok(r.touchWorstPct! < 100);
});

test('a module hanging off a standing one sags tens of mm (MuJoCo measured 70 mm on this shape) and loads the PLA brackets', () => {
  const e = LIBRARY.find((x) => x.id === 't_anchored_2m')!;
  const r = checkStatic({ modules: ['M1', 'M2'], unused: [], edges: e.topology, pose: e.pose, baseFrame: e.baseFrame });
  assert.ok(r.sag.maxMm > 35 && r.sag.maxMm < 105, `sag ${r.sag.maxMm} mm`);
  assert.ok(r.sag.flexUse > 0.5, `flex use ${r.sag.flexUse}`);
  // an estimate is never a verdict: physics (MuJoCo) decides whether it holds
});
