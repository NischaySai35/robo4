/**
 * Auto-save change detection.
 *
 * The auto-save timer fires every 30s forever and used to re-serialise, re-pack and
 * re-write the whole project — mesh assets included — every single time, regardless of
 * whether anything had changed. On a large model that is tens of MB allocated twice a
 * minute indefinitely, which showed up as a JS heap that climbed with TIME rather than
 * with use. These tests pin the guard that makes an idle auto-save a no-op.
 *
 * Run: npx tsx --test src/core/serialization/projectFingerprint.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { projectFingerprint } from './projectFingerprint';

const project = (over: Record<string, unknown> = {}) => ({
  format: 'tetrobot-project',
  version: 1,
  savedAt: new Date().toISOString(),
  model: { bodies: { a: { id: 'a', transform: { position: [0, 0, 0] } } }, assets: { m1: { data: 'AAAA' } } },
  animation: { duration: 4, tracks: {} },
  workspace: { page: 'editor' },
  ...over,
});

test('an unchanged project fingerprints identically even though savedAt differs every call', () => {
  const a = projectFingerprint({ ...project(), savedAt: '2026-01-01T00:00:00.000Z' }, 1);
  const b = projectFingerprint({ ...project(), savedAt: '2099-12-31T23:59:59.000Z' }, 1);
  assert.equal(a, b, 'savedAt must not participate — it changes on every serializeProject() call');
  assert.notEqual(a, null);
});

test('a real model edit changes the fingerprint', () => {
  const before = projectFingerprint(project(), 1);
  const after = projectFingerprint(project({
    model: { bodies: { a: { id: 'a', transform: { position: [0, 1, 0] } } }, assets: { m1: { data: 'AAAA' } } },
  }), 1);
  assert.notEqual(before, after);
});

test('an animation edit changes the fingerprint', () => {
  const before = projectFingerprint(project(), 1);
  const after = projectFingerprint(project({ animation: { duration: 8, tracks: {} } }), 1);
  assert.notEqual(before, after, 'keyframe/animation work must still auto-save');
});

test('asset payloads are NOT stringified — a new assets reference is signalled by the token', () => {
  // Same token + different asset BYTES must fingerprint the same: stringifying megabytes of
  // base64 mesh data on every timer tick is the cost this whole guard exists to avoid.
  const big = projectFingerprint(project({
    model: { bodies: {}, assets: { m1: { data: 'ZZZZZZZZZZZZ' } } },
  }), 1);
  const small = projectFingerprint(project({
    model: { bodies: {}, assets: { m1: { data: 'AAAA' } } },
  }), 1);
  assert.equal(big, small, 'asset contents must not be walked by the fingerprint');
  assert.ok(!big!.includes('ZZZZ'), 'asset payload must not appear in the fingerprint at all');

  // ...but a changed assets REFERENCE (import / edit-mesh) bumps the token and does differ.
  assert.notEqual(projectFingerprint(project(), 1), projectFingerprint(project(), 2));
});

test('an unserialisable project returns null so the caller saves rather than skipping', () => {
  const cyclic: any = project();
  cyclic.self = cyclic;
  assert.equal(projectFingerprint(cyclic, 1), null);
});
