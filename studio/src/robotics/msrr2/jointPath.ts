/**
 * jointPath.ts — a SAFE way for the joints to get from one pose to another while the
 * locks stay as they are (the pose_move verb).
 *
 * "Safe" = every pose passed through passes the static checker: stable (CoG ≥ 15 mm
 * inside, or anchored), every joint within the torque budget, no collisions, limits.
 * Real reconfiguration needs ordering — e.g. turn the twists first so the bends then
 * sweep a module along the floor instead of lifting it — so this tries cheap orderings
 * first and falls back to RRT-Connect, a standard sampling path planner, in joint space.
 */
import { type Config, type Margins, type ModuleId, type PortId, JOINTS, PLAN_BEND_DEG, isBend, cloneConfig } from './model';
import { checkStatic } from './statics';

export type PendingDock = { a: { module: ModuleId; port: PortId }; b: { module: ModuleId; port: PortId } } | null;
const ZERO: Margins = { maxTorquePct: 0, cogMarginMm: 999, minJointMarginDeg: 999 };
const worse = (a: Margins, b: Margins): Margins => ({
  maxTorquePct: Math.max(a.maxTorquePct, b.maxTorquePct), cogMarginMm: Math.min(a.cogMarginMm, b.cogMarginMm), minJointMarginDeg: Math.min(a.minJointMarginDeg, b.minJointMarginDeg),
  sagMm: Math.max(a.sagMm ?? 0, b.sagMm ?? 0), tipPushN: Math.min(a.tipPushN ?? 999, b.tipPushN ?? 999),
});

/** Largest joint step between checked samples (degrees). */
const RES_DEG = 5;

function vec(c: Config, mods: string[]): number[] { return mods.flatMap((m) => JOINTS.map((j) => c.pose[m][j])); }
function fromVec(base: Config, mods: string[], v: number[]): Config {
  const c = cloneConfig(base);
  mods.forEach((m, mi) => JOINTS.forEach((j, ji) => { c.pose[m][j] = v[mi * 7 + ji]; }));
  return c;
}

/** Check the straight joint-space segment a→b (same locks). */
export function poseMoveOk(a: Config, b: Config, pending: PendingDock = null): { ok: boolean; worst: Margins; why?: string } {
  const mods = b.modules.filter((m) => !b.unused.includes(m));
  const va = vec(a, mods), vb = vec(b, mods);
  const span = Math.max(1e-9, ...va.map((x, i) => Math.abs(vb[i] - x)));
  const n = Math.max(2, Math.ceil(span / RES_DEG));
  let worst = ZERO;
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const c = fromVec(b, mods, va.map((x, i) => x + (vb[i] - x) * t));
    const r = checkStatic(c, undefined, { pendingDock: pending });
    worst = worse(worst, { maxTorquePct: r.margins.maxTorquePct, cogMarginMm: Math.min(999, r.margins.cogMarginMm), minJointMarginDeg: r.margins.minJointMarginDeg, sagMm: r.margins.sagMm, tipPushN: r.margins.tipPushN });
    if (!r.ok) return { ok: false, worst, why: `at ${Math.round(t * 100)}% of the move: ${r.reasons[0]}` };
  }
  return { ok: true, worst };
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * A safe joint path a → b: a list of poses to pass through (the last is b).
 * Returns null when none is found within the budget.
 */
export function poseMovePath(a: Config, b: Config, seed = 1, pending: PendingDock = null, budget = 1500): { path: Config[]; worst: Margins } | null {
  const legs = (pts: Config[]) => {
    let worst = ZERO; let prev = a;
    for (const p of pts) {
      const r = poseMoveOk(prev, p, pending);
      if (!r.ok) return null;
      worst = worse(worst, r.worst); prev = p;
    }
    return { path: pts, worst };
  };
  const mods = b.modules.filter((m) => !b.unused.includes(m));
  const isTw = (j: string) => j[0] === 'T';
  const pick = (from: Config, to: Config, f: (j: string) => boolean) => {
    const c = cloneConfig(to);
    for (const m of mods) for (const j of JOINTS) c.pose[m][j] = f(j) ? to.pose[m][j] : (from.pose[m]?.[j] ?? 180);
    return c;
  };
  const straight = pick(a, a, () => true);
  for (const m of mods) for (const j of JOINTS) if (!isTw(j)) straight.pose[m][j] = 180;
  const tries: Config[][] = [
    [b],
    [pick(a, b, isTw), b],
    [pick(a, b, (j) => !isTw(j)), b],
    [straight, pick(straight, b, isTw), b],
  ];
  for (const t of tries) {
    if (t.slice(0, -1).some((c) => !checkStatic(c, undefined, { pendingDock: pending }).ok)) continue;
    const r = legs(t);
    if (r) return r;
  }
  return rrtConnect(a, b, mods, seed, pending, budget);
}

/**
 * RRT-Connect in joint space (LaValle & Kuffner): grow one tree from each end, each
 * step extends toward a random pose and then greedily connects the other tree. The
 * joined path is shortcut-smoothed. Every edge is checked with poseMoveOk.
 */
function rrtConnect(a: Config, b: Config, mods: string[], seed: number, pending: PendingDock, budget: number): { path: Config[]; worst: Margins } | null {
  const rnd = mulberry(seed * 7919 + 13);
  const lim = (i: number) => (isBend(JOINTS[i % 7]) ? PLAN_BEND_DEG : 180);
  const STEP = 20;
  type N = { v: number[]; parent: number };
  const A: N[] = [{ v: vec(a, mods), parent: -1 }];
  const B: N[] = [{ v: vec(b, mods), parent: -1 }];
  const toCfg = (v: number[]) => fromVec(b, mods, v);
  const valid = (v: number[]) => checkStatic(toCfg(v), undefined, { pendingDock: pending }).ok;
  const seg = (u: number[], v: number[]) => poseMoveOk(toCfg(u), toCfg(v), pending).ok;
  const nearest = (T: N[], v: number[]) => {
    let bi = 0, bd = Infinity;
    T.forEach((n, i) => { const d = Math.max(...n.v.map((x, k) => Math.abs(x - v[k]))); if (d < bd) { bd = d; bi = i; } });
    return bi;
  };
  const steer = (u: number[], v: number[]) => {
    const d = Math.max(...u.map((x, k) => Math.abs(x - v[k])));
    if (d <= STEP) return v;
    return u.map((x, k) => x + ((v[k] - x) * STEP) / d);
  };
  const extend = (T: N[], target: number[]): number => {
    const i = nearest(T, target);
    const nv = steer(T[i].v, target);
    if (!valid(nv) || !seg(T[i].v, nv)) return -1;
    T.push({ v: nv, parent: i });
    return T.length - 1;
  };
  const connect = (T: N[], target: number[]): number => {
    let last = -1;
    for (let k = 0; k < 40; k++) {
      const i = extend(T, target);
      if (i < 0) return -1;
      last = i;
      if (Math.max(...T[i].v.map((x, q) => Math.abs(x - target[q]))) < 1e-6) return i;
    }
    return last >= 0 && Math.max(...T[last].v.map((x, q) => Math.abs(x - target[q]))) < 1e-6 ? last : -1;
  };
  let [Ta, Tb] = [A, B];
  for (let it = 0; it < budget; it++) {
    const goalBias = rnd() < 0.15;
    const r = goalBias ? Tb[0].v : Array.from({ length: mods.length * 7 }, (_, i) => (rnd() * 2 - 1) * lim(i % 7) + 180);
    const ia = extend(Ta, r);
    if (ia >= 0) {
      const ib = connect(Tb, Ta[ia].v);
      if (ib >= 0) {
        const pathOf = (T: N[], i: number) => { const out: number[][] = []; for (let k = i; k >= 0; k = T[k].parent) out.push(T[k].v); return out; };
        let pa = pathOf(Ta, ia).reverse(), pb = pathOf(Tb, ib);
        if (Ta !== A) [pa, pb] = [pb.reverse(), pa.reverse()];
        let pts = [...pa, ...pb.slice(1)];
        // shortcut smoothing
        for (let s = 0; s < 60 && pts.length > 2; s++) {
          const i = Math.floor(rnd() * (pts.length - 2)), j = i + 2 + Math.floor(rnd() * (pts.length - i - 2));
          if (j < pts.length && seg(pts[i], pts[j])) pts = [...pts.slice(0, i + 1), ...pts.slice(j)];
        }
        const cfgs = pts.slice(1).map(toCfg);
        cfgs[cfgs.length - 1] = b;
        let worst = ZERO, prev = a;
        for (const c of cfgs) { const rr = poseMoveOk(prev, c, pending); if (!rr.ok) return null; worst = worse(worst, rr.worst); prev = c; }
        return { path: cfgs, worst };
      }
    }
    [Ta, Tb] = [Tb, Ta];
  }
  return null;
}

import { closureResidual } from './assemble';
import { feasibilityPenalty } from './optimise';
import type { Edge } from './model';

/**
 * Walk the joints continuously toward closing a new lock, the way the real docking
 * controller does: many small steps (≤ 4°), each one downhill on
 *     closure error + 3 × (how far from passing the static check)
 * and each one ACCEPTED ONLY IF the robot is statically valid all along it. The
 * accepted steps are the path; the end is the docked pose. `movers` are the modules
 * allowed to move (the docking module, or everyone for cooperative docking).
 */
export function descendToDock(start: Config, newLock: Edge, movers: string[], seed = 1, maxSteps = 260): { path: Config[]; closed: Config; worst: Margins } | null {
  const rnd = mulberry(seed * 104729 + 7);
  const mods = start.modules.filter((m) => !start.unused.includes(m));
  const free: number[] = [];
  mods.forEach((m, mi) => { if (movers.includes(m)) for (let j = 0; j < 7; j++) free.push(mi * 7 + j); });
  const lim = (i: number) => (isBend(JOINTS[i % 7]) ? PLAN_BEND_DEG : 180);
  const pending: PendingDock = { a: newLock.a as { module: ModuleId; port: PortId }, b: newLock.b };
  const closedOf = (v: number[]) => ({ ...fromVec(start, mods, v), edges: [...start.edges, newLock] });
  const treeOf = (v: number[]) => fromVec(start, mods, v);
  const f = (v: number[]) => {
    const res = closureResidual(closedOf(v));
    const close = Math.hypot(...res);
    const r = checkStatic(treeOf(v), undefined, { pendingDock: pending });
    return { close, feas: feasibilityPenalty(r) + (r.ok ? 0 : 1), r };
  };
  let v = vec(start, mods);
  let cur = f(v);
  if ((globalThis as any).__dbgDock) console.log('descend start close', cur.close.toFixed(2), 'feas', cur.feas.toFixed(2), cur.r.reasons[0] ?? '');
  if (cur.feas > 0) return null;
  const path: Config[] = [];
  let worst = ZERO;
  let step = 4;
  for (let it = 0; it < maxSteps; it++) {
    if (cur.close < 0.15) break; // ~1.5 mm, faces and keys square
    // finite-difference gradient of the closure error over the free joints
    const g = new Array(v.length).fill(0);
    const h = 0.5;
    for (const i of free) {
      const vp = [...v]; vp[i] = Math.max(-lim(i % 7) + 180, Math.min(lim(i % 7) + 180, vp[i] + h));
      g[i] = (Math.hypot(...closureResidual(closedOf(vp))) - cur.close) / h;
    }
    const gn = Math.hypot(...free.map((i) => g[i])) || 1;
    let accepted = false;
    for (const scale of [1, 0.5, 0.25]) {
      for (let attempt = 0; attempt < 4 && !accepted; attempt++) {
        const nv = [...v];
        for (const i of free) {
          const jitter = attempt ? (rnd() * 2 - 1) * step * 0.6 : 0;
          nv[i] = Math.max(180 - lim(i % 7), Math.min(180 + lim(i % 7), v[i] - (g[i] / gn) * step * scale * Math.sqrt(free.length) * 0.5 + jitter));
        }
        const nf = f(nv);
        if (nf.feas > 0 || nf.close >= cur.close) continue;
        const seg = poseMoveOk(treeOf(v), treeOf(nv), pending);
        if (!seg.ok) continue;
        worst = worse(worst, seg.worst);
        v = nv; cur = nf; accepted = true;
        path.push(treeOf(v));
      }
      if (accepted) break;
    }
    if (!accepted) { step *= 0.6; if (step < 0.3) break; } else step = Math.min(6, step * 1.15);
  }
  if ((globalThis as any).__dbgDock) console.log('descend end close', cur.close.toFixed(2), 'steps', path.length, 'step', step.toFixed(2), closureResidual(closedOf(v)).map((x) => x.toFixed(2)).join(' '), 'joints', v.map((x) => (x - 180).toFixed(0)).join(' '));
  if (cur.close >= 0.15) return null;
  const closed = closedOf(v);
  const rc = checkStatic(closed);
  if (!rc.ok) return null;
  // thin the path: keep every few-degree pose (the animation interpolates between them)
  const thin: Config[] = [];
  let last = vec(start, mods);
  for (const p of path) {
    const pv = vec(p, mods);
    if (Math.max(...pv.map((x, i) => Math.abs(x - last[i]))) >= 15) { thin.push(p); last = pv; }
  }
  thin.push(treeOf(v));
  return { path: thin, closed, worst };
}

/**
 * Backward search: from a solved docked pose `goal` (tree locks, the new lock pending),
 * retreat toward `start` in small valid steps; then join the reached point to `start`
 * with poseMovePath. Returns the forward path start → goal, or null.
 */
export function pathViaRetreat(start: Config, goal: Config, pending: PendingDock, seed = 1, maxSteps = 200): { path: Config[]; worst: Margins } | null {
  const rnd = mulberry(seed * 31337 + 3);
  const mods = start.modules.filter((m) => !start.unused.includes(m));
  const lim = (i: number) => (isBend(JOINTS[i % 7]) ? PLAN_BEND_DEG : 180);
  const vs = vec(start, mods);
  let v = vec(goal, mods);
  const back: number[][] = [v];
  const toCfg = (x: number[]) => fromVec(goal, mods, x);
  const dist = (x: number[]) => Math.max(...x.map((q, i) => Math.abs(q - vs[i])));
  for (let it = 0; it < maxSteps && dist(v) > 1e-6; it++) {
    // try the direct jump home first
    if (poseMoveOk(start, toCfg(v), pending).ok) { back.push(vs); v = vs; break; }
    let moved = false;
    for (const scale of [6, 3, 1.5]) {
      for (let attempt = 0; attempt < 6 && !moved; attempt++) {
        const nv = v.map((q, i) => {
          const d = vs[i] - q;
          const stepI = Math.sign(d) * Math.min(Math.abs(d), scale);
          const jitter = attempt ? (rnd() * 2 - 1) * scale * 0.8 : 0;
          return Math.max(180 - lim(i % 7), Math.min(180 + lim(i % 7), q + stepI + jitter));
        });
        if (dist(nv) >= dist(v) && attempt === 0) continue;
        if (!poseMoveOk(toCfg(v), toCfg(nv), pending).ok) continue;
        v = nv; back.push(v); moved = true;
      }
      if (moved) break;
    }
    if (!moved) break;
  }
  // join start to wherever the retreat got to
  const meet = toCfg(v);
  const head = dist(v) < 1e-6 ? { path: [] as Config[], worst: ZERO } : poseMovePath(start, meet, seed, pending, 800);
  if (!head) return null;
  const tail = back.slice(0, -1).reverse().map(toCfg); // from just after `meet` back to goal
  const path = [...head.path, ...tail.slice(dist(v) < 1e-6 ? 0 : 0)];
  if (!path.length || path[path.length - 1] !== goal) path.push(goal);
  let worst = ZERO, prev = start;
  const thin: Config[] = [];
  for (const p of path) {
    const r = poseMoveOk(prev, p, pending);
    if (!r.ok) return null;
    worst = worse(worst, r.worst);
    prev = p; thin.push(p);
  }
  return { path: thin, worst };
}
