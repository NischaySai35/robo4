import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keywordIntent, rankShapes, validateIntent } from './intent';
import { LIBRARY } from './library';

test('LLM replies are validated: unknown tags and bad bounds are dropped, prose around JSON is tolerated', () => {
  const { intent, problems } = validateIntent('Sure! {"required_tags": {"height_mm": {"min": 300}, "fly": {"is": true}, "reach_mm": "far"}, "preferences": {"prefer": "tall"}}');
  assert.ok(intent);
  assert.deepEqual(intent.required_tags, { height_mm: { min: 300 } });
  assert.equal(intent.preferences.prefer, 'tall');
  assert.equal(problems.length, 2);
  assert.equal(validateIntent('no json here').intent, null);
});

test('the offline reader maps plain requests to tags', () => {
  assert.deepEqual(keywordIntent('make a bridge over a 25 cm gap').required_tags.spans_gap_mm, { min: 250 });
  assert.equal(keywordIntent('stand tall').required_tags.stands_upright?.is, true);
  assert.ok(keywordIntent('hello').clarifying_question);
});

test('ranking uses the measured library tags and the module count', () => {
  const r = rankShapes(LIBRARY, keywordIntent('stand tall'), 1);
  assert.ok(r.length > 0);
  for (const x of r) assert.equal(x.entry.nModules, 1);
  // the best match comes first (whether a single module CAN stand tall is up to the library + physics, not this test)
  for (const x of r) assert.ok(r[0].fit >= x.fit, `${r[0].entry.id} fits less than ${x.entry.id}`);
});
