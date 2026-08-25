/**
 * Two real stability issues found from a live user report: (1) non-adjacent
 * bodies that overlap at their rest pose (common in this app's nested-module
 * designs) had no collision exclusion in DynamicSim's generator, unlike
 * PhysicsSim's — causing severe first-step interpenetration forces that blew
 * the sim to NaN/Inf from frame one, flooding the console every step and
 * making the whole UI feel frozen. (2) even if instability recurs for some
 * other reason, the sim must never spam forever — it should detect NaN/Inf
 * and freeze rather than keep computing garbage.
 *
 * Run: npx tsx --test src/features/gravity/dynamicSimStability.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeGeometry, GeometryType, JointType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { DynamicSim } from './dynamicSim';

function fkOf(doc: any) {
  const fk = new Map<string, { position: number[]; quaternion: number[] }>();
  for (const b of Object.values(doc.bodies) as any[]) fk.set(b.id, { position: b.transform.position, quaternion: b.transform.quaternion });
  return fk;
}

test('deeply overlapping non-adjacent bodies (nested by design) do not blow the sim to NaN', async () => {
  // Three separate branches off a root, where two SIBLING branches' tip
  // bodies are placed to deliberately overlap heavily at rest (like a
  // knuckle nested inside another module's link) — a real shape this app's
  // component system produces, and NOT directly jointed to each other, so
  // MuJoCo's automatic parent/child exclusion doesn't cover it.
  const box = makeGeometry(GeometryType.BOX, { size: [0.3, 0.3, 0.3] });
  const links = [
    { name: 'Root', geometry: box, transform: { position: [0, 5, 0], quaternion: [0, 0, 0, 1] } },
    { name: 'BranchA', geometry: box, transform: { position: [0.05, 5, 0], quaternion: [0, 0, 0, 1] } }, // heavily overlaps Root
    { name: 'BranchB', geometry: box, transform: { position: [0.08, 5, 0.02], quaternion: [0, 0, 0, 1] } }, // heavily overlaps BranchA
  ];
  const joints = [
    { type: JointType.FIXED, origin: { position: [0.025, 0, 0], quaternion: [0, 0, 0, 1] } },
    { type: JointType.FIXED, origin: { position: [0.015, 0, 0.01], quaternion: [0, 0, 0, 1] } },
  ];
  const { doc } = buildSerialChain(makeDocument({ name: 'D' }), { name: 'D', links, joints });

  const sim = await DynamicSim.create(doc, fkOf(doc), -3.2, () => null, null);
  assert.ok(sim);
  for (let i = 0; i < 120; i++) {
    const poses = sim!.step(1 / 60);
    for (const [, p] of poses) {
      assert.ok(p.position.every(Number.isFinite), `positions must stay finite at frame ${i}: ${JSON.stringify(p.position)}`);
    }
  }
  sim!.dispose();
});

test('a single instability occurrence self-heals via reset instead of propagating', async () => {
  const box = makeGeometry(GeometryType.BOX, { size: [0.2, 0.2, 0.2] });
  const links = [{ name: 'Root', geometry: box, transform: { position: [0, 5, 0], quaternion: [0, 0, 0, 1] } }];
  const { doc } = buildSerialChain(makeDocument({ name: 'D' }), { name: 'D', links, joints: [] });
  const sim = await DynamicSim.create(doc, fkOf(doc), -3.2, () => null, null);
  assert.ok(sim);

  const [rb] = (sim as any)._clusterBody.values();
  const Jolt = (sim as any).world.Jolt;
  (sim as any).world.bodyInterface.SetPosition(rb.GetID(), new Jolt.RVec3(NaN, 0, 0), Jolt.EActivation_Activate);
  const poses1 = sim!.step(1 / 60);
  for (const [, p] of poses1) assert.ok(p.position.every(Number.isFinite), 'first NaN occurrence should self-heal via reset');
  assert.equal((sim as any)._frozen, false, 'a single NaN occurrence should reset, not freeze');
  sim!.dispose();
});

test('once frozen, step() short-circuits to a stable no-op read instead of stepping the world again', async () => {
  const box = makeGeometry(GeometryType.BOX, { size: [0.2, 0.2, 0.2] });
  const links = [{ name: 'Root', geometry: box, transform: { position: [0, 5, 0], quaternion: [0, 0, 0, 1] } }];
  const { doc } = buildSerialChain(makeDocument({ name: 'D' }), { name: 'D', links, joints: [] });
  const sim = await DynamicSim.create(doc, fkOf(doc), -3.2, () => null, null);
  assert.ok(sim);

  // Directly force the frozen state (the natural double-instability trigger
  // is implementation-fragile — what matters here is verifying the FREEZE
  // behavior itself works, same reasoning as the MuJoCo-era version of this test).
  (sim as any)._frozen = true;
  const world = (sim as any).world;
  let stepCalls = 0;
  world.jolt = new Proxy(world.jolt, { get(t: any, p: string) { if (p === 'Step') stepCalls++; return t[p].bind(t); } });

  const before = sim!.step(1 / 60);
  const after = sim!.step(1 / 60);
  assert.equal(stepCalls, 0, 'a frozen sim must never step the world again');
  assert.deepEqual([...before.values()], [...after.values()], 'frozen sim should return a stable, unchanging pose');
  sim!.dispose();
});

test('isSettled(): false while a dropped body is still falling, true once it comes to rest', async () => {
  // This gates on-demand rendering (ModelEditor stops writing poses and stops redrawing once
  // the sim settles), so a premature `true` would freeze the viewport mid-fall — visually
  // identical to a hung app. Worth pinning both directions.
  const box = makeGeometry(GeometryType.BOX, { size: [0.2, 0.2, 0.2] });
  const GROUND_Y = -1;
  const links = [
    { name: 'A', geometry: box, transform: { position: [0, GROUND_Y + 1.5, 0], quaternion: [0, 0, 0, 1] } },
  ];
  const { doc } = buildSerialChain(makeDocument({ name: 'Drop' }), { name: 'Drop', links, joints: [] });

  const sim = await DynamicSim.create(doc, fkOf(doc), GROUND_Y, () => null, null);
  assert.ok(sim);

  sim!.step(1 / 60);
  assert.equal(sim!.isSettled(), false, 'a body still falling must not report settled');

  // Long enough to land and for Jolt to put it to sleep (its default is ~0.5s at rest).
  let settled = false;
  for (let i = 0; i < 900 && !settled; i++) { sim!.step(1 / 60); settled = sim!.isSettled(); }
  assert.ok(settled, 'a body resting on the ground must eventually report settled');

  // And once settled it must STAY settled — a flapping value would redraw every other frame.
  for (let i = 0; i < 60; i++) sim!.step(1 / 60);
  assert.equal(sim!.isSettled(), true, 'settled state must be stable, not oscillating');
  sim!.dispose();
});

test('a module chain with driven end-locks settles under gravity and stays still', async () => {
  // REGRESSION. A slip-based tire model briefly replaced the NORMAL contact force with a
  // penalty spring. The spring has to be stiff enough to hold the robot's weight share
  // (~1250 N/m) but is applied to a single ~50g end-lock body, which puts omega*dt past the
  // explicit-integration stability limit — this chain never came to rest and kept ~3mm of
  // permanent wobble. A second, independent bug did the same thing on its own: applying the
  // tangential force with EActivation_Activate every frame re-woke the bodies forever, so
  // nothing could ever sleep.
  //
  // Both were invisible to every other test here (a single dropped box has no joints, no
  // wheels and no tire model), and invisible to typecheck and build. Only a jointed chain
  // with motor-driven end-locks exercises the path, so this test does exactly that.
  const cyl = makeGeometry(GeometryType.CYLINDER, { radius: 0.04, length: 0.03 });
  const box = makeGeometry(GeometryType.BOX, { size: [0.08, 0.06, 0.08] });
  const GROUND_Y = -1;
  const Y = GROUND_Y + 0.35; // dropped from a height, so it must actually fall and settle

  // end_lock -- 3 fixed-joined middles (one fused cluster) -- end_lock, ends on REVOLUTE so
  // isMotorJoint() treats them as driven wheels.
  const links: any[] = [{ name: 'end_lock', geometry: cyl, transform: { position: [-0.20, Y, 0], quaternion: [0, 0, 0, 1] } }];
  for (let i = 0; i < 3; i++) links.push({ name: `mid_${i}`, geometry: box, transform: { position: [-0.12 + i * 0.09, Y, 0], quaternion: [0, 0, 0, 1] } });
  links.push({ name: 'end_lock 2', geometry: cyl, transform: { position: [0.20, Y, 0], quaternion: [0, 0, 0, 1] } });

  const joints: any[] = [{ type: JointType.REVOLUTE, axis: [1, 0, 0], origin: { position: [0.04, 0, 0], quaternion: [0, 0, 0, 1] } }];
  for (let i = 0; i < 2; i++) joints.push({ type: JointType.FIXED, origin: { position: [0.09, 0, 0], quaternion: [0, 0, 0, 1] } });
  joints.push({ type: JointType.REVOLUTE, axis: [1, 0, 0], origin: { position: [0.09, 0, 0], quaternion: [0, 0, 0, 1] } });

  const { doc } = buildSerialChain(makeDocument({ name: 'Chain' }), { name: 'Chain', links, joints });
  const sim = await DynamicSim.create(doc, fkOf(doc), GROUND_Y, () => null, null);
  assert.ok(sim);

  let settled = false;
  for (let i = 0; i < 900 && !settled; i++) { sim!.step(1 / 60); settled = sim!.isSettled(); }
  assert.ok(settled, 'a dropped module chain must come to rest, not shake indefinitely');

  // Settled must also mean STILL: isSettled() gates on-demand rendering, so a model that
  // reports settled while still creeping would freeze a visibly-moving scene.
  const first = [...sim!.step(1 / 60).values()].map((v) => v.position[1]);
  let wobble = 0;
  for (let i = 0; i < 60; i++) {
    const now = [...sim!.step(1 / 60).values()].map((v) => v.position[1]);
    for (let j = 0; j < now.length; j++) wobble = Math.max(wobble, Math.abs(now[j] - first[j]));
  }
  assert.ok(wobble < 0.0005, `settled model still moving: ${(wobble * 1000).toFixed(2)}mm of residual wobble`);
  sim!.dispose();
});
