/**
 * Direct regression test for a live user report: turning gravity on made
 * roughly half the model sink through the floor. Root cause was two
 * compounding bugs in DynamicSim's Jolt port: (1) a flat 0.4kg fallback
 * mass regardless of body size, and (2) rigid connections built as
 * individually-constrained separate bodies instead of one true compound
 * rigid body per cluster — both made contact resolution against the ground
 * numerically too weak to hold bodies up.
 *
 * Run: npx tsx --test src/features/gravity/dynamicSimGroundContact.test.ts
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

test('a rigid multi-body cluster resting near the ground settles ON it, not through it', async () => {
  const box = makeGeometry(GeometryType.BOX, { size: [0.3, 0.15, 0.3] });
  const GROUND_Y = -1;
  // A 4-body rigidly-fused cluster (like a chassis of fused modules) dropped
  // from just above the ground, matching a real "half the model is one
  // rigid cluster resting near the floor" scenario.
  const links = [
    { name: 'A', geometry: box, transform: { position: [0, GROUND_Y + 0.5, 0], quaternion: [0, 0, 0, 1] } },
    { name: 'B', geometry: box, transform: { position: [0.3, GROUND_Y + 0.5, 0], quaternion: [0, 0, 0, 1] } },
    { name: 'C', geometry: box, transform: { position: [0, GROUND_Y + 0.5, 0.3], quaternion: [0, 0, 0, 1] } },
    { name: 'D', geometry: box, transform: { position: [0.3, GROUND_Y + 0.5, 0.3], quaternion: [0, 0, 0, 1] } },
  ];
  const joints = [
    { type: JointType.FIXED, origin: { position: [0.15, 0, 0], quaternion: [0, 0, 0, 1] } },
    { type: JointType.FIXED, origin: { position: [0, 0, 0.15], quaternion: [0, 0, 0, 1] } },
    { type: JointType.FIXED, origin: { position: [0.15, 0, 0], quaternion: [0, 0, 0, 1] } },
  ];
  const { doc } = buildSerialChain(makeDocument({ name: 'Chassis' }), { name: 'Chassis', links, joints });

  const sim = await DynamicSim.create(doc, fkOf(doc), GROUND_Y, () => null, null);
  assert.ok(sim);

  let poses = new Map<string, { position: number[]; quaternion: number[] }>();
  for (let i = 0; i < 300; i++) poses = sim!.step(1 / 60);

  // Ground surface sits at GROUND_Y (box half-height 0.15). Every body's
  // resting Y must be AT OR ABOVE roughly (GROUND_Y + half-height), with
  // only a small numerical-settling tolerance — not deep inside the floor.
  const minAllowedY = GROUND_Y + 0.15 - 0.08;
  for (const [id, pose] of poses) {
    assert.ok(pose.position[1] > minAllowedY, `body ${id} sank through the floor: y=${pose.position[1]}, ground=${GROUND_Y}`);
  }
  sim!.dispose();
});
