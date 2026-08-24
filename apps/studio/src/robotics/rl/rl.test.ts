/**
 * RL engine tests. Run: npx tsx --test src/robotics/rl/rl.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { LinearPolicy, MLPPolicy, policyFromSpec } from './policy';
import { PointReachTask } from './task';
import { VectorESTrainer, makeRng } from './vectorTrainer';
import { putSkill, getSkill, listSkills } from './policyStore';

test('policy params round-trip through spec', () => {
  const p = new MLPPolicy(4, 2, [8]);
  const spec = p.spec();
  const q = policyFromSpec(spec);
  assert.deepEqual(q.forward([0.1, 0.2, 0.3, 0.4]), p.forward([0.1, 0.2, 0.3, 0.4]));
});

test('VectorES improves return on PointReach (linear policy)', () => {
  const task0 = new PointReachTask(2);
  const policy = new LinearPolicy(task0.obsDim, task0.actionDim);
  const trainer = new VectorESTrainer(() => new PointReachTask(2), policy, { pop: 40, sigma: 0.2, alpha: 0.1, seed: 7 });
  const first = trainer.generation().evalReturn;
  let last = first;
  for (let g = 0; g < 25; g++) last = trainer.generation().evalReturn;
  assert.ok(last > first, `return should improve: first=${first.toFixed(2)} last=${last.toFixed(2)}`);
});

test('trained policy actually reaches the goal', () => {
  const policy = new MLPPolicy(4, 2, [16]);
  const trainer = new VectorESTrainer(() => new PointReachTask(2), policy, { pop: 48, sigma: 0.2, alpha: 0.1, seed: 3 });
  for (let g = 0; g < 40; g++) trainer.generation();
  const brain = trainer.trained();

  // run a deterministic episode and check final distance to goal
  const task = new PointReachTask(2);
  const rng = makeRng(99);
  task.reset(rng);
  let obs = task.observe();
  let info: any = {};
  for (let s = 0; s < task.maxSteps; s++) {
    const out = task.act(brain.forward(obs));
    obs = task.observe(); info = out.info;
    if (out.done) break;
  }
  assert.ok(info.dist < 0.5, `trained policy should approach goal, dist=${info.dist?.toFixed(3)}`);
});

test('skills persist in the model document', () => {
  let doc: any = { meta: {} };
  const policy = new LinearPolicy(4, 2);
  doc = putSkill(doc, { name: 'reach', policy: policy.spec(), task: 'point-reach', meta: { generations: 10, bestReturn: 3.2, trainedAt: Date.now() } });
  assert.equal(listSkills(doc).length, 1);
  const s = getSkill(doc, 'reach')!;
  assert.equal(s.task, 'point-reach');
  const restored = policyFromSpec(s.policy);
  assert.equal(restored.actionDim, 2);
});
