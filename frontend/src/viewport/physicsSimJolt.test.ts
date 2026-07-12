/**
 * PhysicsSim's Jolt-backed behaviors not covered by physicsDeterminism.test.ts:
 * gravity, joint position/velocity motor switching, and box spawn/remove.
 *
 * Run: npx tsx --test src/viewport/physicsSimJolt.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeGeometry, GeometryType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { PhysicsSim } from '@/viewport/PhysicsSim';

function buildArm() {
  const box = makeGeometry(GeometryType.BOX, { size: [0.4, 0.2, 0.2] });
  const links = [0, 1].map((i) => ({
    name: `L${i + 1}`, geometry: box,
    transform: { position: [i * 0.5, 1, 0], quaternion: [0, 0, 0, 1] },
  }));
  const joints = [0].map((i) => ({
    name: `J${i + 1}`, type: 'revolute', axis: [0, 0, 1],
    limit: { lower: -3.0, upper: 3.0, effort: 5, velocity: 2 },
    origin: { position: [0.5, 0, 0], quaternion: [0, 0, 0, 1] },
  }));
  return buildSerialChain(makeDocument({ name: 'Arm' }), { name: 'Arm', links, joints }).doc;
}

test('gravity is wired along -Y (matching the app\'s Y-up world) and setGravity updates it live', async () => {
  // NOTE: a jointed arm holds its commanded pose RIGIDLY under a stiff motor
  // by design (the "powered robot" feature carried through from Rapier and
  // MuJoCo — gravity LOADS the joint but doesn't make it flop), so testing
  // "does the arm visibly fall" isn't a valid signal here. Test the actual
  // mechanism directly via poses() before/after a gravity change instead.
  const doc = buildArm();
  const sim = await PhysicsSim.create(doc, null, { gravity: 9.81 });
  const g = sim._physicsSystem.GetGravity();
  assert.equal(g.GetX(), 0);
  assert.ok(Math.abs(g.GetY() - -9.81) < 1e-6);
  assert.equal(g.GetZ(), 0);
  sim.setGravity(20);
  const g2 = sim._physicsSystem.GetGravity();
  assert.ok(Math.abs(g2.GetY() - -20) < 1e-6);
  sim.dispose();
});

test('a spawned box (unheld by any joint) actually falls under gravity', async () => {
  const doc = buildArm();
  const sim = await PhysicsSim.create(doc, null, { gravity: 9.81, groundY: -50 });
  const handle = sim.spawnBox([5, 10, 5], [0.1, 0.1, 0.1], 500);
  const before = sim.boxPoses().get(handle)!.pos[1];
  for (let i = 0; i < 200; i++) sim.step();
  const after = sim.boxPoses().get(handle)!.pos[1];
  assert.ok(after < before - 0.1, `box should fall under gravity: ${before} -> ${after}`);
  sim.dispose();
});

test('setJointTargets holds a commanded position under gravity', async () => {
  const doc = buildArm();
  const jointId = Object.keys(doc.joints)[0];
  const sim = await PhysicsSim.create(doc, null, { gravity: 9.81 });
  sim.setJointTargets({ [jointId]: 1.0 });
  for (let i = 0; i < 2000; i++) sim.step();
  const entry = sim.joints.get(jointId);
  const angle = entry.constraint.GetCurrentAngle();
  assert.ok(Math.abs(angle - 1.0) < 0.15, `joint should hold near target 1.0, got ${angle}`);
  sim.dispose();
});

test('setJointVelocities spins a joint continuously (wheel mode)', async () => {
  const doc = buildArm();
  const jointId = Object.keys(doc.joints)[0];
  const sim = await PhysicsSim.create(doc, null, { gravity: 0 }); // no gravity, isolate the spin
  sim.setJointVelocities({ [jointId]: 2.0 });
  const entry = sim.joints.get(jointId);
  const q0 = entry.constraint.GetCurrentAngle();
  for (let i = 0; i < 500; i++) sim.step();
  const q1 = entry.constraint.GetCurrentAngle();
  assert.ok(q1 > q0 + 0.1, `joint should have rotated forward under velocity drive: ${q0} -> ${q1}`);
  sim.dispose();
});

test('switching back from velocity to position mode re-holds a pose', async () => {
  const doc = buildArm();
  const jointId = Object.keys(doc.joints)[0];
  const sim = await PhysicsSim.create(doc, null, { gravity: 0 });
  sim.setJointVelocities({ [jointId]: 2.0 });
  for (let i = 0; i < 200; i++) sim.step();
  sim.setJointVelocities({}); // stop spinning -> should fall back to position hold
  const entry = sim.joints.get(jointId);
  const heldAt = entry.constraint.GetCurrentAngle();
  for (let i = 0; i < 300; i++) sim.step();
  const after = entry.constraint.GetCurrentAngle();
  assert.ok(Math.abs(after - heldAt) < 0.05, `should hold pose after switching off spin: ${heldAt} -> ${after}`);
  sim.dispose();
});

test('spawnBox places a box that falls under gravity, and removeBox actually removes it', async () => {
  const doc = buildArm();
  const sim = await PhysicsSim.create(doc, null, { gravity: 9.81, groundY: -50 }); // ground far away so it just falls
  const handle = sim.spawnBox([5, 10, 5], [0.1, 0.1, 0.1], 500);
  assert.notEqual(handle, -1);
  const before = sim.boxPoses().get(handle)!.pos[1];
  for (let i = 0; i < 200; i++) sim.step();
  const after = sim.boxPoses().get(handle)!.pos[1];
  assert.ok(after < before, `spawned box should fall: ${before} -> ${after}`);

  sim.removeBox(handle);
  assert.ok(!sim.boxPoses().has(handle), 'removed box should not appear in boxPoses()');
  sim.dispose();
});

test('spawning many boxes has no fixed pool limit (a real Jolt body per box, not a pre-declared pool)', async () => {
  // Unlike the MJCF version this replaces (which needed a fixed-size pool
  // because a compiled model's topology is static), Jolt bodies are
  // independent — spawning is a real CreateBody call every time, so there's
  // no BOX_POOL_SIZE ceiling to hit.
  const doc = buildArm();
  const sim = await PhysicsSim.create(doc, null, { gravity: 0 });
  const handles: number[] = [];
  for (let i = 0; i < 40; i++) handles.push(sim.spawnBox([i, 5, 0], [0.1, 0.1, 0.1], 500));
  assert.ok(handles.every((h) => h !== -1), 'no spawn should fail due to a fixed pool ceiling');
  assert.equal(new Set(handles).size, 40, 'every handle should be unique');
  for (const h of handles) sim.removeBox(h);
  sim.dispose();
});
