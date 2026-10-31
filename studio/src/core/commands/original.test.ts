import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CommandBus, command } from './commandBus';
import { makeDocument, withJointValues, putEntity } from '@/core/model/index';

const start = () => putEntity(makeDocument({ name: 't' }), { kind: 'joint', id: 'j', name: 'j', state: { value: 0 } } as any);
const value = (d: any) => d.joints.j.state.value;
const setJ = (v: number) => command('set', (d: any) => withJointValues(d, { j: v }), (d: any) => d);

test('a simulated pose is shown but the design stays put', () => {
  const bus = new CommandBus(start(), { cap: 0 });
  bus.applyTransient((d: any) => withJointValues(d, { j: 1.2 }));
  assert.equal(value(bus.doc), 1.2);
  assert.equal(value(bus.original), 0);
  assert.equal(bus.showingSimulation, true);
});

test('Keep makes the shown pose the design, Back throws it away', () => {
  const bus = new CommandBus(start(), { cap: 0 });
  bus.applyTransient((d: any) => withJointValues(d, { j: 1.2 }));
  bus.revertToDesign();
  assert.equal(value(bus.doc), 0);
  assert.equal(bus.showingSimulation, false);
  bus.applyTransient((d: any) => withJointValues(d, { j: 0.7 }));
  bus.applyShownPose();
  assert.equal(value(bus.original), 0.7);
  assert.equal(bus.showingSimulation, false);
});

test('an edit is a design change and keeps the pose you see, like before', () => {
  const bus = new CommandBus(start(), { cap: 0 });
  bus.applyTransient((d: any) => withJointValues(d, { j: 0.5 }));
  bus.dispatch(setJ(0.9));
  assert.equal(value(bus.original), 0.9);
  assert.equal(bus.showingSimulation, false);
});

test('loading a document replaces both', () => {
  const bus = new CommandBus(start(), { cap: 0 });
  bus.applyTransient((d: any) => withJointValues(d, { j: 0.5 }));
  bus.reset(start());
  assert.equal(value(bus.doc), 0);
  assert.equal(bus.showingSimulation, false);
});
