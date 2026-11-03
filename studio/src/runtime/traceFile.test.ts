// REUSE-CHECKED: traceFile test -> tests the new traceFile.ts, same node:test style as runtime.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTrace } from './traceFile';

const ev = (name: string, ts: number, dur: number, tid = 7) => ({ name, ph: 'X', ts, dur, pid: 1, tid });

test('a trace gives bars from time zero and totals per callback, busiest first', () => {
  const t = parseTrace(JSON.stringify({ traceEvents: [ev('a', 1000, 1000), ev('b', 2000, 5000, 8), ev('a', 8000, 3000), ev('a', 12000, 2000), { ph: 'M', name: 'thread_name' }] }));
  assert.equal(t.bars.length, 4);
  assert.equal(t.bars[0].startMs, 0);
  assert.equal(t.lengthMs, 13);
  assert.deepEqual(t.threads, [7, 8]);
  assert.deepEqual(t.rows.map((r) => r.name), ['a', 'b']);
  assert.deepEqual(t.rows[0], { name: 'a', count: 3, totalMs: 6, medianMs: 2, worstMs: 3 });
});

test('files that are not traces say what is wrong', () => {
  assert.throws(() => parseTrace('hello'), /not JSON/);
  assert.throws(() => parseTrace('{"a":1}'), /App\(trace=/);
  assert.throws(() => parseTrace('{"traceEvents":[]}'), /empty/);
});
