/**
 * Writes MJCF test cases plus the Studio's own FK answer, for tools/test_mjcf.py to check in real MuJoCo.
 * Run from studio/: npx tsx tools/bench/mjcfCases.ts OUT_DIR
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeDocument } from '@/core/model/index';
import { addEntities } from '@/core/commands/commands';
import { buildDefaultModuleEntities } from '@/core/factory/defaultModule';
import { computeFK } from '@/kinematics/modelFK';
import { exportMJCFPackage } from '@/core/serialization/exporters/mjcf';

const out = process.argv[2];
mkdirSync(join(out, 'meshes'), { recursive: true });
const body = (id: string, x: number, y = 0) => ({ kind: 'body', id, name: id, transform: { position: [x, y, 0], quaternion: [0, 0, 0, 1] }, visual: { geometry: { type: 'box', size: [0.1, 0.1, 0.1] } } });
const joint = (id: string, type: string, p: string, c: string, ox: number, oy = 0): any => ({ kind: 'joint', id, name: id, type, parentBodyId: p, childBodyId: c, axis: [0, 0, 1], origin: { position: [ox, oy, 0], quaternion: [0, 0, 0, 1] }, childRest: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] }, limit: { lower: -1, upper: 1 }, state: { value: 0 } });
const empty = { assets: {}, materials: {}, jointProfiles: {}, frames: {}, constraints: {}, components: {}, kind: 'document' };
const by = (l: any[]) => Object.fromEntries(l.map((e) => [e.id, e]));

const square = (type: string) => ({ ...empty, bodies: by([body('A', 0, 0), body('B', 0.2, 0), body('C', 0.2, 0.2), body('D', 0, 0.2)]),
  joints: by([joint('AB', 'revolute', 'A', 'B', 0.2), joint('BC', 'revolute', 'B', 'C', 0, 0.2), joint('CD', 'revolute', 'C', 'D', -0.2), joint('DA', type, 'D', 'A', 0, -0.2)]) });
const diamond = { ...empty, bodies: by([body('R', 0), body('P', 0.2, 0.1), body('Q', 0.2, -0.1), body('S', 0.4, 0)]),
  joints: by([joint('RP', 'revolute', 'R', 'P', 0.2, 0.1), joint('RQ', 'revolute', 'R', 'Q', 0.2, -0.1), joint('PS', 'revolute', 'P', 'S', 0.2, -0.1), joint('QS', 'revolute', 'Q', 'S', 0.2, 0.1)]) };
const reversedChain = { ...empty, bodies: by([body('c', 0.4), body('b', 0.2), body('a', 0)]),
  joints: by([joint('ab', 'revolute', 'a', 'b', 0.2), joint('bc', 'revolute', 'b', 'c', 0.2)]) };

const moduleDoc = (count: number) => {
  let d: any = makeDocument({ name: 'mods' });
  for (let i = 0; i < count; i++) d = addEntities(buildDefaultModuleEntities(d).entities).redo(d);
  return d;
};
const withBend = (d: any) => { // a real pose: joints away from 0 must still match Studio FK when set in MuJoCo
  const joints = { ...d.joints };
  Object.keys(joints).forEach((id, i) => { joints[id] = { ...joints[id], state: { ...joints[id].state, value: i % 2 ? 0.3 : -0.2 } }; });
  return { ...d, joints };
};

const cases: Record<string, any> = { square_revolute: square('revolute'), square_fixed: square('fixed'), diamond, reversed_chain: reversedChain, module1: moduleDoc(1), module2: moduleDoc(2) };
for (const [name, doc] of Object.entries(cases)) {
  const pkg = exportMJCFPackage(doc, name);
  mkdirSync(join(out, name, 'meshes'), { recursive: true });
  writeFileSync(join(out, name, 'scene.xml'), pkg.xml);
  for (const m of pkg.meshes) writeFileSync(join(out, name, m.file), Buffer.from(doc.assets[m.assetId].data, 'base64'));
  const worlds = (d: any) => { const fk: any = computeFK(d); return Object.fromEntries(Object.values<any>(d.bodies).map((b) => { const e = fk.get(b.id).matrix.elements; return [b.id, [e[12], e[13], e[14]]]; })); };
  const bent = name.startsWith('module') ? withBend(doc) : null;
  const zeroed = { ...doc, joints: Object.fromEntries(Object.entries<any>(doc.joints).map(([k, j]) => [k, { ...j, state: { ...j.state, value: 0 } }])) };
  writeFileSync(join(out, name, 'expect.json'), JSON.stringify({
    bodyNames: pkg.bodyNames,
    rest: worlds(zeroed),
    bent: bent && worlds(bent),
    bentValues: bent && Object.fromEntries(Object.values<any>(bent.joints).map((j: any) => [pkg.jointNames[j.id], j.state.value])),
    warnings: pkg.warnings,
  }));
  console.log(name, 'bodies', Object.keys(doc.bodies).length, 'joints', Object.keys(doc.joints).length, 'warnings', pkg.warnings.length);
}
