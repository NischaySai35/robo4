import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITY_TYPES, findEntity } from './entityTypes';
import { checkValue, patchFor } from './props';

const doc: any = {
  bodies: { b1: { kind: 'body', id: 'b1', name: 'Spine', inertial: { mass: 0.2, com: [0, 0, 0], inertia: {}, auto: false } } },
  joints: {}, materials: { m1: { kind: 'material', id: 'm1', name: 'PLA', metalness: 0, roughness: 0.6, density: 1240 } },
  jointProfiles: { p1: { kind: 'jointProfile', id: 'p1', name: 'Bend', torqueLimit: 2.7 } },
};

test('every kind says where it lives and has a command that edits it', () => {
  for (const t of Object.values(ENTITY_TYPES)) {
    assert.equal(typeof t.update, 'function', t.kind);
    assert.ok(t.collection && t.label && t.props, t.kind);
  }
});

test('find by name or id, with errors that list what there is', () => {
  assert.equal((findEntity(doc, 'body', 'Spine') as any).entity.id, 'b1');
  assert.equal((findEntity(doc, 'body', 'b1') as any).entity.name, 'Spine');
  assert.match((findEntity(doc, 'body', 'Nope') as any).error, /Bodies: Spine/);
  assert.match((findEntity(doc, 'robot', 'x') as any).error, /Kinds: body, joint/);
});

test('a body mass is set in grams, stored in kilograms, and undone', () => {
  const f = findEntity(doc, 'body', 'Spine') as any;
  const r = checkValue(f.entity, f.type.props, 'inertial.mass', 250) as any;
  assert.ok(r.ok); assert.equal(r.stored, 0.25);
  const cmd = f.type.update(f.entity.id, patchFor(f.entity, 'inertial.mass', r.stored));
  const after = cmd.redo(structuredClone(doc));
  assert.equal(after.bodies.b1.inertial.mass, 0.25);
  assert.deepEqual(after.bodies.b1.inertial.com, [0, 0, 0], 'the rest of inertial is kept');
  assert.equal(cmd.undo(after).bodies.b1.inertial.mass, 0.2);
});

test('limits are checked: roughness cannot pass 1, torque cannot go below 0', () => {
  const m = findEntity(doc, 'material', 'PLA') as any;
  assert.match((checkValue(m.entity, m.type.props, 'roughness', 1.5) as any).error, /above 1/);
  const p = findEntity(doc, 'jointProfile', 'Bend') as any;
  assert.match((checkValue(p.entity, p.type.props, 'torqueLimit', -1) as any).error, /below 0/);
});
