import fs from 'node:fs';
import { type Config, STRAIGHT } from '../src/robotics/msrr2/model';
import { toSimScene } from '../src/robotics/msrr2/simScene';
const out: Record<string, unknown> = {};
for (const slot of [0, 1, 2, 3] as const) {
  const c: Config = { modules: ['M1', 'M2'], unused: [], edges: [{ a: { module: 'M1', port: 'B' }, b: { module: 'M2', port: 'A' }, slot, locked: true }], pose: { M1: { ...STRAIGHT }, M2: { ...STRAIGHT } } };
  out[`endend_slot${slot}`] = toSimScene(c);
  const s: Config = { modules: ['M1', 'M2'], unused: [], edges: [{ a: { module: 'M1', port: 'S1A' }, b: { module: 'M2', port: 'A' }, slot, locked: true }], pose: { M1: { ...STRAIGHT }, M2: { ...STRAIGHT } } };
  out[`endside_slot${slot}`] = toSimScene(s);
}
out.standing = toSimScene({ modules: ['M1'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }], pose: { M1: { ...STRAIGHT } } });
fs.writeFileSync(process.argv[2], JSON.stringify(out));
