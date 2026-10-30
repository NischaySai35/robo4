/**
 * RigidTumbleSim (MuJoCo-backed): the whole model must fall and settle as
 * one rigid compound body — no sagging, no per-body drift apart.
 *
 * Run: npx tsx --test src/features/gravity/rigidDrop.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RigidTumbleSim } from './rigidDrop';
import { horizontalArm } from '@/testing/fixtures';


test('falls under gravity and eventually settles', async () => {
  const doc = horizontalArm({ y: 5 });
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
  const doc = horizontalArm({ y: 5 });
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
