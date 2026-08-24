/**
 * DynamicSim (MuJoCo-backed): rigid fusion, passive free-joint articulation,
 * and motor-joint spin/brake — the three jointMode() behaviors.
 *
 * Run: npx tsx --test src/features/gravity/dynamicSim.test.ts
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

test('rigid mode: two fixed-jointed bodies stay at a constant relative offset', async () => {
  const box = makeGeometry(GeometryType.BOX, { size: [0.2, 0.2, 0.2] });
  const links = [
    { name: 'Root', geometry: box, transform: { position: [0, 5, 0], quaternion: [0, 0, 0, 1] } },
    { name: 'Fused', geometry: box, transform: { position: [0.3, 5, 0], quaternion: [0, 0, 0, 1] } },
  ];
  const joints = [{ type: JointType.FIXED, origin: { position: [0.15, 0, 0], quaternion: [0, 0, 0, 1] } }];
  const { doc } = buildSerialChain(makeDocument({ name: 'D' }), { name: 'D', links, joints });

  const sim = await DynamicSim.create(doc, fkOf(doc), -3.2);
  assert.ok(sim);
  const ids = Object.keys(doc.bodies);
  const relAt = (poses: Map<string, any>) => {
    const a = poses.get(ids[0])!.position, b = poses.get(ids[1])!.position;
    return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  };
  const p0 = sim!.step(1 / 60);
  const dist0 = relAt(p0);
  for (let i = 0; i < 100; i++) sim!.step(1 / 60);
  const p1 = sim!.step(1 / 60);
  const dist1 = relAt(p1);
  assert.ok(Math.abs(dist0 - dist1) < 0.01, `rigidly fused bodies must keep a constant offset: ${dist0} vs ${dist1}`);
  sim!.dispose();
});

test('free mode: a joint swings passively under gravity (no rigid hold)', async () => {
  const box = makeGeometry(GeometryType.BOX, { size: [0.6, 0.1, 0.1] });
  const links = [
    { name: 'Root', geometry: box, transform: { position: [0, 5, 0], quaternion: [0, 0, 0, 1] } },
    { name: 'Arm', geometry: box, transform: { position: [0.6, 5, 0], quaternion: [0, 0, 0, 1] } },
  ];
  const joints = [{ type: JointType.REVOLUTE, axis: [0, 0, 1], origin: { position: [0.3, 0, 0], quaternion: [0, 0, 0, 1] } }];
  const { doc, jointIds } = buildSerialChain(makeDocument({ name: 'D' }), { name: 'D', links, joints });
  (doc.joints[jointIds[0]] as any).meta = { free: true };

  const sim = await DynamicSim.create(doc, fkOf(doc), -3.2);
  assert.ok(sim);
  const armId = Object.keys(doc.bodies)[1];
  const before = sim!.step(1 / 60).get(armId)!.position;
  for (let i = 0; i < 200; i++) sim!.step(1 / 60);
  const after = sim!.step(1 / 60).get(armId)!.position;
  const moved = Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]);
  assert.ok(moved > 0.02, `free-mode joint should swing under gravity, moved only ${moved}`);
  sim!.dispose();
});

test('motor mode: an end-lock joint spins on command and brakes when idle', async () => {
  const box = makeGeometry(GeometryType.BOX, { size: [0.2, 0.2, 0.2] });
  const links = [
    { name: 'Root', geometry: box, transform: { position: [0, 5, 0], quaternion: [0, 0, 0, 1] } },
    { name: 'EndLock1', geometry: box, transform: { position: [0.3, 5, 0], quaternion: [0, 0, 0, 1] } },
  ];
  const joints = [{ type: JointType.CONTINUOUS, axis: [0, 0, 1], origin: { position: [0.15, 0, 0], quaternion: [0, 0, 0, 1] } }];
  const { doc, jointIds } = buildSerialChain(makeDocument({ name: 'D' }), { name: 'D', links, joints });

  const sim = await DynamicSim.create(doc, fkOf(doc), -3.2);
  assert.ok(sim);
  const jointId = jointIds[0];
  const driveOn = () => 3.0;
  for (let i = 0; i < 100; i++) sim!.step(1 / 60, driveOn);
  const entry = (sim as any)._motorJoints.find((m: any) => m.jointId === jointId);
  assert.ok(entry, 'motor joint should be registered (EndLock naming should trigger isMotorJoint)');
  const spunAngle = entry.constraint.GetCurrentAngle();
  assert.ok(Math.abs(spunAngle) > 0.3, `commanded motor should have rotated the joint, angle=${spunAngle}`);

  // Now go idle and confirm it brakes (doesn't keep accelerating).
  for (let i = 0; i < 60; i++) sim!.step(1 / 60, () => 0);
  const afterIdle1 = entry.constraint.GetCurrentAngle();
  for (let i = 0; i < 60; i++) sim!.step(1 / 60, () => 0);
  const afterIdle2 = entry.constraint.GetCurrentAngle();
  assert.ok(Math.abs(afterIdle2 - afterIdle1) < 0.2, `idle should brake (small further rotation): ${afterIdle1} -> ${afterIdle2}`);
  sim!.dispose();
});
