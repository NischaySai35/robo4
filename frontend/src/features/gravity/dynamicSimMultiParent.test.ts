/**
 * A body with more than one incoming joint (e.g. auto-lock connectors
 * snapping it to two neighbors) must not crash MJCF compilation with
 * MuJoCo's mjCModel::CheckRepeat (duplicate name) error — this app's joint
 * graph isn't guaranteed to be a tree, and MJCF requires one.
 *
 * Run: npx tsx --test src/features/gravity/dynamicSimMultiParent.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeGeometry, GeometryType, JointType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { putEntity } from '@/core/model/graph';
import { makeJoint } from '@/core/model/entities';
import { DynamicSim } from './dynamicSim';

function fkOf(doc: any) {
  const fk = new Map<string, { position: number[]; quaternion: number[] }>();
  for (const b of Object.values(doc.bodies) as any[]) fk.set(b.id, { position: b.transform.position, quaternion: b.transform.quaternion });
  return fk;
}

test('a body with two incoming joints does not crash MJCF compilation', async () => {
  const box = makeGeometry(GeometryType.BOX, { size: [0.2, 0.2, 0.2] });
  const links = [
    { name: 'A', geometry: box, transform: { position: [0, 5, 0], quaternion: [0, 0, 0, 1] } },
    { name: 'B', geometry: box, transform: { position: [0.3, 5, 0], quaternion: [0, 0, 0, 1] } },
    { name: 'C', geometry: box, transform: { position: [0, 5, 0.3], quaternion: [0, 0, 0, 1] } },
  ];
  // A -> B via a normal serial-chain joint.
  const joints = [{ type: JointType.FIXED, origin: { position: [0.15, 0, 0], quaternion: [0, 0, 0, 1] } }];
  let { doc, bodyIds } = buildSerialChain(makeDocument({ name: 'D' }), { name: 'D', links, joints });

  // C -> B via a SECOND joint (simulating an auto-lock connector snap) — B
  // now has two incoming joints (from A, and from C), which is not a tree.
  const extraJoint = makeJoint({
    name: 'Extra', type: JointType.FIXED,
    parentBodyId: bodyIds[2], childBodyId: bodyIds[1], // C -> B, second parent for B
    origin: { position: [0, 0, 0.15], quaternion: [0, 0, 0, 1] },
  });
  doc = putEntity(doc, extraJoint);

  const fk = fkOf(doc);
  // Must not throw/reject — this is exactly what previously threw mjCError
  // (mjCModel::CheckRepeat) and silently killed gravity sim in the app.
  const sim = await DynamicSim.create(doc, fk, -3.2, () => null, null);
  assert.ok(sim, 'sim should still be created despite the non-tree joint graph');
  const poses = sim!.step(1 / 60);
  assert.equal(poses.size, 3, 'all three bodies should still report a pose');
  for (const [, p] of poses) {
    assert.ok(p.position.every(Number.isFinite), 'positions must stay finite, not NaN/Inf');
  }
  sim!.dispose();
});
