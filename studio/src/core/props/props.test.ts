import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOINT_PROPS, propsFor, getProp, patchFor, checkValue } from './props';

const revolute = { type: 'revolute', limit: { lower: -1, upper: 1, effort: 2, velocity: 3 }, dynamics: { damping: 0.1, friction: 0 }, mimic: null };

test('a joint is offered only the properties that mean something for it', () => {
  assert.deepEqual(propsFor(JOINT_PROPS, { type: 'fixed' }).map((d) => d.path), []);
  const paths = propsFor(JOINT_PROPS, revolute).map((d) => `${d.path}:${d.unit ?? ''}`);
  assert.ok(paths.includes('limit.lower:°') && !paths.includes('limit.lower:mm') && !paths.some((p) => p.startsWith('mimic')));
});

test('a patch changes one value and keeps its neighbours', () => {
  assert.deepEqual(patchFor(revolute, 'limit.lower', -2), { limit: { lower: -2, upper: 1, effort: 2, velocity: 3 } });
  assert.deepEqual(patchFor({}, 'dynamics.damping', 0.5), { dynamics: { damping: 0.5 } });
});

test('values show in their units and scripted changes are checked', () => {
  const lower = propsFor(JOINT_PROPS, revolute).find((d) => d.path === 'limit.lower')!;
  assert.equal(Math.round(getProp(revolute, lower) * lower.scale!), -57);
  const ok = checkValue(revolute, JOINT_PROPS, 'limit.lower', -90);
  assert.ok(ok.ok && Math.abs(ok.stored + Math.PI / 2) < 1e-12);
  assert.match((checkValue(revolute, JOINT_PROPS, 'dynamics.damping', -1) as any).error, /below 0/);
  assert.match((checkValue(revolute, JOINT_PROPS, 'mimic.offset', 1) as any).error, /can't be set/);
});
