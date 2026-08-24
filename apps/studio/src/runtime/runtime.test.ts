/**
 * Runtime core tests. Run: npx tsx --test src/runtime/runtime.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { MessageBus } from './messageBus';
import { ParameterServer } from './params';
import { ServiceRegistry } from './services';
import { ActionRegistry } from './actions';
import { TransformTree } from './tf';
import { Recorder, Player } from './recorder';
import { bus as globalBus } from './messageBus';
import { clock } from './clock';

test('bus: publish/subscribe delivers messages', () => {
  const bus = new MessageBus();
  const got: number[] = [];
  bus.subscribe<number>('/a', (m) => got.push(m));
  bus.publish('/a', 1);
  bus.publish('/a', 2);
  assert.deepEqual(got, [1, 2]);
});

test('bus: latched replays last message to new subscriber', () => {
  const bus = new MessageBus();
  bus.advertise('/state', { latched: true });
  bus.publish('/state', { x: 9 });
  let seen: any = null;
  bus.subscribe('/state', (m) => { seen = m; });
  assert.deepEqual(seen, { x: 9 });
});

test('bus: stats track count + topic list', () => {
  const bus = new MessageBus();
  bus.publish('/t', 1); bus.publish('/t', 2); bus.publish('/t', 3);
  const t = bus.topics().find((x) => x.name === '/t')!;
  assert.equal(t.count, 3);
});

test('params: declare + coerce to min/max', () => {
  const p = new ParameterServer();
  p.declare({ name: '/r', type: 'number', value: 5, min: 0, max: 10 });
  p.set('/r', 999);
  assert.equal(p.get('/r'), 10);
  p.set('/r', -3);
  assert.equal(p.get('/r'), 0);
});

test('services: call returns provider result', async () => {
  const s = new ServiceRegistry();
  s.advertise<{ a: number; b: number }, number>('/add', (req) => req.a + req.b);
  assert.equal(await s.call('/add', { a: 2, b: 3 }), 5);
});

test('services: missing service throws', async () => {
  const s = new ServiceRegistry();
  await assert.rejects(() => s.call('/nope', {}));
});

test('actions: feedback + result', async () => {
  const a = new ActionRegistry();
  a.advertise<number, number, number>('/count', async (goal, ctx) => {
    for (let i = 1; i <= goal; i++) ctx.report(i);
    return goal * 10;
  });
  const fb: number[] = [];
  const h = a.send<number, number, number>('/count', 3);
  h.onFeedback((f) => fb.push(f));
  const res = await h.result;
  assert.equal(res, 30);
});

test('actions: cancel sets canceled status', async () => {
  const a = new ActionRegistry();
  a.advertise<number, number, number>('/wait', async (_g, ctx) => {
    await new Promise((r) => setTimeout(r, 50));
    if (ctx.signal.aborted) return -1;
    return 1;
  });
  const h = a.send<number, number, number>('/wait', 0);
  h.cancel();
  await h.result.catch(() => {});
  assert.equal(h.status, 'canceled');
});

test('tf: lookup composes through the tree', () => {
  const t = new TransformTree();
  t.set({ parent: 'world', child: 'a', t: 0, position: [1, 0, 0], quaternion: [0, 0, 0, 1] });
  t.set({ parent: 'a', child: 'b', t: 0, position: [0, 2, 0], quaternion: [0, 0, 0, 1] });
  const r = t.lookup('world', 'b')!;
  assert.ok(Math.abs(r.position[0] - 1) < 1e-9);
  assert.ok(Math.abs(r.position[1] - 2) < 1e-9);
});

test('tf: interpolates between samples in time', () => {
  const t = new TransformTree();
  t.set({ parent: 'world', child: 'a', t: 0, position: [0, 0, 0], quaternion: [0, 0, 0, 1] });
  t.set({ parent: 'world', child: 'a', t: 100, position: [10, 0, 0], quaternion: [0, 0, 0, 1] });
  const r = t.lookup('world', 'a', 50)!;
  assert.ok(Math.abs(r.position[0] - 5) < 1e-6, `got ${r.position[0]}`);
});

test('recorder + player: round-trip and seek snapshot', () => {
  // record on the global bus (recorder taps it)
  globalBus.clear();
  clock.useSource('wall');
  const rec = new Recorder();
  rec.start(['/topic']);
  globalBus.publish('/topic', { v: 1 });
  globalBus.publish('/topic', { v: 2 });
  globalBus.publish('/other', { v: 99 }); // filtered out
  const bag = rec.stop();
  assert.equal(bag.messages.length, 2);
  assert.deepEqual(bag.topics, ['/topic']);

  // play back: seek to end re-publishes latest snapshot per topic
  const player = new Player();
  const seen: any[] = [];
  globalBus.subscribe('/topic', (m) => seen.push(m));
  player.load(bag);
  player.seek(1);
  assert.deepEqual(seen[seen.length - 1], { v: 2 });
  player.unload();
  assert.equal(clock.source, 'wall');
});
