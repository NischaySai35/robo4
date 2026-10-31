/**
 * GOS G0 baseline: what today's Studio code costs on this machine (RESTRUCTURING §10.8).
 * Run from studio/: npx tsx tools/bench/g0.ts
 * Prints median and p99 of repeated timed blocks. Sizes are small so the run takes seconds.
 */
import * as THREE from 'three';
import { MessageBus } from '@/runtime/messageBus';
import { makeDocument, withJointValues } from '@/core/model/index';
import { addEntities } from '@/core/commands/commands';
import { buildDefaultModuleEntities } from '@/core/factory/defaultModule';
import { computeFK } from '@/kinematics/modelFK';
import { solveModelIK } from '@/kinematics/modelIK';
import { spreadScore } from '@/assembly/connectorSnap';
import { exportMJCF } from '@/core/serialization/exporters/mjcf';

function bench(label: string, fn: () => void, repeat = 200, unit = 'us', per = 1) {
  const t: number[] = [];
  for (let i = 0; i < repeat; i++) { const a = performance.now(); fn(); t.push((performance.now() - a) * 1000 / per); }
  t.sort((x, y) => x - y);
  const f = unit === 'ms' ? 0.001 : 1;
  console.log(`${label.padEnd(44)} median ${(t[t.length >> 1] * f).toFixed(2).padStart(10)} ${unit}   p99 ${(t[Math.floor(t.length * 0.99)] * f).toFixed(2).padStart(10)} ${unit}`);
}

const fkOf = (d: any, id: string) => { const fk: any = computeFK(d); return fk.get(id).matrix; };

const docWith = (modules: number) => {
  let doc: any = makeDocument({ name: 'bench' });
  for (let i = 0; i < modules; i++) doc = addEntities(buildDefaultModuleEntities(doc).entities).redo(doc);
  return doc;
};

// Topics: same process, small message, 1000 per timed block.
const b = new MessageBus();
const topic = '/bench';
let got = 0;
b.subscribe(topic, () => { got++; });
const msg = { q: new Array(7).fill(0.1) };
bench('bus publish+deliver, in-process', () => { for (let i = 0; i < 1000; i++) b.publish(topic, msg); }, 200, 'us', 1000);
if (!got) throw new Error('bus delivered nothing, the number above is meaningless');

// Joint state for 3 modules as JSON, which is what the HTTP path to MuJoCo sends today.
const js = { t: 1.5, names: Array.from({ length: 21 }, (_, i) => `M${i >> 3}.J${i}`), q: new Array(21).fill(0.123456) };
bench('JSON stringify+parse, 21 joints', () => { JSON.parse(JSON.stringify(js)); }, 2000);

for (const m of [1, 3, 6]) {
  const doc = docWith(m);
  const bodies = Object.keys(doc.bodies).length, joints = Object.keys(doc.joints).length;
  console.log(`-- ${m} module(s) in the document, not connected to each other: ${bodies} bodies, ${joints} joints`);
  bench('computeFK', () => { computeFK(doc); }, 200);
  bench('spreadScore (VSEPR)', () => { spreadScore(doc); }, 200);
  bench('exportMJCF', () => { exportMJCF(doc); }, 50);
  // One chain only: solveModelIK walks a single path, so more modules only add unrelated bodies.
  const tip = Object.values<any>(doc.bodies).find((x) => x.name.startsWith('EndB'))!;
  // A goal a short way from the tip's rest pose, so it is reachable; the check below proves it.
  const rest = fkOf(doc, tip.id);
  const p0 = new THREE.Vector3().setFromMatrixPosition(rest);
  const target = [p0.x - 0.03, p0.y + 0.08, p0.z + 0.02];
  let res: any;
  bench('solveModelIK one call (position goal)', () => { res = solveModelIK(doc, tip.id, target); }, 30, 'ms');
  const after = new THREE.Vector3().setFromMatrixPosition(fkOf(withJointValues(doc, res), tip.id));
  console.log(`   reached: ${(after.distanceTo(new THREE.Vector3(...(target as [number, number, number]))) * 1000).toFixed(2)} mm from the goal, chain of ${Object.keys(res).length} joints`);
}
