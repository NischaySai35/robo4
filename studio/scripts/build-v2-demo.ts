/**
 * build-v2-demo.ts — run the v2 planner on the demo transformations and save the plans
 * (src/robotics/msrr2/library/demo_plans.json) so the page can play them instantly.
 *
 *   npx tsx scripts/build-v2-demo.ts [demoIndex]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Config, STRAIGHT } from '../src/robotics/msrr2/model';
import { planTo } from '../src/robotics/msrr2/planner';
import { LIBRARY } from '../src/robotics/msrr2/library';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../src/robotics/msrr2/library/demo_plans.json');

const twoStanding: Config = {
  modules: ['M1', 'M2'], unused: [],
  edges: [
    { a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true },
    { a: { floor: 'F1' }, b: { module: 'M2', port: 'A' }, slot: 0, locked: true },
  ],
  pose: { M1: { ...STRAIGHT }, M2: { ...STRAIGHT } },
};
const oneStanding: Config = {
  modules: ['M1'], unused: [],
  edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }],
  pose: { M1: { ...STRAIGHT } },
};
const lib = (id: string) => { const e = LIBRARY.find((x) => x.id === id); if (!e) throw new Error(`no library entry ${id}`); return e; };

const DEMOS = [
  { title: 'Two modules standing in F0 and F1 → T (end docked on a spine)', start: twoStanding, target: lib('t_anchored_2m') },
  { title: 'Two modules standing in F0 and F1 → tripod seat (free-standing)', start: twoStanding, target: lib('tripod_2m') },
  { title: 'One module standing in F0 → curled stand (free-standing)', start: oneStanding, target: lib('curled_stand_1m') },
];

const only = process.argv[2] !== undefined ? Number(process.argv[2]) : null;
const existing: unknown[] = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf-8')) : [];
const out: unknown[] = [];
DEMOS.forEach((d, i) => {
  if (only !== null && i !== only) { const prev = (existing as { title: string }[]).find((x) => x.title === d.title); if (prev) out.push(prev); return; }
  const t0 = Date.now();
  const plan = planTo(d.start, d.target, { maxExpansions: 8, onProgress: (m) => console.log(`  [${i}] ${m}`) });
  console.log(`[${i}] ${d.title}: ${plan.ok ? `${plan.steps.length} steps, ${(plan.totalP * 100).toFixed(1)}%` : 'NO PLAN'} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  for (const s of plan.steps) console.log(`      ${s.verb.padEnd(9)} ${(s.successP * 100).toFixed(1).padStart(5)}%  ${s.durationS.toFixed(0).padStart(3)} s  torque ${s.margins.maxTorquePct.toFixed(0)}%  ${s.label}${s.note ? ` (${s.note})` : ''}`);
  if (plan.ok) out.push({ title: d.title, start: d.start, target: d.target, plan });
});
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`wrote ${out.length} demo plan(s)`);
