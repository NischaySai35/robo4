/**
 * redock-roomy.ts — re-solve ONE dock of a demo plan with room to correct (bends <= DOCK_BEND_DEG) and export it for physics.
 * Fast (one pose search, not the whole planner).   npx tsx scripts/redock-roomy.ts [demoIndex] [stepIndex] [seed]
 * -> C:/TETROBOT/logs/roomy_dock.json  { scene, plan: { steps: [pose_move to the pre-dock pose, dock] } }  (toSimPlan format)
 */
import { writeFileSync } from 'node:fs';
import { DEMO_PLANS } from '../src/robotics/msrr2/library/demoPlans';
import { optimisePose } from '../src/robotics/msrr2/optimise';
import { DOCK_BEND_DEG, poseMoveSeconds } from '../src/robotics/msrr2/planner';
import { poseMovePath } from '../src/robotics/msrr2/jointPath';
import { toSimPlan } from '../src/robotics/msrr2/simScene';
import { JOINTS, isBend, isFloorRef, type Edge, type ModuleId, type Config } from '../src/robotics/msrr2/model';

const di = Number(process.argv[2] ?? 0), si = Number(process.argv[3] ?? 1), seed = Number(process.argv[4] ?? 1);
const d = DEMO_PLANS[di]; const start = di === 0 && si === 1 ? d.start : d.plan.steps[si - 2].expected;
const key = (e: Edge) => JSON.stringify([e.a, e.b]);
const dockStep = d.plan.steps[si];
const nl0 = dockStep.expected.edges.find((e) => e.locked && !start.edges.some((b) => key(b) === key(e)))!;
// optional: dock into ANOTHER receiver of the same module (argv[5] = S1A | S1B | S2A | S2B) - more options, same rules
const port = process.argv[5]; const slotArg = process.argv[6];
const nl: Edge = port ? { ...nl0, b: { ...nl0.b, port: port as any }, slot: (slotArg !== undefined ? Number(slotArg) : nl0.slot) as any } : nl0;
console.log('dock', JSON.stringify(nl));
const active = start.modules.filter((m) => !start.unused.includes(m));
const mover = isFloorRef(nl.a) ? nl.b.module : (nl.a as { module: ModuleId }).module;
const topo = [...start.edges.filter((e) => e.locked), nl];
const maxBend = (c: Config) => Math.max(...active.flatMap((m) => JOINTS.filter(isBend).map((j) => Math.abs(c.pose[m][j] - 180))));
console.log(`old pre-dock pose: max bend ${maxBend(dockStep.expected).toFixed(1)} deg`);
let pre = optimisePose(topo, active, {}, { start, keepBase: true, frozen: active.filter((m) => m !== mover), stayNear: 0.05, restarts: 2, iterations: 80, seed, firstFeasible: true, bendLimitDeg: DOCK_BEND_DEG });
let coop = false;
if (!pre.feasible) { pre = optimisePose(topo, active, {}, { start, keepBase: true, stayNear: 0.05, restarts: 2, iterations: 80, seed: seed + 50, firstFeasible: true, bendLimitDeg: DOCK_BEND_DEG }); coop = true; }
if (!pre.feasible) { console.log('NO pre-dock pose with <= ' + DOCK_BEND_DEG + ' deg bends:', pre.report.reasons[0], pre.report.closureErrMm.toFixed(1), 'mm'); process.exit(1); }
const preCfg = pre.config;
console.log(`new pre-dock pose (${coop ? 'cooperative' : 'only ' + mover + ' moves'}): max bend ${maxBend(preCfg).toFixed(1)} deg, closure ${pre.report.closureErrMm.toFixed(2)} mm`);
for (const m of active) console.log(`   ${m}: ${JOINTS.map((j) => `${j} ${(preCfg.pose[m][j] - 180).toFixed(0)}`).join('  ')}`);
const path = poseMovePath(start, { ...preCfg, edges: start.edges }, seed, isFloorRef(nl.a) ? null : { a: nl.a as { module: ModuleId; port: 'A' }, b: nl.b }, 300);
const plan = {
  steps: [
    { verb: 'pose_move', label: `bend to reach (roomy, bends <= ${DOCK_BEND_DEG} deg)`, expected: { ...preCfg, edges: start.edges }, via: path ? path.path.slice(0, -1) : [], durationS: poseMoveSeconds(start, preCfg), successP: 0.99, margins: dockStep.margins, risky: false },
    { ...dockStep, expected: preCfg },
  ],
} as any;
writeFileSync('C:/TETROBOT/logs/roomy_dock.json', JSON.stringify({ title: d.title + ' (roomy dock)', plan: toSimPlan(start, plan) }));
console.log('wrote C:/TETROBOT/logs/roomy_dock.json');
