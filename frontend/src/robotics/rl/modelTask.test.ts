/**
 * ModelReachTask integration test (real arm chain). Run:
 *   npx tsx --test src/robotics/rl/modelTask.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeGeometry, GeometryType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { ModelReachTask } from '@/robotics/rl/modelTask';
import { MLPPolicy } from '@/robotics/rl/policy';
import { VectorESTrainer } from '@/robotics/rl/vectorTrainer';

function buildArm() {
  const box = makeGeometry(GeometryType.BOX, { size: [0.3, 0.3, 0.3] });
  const links = [0, 1, 2, 3].map((i) => ({ name: `L${i + 1}`, geometry: box, transform: { position: [0, i + 1, 0], quaternion: [0, 0, 0, 1] } }));
  const joints = [0, 1, 2].map((i) => ({
    name: `J${i + 1}`, type: 'revolute', axis: [0, 0, 1],
    limit: { lower: -1.5, upper: 1.5, effort: 5, velocity: 1.2 },
    origin: { position: [0, 1, 0], quaternion: [0, 0, 0, 1] },
  }));
  const { doc, bodyIds } = buildSerialChain(makeDocument({ name: 'Arm' }), { name: 'Arm', links, joints });
  return { doc, tipId: bodyIds[3] };
}

test('ModelReachTask exposes the right obs/action spaces for a real arm', () => {
  const { doc, tipId } = buildArm();
  const task = new ModelReachTask(doc, tipId);
  assert.equal(task.actionDim, 3);       // 3 revolute joints
  assert.equal(task.obsDim, 6);          // 3 joints + 3 (target-tip)
  task.reset(Math.random);
  assert.equal(task.observe().length, 6);
});

test('training a real arm produces finite, improving returns', () => {
  const { doc, tipId } = buildArm();
  const probe = new ModelReachTask(doc, tipId);
  const policy = new MLPPolicy(probe.obsDim, probe.actionDim, [16]);
  const trainer = new VectorESTrainer(() => new ModelReachTask(doc, tipId), policy, { pop: 24, sigma: 0.12, alpha: 0.08, seed: 5 });
  const first = trainer.generation().evalReturn;
  let last = first;
  for (let g = 0; g < 20; g++) last = trainer.generation().evalReturn;
  assert.ok(Number.isFinite(first) && Number.isFinite(last), 'returns finite');
  assert.ok(last >= first - 1e-6, `return should not collapse: first=${first.toFixed(2)} last=${last.toFixed(2)}`);
});
