import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assemble, keyPhi } from './assemble';
import { type Config, STRAIGHT } from './model';

const mk = (slot: 0 | 1 | 2 | 3, bend = 200): Config => ({
  modules: ['M1', 'M2'], unused: [],
  edges: [
    { a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true },
    { a: { module: 'M1', port: 'B' }, b: { module: 'M2', port: 'S1A' }, slot, locked: true },
  ],
  pose: { M1: { ...STRAIGHT, B2: bend }, M2: { ...STRAIGHT, T2: 150 } },
});

test('a lock placed by the tree has zero key error on its own slot, and 90° on the others', () => {
  for (const slot of [0, 1, 2, 3] as const) {
    const asm = assemble(mk(slot));
    const A = asm.placed.get('M1')!.geo.ports.B, B = asm.placed.get('M2')!.geo.ports.S1A;
    for (const s2 of [0, 1, 2, 3]) {
      const deg = Math.abs(keyPhi(A, B, s2) * 180 / Math.PI);
      const want = [0, 90, 180, 90][(s2 - slot + 4) % 4];
      assert.ok(Math.abs(deg - want) < 1e-6, `slot ${slot} checked as ${s2}: ${deg} vs ${want}`);
    }
  }
});
