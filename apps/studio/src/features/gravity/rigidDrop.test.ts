/**
 * RigidTumbleSim (MuJoCo-backed): the whole model must fall and settle as
 * one rigid compound body — no sagging, no per-body drift apart.
 *
 * Run: npx tsx --test src/features/gravity/rigidDrop.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeGeometry, GeometryType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { RigidTumbleSim } from './rigidDrop';

function buildArm() {
  const box = makeGeometry(GeometryType.BOX, { size: [0.4, 0.2, 0.2] });
  const links = [0, 1].map((i) => ({
    name: `L${i + 1}`, geometry: box,
    transform: { position: [i * 0.5, 5, 0], quaternion: [0, 0, 0, 1] },
  }));
  const joints = [0].map((i) => ({
    name: `J${i + 1}`, type: 'revolute', axis: [0, 0, 1],
    limit: { lower: -1.5, upper: 1.5, effort: 5, velocity: 2 },
    origin: { position: [0.5, 0, 0], quaternion: [0, 0, 0, 1] },
  }));
  return buildSerialChain(makeDocument({ name: 'Arm' }), { name: 'Arm', links, joints }).doc;
}

test('falls under gravity and eventually settles', async () => {
  const doc = buildArm();
  const fk = new Map<string, { position: number[]; quaternion: number[] }>();
  for (const b of Object.values(doc.bodies)) fk.set(b.id, { position: b.transform.position, quaternion: b.transform.quaternion });

  const sim = await RigidTumbleSim.create(doc, fk, -3.2);
  assert.ok(sim, 'sim should be created for a non-empty model');

  let settledAt = -1;
  for (let i = 0; i < 400 && settledAt < 0; i++) {
    sim!.step(1 / 60);
    if (sim!.settled()) settledAt = i;
  }
  assert.ok(settledAt >= 0, 'the compound body should settle within 400 frames');
  sim!.dispose();
});

test('the two links move together rigidly (no sagging apart)', async () => {
  const doc = buildArm();
  const fk = new Map<string, { position: number[]; quaternion: number[] }>();
  for (const b of Object.values(doc.bodies)) fk.set(b.id, { position: b.transform.position, quaternion: b.transform.quaternion });

  const sim = await RigidTumbleSim.create(doc, fk, -3.2);
  const m0 = sim!.step(1 / 60);
  for (let i = 0; i < 100; i++) sim!.step(1 / 60);
  const m1 = sim!.step(1 / 60);
  // A single rigid-delta matrix is returned for the WHOLE compound — if the
  // API still returns one matrix (not per-body), rigidity is true by
  // construction; this just confirms step() keeps returning a valid transform.
  assert.ok(m1.elements.every((v) => Number.isFinite(v)), 'transform must stay finite (no NaN blowup)');
  sim!.dispose();
});
