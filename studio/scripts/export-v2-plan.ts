/**
 * export-v2-plan.ts — write a plan as a VERIFY-service /rehearse request.
 *   npx tsx scripts/export-v2-plan.ts OUT.json [demoIndex]      (no index: a small synthetic plan)
 */
import fs from 'node:fs';
import { type Config, STRAIGHT, cloneConfig } from '../src/robotics/msrr2/model';
import type { Plan, PlanStep } from '../src/robotics/msrr2/planner';
import { toSimPlan } from '../src/robotics/msrr2/simScene';
import { DEMO_PLANS } from '../src/robotics/msrr2/library/demoPlans';

const i = process.argv[3];
let start: Config, plan: Plan;
if (i !== undefined) {
  const d = DEMO_PLANS[Number(i)]; start = d.start as Config; plan = d.plan as Plan;
} else {
  start = { modules: ['M1'], unused: [], edges: [{ a: { floor: 'F0' }, b: { module: 'M1', port: 'A' }, slot: 0, locked: true }], pose: { M1: { ...STRAIGHT } } };
  const bent = cloneConfig(start); bent.pose.M1.B2 = 135; bent.pose.M1.B3 = 135;
  const m = { maxTorquePct: 0, cogMarginMm: 999, minJointMarginDeg: 0 };
  const st = (verb: PlanStep['verb'], expected: Config): PlanStep => ({ verb, label: verb, expected, successP: 0.995, durationS: 4, margins: m, risky: false });
  plan = { ok: true, steps: [st('pose_move', bent), st('pose_move', start)], totalP: 0.99, totalS: 8, cost: 0, target: {} as never, why: [], expansions: 0 };
}
fs.writeFileSync(process.argv[2], JSON.stringify({ ...toSimPlan(start, plan), n_robots: 16, seed: 1 }));
console.log('wrote', plan.steps.length, 'steps');
