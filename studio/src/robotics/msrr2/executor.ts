/**
 * executor.ts — run a plan against a robot, step by step (brief M7), in DRY_RUN.
 *
 * DRY_RUN: nothing is sent; every step is compiled to the exact controller calls it
 * would make (the module ESPs' /api/batch with NOMINAL angles — 180 = straight, each
 * ESP adds its own manual-home offsets — plus the lock servos), and the step's outcome
 * is drawn from its measured success rate or forced to fail (induced failures).
 *
 * After every step the executor compares the TRUE state with what the plan expected.
 * When they differ (a dock that did not latch, a lock that did not release) it stops
 * following the old plan and asks for a new one from the true state.
 */
import { type Config, type ModulePose, JOINTS, cloneConfig, isFloorRef } from './model';
import type { Plan, PlanStep } from './planner';
import { checkStatic } from './statics';

/** servo ids on each module's bus: LOCK1, T1, B1, B2, T2, B3, B4, T3, LOCK2 = 1..9 */
export const SERVO_ID: Record<string, number> = { LOCK_A: 1, T1: 2, B1: 3, B2: 4, T2: 5, B3: 6, B4: 7, T3: 8, LOCK_B: 9 };
/** lock rotor (nominal deg, 180 = home = open). Locking turns it 45°: End A one way, End B the other
 *  (handoff §4.2: "turns 45° either way"; the sim's lock_sign: A −1, B +1). */
export const LOCK_OPEN_DEG = 180;
export const LOCK_TURN_DEG = 45;
export const lockClosedDeg = (port: 'A' | 'B') => LOCK_OPEN_DEG + (port === 'A' ? -LOCK_TURN_DEG : LOCK_TURN_DEG);

export interface ControllerCall { module: string; url: string; why: string }
export interface ExecEvent {
  stepIndex: number;
  planNo: number;
  step: PlanStep;
  outcome: 'ok' | 'failed';
  induced: boolean;
  calls: ControllerCall[];
  note: string;
  trueState: Config;
}
export interface ExecResult { ok: boolean; events: ExecEvent[]; replans: number; final: Config; why?: string }

export interface ExecOptions {
  /** step indices (counted over the whole run) that must fail */
  induce?: number[];
  /** also fail docks/peels at random with their measured failure rate */
  randomFailures?: boolean;
  seed?: number;
  maxReplans?: number;
  /** retries of the same step when the failure left the robot exactly where the plan
   *  expected before that step (a dock that did not latch): back off and try again */
  retriesPerStep?: number;
  /** module id → its ESP base url (unknown modules print as http://<module>.local) */
  urls?: Record<string, string>;
  speed?: number;
  acc?: number;
  /** a new plan from the true state (the UI runs it in a worker; tests call planTo) */
  replan: (from: Config) => Promise<Plan>;
  onEvent?: (e: ExecEvent) => void;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
}

const batchUrl = (base: string, ids: Record<number, number>, speed: number, acc: number) =>
  `${base}/api/batch?${Object.entries(ids).map(([id, d]) => `${id}=${d.toFixed(1)}`).join('&')}&speed=${speed}&acc=${acc}`;

/** The controller calls a step makes. */
export function compileStep(before: Config, step: PlanStep, urls: Record<string, string> = {}, speed = 5, acc = 20): ControllerCall[] {
  const url = (m: string) => urls[m] ?? `http://${m}.local`;
  const out: ControllerCall[] = [];
  if (step.verb === 'pose_move') {
    const legs = [...(step.via ?? []), step.expected];
    legs.forEach((leg, k) => {
      for (const m of leg.modules) {
        if (leg.unused.includes(m)) continue;
        const a = (k === 0 ? before : legs[k - 1]).pose[m], b = leg.pose[m];
        const ids: Record<number, number> = {};
        for (const j of JOINTS) if (!a || Math.abs(a[j] - b[j]) > 0.05) ids[SERVO_ID[j]] = (b as ModulePose)[j];
        if (Object.keys(ids).length) out.push({ module: m, url: batchUrl(url(m), ids, speed, acc), why: `leg ${k + 1}/${legs.length}` });
      }
    });
    return out;
  }
  // lock changes: what is locked after the step vs before
  const key = (e: Config['edges'][number]) => JSON.stringify([e.a, e.b]);
  const was = new Set(before.edges.filter((e) => e.locked).map(key));
  const now = new Set(step.expected.edges.filter((e) => e.locked).map(key));
  const changed = [
    ...step.expected.edges.filter((e) => e.locked && !was.has(key(e))).map((e) => ({ e, close: true })),
    ...before.edges.filter((e) => e.locked && !now.has(key(e))).map((e) => ({ e, close: false })),
  ];
  for (const { e, close } of changed) {
    // the END owns the lock rotor (spines are passive receivers); b is always a module port
    const ends = [e.b, ...(!isFloorRef(e.a) ? [e.a] : [])].filter((p) => p.port === 'A' || p.port === 'B');
    // every END in the lock turns its rotor (end↔end: both at once, each its own way); spine receivers have no rotor
    for (const owner of ends) {
      const port = owner.port as 'A' | 'B';
      const id = port === 'A' ? SERVO_ID.LOCK_A : SERVO_ID.LOCK_B;
      out.push({ module: owner.module, url: batchUrl(url(owner.module), { [id]: close ? lockClosedDeg(port) : LOCK_OPEN_DEG }, speed, acc), why: `${close ? 'close' : 'open'} lock ${owner.module}.${owner.port}` });
    }
  }
  return out;
}

/** What is really true after a FAILED step: the step's locks did not change. */
function failedState(before: Config, step: PlanStep): Config {
  if (step.verb === 'pose_move') return cloneConfig(before);
  const c = cloneConfig(step.expected);
  c.edges = cloneConfig(before).edges;
  return c;
}

const lockSet = (c: Config) => c.edges.filter((e) => e.locked).map((e) => JSON.stringify([e.a, e.b, e.slot])).sort().join('|');
function sameState(a: Config, b: Config): boolean {
  if (lockSet(a) !== lockSet(b)) return false;
  return a.modules.every((m) => JOINTS.every((j) => Math.abs((a.pose[m]?.[j] ?? 180) - (b.pose[m]?.[j] ?? 180)) < 0.5));
}

export async function executeDryRun(start: Config, plan: Plan, o: ExecOptions): Promise<ExecResult> {
  const rand = rng(o.seed ?? 1);
  const induce = new Set(o.induce ?? []);
  const events: ExecEvent[] = [];
  let cur = cloneConfig(start), p = plan, replans = 0, k = 0, idx = 0, retries = 0;
  while (true) {
    if (!p.ok) return { ok: false, events, replans, final: cur, why: `no plan from the true state: ${p.why[p.why.length - 1] ?? '?'}` };
    if (k >= p.steps.length) return { ok: true, events, replans, final: cur };
    const step = p.steps[k];
    const calls = compileStep(cur, step, o.urls, o.speed, o.acc);
    const forced = induce.has(idx);
    const fails = forced || (o.randomFailures === true && rand() > step.successP);
    const trueState = fails ? failedState(cur, step) : cloneConfig(step.expected);
    const safe = checkStatic(trueState);
    const before = cur;
    // the failed step left the robot as it was before the step (locks unchanged, same pose):
    // the rest of the plan is still valid, so retry it before asking for a new plan
    const retry = fails && step.verb !== 'pose_move' && sameState(before, trueState) && retries < (o.retriesPerStep ?? 1);
    const ev: ExecEvent = {
      stepIndex: idx, planNo: replans, step, outcome: fails ? 'failed' : 'ok', induced: forced, calls, trueState,
      note: !fails ? 'as planned'
        : `${step.verb} did not complete${forced ? ' (induced)' : ''}; the robot is ${safe.ok ? 'still statically safe' : `NOT safe: ${safe.reasons[0]}`} — ${retry ? 'it is where the plan expected before this step, so it backs off and retries' : 'replanning from where it really is'}`,
    };
    events.push(ev); o.onEvent?.(ev);
    cur = trueState; idx++;
    if (!fails) { k++; retries = 0; continue; }
    if (retry) { retries++; continue; }
    if (replans >= (o.maxReplans ?? 3)) return { ok: false, events, replans, final: cur, why: `gave up after ${replans} replans` };
    replans++; retries = 0;
    p = await o.replan(cur);
    k = 0;
  }
}
