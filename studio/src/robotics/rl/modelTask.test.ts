/**
 * ModelReachTask integration test (real arm chain). Run:
 *   npx tsx --test src/robotics/rl/modelTask.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ModelReachTask } from '@/robotics/rl/modelTask';
import { MLPPolicy } from '@/robotics/rl/policy';
import { VectorESTrainer, makeRng } from '@/robotics/rl/vectorTrainer';
import { verticalArm } from '@/testing/fixtures';


test('ModelReachTask exposes the right obs/action spaces for a real arm', () => {
  const { doc, tipId } = verticalArm();
  const task = new ModelReachTask(doc, tipId);
  assert.equal(task.actionDim, 3);       // 3 revolute joints
  assert.equal(task.obsDim, 6);          // 3 joints + 3 (target-tip)
  task.reset(Math.random);
  assert.equal(task.observe().length, 6);
});

test('training a real arm produces finite, improving returns', () => {
  const { doc, tipId } = verticalArm();
  const probe = new ModelReachTask(doc, tipId);
  // Seed BOTH the policy init and the trainer so the whole run is reproducible — the
  // eval return is otherwise noisy (randomized target per generation) and the test flaky.
  const policy = new MLPPolicy(probe.obsDim, probe.actionDim, [16], undefined, makeRng(7));
  const trainer = new VectorESTrainer(() => new ModelReachTask(doc, tipId), policy, { pop: 24, sigma: 0.12, alpha: 0.08, seed: 5 });
  const first = trainer.generation().evalReturn;
  let last = first;
  for (let g = 0; g < 20; g++) last = trainer.generation().evalReturn;
  assert.ok(Number.isFinite(first) && Number.isFinite(last), 'returns finite');
  // Deterministic run (seeded init + ES): training must measurably improve the return.
  assert.ok(last > first, `training did not improve: first=${first.toFixed(2)} last=${last.toFixed(2)}`);
});
