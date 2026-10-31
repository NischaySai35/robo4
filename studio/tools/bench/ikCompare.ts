/**
 * GOS G4 stage B, part 2: the Studio's own IK (solveModelIK) on the same goals as tools/bench/ik_goals.py.
 * Run from studio/: npx tsx tools/bench/ikCompare.ts GOALS.json
 */
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { withJointValues } from '@/core/model/index';
import { computeFK } from '@/kinematics/modelFK';
import { solveModelIK } from '@/kinematics/modelIK';
import { solveGraphIK } from '@/core/gos/graphCore';

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const raw = JSON.parse(readFileSync('src/core/factory/single-module-demo.json', 'utf8'));
const doc: any = raw.model ?? raw;
const tip = Object.values<any>(doc.bodies).find((b) => b.name === data.tip)!;
const zero = withJointValues(doc, Object.fromEntries(Object.keys(doc.joints).map((id) => [id, 0])));
const pos = (d: any) => new THREE.Vector3().setFromMatrixPosition((computeFK(d) as any).get(tip.id).matrix);

// Studio FK and MuJoCo agree to 0.001 mm, but check the frames line up on this data before comparing.
const byName = Object.fromEntries(Object.values<any>(doc.joints).map((j) => [j.name, j.id]));
const g0 = data.goals[0];
const check = pos(withJointValues(doc, Object.fromEntries(Object.entries<number>(g0.q).map(([n, v]) => [byName[n], v]))));
const frameErr = check.distanceTo(new THREE.Vector3(...g0.tip)) * 1000;
console.log(`frame check: Studio FK vs MuJoCo for goal 0 differs by ${frameErr.toFixed(3)} mm`);

const rows = data.goals.map((g: any) => {
  const t = performance.now();
  const res = solveModelIK(zero, tip.id, g.tip, { iterations: 200 });
  const ms = performance.now() - t;
  const err = pos(withJointValues(zero, res ?? {})).distanceTo(new THREE.Vector3(...g.tip)) * 1000;
  return { ok: err < 2, err, ms };
});
const rust = data.goals.map((g: any) => {
  const t = performance.now();
  const res = solveGraphIK(zero, tip.id, g.tip, { iterations: 200, tolerance: 0.0005 });
  const ms = performance.now() - t;
  const err = pos(withJointValues(zero, res.values)).distanceTo(new THREE.Vector3(...g.tip)) * 1000;
  return { ok: err < 2, err, ms };
});
const med = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
const mk = data.mink;
const line = (name: string, r: any[]) => console.log(`| ${name} | ${r.filter((x) => x.ok).length}/${r.length} | ${med(r.map((x) => x.err ?? x.err_mm)).toFixed(1)} mm | ${med(r.map((x) => x.ms)).toFixed(1)} ms |`);
console.log('| Solver | Reached within 2 mm | Median error | Median time |\n|---|---|---|---|');
line('Studio solveModelIK (TypeScript)', rows);
line('GOS ik (mink, Python)', mk);
line('GOS GraphIK (Rust core, in the Studio)', rust);
