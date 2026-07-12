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
