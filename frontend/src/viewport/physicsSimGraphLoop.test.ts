/**
 * The actual point of the Jolt migration: a body with two incoming joints
 * (a closed loop / multi-parent graph, not a tree) must Just Work — no
 * silent-drop workaround needed, because Jolt constraints don't require a
 * tree at all (see MIGRATION notes / the architecture review).
 *
 * Run: npx tsx --test src/viewport/physicsSimGraphLoop.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeGeometry, GeometryType, JointType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { putEntity } from '@/core/model/graph';
import { makeJoint } from '@/core/model/entities';
import { PhysicsSim } from '@/viewport/PhysicsSim';

test('a closed-loop (triangle) joint graph simulates correctly, all constraints active', async () => {
  const box = makeGeometry(GeometryType.BOX, { size: [0.3, 0.1, 0.1] });
  const links = [
    { name: 'A', geometry: box, transform: { position: [0, 5, 0], quaternion: [0, 0, 0, 1] } },
    { name: 'B', geometry: box, transform: { position: [1, 5, 0], quaternion: [0, 0, 0, 1] } },
    { name: 'C', geometry: box, transform: { position: [1, 4, 0], quaternion: [0, 0, 0, 1] } },
  ];
  // A->B, B->C via the normal chain builder, THEN a third joint C->A closes
  // the triangle — a genuine cycle, impossible to represent as a tree.
  const joints = [
    { type: JointType.REVOLUTE, axis: [0, 0, 1], origin: { position: [0.5, 0, 0], quaternion: [0, 0, 0, 1] } },
    { type: JointType.REVOLUTE, axis: [0, 0, 1], origin: { position: [0, 0.5, 0], quaternion: [0, 0, 0, 1] } },
  ];
  let { doc, bodyIds } = buildSerialChain(makeDocument({ name: 'Loop' }), { name: 'Loop', links, joints });
  const closingJoint = makeJoint({
    name: 'Closing', type: JointType.REVOLUTE, axis: [0, 0, 1],
    parentBodyId: bodyIds[2], childBodyId: bodyIds[0],
    origin: { position: [-0.5, -0.5, 0], quaternion: [0, 0, 0, 1] },
  });
  doc = putEntity(doc, closingJoint);

  const fk = new Map<string, { position: number[]; quaternion: number[] }>();
  for (const b of Object.values(doc.bodies) as any[]) fk.set(b.id, { position: b.transform.position, quaternion: b.transform.quaternion });

  const sim = await PhysicsSim.create(doc, fk, { gravity: 9.81 });
  // All THREE joints should have created a real constraint — none silently
  // dropped, unlike the MJCF tree-walker's forced "first joint wins" fallback.
  assert.equal(sim.joints.size, 3, 'all three joints in the loop should have real constraints, none dropped');

  for (let i = 0; i < 300; i++) {
    sim.step();
    for (const [, pose] of sim.poses()) {
      assert.ok(pose.position.every(Number.isFinite), `positions must stay finite at frame ${i}`);
    }
  }
  sim.dispose();
});
