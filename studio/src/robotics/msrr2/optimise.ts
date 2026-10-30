/**
 * optimise.ts — find joint angles for a topology that make it DO something (brief §5 L2.3).
 *
 * Given a lock graph and a target (required tags + preferences), search the joint
 * angles, the lock slots and — for a free-standing robot — which way up it rests,
 * for a pose that
 *   1. passes the static checker (no collision, torque ≤ 70%, CoG ≥ 15 mm in, limits),
 *   2. meets the required tags,
 *   3. keeps the biggest margins.
 *
 * Method: random restarts + an adaptive (1+λ) evolution strategy. Deterministic for a
 * given seed so results and tests are repeatable.
 */
import {
  type Config, type Edge, type ModulePose, type CapabilityTag, type BaseFrame,
  JOINTS, PLAN_BEND_DEG, CONFIG, isBend, isFloorRef, cloneConfig,
} from './model';
import { checkStatic, type StaticReport } from './statics';
import { closureResidual, hasLoop } from './assemble';
import { measureStaticTags, type Tags } from './tags';
import { type Q, qaxis, qmul } from './vec';

/** A requirement on one tag: numeric bounds or a boolean. */
export type TagReq = { min?: number; max?: number; is?: boolean; weight?: number };
export type TagSpec = Partial<Record<CapabilityTag, TagReq>>;

export interface OptimiseOptions {
  seed?: number;
  restarts?: number;
  iterations?: number;
  /** start from these angles (e.g. the current robot) for one of the restarts */
  start?: Config;
  /** keep these modules' poses fixed */
  frozen?: string[];
  /** prefer poses close to `start` (penalty per degree moved, summed over joints, ÷ 180) */
  stayNear?: number;
  /** tighter bend limit (deg from straight) for this search, e.g. a pre-dock pose that must leave the docking brain room to correct */
  bendLimitDeg?: number;
  /** stop early once a feasible pose meeting every requirement is found */
  firstFeasible?: boolean;
  /** keep the root's world orientation from `start` (free-standing robots must not teleport) */
  keepBase?: boolean;
}

export interface OptimiseResult {
  config: Config;
  report: StaticReport;
  tags: Tags;
  score: number;
  feasible: boolean;
  /** which required tags are not met */
  unmet: string[];
  evals: number;
}

const SCALE: Partial<Record<CapabilityTag, number>> = {
  height_mm: 50, cog_height_mm: 30, reach_mm: 50, flat_top_area_cm2: 30, spans_gap_mm: 50,
  ground_contacts: 0.5, holds_load_kg: 0.2, stable_on_tilt_deg: 3, max_speed_mm_s: 10,
};

export function tagShortfall(tags: Tags, spec: TagSpec): { pen: number; unmet: string[] } {
  let pen = 0; const unmet: string[] = [];
  for (const [k, req] of Object.entries(spec) as [CapabilityTag, TagReq][]) {
    const tv = tags[k];
    const w = req.weight ?? 1;
    if (!tv) { if (req.min !== undefined || req.is !== undefined) { pen += 5 * w; unmet.push(`${k} not measured`); } continue; }
    const v = tv.value;
    if (req.is !== undefined) {
      if (Boolean(v) !== req.is) { pen += 5 * w; unmet.push(`${k} should be ${req.is}`); }
      continue;
    }
    const x = Number(v), s = SCALE[k] ?? 1;
    if (req.min !== undefined && x < req.min) { pen += w * (1 + (req.min - x) / s); unmet.push(`${k} ${x} < ${req.min}`); }
    if (req.max !== undefined && x > req.max) { pen += w * (1 + (x - req.max) / s); unmet.push(`${k} ${x} > ${req.max}`); }
  }
  return { pen, unmet };
}

/** Penalty for failing the static check: 0 when it passes, growing with how badly it fails. */
export function feasibilityPenalty(r: StaticReport): number {
  let p = 0;
  p += r.collisions.length * 4;
  p += Math.max(0, r.margins.maxTorquePct - CONFIG.limits.torqueBudgetPct) / 5;
  if (r.supportedBy === 'floor-contact') p += Math.max(0, CONFIG.limits.cogMarginMm - r.margins.cogMarginMm) / 5;
  if (r.supportedBy === 'nothing') p += 50;
  p += Math.max(0, r.closureErrMm - 3) / 2;
  // estimates of the real (sagging) robot steer the search toward sturdier poses (physics has the final word)
  p += Math.max(0, r.sag.flexUse - 1) * 20;
  p += Math.max(0, r.sag.receiverTiltDeg - CONFIG.compliance.receiverTiltMaxDeg) * 5;
  // fragile (a touch tips it) is allowed but less good: a small push toward sturdier stances
  if (r.supportedBy === 'floor-contact') p += Math.max(0, CONFIG.robustness.minTipPushN - (r.margins.tipPushN ?? 999)) * 0.5;
  for (const l of r.assembly.locks) if (l.closure && !l.tree) p += Math.max(0, l.closure.normalDot + 0.995) * 20 + Math.max(0, l.closure.keyDeg - 5) / 10;
  p += r.reasons.filter((x) => /piece|unknown|carries|side↔side|planning limit|past ±180/.test(x)).length * 10;
  return p;
}

function gaussSolve(A: number[][], b: number[]): number[] | null {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / M[i][i]);
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

interface Genome { joints: number[]; rot: [number, number, number]; slots: number[] }

export function optimisePose(topology: Edge[], modules: string[], spec: TagSpec, opts: OptimiseOptions = {}): OptimiseResult {
  const rnd = mulberry(opts.seed ?? 1);
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const anchored = topology.some((e) => isFloorRef(e.a));
  const frozen = new Set(opts.frozen ?? []);
  const nJ = modules.length * 7;
  const lim = (i: number) => (isBend(JOINTS[i % 7]) ? Math.min(PLAN_BEND_DEG, opts.bendLimitDeg ?? PLAN_BEND_DEG) : 180);
  const needLoad = spec.holds_load_kg !== undefined;

  const decode = (g: Genome): Config => {
    const pose: Record<string, ModulePose> = {};
    modules.forEach((m, mi) => {
      pose[m] = Object.fromEntries(JOINTS.map((j, ji) => {
        const fixed = frozen.has(m) && opts.start ? opts.start.pose[m][j] - 180 : g.joints[mi * 7 + ji];
        return [j, 180 + Math.max(-lim(ji), Math.min(lim(ji), fixed))];
      })) as ModulePose;
    });
    const edges = topology.map((e, i) => ({ ...e, slot: (g.slots[i] & 3) as 0 | 1 | 2 | 3 }));
    let baseFrame: BaseFrame | undefined;
    if (!anchored && opts.keepBase) {
      baseFrame = opts.start?.baseFrame; // undefined = the assembler's default resting frame
    } else if (!anchored) {
      const [a, b, c] = g.rot;
      const q: Q = qmul(qaxis([1, 0, 0], a), qmul(qaxis([0, 0, 1], b), qaxis([0, 1, 0], c)));
      baseFrame = { worldPose: { p: [0, 0.3, 0], q }, dropToFloor: true };
    }
    return { modules: [...modules], unused: [], edges, pose, baseFrame };
  };

  // Loops (a ring of modules, or two ends in two floor receivers) only exist on a thin
  // closure manifold that random mutation almost never lands on, so every candidate is
  // first pulled onto it with a few damped Gauss-Newton steps on the closure residual.
  const loopy = hasLoop(decode({ joints: new Array(nJ).fill(0), rot: [0, 0, 0], slots: topology.map(() => 0) }));
  const project = (g: Genome): Genome => {
    if (!loopy) return g;
    let x = [...g.joints];
    const res = (xs: number[]) => closureResidual(decode({ ...g, joints: xs }));
    let r0 = res(x); let n0 = Math.hypot(...r0);
    let lambda = 1e-2;
    for (let it = 0; it < 30 && n0 > 1e-3; it++) {
      const h = 0.05;
      const J: number[][] = r0.map(() => new Array(nJ).fill(0));
      for (let j = 0; j < nJ; j++) {
        if (frozen.has(modules[Math.floor(j / 7)])) continue;
        const xp = [...x]; xp[j] += h;
        const rp = res(xp);
        for (let i = 0; i < r0.length; i++) J[i][j] = (rp[i] - r0[i]) / h;
      }
      // (JᵀJ + λI) δ = -Jᵀ r, solved by Gaussian elimination
      const A = Array.from({ length: nJ }, (_, a) => Array.from({ length: nJ }, (_, b) => J.reduce((s2, row) => s2 + row[a] * row[b], 0) + (a === b ? lambda : 0)));
      const bb = Array.from({ length: nJ }, (_, a) => -J.reduce((s2, row, i) => s2 + row[a] * r0[i], 0));
      const d = gaussSolve(A, bb);
      if (!d) break;
      const xn = x.map((v, j) => Math.max(-lim(j % 7), Math.min(lim(j % 7), v + d[j])));
      const rn = res(xn); const nn = Math.hypot(...rn);
      if (nn < n0) { x = xn; r0 = rn; n0 = nn; lambda = Math.max(1e-6, lambda * 0.3); } else { lambda *= 10; if (lambda > 1e4) break; }
    }
    return { ...g, joints: x };
  };

  let evals = 0;
  const score = (g0: Genome) => {
    evals++;
    const g = project(g0);
    const cfg = decode(g);
    const r = checkStatic(cfg);
    const feas = feasibilityPenalty(r);
    const tags = measureStaticTags(cfg, r, false);
    if (needLoad && feas === 0) Object.assign(tags, { holds_load_kg: measureStaticTags(cfg, r, true).holds_load_kg });
    const { pen, unmet } = tagShortfall(tags, spec);
    const marginBonus = (CONFIG.limits.torqueBudgetPct - Math.min(CONFIG.limits.torqueBudgetPct, r.margins.maxTorquePct)) / 100
      + Math.min(60, Math.max(0, r.margins.cogMarginMm)) / 300;
    const tidy = g.joints.reduce((s, v) => s + Math.abs(v), 0) / (nJ * 180) * 0.05
      + (opts.stayNear && startG ? g.joints.reduce((s, v, i) => s + Math.abs(v - startG.joints[i]), 0) / 180 * opts.stayNear : 0);
    return { s: feas * 10 + pen * 6 - marginBonus + tidy, cfg, r, tags, unmet, feas, g };
  };

  const rand = (): Genome => ({
    joints: Array.from({ length: nJ }, (_, i) => (isBend(JOINTS[i % 7]) ? (rnd() * 2 - 1) * lim(i % 7) : [0, 90, 180, -90][Math.floor(rnd() * 4)] + (rnd() * 2 - 1) * 20)),
    rot: [(rnd() * 2 - 1) * Math.PI, (rnd() * 2 - 1) * Math.PI, 0],
    slots: topology.map(() => Math.floor(rnd() * 4)),
  });
  const fromConfig = (c: Config): Genome => ({
    joints: modules.flatMap((m) => JOINTS.map((j) => (c.pose[m]?.[j] ?? 180) - 180)),
    rot: [0, 0, 0],
    slots: topology.map((e) => {
      const same = c.edges.find((x) => JSON.stringify(x.a) === JSON.stringify(e.a) && JSON.stringify(x.b) === JSON.stringify(e.b));
      return same?.slot ?? 0;
    }),
  });

  const startG = opts.start ? fromConfig(opts.start) : null;
  // A lock that already exists keeps its key slot: re-keying needs an undock.
  const slotFixed = topology.map((e) => !!opts.start?.edges.some((x) => x.locked && JSON.stringify(x.a) === JSON.stringify(e.a) && JSON.stringify(x.b) === JSON.stringify(e.b)));
  const fixSlots = (g: Genome): Genome => (startG ? { ...g, slots: g.slots.map((v, i) => (slotFixed[i] ? startG.slots[i] : v)) } : g);
  const restarts = opts.restarts ?? 12, iters = opts.iterations ?? 250;
  let best: ReturnType<typeof score> | null = null;
  for (let r = 0; r < restarts; r++) {
    let g = r === 0 && opts.start ? fromConfig(opts.start) : rand();
    if (r === 0 && !opts.start) g = { joints: new Array(nJ).fill(0), rot: [0, 0, 0], slots: topology.map(() => 0) };
    g = fixSlots(g);
    let cur = score(g); g = cur.g;
    let step = 30;
    for (let it = 0; it < iters; it++) {
      const kids: Genome[] = [];
      for (let k = 0; k < 4; k++) {
        const c: Genome = { joints: [...g.joints], rot: [...g.rot] as [number, number, number], slots: [...g.slots] };
        const nmut = 1 + Math.floor(rnd() * 3);
        for (let q = 0; q < nmut; q++) {
          const i = Math.floor(rnd() * (nJ + (anchored ? 0 : 2)));
          if (i < nJ) c.joints[i] = Math.max(-lim(i % 7), Math.min(lim(i % 7), c.joints[i] + gauss() * step));
          else c.rot[i - nJ] += gauss() * (step * Math.PI / 180);
        }
        if (topology.length && rnd() < 0.05) c.slots[Math.floor(rnd() * topology.length)] = Math.floor(rnd() * 4);
        kids.push(fixSlots(c));
      }
      let improved = false;
      for (const c of kids) {
        const s = score(c);
        if (s.s < cur.s) { cur = s; g = s.g; improved = true; }
      }
      step = improved ? Math.min(60, step * 1.3) : Math.max(0.5, step * 0.85);
    }
    if (!best || cur.s < best.s) best = cur;
    if (opts.firstFeasible && best.feas === 0 && best.r.ok && !best.unmet.length) break;
  }
  const b = best!;
  const tags = measureStaticTags(b.cfg, b.r, true);
  const { unmet } = tagShortfall(tags, spec);
  return { config: cloneConfig(b.cfg), report: b.r, tags, score: b.s, feasible: b.feas === 0 && b.r.ok, unmet, evals };
}
