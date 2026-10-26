/**
 * export-v2-scenes.ts — dump a few v2 configs as VERIFY-service scenes (for testing the service).
 *   npx tsx scripts/export-v2-scenes.ts OUT.json
 */
import fs from 'node:fs';
import { type Config, STRAIGHT } from '../src/robotics/msrr2/model';
import { toSimScene } from '../src/robotics/msrr2/simScene';
import { LIBRARY } from '../src/robotics/msrr2/library';

const lying: Config = { modules: ['M1'], unused: [], edges: [], pose: { M1: { ...STRAIGHT } } };
const standing: Config = { modules: ['M1'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }], pose: { M1: { ...STRAIGHT } } };
const lib = (id: string): Config => { const e = LIBRARY.find((x) => x.id === id)!; return { modules: Array.from({ length: e.nModules }, (_, i) => `M${i + 1}`), unused: [], edges: e.topology, pose: e.pose, baseFrame: e.baseFrame }; };
const out: Record<string, unknown> = { lying: toSimScene(lying), standing: toSimScene(standing) };
for (const id of ['curled_stand_1m', 'arch_1m', 't_anchored_2m', 't_stand_2m', 'l_stand_2m']) if (LIBRARY.find((x) => x.id === id)) out[id] = toSimScene(lib(id));
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log('wrote', Object.keys(out).join(', '));
