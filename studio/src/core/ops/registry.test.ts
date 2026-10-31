import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defineOperator, runOperator, canRun } from './registry';
import { findBindings, type Binding, type KeyLike } from './keymap';

const key = (key: string, m: Partial<KeyLike> = {}): KeyLike => ({ key, ctrlKey: false, metaKey: false, shiftKey: false, ...m });

test('run gives a clear result for missing, blocked, failing and working operators', () => {
  defineOperator({ id: 't.ok', label: 'Ok', group: 't', exec: () => 42 });
  defineOperator({ id: 't.blocked', label: 'Blocked', group: 't', poll: () => false, exec: () => 1 });
  defineOperator({ id: 't.throws', label: 'Throws', group: 't', exec: () => { throw new Error('boom'); } });
  assert.deepEqual(runOperator('t.ok'), { ok: true, value: 42 });
  assert.match((runOperator('nope') as any).error, /No operator/);
  assert.match((runOperator('t.blocked') as any).error, /can't run/);
  const log = console.error; console.error = () => {};
  assert.match((runOperator('t.throws') as any).error, /boom/);
  console.error = log;
  assert.equal(canRun('t.blocked'), false);
});

test('defining an operator twice is an error', () => {
  defineOperator({ id: 't.once', label: 'x', group: 't', exec: () => 0 });
  assert.throws(() => defineOperator({ id: 't.once', label: 'x', group: 't', exec: () => 0 }));
});

test('bindings match modifiers exactly, unless told not to care about Shift', () => {
  const map: Binding[] = [{ key: 's', ctrl: true, op: 'save' }, { key: 's', ctrl: true, shift: true, op: 'saveAs' }, { key: 's', op: 'scale' }, { key: '?', anyShift: true, op: 'help' }];
  assert.deepEqual(findBindings(map, key('s')).map((b) => b.op), ['scale']);
  assert.deepEqual(findBindings(map, key('S', { ctrlKey: true })).map((b) => b.op), ['save']);
  assert.deepEqual(findBindings(map, key('S', { ctrlKey: true, shiftKey: true })).map((b) => b.op), ['saveAs']);
  assert.deepEqual(findBindings(map, key('?', { shiftKey: true })).map((b) => b.op), ['help']);
});
