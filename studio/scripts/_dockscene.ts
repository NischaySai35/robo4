import fs from 'node:fs';
import { type Config, STRAIGHT } from '../src/robotics/msrr2/model';
import { toSimScene } from '../src/robotics/msrr2/simScene';
const out: Record<string, unknown> = {};
out.walk = toSimScene({ modules: ['M1'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }], pose: { M1: { ...STRAIGHT } } });
out.two = toSimScene({ modules: ['M1', 'M2'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }, { a: { floor: 'F1' }, b: { module: 'M2', port: 'A' }, slot: 0, locked: true }], pose: { M1: { ...STRAIGHT }, M2: { ...STRAIGHT } } });
fs.writeFileSync(process.argv[2], JSON.stringify(out));
