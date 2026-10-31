import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bridge, createViewport, releaseViewport, setActiveViewport, activeViewport } from './cameraBridge';

test('reads go to the active viewport, then fall back to the editor', () => {
  const editor = createViewport('editor');
  const undo = () => {};
  editor.undo = undo; editor.camera = 'editor-cam';
  const msrr = createViewport('msrr');
  msrr.camera = 'msrr-cam';
  assert.equal(activeViewport(), msrr);
  assert.equal(bridge.camera, 'msrr-cam');
  assert.equal(bridge.undo, undo, 'MSRR has no undo of its own: it must still reach the editor');
  releaseViewport(msrr); releaseViewport(editor);
});

test('closing a viewport gives control back and leaves the editor untouched', () => {
  const editor = createViewport('editor');
  editor.camera = 'editor-cam';
  const msrr = createViewport('msrr');
  msrr.camera = 'msrr-cam'; msrr.fitCamera = () => {};
  releaseViewport(msrr);
  assert.equal(activeViewport(), editor);
  assert.equal(bridge.camera, 'editor-cam');
  assert.equal(bridge.fitCamera, null, 'nothing from MSRR may stay behind');
  releaseViewport(editor);
});

test('an editor that opens while MSRR is on screen does not take focus', () => {
  const msrr = createViewport('msrr');
  const editor = createViewport('editor');
  assert.equal(activeViewport(), msrr);
  setActiveViewport(editor);
  assert.equal(activeViewport(), editor);
  releaseViewport(msrr); releaseViewport(editor);
});

test('with no viewport, reads give the defaults and writes are not lost silently', () => {
  assert.equal(activeViewport(), null);
  assert.equal(bridge.camera, null);
  assert.throws(() => { bridge.camera = 'x'; }, /owns|handle/);
});
