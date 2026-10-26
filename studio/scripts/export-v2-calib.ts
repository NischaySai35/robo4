/**
 * export-v2-calib.ts — reference poses for matching the Studio v2 module model to the
 * MuJoCo module (C:\TETROBOT\sim\train_v2.xml). For a few joint-angle sets it writes,
 * in the module's BASE frame (connector A at the origin, +Z = A's outward normal),
 * every body's centre of mass and both end connector positions. The Python verify
 * service fits the fixed frame transform and the joint signs from these.
 *
 *   npx tsx scripts/export-v2-calib.ts  →  C:\TETROBOT\sim\v2_calib.json
 */
import fs from 'node:fs';
import { moduleGeo } from '../src/robotics/msrr2/kin';

const sets: number[][] = [
  [0, 0, 0, 0, 0, 0, 0],
  [0.5, 0, 0, 0, 0, 0, 0],
  [0, 0.6, 0, 0, 0, 0, 0],
  [0, 0, 0.6, 0, 0, 0, 0],
  [0, 0, 0, 0.7, 0.5, 0, 0],
  [0, 0, 0, 0, 0.6, 0, 0],
  [0, 0, 0, 0, 0, 0.6, 0],
  [0, 0, 0, 0, 0, 0.4, 0.8],
  [0.3, -0.5, 0.4, -0.6, 0.7, -0.3, 0.5],
];
const out = sets.map((rad) => {
  const g = moduleGeo(rad, { p: [0, 0, 0], q: [0, 0, 0, 1] });
  return {
    rad,
    bodies: Object.fromEntries(g.bodies.map((b) => [b.name, b.com])),
    ports: Object.fromEntries(Object.entries(g.ports).map(([k, p]) => [k, { pos: p.pos, z: p.z, x: p.x }])),
  };
});
fs.writeFileSync('C:/TETROBOT/sim/v2_calib.json', JSON.stringify(out, null, 1));
console.log(`wrote ${out.length} calibration poses`);
