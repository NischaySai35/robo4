/**
 * BoxWorld (MuJoCo-backed): static robot bodies, box pool spawn/fall/remove,
 * and impact-torque estimation on the robot's joint chain.
 *
 * Run: npx tsx --test src/viewport/BoxWorld.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxWorld, extraContactTorques } from './BoxWorld';
import { horizontalArm, restFK } from '@/testing/fixtures';



test('robot bodies stay static (do not move) while boxes fall', async () => {
  const doc = horizontalArm({ limit: null });
  const fk = restFK(doc);
  const world = await BoxWorld.create(doc, fk, -3.2);
  const rb = [...world._robotBodies.values()][0];
  const p0 = rb.GetPosition();
  const before = [p0.GetX(), p0.GetY(), p0.GetZ()];
  for (let i = 0; i < 100; i++) world.stepFor(1 / 60);
  const p1 = rb.GetPosition();
  const after = [p1.GetX(), p1.GetY(), p1.GetZ()];
  assert.deepEqual(before, after, 'static robot body must not move under physics');
  world.dispose();
});

test('spawnBox falls and removeBox parks it out of the pool', async () => {
  const doc = horizontalArm({ limit: null });
  const world = await BoxWorld.create(doc, restFK(doc), -50);
  const h = world.spawnBox([0, 10, 0], [0.1, 0.1, 0.1], 500);
  assert.notEqual(h, -1);
  const before = world.boxPoses().get(h)!.pos[1];
  for (let i = 0; i < 100; i++) world.stepFor(1 / 60);
  const after = world.boxPoses().get(h)!.pos[1];
  assert.ok(after < before, `box should fall: ${before} -> ${after}`);
  world.removeBox(h);
  assert.ok(!world.boxPoses().has(h));
  world.dispose();
});

test('updateRobotPose moves a static body to its new pose', async () => {
  const doc = horizontalArm({ limit: null });
  const fk = restFK(doc);
  const world = await BoxWorld.create(doc, fk, -3.2);
  const bodyId = Object.keys(doc.bodies)[0];
  const rb = world._robotBodies.get(bodyId);
  const newFk = new Map(fk);
  newFk.set(bodyId, { position: [10, 20, 30], quaternion: [0, 0, 0, 1] });
  world.updateRobotPose(newFk);
  const p = rb.GetPosition();
  assert.ok(Math.abs(p.GetX() - 10) < 1e-6, `body should have moved to its new pose, got x=${p.GetX()}`);
  world.dispose();
});

test('a hard impact registers an impulsive torque on the nearby joint chain', async () => {
  const doc = horizontalArm({ limit: null });
  const fk = restFK(doc);
  const world = await BoxWorld.create(doc, fk, -3.2);
  extraContactTorques.clear();
  // Drop a heavy box directly onto the second link from just above it.
  const targetPos = fk.get(Object.keys(doc.bodies)[1])!.position;
  const h = world.spawnBox([targetPos[0], targetPos[1] + 0.5, targetPos[2]], [0.15, 0.15, 0.15], 3000);
  let sawImpact = false;
  for (let i = 0; i < 60; i++) {
    world.stepFor(1 / 60);
    if (extraContactTorques.size > 0) { sawImpact = true; break; }
  }
  assert.ok(sawImpact, 'a heavy box dropped onto a link should register an impact torque');
  world.removeBox(h);
  world.dispose();
});
