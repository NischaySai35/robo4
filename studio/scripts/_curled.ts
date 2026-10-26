import fs from 'node:fs';
import { STRAIGHT } from '../src/robotics/msrr2/model';
import { toSimScene } from '../src/robotics/msrr2/simScene';
const pose = { M1: { ...STRAIGHT, B3: 260, B4: 260 } };
fs.writeFileSync('C:/TETROBOT/logs/curled_scenes.json', JSON.stringify({
  locked: toSimScene({ modules: ['M1'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }], pose }),
  free: toSimScene({ modules: ['M1'], unused: [], edges: [], pose, baseFrame: { module: 'M1', worldPose: { p: [0.3, 0.0063, 0.15], q: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2] }, dropToFloor: true } }),
}));
