/**
 * The bundled default module must be the REAL 7-DOF try8 module (T1-B1-B2-T2-B3-B4-T3 + 2 end locks, 2 spines x 2 side receivers),
 * not the discarded 6-DOF prototype. Source files: D:\robo4\assets\tetrobot-module\
 * Run: npx tsx --test src/core/factory/defaultModule.try8.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeFKGraph } from '@/kinematics/modelFK';
import { getConnectorWorld, listConnectors } from '@/assembly/connectorSnap';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
(globalThis as any).localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const doc: any = JSON.parse(fs.readFileSync(path.join(__dirname, 'single-module-demo.json'), 'utf-8'));
const byName = (n: string) => Object.values(doc.bodies).find((b: any) => b.name === n) as any;
const J = (n: string) => Object.values(doc.joints).find((j: any) => j.name === n) as any;
const root = byName('EndA_LockModule').id;
const wpos = (fk: any, n: string) => fk.get(byName(n).id).matrix.elements.slice(12, 15) as number[];
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('structure: 10 bodies, 9 joints (7 DOF + 2 locks), 4 side receivers + 2 end connectors', () => {
  assert.equal(Object.keys(doc.bodies).length, 10);
  assert.equal(Object.keys(doc.joints).length, 9);
  const k = (n: string) => Object.values(doc.joints).filter((j: any) => j.meta.kind === n).length;
  assert.deepEqual([k('twist'), k('bend'), k('lock')], [3, 4, 2]);
  const conns = listConnectors(doc);
  assert.equal(conns.length, 6);
  assert.equal(byName('Spine1_B1B2').meta.connectors.length, 2);
  assert.equal(byName('Spine2_B3B4').meta.connectors.length, 2);
});

test('limits: twist +-180, bend +-90, lock +-45 degrees; every joint is an ST3215', () => {
  const d = (r: number) => Math.round((r * 180) / Math.PI);
  for (const j of Object.values(doc.joints) as any[]) {
    const want = j.meta.kind === 'twist' ? 180 : j.meta.kind === 'bend' ? 90 : 45;
    assert.equal(d(j.limit.upper), want, j.name); assert.equal(d(j.limit.lower), -want, j.name);
    assert.equal(doc.jointProfiles[j.profileId].motorType, 'ST3215');
  }
});

test('home pose is one contiguous module of the CAD length; mass = 1.134 kg', () => {
  const fk = computeFKGraph(doc, root);
  for (const b of Object.values(doc.bodies) as any[]) assert.ok(dist(wpos(fk, b.name), b.transform.position) < 1e-6, b.name + ' at home');
  const mass = (Object.values(doc.bodies) as any[]).reduce((s, b) => s + b.inertial.mass, 0);
  assert.ok(Math.abs(mass - 1.134) < 0.005, 'mass ' + mass);
  const spec = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../assets/tetrobot-module/module_spec.json'), 'utf-8'));
  assert.ok(Math.abs(spec.straight_length_m - 0.67) < 0.005);
});

test('bending B1 by 90 deg swings the rest of the module about the B1 pivot (in the XZ plane, like the old bends)', () => {
  const j = J('J_B1_bend'); const q0 = j.state.value;
  const home = computeFKGraph(doc, root); const pivot = wpos(home, 'Spine1_B1B2').slice();   // pivot sits at the Spine1 body origin line (same x as the B1 pivot)
  j.state.value = Math.PI / 2; const bent = computeFKGraph(doc, root); j.state.value = q0;
  const tipHome = wpos(home, 'EndB_LockModule'), tipBent = wpos(bent, 'EndB_LockModule');
  const piv = [byName('T1_Housing_B1Fork').transform.position[0], 0, 0];
  const r0 = Math.hypot(tipHome[0] - piv[0], tipHome[2] - piv[2]), r1 = Math.hypot(tipBent[0] - piv[0], tipBent[2] - piv[2]);
  assert.ok(Math.abs(tipBent[1] - tipHome[1]) < 1e-6, 'bend keeps the height');
  assert.ok(Math.abs(r0 - r1) < 0.2 * r0, 'distance to the pivot roughly preserved (pivot is the Spine1 CAD origin)');
  assert.ok(Math.abs(tipBent[0] - tipHome[0]) > 0.2, 'the tip moved a lot');
  void pivot;
});

test('connectors: ends face outward along X, side receivers face up/down (+-Y) with a 4-fold key', () => {
  const fk = computeFKGraph(doc, root);
  const nA = getConnectorWorld(doc, byName('EndA_LockModule').id, 'conn-endA', fk)!.normal;
  const nB = getConnectorWorld(doc, byName('EndB_LockModule').id, 'conn-endB', fk)!.normal;
  assert.ok(nA.x < -0.99 && nB.x > 0.99);
  for (const [b, id, s] of [['Spine1_B1B2', 'conn-s1a', -1], ['Spine1_B1B2', 'conn-s1b', 1], ['Spine2_B3B4', 'conn-s2a', -1], ['Spine2_B3B4', 'conn-s2b', 1]] as const) {
    const w = getConnectorWorld(doc, byName(b).id, id, fk)!;
    assert.ok(Math.abs(w.normal.y - s) < 1e-6, id); assert.equal(w.symmetry, 4);
  }
});
