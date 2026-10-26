import fs from 'node:fs';
import { STRAIGHT } from '../src/robotics/msrr2/model';
import { toSimScene } from '../src/robotics/msrr2/simScene';
fs.writeFileSync('C:/TETROBOT/logs/judge_scene.json', JSON.stringify(toSimScene({ modules: ['M1'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }], pose: { M1: { ...STRAIGHT } } })));
