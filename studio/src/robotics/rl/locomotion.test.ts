/**
 * Locomotion (physics) task test on a small modular robot.
 * Run: npx tsx --test src/robotics/rl/locomotion.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeGeometry, GeometryType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { initPhysics } from '@/robotics/rl/physicsWorld';
import { ModelLocomotionTask } from '@/robotics/rl/locomotionTask';
import { MLPPolicy } from '@/robotics/rl/policy';
import { VectorESTrainer } from '@/robotics/rl/vectorTrainer';

// a 3-segment "worm": boxes along +X at ground height, 2 revolute joints about Z.
function buildModular() {
  const box = makeGeometry(GeometryType.BOX, { size: [0.5, 0.3, 0.3] });
  const links = [0, 1, 2].map((i) => ({ name: `S${i + 1}`, geometry: box, transform: { position: [i * 0.6, 0.3, 0], quaternion: [0, 0, 0, 1] } }));
  const joints = [0, 1].map((i) => ({
    name: `J${i + 1}`, type: 'revolute', axis: [0, 0, 1],
    limit: { lower: -1.0, upper: 1.0, effort: 5, velocity: 2 },
    origin: { position: [0.6, 0, 0], quaternion: [0, 0, 0, 1] },
  }));
  return buildSerialChain(makeDocument({ name: 'Worm' }), { name: 'Worm', links, joints }).doc;
}

test('locomotion env builds, steps physics, and produces finite reward', async () => {
  await initPhysics();
  const doc = buildModular();
  const task = new ModelLocomotionTask(doc, { maxSteps: 30 });
  assert.equal(task.actionDim, 2);                 // 2 joints
  assert.equal(task.obsDim, 2 + 5);
  task.reset(Math.random);

  let total = 0; let last: any = {};
  for (let s = 0; s < task.maxSteps; s++) {
    // open-loop sinusoidal gait just to exercise the dynamics
    const a = [Math.sin(s * 0.5), Math.cos(s * 0.5)];
    const out = task.act(a); total += out.reward; last = out.info;
    if (out.done) break;
  }
  assert.ok(Number.isFinite(total), `reward finite, got ${total}`);
  assert.ok(Number.isFinite(last.x), 'COM x is finite');
  task.dispose();
});

test('ES training on the modular robot produces finite returns (smoke)', async () => {
  await initPhysics();
  const doc = buildModular();
  const probe = new ModelLocomotionTask(doc, { maxSteps: 25 });
  const policy = new MLPPolicy(probe.obsDim, probe.actionDim, [12]);
  const trainer = new VectorESTrainer(() => new ModelLocomotionTask(doc, { maxSteps: 25 }), policy, { pop: 6, sigma: 0.1, alpha: 0.05, episodesPerEval: 1, seed: 2 });
  let r = 0;
  for (let g = 0; g < 3; g++) r = trainer.generation().evalReturn;
  assert.ok(Number.isFinite(r), `eval return finite, got ${r}`);
});
