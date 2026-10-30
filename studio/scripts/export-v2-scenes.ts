/**
 * export-v2-scenes.ts — dump a few v2 configs as VERIFY-service scenes (for testing the service).
 *   npx tsx scripts/export-v2-scenes.ts OUT.json [NAME ...]   NAME = a library id or chainN (N modules end to end, lying, no floor connectors)
 */
import fs from 'node:fs';
import { type Config, STRAIGHT } from '../src/robotics/msrr2/model';
import { toSimScene } from '../src/robotics/msrr2/simScene';
import { LIBRARY } from '../src/robotics/msrr2/library';

const lying: Config = { modules: ['M1'], unused: [], edges: [], pose: { M1: { ...STRAIGHT } } };
const standing: Config = { modules: ['M1'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }], pose: { M1: { ...STRAIGHT } } };
const lib = (id: string): Config => { const e = LIBRARY.find((x) => x.id === id)!; return { modules: Array.from({ length: e.nModules }, (_, i) => `M${i + 1}`), unused: [], edges: e.topology, pose: e.pose, baseFrame: e.baseFrame }; };
const chain = (n: number): Config => {
  const ms = Array.from({ length: n }, (_, i) => `M${i + 1}`);
  return { modules: ms, unused: [], edges: ms.slice(1).map((m, i) => ({ a: { module: ms[i], port: 'B' as const }, b: { module: m, port: 'A' as const }, slot: 0, locked: true })), pose: Object.fromEntries(ms.map((m) => [m, { ...STRAIGHT }])) };
};
const names = process.argv.slice(3);
const out: Record<string, unknown> = names.length ? {} : { lying: toSimScene(lying), standing: toSimScene(standing) };
for (const id of names.length ? names : ['curled_stand_1m', 'arch_1m', 't_anchored_2m', 't_stand_2m', 'l_stand_2m']) {
  const n = /^chain(\d+)$/.exec(id);
  if (n) out[id] = toSimScene(chain(Number(n[1])));
  else if (LIBRARY.find((x) => x.id === id)) out[id] = toSimScene(lib(id));
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log('wrote', Object.keys(out).join(', '));
