/**
 * topology.test.ts — M2: the enumerator's counts and rules, and the pose optimiser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enumerateTopologies } from './topology';
import { edgeIsValid, configProblems } from './rules';
import { optimisePose } from './optimise';
import { STRAIGHT } from './model';

test('distinct tree topologies: N=2 → 2, N=3 → 10, N=4 → 51 (matches the independent Python count)', () => {
  assert.equal(enumerateTopologies(1).length, 1);
  assert.equal(enumerateTopologies(2).length, 2);
  assert.equal(enumerateTopologies(3).length, 10);
  assert.equal(enumerateTopologies(4).length, 51);
  // two locks between two modules (a loop): 9, as the Python enumerator found
  assert.equal(enumerateTopologies(2, 1).length, 9);
});

test('every enumerated topology obeys the connector rules and is one piece', () => {
  for (const n of [2, 3]) {
    for (const t of enumerateTopologies(n)) {
      for (const e of t) assert.ok(edgeIsValid(e), JSON.stringify(e));
      const modules = Array.from({ length: n }, (_, i) => `M${i + 1}`);
      const probs = configProblems({ modules, unused: [], edges: t, pose: Object.fromEntries(modules.map((m) => [m, { ...STRAIGHT }])) });
      assert.deepEqual(probs, []);
    }
  }
});

test('the pose optimiser finds a stable standing pose for one module', () => {
  // standing on its own it must also survive a light touch (≥ 2 N at the top), which needs a wider stance: more search
  const r = optimisePose([], ['M1'], { height_mm: { min: 200 }, stands_upright: { is: true } }, { seed: 3, restarts: 16, iterations: 300 });
  assert.ok(r.feasible, `not feasible: ${r.report.reasons.join(' | ')}`);
  assert.ok(r.report.margins.tipPushN! >= 2, `tips at ${r.report.margins.tipPushN} N`);
  assert.deepEqual(r.unmet, [], `unmet: ${r.unmet.join(', ')}`);
  assert.ok(Number(r.tags.height_mm!.value) >= 200);
});
