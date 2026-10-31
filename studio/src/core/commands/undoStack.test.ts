import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UndoStack } from './undoStack';
import { makeDocument, putEntity } from '@/core/model/index';
import { projectStepsSame, type ProjectStep } from './projectStep';

test('undo and redo walk the states, and a new edit clears redo', () => {
  const u = new UndoStack<number>((a, b) => a === b);
  u.record(1); u.record(2); u.record(3);
  assert.equal(u.undo(), 2);
  assert.equal(u.undo(), 1);
  assert.equal(u.undo(), null);
  assert.equal(u.redo(), 2);
  u.record(9);
  assert.equal(u.canRedo, false);
  assert.equal(u.undo(), 2);
});

test('an unchanged state adds no step, and the cap drops the oldest', () => {
  const u = new UndoStack<number>((a, b) => a === b, 2);
  u.record(1); u.record(1);
  assert.equal(u.canUndo, false);
  u.record(2); u.record(3); u.record(4);
  assert.equal(u.undo(), 3);
  assert.equal(u.undo(), 2);
  assert.equal(u.undo(), null);
});

test('a state restored by undo is not recorded as a new edit', () => {
  const u = new UndoStack<number>((a, b) => a === b);
  u.record(1); u.record(2);
  const back = u.undo()!;
  u.sync(back); u.record(back);
  assert.equal(u.canRedo, true);
});

test('100 edits on a 300-body document share every unchanged body', () => {
  let doc: any = makeDocument({ name: 'big' });
  for (let i = 0; i < 300; i++) doc = putEntity(doc, { kind: 'body', id: `b${i}`, name: `b${i}`, transform: { position: [i, 0, 0] } });
  const steps: ProjectStep[] = [{ model: doc, animation: '' }];
  const u = new UndoStack<ProjectStep>(projectStepsSame);
  u.record(steps[0]);
  for (let i = 0; i < 100; i++) {
    doc = putEntity(doc, { ...doc.bodies.b0, transform: { position: [0, i + 1, 0] } });
    const s = { model: doc, animation: '' };
    steps.push(s); u.record(s);
  }
  const unique = new Set(steps.flatMap((s) => Object.values(s.model.bodies)));
  assert.equal(unique.size, 300 + 100, 'only the edited body may be new in each step');
  let back: ProjectStep | null = null;
  for (let i = 0; i < 100; i++) back = u.undo();
  assert.equal(back!.model, steps[0].model, 'undo returns the exact original document');
});

test('a new document object with the same contents is not a new step', () => {
  const doc: any = makeDocument({ name: 'a' });
  assert.equal(projectStepsSame({ model: doc, animation: 'x' }, { model: { ...doc }, animation: 'x' }), true);
  assert.equal(projectStepsSame({ model: doc, animation: 'x' }, { model: doc, animation: 'y' }), false);
});
