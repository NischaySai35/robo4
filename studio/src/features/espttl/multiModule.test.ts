import test from 'node:test';
import assert from 'node:assert/strict';

// the stores read browser storage when they load; give the test a small stand-in first
const mem = new Map<string, string>();
(globalThis as any).localStorage ??= { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
const { normalizePose } = await import('./timelineStore');
const { splitKey, jointKey, byModule } = await import('@/state/espTtlStore');

test('old frames with bare servo ids load as module 1', () => {
  assert.deepEqual(normalizePose({ 3: 180, '2:5': 90, bad: 1, 4: 'x' }), { '1:3': 180, '2:5': 90 });
});

test('a joint name holds module and servo, and same servo ids on two modules stay apart', () => {
  assert.equal(jointKey(2, 5), '2:5');
  assert.deepEqual(splitKey('2:5'), { mod: 2, id: 5 });
  const m = byModule({ '1:1': 10, '2:1': 20, '2:3': 30 });
  assert.deepEqual(m.get(1), { 1: 10 });
  assert.deepEqual(m.get(2), { 1: 20, 3: 30 });
});

test('modules the radio gateway names are added once, as 127.0.4.N (= modN.local); other names are left to the user', async () => {
  const { addModules, moduleNumber } = await import('@/features/servo/espPoll');
  const { useEspNodesStore } = await import('@/state/espNodesStore');
  const before = useEspNodesStore.getState().nodes.length;
  addModules(['mod2', 'mod2', 'mod3', 'kitchen', null]);
  addModules(['mod3']);
  const nodes = useEspNodesStore.getState().nodes;
  assert.equal(nodes.length, before + 2);
  assert.deepEqual(nodes.slice(-2).map(n => n.url), ['http://127.0.4.2', 'http://127.0.4.3']);
  assert.equal(moduleNumber('http://mod1.local', '', 0), moduleNumber('http://127.0.4.1', '', 5));
});
