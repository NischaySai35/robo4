// espNodesStore: modules default to the ESP-NOW bridge address; saved Wi-Fi names move over once, and only once.
// REUSE-CHECKED: no test covered espNodesStore; node:test style as src/robotics/msrr/modulink.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, String(v)); },
  removeItem: (k: string) => { mem.delete(k); },
};

async function fresh() {   // a new copy of the store module, as on a Studio start
  return import(`./espNodesStore.ts?start=${Math.random()}`);
}

test('first start ever: module 1 is the bridge address', async () => {
  mem.clear();
  const { useEspNodesStore } = await fresh();
  assert.equal(useEspNodesStore.getState().nodes[0].url, 'http://127.0.4.1');
  useEspNodesStore.getState().addNode();
  assert.equal(useEspNodesStore.getState().nodes[1].url, 'http://127.0.4.2');
});

test('saved modN.local moves to the bridge once; a Wi-Fi address typed later stays', async () => {
  mem.clear();
  mem.set('robo4:espNodes', JSON.stringify([
    { id: 'a', name: 'Module 1', url: 'http://mod1.local', componentId: 'c1' },
    { id: 'b', name: 'Module 2', url: 'http://mod2.local/', componentId: null },
    { id: 'c', name: 'Bench', url: 'http://192.168.137.50', componentId: null },
  ]));
  let { useEspNodesStore } = await fresh();
  assert.deepEqual(useEspNodesStore.getState().nodes.map((n: any) => n.url),
    ['http://127.0.4.1', 'http://127.0.4.2', 'http://192.168.137.50']);
  assert.equal(useEspNodesStore.getState().nodes[0].componentId, 'c1');
  useEspNodesStore.getState().updateNode('a', { url: 'http://mod1.local' });     // back to Wi-Fi by hand
  ({ useEspNodesStore } = await fresh());
  assert.equal(useEspNodesStore.getState().nodes[0].url, 'http://mod1.local');
});
