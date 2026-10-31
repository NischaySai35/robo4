import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { scheduleFrame, cancelFrame } from './frameScheduler';

const nextFrame = () => new Promise<void>((r) => { scheduleFrame(() => r()); });

test('callbacks share one frame, and one added during a frame waits for the next', async () => {
  const order: string[] = [];
  scheduleFrame(() => { order.push('a'); scheduleFrame(() => order.push('later')); });
  scheduleFrame(() => order.push('b'));
  await nextFrame();
  assert.deepEqual(order, ['a', 'b']);
  await nextFrame();
  assert.deepEqual(order, ['a', 'b', 'later']);
});

test('a cancelled callback does not run', async () => {
  let ran = false;
  cancelFrame(scheduleFrame(() => { ran = true; }));
  await nextFrame();
  assert.equal(ran, false);
});

test('one failing callback does not stop the others', async () => {
  const realError = console.error;
  console.error = () => {};
  let ran = false;
  scheduleFrame(() => { throw new Error('boom'); });
  scheduleFrame(() => { ran = true; });
  await nextFrame();
  console.error = realError;
  assert.equal(ran, true);
});

test('only the scheduler calls requestAnimationFrame', () => {
  const offenders: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(n) && !/frameScheduler/.test(n)) {
        const code = readFileSync(p, 'utf8').split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l)).join('\n');
        if (/(requestAnimationFrame|cancelAnimationFrame)\s*\(/.test(code)) offenders.push(p);
      }
    }
  };
  walk('src');
  assert.deepEqual(offenders, []);
});
