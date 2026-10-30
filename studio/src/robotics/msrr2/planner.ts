/**
 * planner.ts — L1 verbs + L3 roadmap planner (brief §5, milestone M4).
 *
 * THE MOVE. A module never lets go first. To move a lock it
 *   1. pose_move  — bends (every intermediate pose checked: stable, in budget, no collision)
 *   2. dock       — locks its free END onto a new port, closing a loop for a moment
 *   3. undock     — PEELS an old lock off (tilt about the rim, then lift)
 * so the robot is one statically-checked piece at every instant. That is the measured
 * hand-over-hand step, the only reconfiguration the hardware has demonstrated.
 *
 * THE SEARCH. Dijkstra over robot states (lock graph + pose), cost per verb
 *   −log(successP) + λ·durationS     (λ from plannerConfig.json)
 * so the cheapest plan is the most RELIABLE one, time breaking ties. A state reaches the
 * target when its lock graph is the target's topology up to renaming / turning modules
 * over; the last step re-solves the target's pose for these actual module labels against
 * the target's required tags (which is also the module assignment).
 */
import {
  type Config, type Edge, type ShapeEntry, type VerbKind, type Margins, type PortId, type ModuleId,
  CONFIG, JOINTS, PORTS, isEndPort, isFloorRef, cloneConfig,
} from './model';
import { checkStatic, type StaticReport } from './statics';
import { optimisePose, tagShortfall, type TagSpec } from './optimise';
import { measureStaticTags } from './tags';
import { edgeIsValid, configProblems } from './rules';
import { canonicalKey } from './canonical';
import { assemble } from './assemble';
import { poseMoveOk, poseMovePath, pathViaRetreat, descendToDock } from './jointPath';
export { poseMoveOk, poseMovePath } from './jointPath';

export interface PlanStep {
  verb: VerbKind;
  label: string;
  /** the robot after this step */
  expected: Config;
  successP: number;
  durationS: number;
  margins: Margins;
  /** below 90% success, or within 10% of a limit */
  risky: boolean;
  /** for pose_move: poses passed through on the way (joint-space legs) */
  via?: Config[];
  note?: string;
}

export interface Plan {
  ok: boolean;
  steps: PlanStep[];
  totalP: number;
  totalS: number;
  cost: number;
  target: ShapeEntry;
  why: string[];
  expansions: number;
}

const V = CONFIG.verbs;
const LAMBDA = CONFIG.lambdaPerSecond;
const stepCost = (p: number, s: number) => -Math.log(Math.max(1e-6, p)) + LAMBDA * s;

const marginsOf = (r: StaticReport): Margins => ({
  maxTorquePct: r.margins.maxTorquePct, cogMarginMm: Math.min(999, r.margins.cogMarginMm), minJointMarginDeg: r.margins.minJointMarginDeg,
  sagMm: r.margins.sagMm, tipPushN: r.margins.tipPushN,
});
// risky: unreliable, near the torque limit, or FRAGILE (standing so that a light touch tips it)
const risky = (p: number, m: Margins) => p < 0.9 || (m.tipPushN ?? 999) < CONFIG.robustness.minTipPushN || m.maxTorquePct > CONFIG.limits.torqueBudgetPct * 0.9
  || (m.cogMarginMm < 999 && m.cogMarginMm < CONFIG.limits.cogMarginMm * 1.1);

/** Time for a joint move at ≤ 35°/s (the fastest joint sets it), plus settling. */
export function poseMoveSeconds(a: Config, b: Config): number {
  let worst = 0;
  for (const m of a.modules) for (const j of JOINTS) worst = Math.max(worst, Math.abs((b.pose[m]?.[j] ?? 180) - (a.pose[m]?.[j] ?? 180)));
  return worst / CONFIG.limits.maxJointDegS + 1;
}

/**
 * How reliable docking this end onto that port is, from the measured stats.
 * The 82% end→side figure was measured with the partner STANDING IN A FLOOR RECEIVER
 * (C:\TETROBOT\sim\dock_side.py), so a receiver whose module is anchored to the floor
 * or resting on it docks at that rate. A receiver held up only by another module is the
 * "air docking" case (30-39%).
 */
/** bends of a pre-dock pose stay this far from straight at most (15 deg of room before the 90 deg stops) */
export const DOCK_BEND_DEG = CONFIG.limits.bendDeg - 15;

export function dockKind(cfg: Config, e: Edge): { p: number; s: number; kind: string } {
  if (isFloorRef(e.a)) return { p: V.dock_floor.successP, s: V.dock_floor.durationS, kind: 'floor dock' };
  const a = e.a as { module: ModuleId; port: PortId };
  const recv = !isEndPort(a.port) ? a : !isEndPort(e.b.port) ? e.b : e.b;
  const kind = isEndPort(a.port) && isEndPort(e.b.port) ? 'end↔end' : 'end→side';
  const r = checkStatic({ ...cfg, edges: cfg.edges.filter((x) => !(x === e)) });
  const grounded = cfg.edges.some((x) => x.locked && isFloorRef(x.a) && x.b.module === recv.module)
    || r.contacts.some((c) => c.module === recv.module);
  if (!grounded) return { p: V.dock_air.successP, s: V.dock_air.durationS, kind: `air ${kind}` };
  return kind === 'end↔end'
    ? { p: V.dock_end_end.successP, s: V.dock_end_end.durationS, kind }
    : { p: V.dock_end_side.successP, s: V.dock_end_side.durationS, kind };
}

const edgeKey = (e: Edge) => `${isFloorRef(e.a) ? `F:${e.a.floor}` : `${e.a.module}.${e.a.port}`}|${e.b.module}.${e.b.port}`;
const sameEdge = (x: Edge, y: Edge) => edgeKey(x) === edgeKey(y)
  || (!isFloorRef(x.a) && !isFloorRef(y.a) && `${x.a.module}.${x.a.port}` === `${y.b.module}.${y.b.port}` && `${x.b.module}.${x.b.port}` === `${y.a.module}.${y.a.port}`);

function connectedWithout(cfg: Config, drop: Edge): boolean {
  const ids = cfg.modules.filter((m) => !cfg.unused.includes(m));
  const par = new Map(ids.map((m) => [m, m]));
  const f = (m: string): string => { while (par.get(m) !== m) m = par.get(m)!; return m; };
  for (const e of cfg.edges) {
    if (!e.locked || e === drop || isFloorRef(e.a)) continue;
    par.set(f(e.a.module), f(e.b.module));
  }
  return new Set(ids.map(f)).size === 1;
}

/** Every new lock a free END could make onto a free port of another module. */
function candidateLocks(cfg: Config): Edge[] {
  const used = new Set<string>();
  for (const e of cfg.edges) if (e.locked) { if (!isFloorRef(e.a)) used.add(`${e.a.module}.${e.a.port}`); used.add(`${e.b.module}.${e.b.port}`); }
  const out: Edge[] = [];
  for (const x of cfg.modules) for (const pe of ['A', 'B'] as PortId[]) {
    if (used.has(`${x}.${pe}`)) continue;
    for (const y of cfg.modules) {
      if (y === x) continue;
      for (const pp of PORTS) {
        if (used.has(`${y}.${pp}`)) continue;
        const e: Edge = { a: { module: x, port: pe }, b: { module: y, port: pp }, slot: 0, locked: true };
        if (!edgeIsValid(e)) continue;
        if (out.some((o) => sameEdge(o, e))) continue;
        out.push(e);
      }
    }
    // a free end may also step into a free floor receiver (the measured walk step)
    const busy = new Set(cfg.edges.filter((e) => e.locked && isFloorRef(e.a)).map((e) => (e.a as { floor: string }).floor));
    for (const a of CONFIG.floorAnchors) {
      if (busy.has(a.id)) continue;
      out.push({ a: { floor: a.id }, b: { module: x, port: pe }, slot: 0, locked: true });
    }
  }
  return out;
}

interface Node { cfg: Config; cost: number; steps: PlanStep[] }

export interface PlanOptions { maxExpansions?: number; seed?: number; onProgress?: (msg: string) => void; debug?: (msg: string) => void; effort?: number; maxSuccessors?: number }

export function planTo(current: Config, target: ShapeEntry, opts: PlanOptions = {}): Plan {
  const why: string[] = [];
  const spec = (target.spec ?? {}) as TagSpec;
  const targetModules = Array.from({ length: target.nModules }, (_, i) => `M${i + 1}`);
  const targetKey = canonicalKey(target.topology, targetModules);
  const effort = opts.effort ?? 1;
  const log = (s: string) => { why.push(s); opts.onProgress?.(s); };

  const active = current.modules.filter((m) => !current.unused.includes(m));
  if (active.length !== target.nModules) {
    log(`the target needs ${target.nModules} module(s), the robot has ${active.length} active — park or add modules first`);
    return { ok: false, steps: [], totalP: 0, totalS: 0, cost: Infinity, target, why, expansions: 0 };
  }
  const startCheck = checkStatic(current);
  if (!startCheck.ok) log(`warning: the current robot does not pass the static check (${startCheck.reasons[0]})`);

  const open: Node[] = [{ cfg: cloneConfig(current), cost: 0, steps: [] }];
  const seen = new Set<string>();
  let expansions = 0;
  let best: { node: Node; final: PlanStep[] } | null = null;
  const maxExp = opts.maxExpansions ?? 12;

  while (open.length && expansions < maxExp) {
    open.sort((a, b) => a.cost - b.cost);
    const node = open.shift()!;
    if (best && node.cost >= best.node.cost + best.final.reduce((s, x) => s + stepCost(x.successP, x.durationS), 0)) break;
    const key = canonicalKey(node.cfg.edges.filter((e) => e.locked), active);
    if (seen.has(key)) continue;
    seen.add(key);
    expansions++;
    log(`exploring lock graph #${expansions}: ${node.cfg.edges.map(edgeKey).join(', ') || 'none'} (cost so far ${node.cost.toFixed(2)})`);

    // ── goal: right lock graph → re-solve the target pose here and move into it ──
    if (key === targetKey) {
      let fin = optimisePose(node.cfg.edges, active, spec, { start: node.cfg, keepBase: true, stayNear: 0.02, restarts: 4 * effort, iterations: 200, seed: opts.seed ?? 3, firstFeasible: true });
      // A robot standing on its own feet may have to settle onto OTHER feet to take the
      // target shape (e.g. a tripod's third foot): try again with the resting orientation free.
      const freeStanding = !node.cfg.edges.some((e) => e.locked && isFloorRef(e.a));
      if ((!fin.feasible || fin.unmet.length) && freeStanding) {
        log('  no pose near the current one meets the target; trying with the resting orientation free');
        const again = optimisePose(node.cfg.edges, active, spec, { start: node.cfg, stayNear: 0.005, restarts: 8 * effort, iterations: 300, seed: (opts.seed ?? 3) + 1, firstFeasible: true });
        // only a wider joint search: the joint-path check keeps the base fixed, so the
        // robot must stay on (nearly) the same resting orientation — no rolling onto new feet
        const m0 = active[0];
        const q0 = assemble(node.cfg).placed.get(m0)?.base.q, q1 = assemble(again.config).placed.get(m0)?.base.q;
        const turnDeg = q0 && q1 ? (2 * Math.acos(Math.min(1, Math.abs(q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3]))) * 180) / Math.PI : 180;
        if (again.feasible && !again.unmet.length && turnDeg < 10) fin = again;
        else if (again.feasible && !again.unmet.length) log(`  …only by rolling the robot ${turnDeg.toFixed(0)}° onto other feet, which no verb does`);
      }
      if (fin.feasible && !fin.unmet.length) {
        const mvp = poseMovePath(node.cfg, fin.config, opts.seed ?? 1);
        const mv = mvp ? { ok: true as const, worst: mvp.worst, why: '' } : { ok: false as const, worst: null, why: '(no safe joint path)' };
        if (mv.ok && mvp) {
          const s = poseMoveSeconds(node.cfg, fin.config);
          const step: PlanStep = { via: mvp.path.slice(0, -1), verb: 'pose_move', label: `pose into ${target.name}`, expected: fin.config, successP: V.pose_move.successP, durationS: s, margins: mv.worst, risky: risky(V.pose_move.successP, mv.worst) };
          const total = node.cost + stepCost(step.successP, step.durationS);
          if (!best || total < best.node.cost + stepCost(best.final[0].successP, best.final[0].durationS)) best = { node, final: [step] };
          log(`  reaches the target: ${target.name}`);
        } else log(`  right locks, but moving into the target pose fails ${mv.why}`);
      } else log(`  right locks, but no pose here meets the target (${fin.unmet.join('; ') || fin.report.reasons[0]})`);
      continue;
    }

    // ── expand (a): release a floor receiver without docking anything new ──
    // (how a robot built while anchored ends up standing on its own feet)
    for (const old of node.cfg.edges) {
      if (!old.locked || !isFloorRef(old.a)) continue;
      const after: Config = { ...cloneConfig(node.cfg), edges: node.cfg.edges.filter((e) => e !== old).map((e) => ({ ...e })) };
      if (configProblems(after).length) continue;
      if (!after.edges.some((e) => e.locked && isFloorRef(e.a))) {
        const pl = assemble(node.cfg).placed.get(active[0])!;
        after.baseFrame = { module: active[0], worldPose: { p: pl.base.p, q: pl.base.q }, dropToFloor: true };
      }
      // stand it on its own feet first if it would not stand as it is
      let ready = after; let prep: PlanStep | null = null;
      // releasing this lock leaves exactly the target's lock graph: take the target shape
      // WHILE STILL ANCHORED, so the peel lands it on the target's feet (a free robot
      // cannot roll onto other feet)
      const toTarget = canonicalKey(after.edges.filter((e) => e.locked), active) === targetKey && !after.edges.some((e) => e.locked && isFloorRef(e.a));
      const needPrep = !checkStatic(after).ok || (toTarget && optimisePoseUnmet(after, spec));
      if (needPrep) {
        const st = optimisePose(after.edges, active, toTarget ? spec : {}, { start: after, keepBase: true, stayNear: 0.05, restarts: 3 * effort, iterations: 120, seed: (opts.seed ?? 1) + 77, firstFeasible: true });
        if (!st.feasible || (toTarget && st.unmet.length)) { opts.debug?.(`  release ${edgeKey(old)}: no pose stands without it${toTarget ? ' in the target shape' : ''}`); continue; }
        const held: Config = { ...st.config, edges: node.cfg.edges, baseFrame: node.cfg.baseFrame };
        const path = poseMovePath(node.cfg, held, (opts.seed ?? 1) + 78, null, toTarget ? 1500 : 300);
        if (!path) { opts.debug?.(`  release ${edgeKey(old)}: no safe path to a free-standing pose`); continue; }
        const r2 = checkStatic({ ...st.config, baseFrame: after.baseFrame });
        if (!r2.ok) continue;
        prep = { via: path.path.slice(0, -1), verb: 'pose_move', label: toTarget ? `take the ${target.name} shape while still anchored` : `get ready to stand on its own feet`, expected: held, successP: V.pose_move.successP, durationS: poseMoveSeconds(node.cfg, held), margins: path.worst, risky: risky(V.pose_move.successP, path.worst) };
        ready = { ...st.config, baseFrame: after.baseFrame, edges: after.edges };
      }
      const r = checkStatic(ready);
      if (!r.ok) continue;
      const peel: PlanStep = { verb: 'undock', label: `peel ${old.b.module}.${old.b.port} out of floor receiver ${(old.a as { floor: string }).floor}`, expected: ready, successP: V.undock_peel.successP, durationS: V.undock_peel.durationS, margins: marginsOf(r), risky: risky(V.undock_peel.successP, marginsOf(r)) };
      const steps = prep ? [prep, peel] : [peel];
      open.push({ cfg: ready, cost: node.cost + steps.reduce((t, x) => t + stepCost(x.successP, x.durationS), 0), steps: [...node.steps, ...steps] });
    }

    // ── expand (b): dock a free end somewhere new, then peel off one old lock ──
    // Most promising first: the free end nearest its target, most reliable dock type.
    const asmNow = assemble(node.cfg);
    const anchorPos = new Map(CONFIG.floorAnchors.map((a) => [a.id, [a.x, 0, a.z] as [number, number, number]]));
    const ranked = candidateLocks(node.cfg).map((nl) => {
      const mv = isFloorRef(nl.a) ? nl.b : (nl.a as { module: ModuleId; port: PortId });
      const tgt = isFloorRef(nl.a) ? null : nl.b;
      const from = asmNow.placed.get(mv.module)?.geo.ports[mv.port].pos;
      const to = isFloorRef(nl.a) ? anchorPos.get(nl.a.floor) : asmNow.placed.get(tgt!.module)?.geo.ports[tgt!.port].pos;
      const d = from && to ? Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2]) : 9;
      return { nl, d };
    }).filter((c) => c.d < 0.75).sort((x, y) => x.d - y.d);
    let found = 0;
    const maxSucc = opts.maxSuccessors ?? 4;
    for (const { nl } of ranked) {
      if (found >= maxSucc) break;
      const loopTopo = [...node.cfg.edges.filter((e) => e.locked), nl];
      // First only the docking module moves (everyone else holds still); then, if that
      // cannot close, the receiving modules may bend too (cooperative docking).
      const mover = isFloorRef(nl.a) ? nl.b.module : (nl.a as { module: ModuleId }).module;
      // PRE-DOCK POSES KEEP ROOM TO CORRECT: bends <= DOCK_BEND_DEG (28 Oct, physics: the T plan's dock pose had M1 B2/B3 at 88 deg,
      // 2 deg from the stops; the arm could not follow the camera's corrections, drifted 6-11 mm off the axis and hit the rim)
      let pre = optimisePose(loopTopo, active, {}, { start: node.cfg, keepBase: true, frozen: active.filter((m) => m !== mover), stayNear: 0.05, restarts: 4 * effort, iterations: 120, seed: (opts.seed ?? 1) + expansions, firstFeasible: true, bendLimitDeg: DOCK_BEND_DEG });
      let coop = false;
      if (!pre.feasible) {
        pre = optimisePose(loopTopo, active, {}, { start: node.cfg, keepBase: true, stayNear: 0.05, restarts: 3 * effort, iterations: 120, seed: (opts.seed ?? 1) + expansions + 50, firstFeasible: true, bendLimitDeg: DOCK_BEND_DEG });
        coop = true;
      }
      const nlName = isFloorRef(nl.a) ? `${nl.b.module}.${nl.b.port}→floor ${nl.a.floor}` : `${(nl.a as { module: string; port: string }).module}.${(nl.a as { module: string; port: string }).port}→${nl.b.module}.${nl.b.port}`;
      if (!pre.feasible) { opts.debug?.(`  ${nlName}: no closed, stable pre-dock pose (${pre.report.reasons[0] ?? 'closure'}, closure ${pre.report.closureErrMm.toFixed(0)} mm)`); continue; }
      const preCfg = pre.config;
      const pend = isFloorRef(nl.a) ? null : { a: nl.a as { module: ModuleId; port: PortId }, b: nl.b };
      const mvp = poseMovePath(node.cfg, { ...preCfg, edges: node.cfg.edges }, (opts.seed ?? 1) + expansions, pend, 300)
        ?? pathViaRetreat(node.cfg, { ...preCfg, edges: node.cfg.edges }, pend, (opts.seed ?? 1) + expansions);
      if (!mvp) { opts.debug?.(`  ${nlName}: no safe joint path to the pre-dock pose`); continue; }
      const mv = { ok: true, worst: mvp.worst };
      const dk = dockKind(preCfg, nl);
      if (dk.p <= 0) { opts.debug?.(`  ${nlName}: ${dk.kind} has no measured success yet — skipped`); continue; }
      const t1 = poseMoveSeconds(node.cfg, preCfg);
      const docked = preCfg.edges.find((e) => sameEdge(e, nl))!;
      for (const old of preCfg.edges) {
        if (sameEdge(old, docked) || !old.locked) continue;
        const after: Config = { ...cloneConfig(preCfg), edges: preCfg.edges.filter((e) => e !== old).map((e) => ({ ...e })) };
        if (configProblems(after).length) continue;
        // releasing the last floor receiver: the robot stays exactly where it is and rests on the floor
        if (!after.edges.some((e) => e.locked && isFloorRef(e.a)) && preCfg.edges.some((e) => e.locked && isFloorRef(e.a))) {
          const asm = assemble(preCfg);
          const root = active[0];
          const pl = asm.placed.get(root)!;
          after.baseFrame = { module: root, worldPose: { p: pl.base.p, q: pl.base.q }, dropToFloor: true };
        }
        const r = checkStatic(after);
        if (!r.ok) { opts.debug?.(`  ${nlName} then peel ${edgeKey(old)}: unstable after (${r.reasons[0]})`); continue; }
        const rd = checkStatic(preCfg);
        const steps: PlanStep[] = [
          { via: mvp.path.slice(0, -1), note: coop ? 'cooperative: the receiving module bends too' : undefined, verb: 'pose_move', label: `bend to reach ${nlName.split('→')[1]} with ${nlName.split('→')[0]}`, expected: { ...preCfg, edges: node.cfg.edges }, successP: V.pose_move.successP, durationS: t1, margins: mv.worst, risky: risky(V.pose_move.successP, mv.worst) },
          { verb: isFloorRef(nl.a) ? 'walk_step' : 'dock', label: `dock ${nlName.replace('→', ' → ')} (${dk.kind})`, expected: preCfg, successP: dk.p, durationS: dk.s, margins: marginsOf(rd), risky: risky(dk.p, marginsOf(rd)) },
          { verb: 'undock', label: isFloorRef(old.a) ? `peel ${old.b.module}.${old.b.port} out of floor receiver ${old.a.floor}` : `peel ${edgeKey(old).replace('|', ' ↔ ')} off`, expected: after, successP: V.undock_peel.successP, durationS: V.undock_peel.durationS, margins: marginsOf(r), risky: risky(V.undock_peel.successP, marginsOf(r)) },
        ];
        const add = steps.reduce((s, x) => s + stepCost(x.successP, x.durationS), 0);
        open.push({ cfg: after, cost: node.cost + add, steps: [...node.steps, ...steps] });
        found++;
      }
    }
  }

  if (!best) {
    log(`no plan found within ${expansions} lock-graph expansions`);
    return { ok: false, steps: [], totalP: 0, totalS: 0, cost: Infinity, target, why, expansions };
  }
  const steps = [...best.node.steps, ...best.final];
  const totalP = steps.reduce((p, s) => p * s.successP, 1);
  const totalS = steps.reduce((t, s) => t + s.durationS, 0);
  log(`plan: ${steps.length} steps, ${(totalP * 100).toFixed(1)}% overall success, ${totalS.toFixed(0)} s`);
  return { ok: true, steps, totalP, totalS, cost: -Math.log(totalP) + LAMBDA * totalS, target, why, expansions };
}

export interface RankedTarget { entry: ShapeEntry; tagFit: number; marginScore: number; plan: Plan; score: number; reason: string }

/** Score = tagFit × marginScore − planCost; the top 3 with their plans and the reasons. */
/** Does this config (as it stands) miss any of the target's tag requirements? */
function optimisePoseUnmet(cfg: Config, spec: TagSpec): boolean {
  const r = checkStatic(cfg);
  return tagShortfall(measureStaticTags(cfg, r, false), spec).unmet.length > 0;
}

export function rankTargets(current: Config, entries: ShapeEntry[], fit: (e: ShapeEntry) => number, opts: PlanOptions = {}): RankedTarget[] {
  const out: RankedTarget[] = [];
  const nActive = current.modules.filter((m) => !current.unused.includes(m)).length;
  for (const e of entries) {
    if (e.nModules !== nActive) continue;
    const tagFit = fit(e);
    if (tagFit <= 0) continue;
    const m = e.margins;
    const marginScore = Math.max(0.05, Math.min(1, (CONFIG.limits.torqueBudgetPct - m.maxTorquePct) / CONFIG.limits.torqueBudgetPct))
      * (m.cogMarginMm >= 999 ? 1 : Math.max(0.05, Math.min(1, m.cogMarginMm / 60)));
    const plan = planTo(current, e, opts);
    const score = tagFit * marginScore - (plan.ok ? plan.cost : 99);
    out.push({
      entry: e, tagFit, marginScore, plan, score,
      reason: plan.ok
        ? `fits the request ${(tagFit * 100).toFixed(0)}%, margins ${(marginScore * 100).toFixed(0)}%, reachable in ${plan.steps.length} steps at ${(plan.totalP * 100).toFixed(0)}% success`
        : `fits ${(tagFit * 100).toFixed(0)}% but no plan from here (${plan.why[plan.why.length - 1]})`,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}
