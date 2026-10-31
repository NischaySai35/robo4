import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { upgradeProject, PROJECT_SUBVERSION } from './versioning';
import { computeFK } from '@/kinematics/modelFK';

// A project as an early version wrote it: no subversion, no components, no joint profiles, no childRest.
const OLD_FILE = {
  format: 'tetrobot-project', version: 1,
  model: {
    kind: 'document', name: 'old',
    bodies: { a: { kind: 'body', id: 'a', name: 'a', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] } }, b: { kind: 'body', id: 'b', name: 'b', transform: { position: [1, 0, 0], quaternion: [0, 0, 0, 1] } } },
    joints: { j: { kind: 'joint', id: 'j', name: 'j', type: 'revolute', parentBodyId: 'a', childBodyId: 'b', axis: [0, 0, 1], origin: { position: [1, 0, 0], quaternion: [0, 0, 0, 1] } } },
    assets: {},
  },
};

test('an old file gains what the current code expects, and FK works on it', () => {
  const up = upgradeProject(OLD_FILE);
  assert.equal(up.subversion, PROJECT_SUBVERSION);
  for (const c of ['components', 'jointProfiles', 'frames', 'constraints', 'materials']) assert.deepEqual(up.model[c], {});
  assert.deepEqual(up.model.joints.j.childRest, { position: [0, 0, 0], quaternion: [0, 0, 0, 1] });
  const e = (computeFK(up.model) as any).get('b').matrix.elements;
  assert.deepEqual([e[12], e[13], e[14]], [1, 0, 0]);
});

test('the input file object is left alone', () => {
  const before = JSON.stringify(OLD_FILE);
  upgradeProject(OLD_FILE);
  assert.equal(JSON.stringify(OLD_FILE), before);
});

test('upgrading twice changes nothing, and a current file keeps its data', () => {
  const once = upgradeProject(OLD_FILE);
  assert.deepEqual(upgradeProject(once), once);
});

test('the bundled real module still upgrades and computes FK for every body', () => {
  const raw = JSON.parse(readFileSync('src/core/factory/single-module-demo.json', 'utf8'));
  const up = upgradeProject({ format: 'tetrobot-project', version: 1, model: raw.model ?? raw });
  const fk: any = computeFK(up.model);
  assert.equal(Object.keys(up.model.bodies).length, 10);
  for (const id of Object.keys(up.model.bodies)) assert.ok(fk.get(id), id);
});
