/**
 * statics.ts — the cheap physics check every candidate shape, pose and intermediate
 * plan state must pass (brief §4–5, L2 static checker).
 *
 * For a Config it:
 *   1. places every module (assemble.ts);
 *   2. finds the supports: floor-receiver locks (and a "held" base) can push, pull and
 *      twist; bodies resting on the floor can only PUSH UP;
 *   3. solves how the weight is shared between those supports (least-norm, contacts
 *      pushing only), which also tells whether it can stand at all;
 *   4. computes the gravity torque every joint must hold, from all the weight and the
 *      support forces on one side of it, against the servo budget (≤ 70% of 2.7 N·m);
 *   5. checks the centre of gravity is inside the support polygon by ≥ 15 mm when only
 *      floor contact holds it up;
 *   6. checks joint limits (bends ±88.2° for planning), self-collision (capsules) and
 *      the floor, and that every loop of locks closes.
 *
 * It returns pass/fail plus the margins, never just a yes/no, so the optimiser can
 * climb them and the UI can show how close to the edge a shape is.
 */
import {
  type Config, type FloorAnchor, type ModuleId, type PortId, CONFIG, JOINTS, PLAN_BEND_DEG,
  TORQUE_BUDGET_NM, isBend, isFloorRef, type Margins,
} from './model';
import { assemble, type Assembly } from './assemble';
import { PORT_SEG } from './kin';
import { type V3, sub, cross, dot, len, qrot } from './vec';
import { configProblems } from './rules';

const G = 9.81;
/** a body sphere within this of the floor counts as resting on it (m) */
const CONTACT_TOL = 0.0025;
/** deeper than this into the floor or another body is a collision (m) */
const PENETRATION_TOL = 0.004;
/** contact points closer than this are one contact patch (m) */
const CLUSTER = 0.03;
/** half-width of a contact patch (m): the boxy parts touching the floor are 63-80 mm across */
const PATCH = 0.02;
/** a body axis within this of horizontal lies along the floor (a flat face or an edge) */
const FLAT_SIN = Math.sin((12 * Math.PI) / 180);
/** half-width across a part that only touches with an edge or a corner (m) */
const EDGE = 0.003;

export interface JointTorque { module: ModuleId; joint: string; nm: number; pct: number }
export interface Contact { module: ModuleId; seg: number; p: V3; force: number }
export interface StaticReport {
  ok: boolean;
  reasons: string[];
  /** OK but delicate, e.g. 'fragile: a 0.3 N touch tips it over' */
  warnings: string[];
  fragile: boolean;
  margins: Margins;
  torques: JointTorque[];
  contacts: Contact[];
  com: V3;
  totalMassKg: number;
  /** support polygon (x, z) when standing on the floor without anchors */
  support: [number, number][];
  supportedBy: 'floor-anchor' | 'held' | 'floor-contact' | 'nothing';
  collisions: string[];
  closureErrMm: number;
  assembly: Assembly;
  /** the real robot under its own weight: worst point offset, the CoG it really has, PLA bracket use (1 = at its 3° limit), receiver tilt */
  sag: { maxMm: number; where: string; com: V3; flexUse: number; flexWhere: string; receiverTiltDeg: number };
  /** the touch test (only when asked): worst servo load (% of stall) under a push at the top */
  touchWorstPct?: number;
}

// ── small linear algebra (6 x n least norm) ───────────────────────────────────

function solveSym(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-14) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / M[i][i]);
}

/** min Σ x_i²/w_i  s.t.  A x = b  (A is 6 x n), regularised. */
function leastNorm(A: number[][], b: number[], w: number[]): { x: number[]; resid: number } {
  const n = w.length;
  const AW = A.map((r) => r.map((v, j) => v * w[j]));
  const K = AW.map((ri) => A.map((rj) => ri.reduce((s, v, j) => s + v * rj[j], 0)));
  for (let i = 0; i < K.length; i++) K[i][i] += 1e-9;
  const y = solveSym(K, b) ?? new Array(b.length).fill(0);
  const x = new Array(n).fill(0).map((_, j) => A.reduce((s, r, i) => s + AW[i][j] * y[i], 0));
  const resid = Math.hypot(...A.map((r, i) => r.reduce((s, v, j) => s + v * x[j], 0) - b[i]));
  return { x, resid };
}

/** Convex hull (x,z), counter-clockwise. */
function hull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const crossZ = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const q of p) { while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of [...p].reverse()) { while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Signed distance (m) of point q inside a CCW polygon: + inside, − outside. Degenerate polygons are "outside". */
function insideMargin(poly: [number, number][], q: [number, number]): number {
  if (poly.length < 3) {
    // a point or a line: the best you can be is ON it
    if (!poly.length) return -1;
    let d = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ab = [b[0] - a[0], b[1] - a[1]], aq = [q[0] - a[0], q[1] - a[1]];
      const L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-12;
      const t = Math.max(0, Math.min(1, (aq[0] * ab[0] + aq[1] * ab[1]) / L2));
      d = Math.min(d, Math.hypot(a[0] + ab[0] * t - q[0], a[1] + ab[1] * t - q[1]));
    }
    return -d;
  }
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0], ez = b[1] - a[1];
    const L = Math.hypot(ex, ez) || 1e-12;
    // left normal of a CCW edge points inside
    const d = (ex * (q[1] - a[1]) - ez * (q[0] - a[0])) / L;
    m = Math.min(m, d);
  }
  return m;
}

// ── the check ─────────────────────────────────────────────────────────────────

export interface StaticOptions {
  /** extra point masses (a load on a seat, a payload in a gripper): world point, kg, carried by module/segment */
  extraLoads?: { p: V3; kg: number; module: ModuleId; seg: number }[];
  /** a dock that is about to close: its two ports may touch (they are about to lock) */
  pendingDock?: { a: { module: ModuleId; port: PortId }; b: { module: ModuleId; port: PortId } } | null;
  /** also run the touch test (a push at the top in 4 directions); off in the planner's inner loops */
  touch?: boolean;
}

export function checkStatic(cfg: Config, anchors: FloorAnchor[] = CONFIG.floorAnchors, opts: StaticOptions = {}): StaticReport {
  const reasons: string[] = [...configProblems(cfg)];
  /** physically OK but delicate (shown, and the planner prefers to avoid it) */
  const warnings: string[] = [];
  const asm = assemble(cfg, anchors);
  reasons.push(...asm.problems);
  const mods = [...asm.placed.values()];

  // ── loads ──
  type Load = { node: string; p: V3; f: V3 };
  const masses: Load[] = [];
  let M = 0; let com: V3 = [0, 0, 0];
  for (const m of mods) {
    for (const b of m.geo.bodies) {
      masses.push({ node: `${m.id}:${b.seg}`, p: b.com, f: [0, -b.mass * G, 0] });
      M += b.mass; com = [com[0] + b.com[0] * b.mass, com[1] + b.com[1] * b.mass, com[2] + b.com[2] * b.mass];
    }
  }
  for (const l of opts.extraLoads ?? []) {
    masses.push({ node: `${l.module}:${l.seg}`, p: l.p, f: [0, -l.kg * G, 0] });
    M += l.kg; com = [com[0] + l.p[0] * l.kg, com[1] + l.p[1] * l.kg, com[2] + l.p[2] * l.kg];
  }
  com = M > 0 ? [com[0] / M, com[1] / M, com[2] / M] : [0, 0, 0];

  // ── supports ──
  const pinnedSeg = new Set<string>();
  const anchorsAt: { node: string; p: V3 }[] = [];
  for (const f of asm.floorLocks) {
    const node = `${f.module}:${PORT_SEG[f.port]}`;
    pinnedSeg.add(node);
    anchorsAt.push({ node, p: [f.anchor.x, 0, f.anchor.z] });
  }
  if (asm.held) {
    const node = `${asm.held.module}:${PORT_SEG[asm.held.port]}`;
    const pa = asm.placed.get(asm.held.module)!.geo.ports[asm.held.port].pos;
    anchorsAt.push({ node, p: pa });
  }

  const collisions: string[] = [];
  const rawContacts: { module: ModuleId; seg: number; p: V3 }[] = [];
  for (const m of mods) {
    for (const s of m.geo.spheres) {
      const node = `${m.id}:${s.seg}`;
      const gap = s.c[1] - s.r;
      if (pinnedSeg.has(node)) continue;
      if (gap < -PENETRATION_TOL) collisions.push(`${m.id} segment ${s.seg} goes ${((-gap) * 1000).toFixed(0)} mm into the floor`);
      else if (gap < CONTACT_TOL) rawContacts.push({ module: m.id, seg: s.seg, p: [s.c[0], 0, s.c[2]] });
    }
  }
  // cluster, then give every contact its real footprint: the parts touching the floor
  // are boxy (end locks 80 mm square, spines 63 x 70 mm), so each contact is a small
  // square patch, not a point on the centreline. Its corners are what the support
  // polygon and the force solve use.
  const clusters: { module: ModuleId; seg: number; p: V3 }[] = [];
  for (const c of rawContacts) {
    const near = clusters.find((k) => k.module === c.module && k.seg === c.seg && Math.hypot(k.p[0] - c.p[0], k.p[2] - c.p[2]) < CLUSTER);
    if (!near) clusters.push(c);
  }
  const contacts: Contact[] = [];
  for (const c of clusters) {
    // The footprint only spreads along body axes that lie flat on the floor: a face down
    // gives a square, an edge down a line, a corner a point (MuJoCo showed curled shapes
    // resting on edges tip over when every contact was treated as a square).
    const body = asm.placed.get(c.module)!.geo.bodies.find((b) => b.seg === c.seg)!;
    const flat: V3[] = [];
    for (const ax of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as V3[]) {
      const w = qrot(body.frame.q, ax);
      if (Math.abs(w[1]) < FLAT_SIN) { const L = Math.hypot(w[0], w[2]); flat.push([w[0] / L, 0, w[2] / L]); }
    }
    const d: V3 = flat[0] ?? [1, 0, 0];
    const n: V3 = flat[1] ?? [-d[2], 0, d[0]];
    const hd = flat.length >= 1 ? PATCH : EDGE, hn = flat.length >= 2 ? PATCH : EDGE;
    for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      contacts.push({ module: c.module, seg: c.seg, p: [c.p[0] + d[0] * u * hd + n[0] * v * hn, 0, c.p[2] + d[2] * u * hd + n[2] * v * hn], force: 0 });
    }
  }

  // ── share the load: unknowns = contact pushes, then 6 per anchor ──
  // (a function, so the touch test below can re-solve with an extra push)
  const nC = contacts.length;
  const cols: number[][] = [];
  const weights: number[] = [];
  const rel = (p: V3) => sub(p, com);
  for (const c of contacts) {
    const r = rel(c.p); // force (0,f,0): moment r × F = (-r_z f, 0, r_x f)
    cols.push([0, 1, 0, -r[2], 0, r[0]]); weights.push(1);
  }
  for (const a of anchorsAt) {
    const r = rel(a.p);
    for (let k = 0; k < 3; k++) {
      const F: V3 = [0, 0, 0]; F[k] = 1;
      const mmt = cross(r, F);
      cols.push([F[0], F[1], F[2], mmt[0], mmt[1], mmt[2]]); weights.push(0.05);
    }
    for (let k = 0; k < 3; k++) {
      const c = [0, 0, 0, 0, 0, 0]; c[3 + k] = 1; cols.push(c); weights.push(0.05 * 0.05);
    }
  }
  const A = [0, 1, 2, 3, 4, 5].map((row) => cols.map((c) => c[row]));
  const solve = (loads: Load[]): { x: number[]; balanced: boolean } => {
    // the supports cancel the total force and the total moment about the CoG
    let F: V3 = [0, 0, 0], T: V3 = [0, 0, 0];
    for (const l of loads) { F = [F[0] + l.f[0], F[1] + l.f[1], F[2] + l.f[2]]; const t = cross(rel(l.p), l.f); T = [T[0] + t[0], T[1] + t[1], T[2] + t[2]]; }
    const rhs = [-F[0], -F[1], -F[2], -T[0], -T[1], -T[2]];
    let x: number[] = new Array(cols.length).fill(0);
    let balanced = false;
    if (cols.length) {
      const active = new Array(cols.length).fill(true);
      for (let iter = 0; iter < nC + 1; iter++) {
        const idx = active.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
        const sol = leastNorm(A.map((r) => idx.map((i) => r[i])), rhs, idx.map((i) => weights[i]));
        x = new Array(cols.length).fill(0);
        idx.forEach((i, k) => { x[i] = sol.x[k]; });
        const neg = idx.filter((i) => i < nC && x[i] < -1e-6);
        if (!neg.length) { balanced = sol.resid < 1e-3 * M * G + 1e-6; break; }
        let worst = neg[0];
        for (const i of neg) if (x[i] < x[worst]) worst = i;
        active[worst] = false;
      }
    }
    return { x, balanced };
  };
  const { x, balanced } = solve(masses);
  contacts.forEach((c, i) => { c.force = x[i]; });

  const supportedBy: StaticReport['supportedBy'] = asm.floorLocks.length ? 'floor-anchor' : asm.held ? 'held' : nC ? 'floor-contact' : 'nothing';
  const externalsOf = (loads: Load[], xs: number[]) => {
    const external: Load[] = [...loads];
    contacts.forEach((c, i) => external.push({ node: `${c.module}:${c.seg}`, p: c.p, f: [0, xs[i], 0] }));
    const anchorMoments: { node: string; m: V3 }[] = [];
    anchorsAt.forEach((a, k) => {
      const o = nC + k * 6;
      external.push({ node: a.node, p: a.p, f: [xs[o], xs[o + 1], xs[o + 2]] });
      anchorMoments.push({ node: a.node, m: [xs[o + 3], xs[o + 4], xs[o + 5]] });
    });
    return { external, anchorMoments };
  };
  const { external, anchorMoments } = externalsOf(masses, x);

  // ── joint moments ──
  // segment graph through TREE locks only (a loop is statically indeterminate; carrying
  // the load through the tree is the conservative reading)
  const adj = new Map<string, string[]>();
  const link = (a: string, b: string) => { (adj.get(a) ?? adj.set(a, []).get(a)!).push(b); (adj.get(b) ?? adj.set(b, []).get(b)!).push(a); };
  for (const m of mods) for (let s = 0; s < 7; s++) link(`${m.id}:${s}`, `${m.id}:${s + 1}`);
  for (const l of asm.locks) {
    if (!l.tree || isFloorRef(l.edge.a)) continue;
    const a = l.edge.a as { module: ModuleId; port: PortId };
    link(`${a.module}:${PORT_SEG[a.port]}`, `${l.edge.b.module}:${PORT_SEG[l.edge.b.port]}`);
  }
  // for every joint: the segments on its far side
  type Placed = typeof mods[number];
  const jointList: { m: Placed; ji: number; j: Placed['geo']['joints'][number]; side: Set<string> }[] = [];
  for (const m of mods) {
    m.geo.joints.forEach((j, ji) => {
      const cutA = `${m.id}:${ji}`, start = `${m.id}:${ji + 1}`;
      const side = new Set([start]); const q = [start];
      while (q.length) {
        const n = q.pop()!;
        for (const k of adj.get(n) ?? []) {
          if ((n === start && k === cutA) || side.has(k)) continue;
          side.add(k); q.push(k);
        }
      }
      jointList.push({ m, ji, j, side });
    });
  }
  /** moment vector (N·m) every joint must carry for a set of external loads */
  const momentsOf = (ext: Load[], am: { node: string; m: V3 }[]): V3[] => jointList.map(({ j, side }) => {
    let t: V3 = [0, 0, 0];
    for (const ld of ext) if (side.has(ld.node)) { const c = cross(sub(ld.p, j.pos), ld.f); t = [t[0] + c[0], t[1] + c[1], t[2] + c[2]]; }
    for (const a of am) if (side.has(a.node)) t = [t[0] + a.m[0], t[1] + a.m[1], t[2] + a.m[2]];
    return t;
  });
  const jm = momentsOf(external, anchorMoments);
  const torques: JointTorque[] = [];
  let worst = 0;
  jointList.forEach(({ m, ji, j }, k) => {
    const nm = Math.abs(dot(jm[k], j.axis));
    const pct = (nm / CONFIG.limits.stallTorqueNm) * 100;
    worst = Math.max(worst, pct);
    torques.push({ module: m.id, joint: JOINTS[ji], nm, pct });
  });
  if (worst > CONFIG.limits.torqueBudgetPct) {
    const w = torques.reduce((a, c) => (c.pct > a.pct ? c : a));
    reasons.push(`${w.module} ${w.joint} must hold ${w.nm.toFixed(2)} N·m = ${w.pct.toFixed(0)}% of stall (budget ${CONFIG.limits.torqueBudgetPct}% = ${TORQUE_BUDGET_NM.toFixed(2)} N·m)`);
  }

  // ── sag: the real robot is not where it is drawn ──
  // Every joint gives under its moment (the MuJoCo module the GPU runs use, physics_params.json):
  //   along the motor axis: servo droop τ/80 N·m/rad + gear slop (0.2° bend, 0.5° twist) + the bend bracket 67.6 N·m/rad;
  //   across it: PLA flex 39.4 (bend) / 59.2 (twist) N·m/rad, at most ±3° (beyond that the print itself takes the load).
  // A floor receiver tilts 175 N·m/rad (±1.5° play). Small angles, so the displacements add up linearly.
  const C = CONFIG.compliance, D2R = Math.PI / 180;
  const flexMax = C.flexMaxDeg * D2R;
  let groundNode: string | null = anchorsAt[0]?.node ?? null;
  if (!groundNode && contacts.length) { const c = contacts.reduce((p, q) => (q.force > p.force ? q : p)); groundNode = `${c.module}:${c.seg}`; }
  let flexWorst = 0; let flexWhere = '';
  const rot: { theta: V3; at: V3; moving: (node: string) => boolean }[] = [];
  jointList.forEach(({ m, ji, j, side }, k) => {
    const t = jm[k]; const ta = dot(t, j.axis);
    const perp = sub(t, [j.axis[0] * ta, j.axis[1] * ta, j.axis[2] * ta]);
    const bend = j.kind === 'bend';
    const kPerp = bend ? C.flexBendPerpNmPerRad : C.flexTwistPerpNmPerRad;
    const bl = (bend ? C.backlashBendDeg : C.backlashTwistDeg) * D2R * (Math.abs(ta) > 0.02 ? Math.sign(ta) : 0);
    const thA = ta / C.servoKpNmPerRad + (bend ? ta / C.flexBendInPlaneNmPerRad : 0) + bl;
    const pm = len(perp); const thP = pm / kPerp;
    if (thP / flexMax > flexWorst) { flexWorst = thP / flexMax; flexWhere = `${m.id} ${JOINTS[ji]}`; }
    const thPc = Math.min(thP, flexMax);
    const u: V3 = pm > 1e-12 ? [perp[0] / pm, perp[1] / pm, perp[2] / pm] : [0, 0, 0];
    const theta: V3 = [j.axis[0] * thA + u[0] * thPc, j.axis[1] * thA + u[1] * thPc, j.axis[2] * thA + u[2] * thPc];
    // the side away from the ground moves; if the ground is on the far side, the near side turns the other way
    const groundFar = groundNode !== null && side.has(groundNode);
    rot.push(groundFar ? { theta: [-theta[0], -theta[1], -theta[2]], at: j.pos, moving: (n) => !side.has(n) } : { theta, at: j.pos, moving: (n) => side.has(n) });
  });
  let receiverTiltDeg = 0;
  if (anchorsAt.length === 1 && !contacts.some((c) => c.force > 1e-3)) {
    // one receiver holds everything: the whole robot leans on its play
    const a = anchorsAt[0]; let t: V3 = [0, 0, 0];
    for (const ld of masses) { const c = cross(sub(ld.p, a.p), ld.f); t = [t[0] + c[0], t[1] + c[1], t[2] + c[2]]; }
    const th = Math.hypot(t[0], t[2]) / C.receiverTiltNmPerRad;
    receiverTiltDeg = th / D2R;
    const thc = Math.min(th, C.receiverTiltMaxDeg * D2R), h = Math.hypot(t[0], t[2]) || 1;
    rot.push({ theta: [(t[0] / h) * thc, 0, (t[2] / h) * thc], at: a.p, moving: () => true });
  }
  const rawDisp = (p: V3, node: string): V3 => {
    let d: V3 = [0, 0, 0];
    for (const r of rot) if (r.moving(node)) { const c = cross(r.theta, sub(p, r.at)); d = [d[0] + c[0], d[1] + c[1], d[2] + c[2]]; }
    return d;
  };
  // Resting on the floor at several places, it cannot sink through it: take out the rigid
  // tilt/shift that brings every loaded contact back onto the floor (least squares, small angles).
  let rigid: { t: V3; w: V3; c: V3 } | null = null;
  const loaded = contacts.filter((c) => c.force > 1e-3);
  if (supportedBy === 'floor-contact' && loaded.length >= 2) {
    const c0 = loaded.reduce((a, c) => [a[0] + c.p[0] / loaded.length, a[1] + c.p[1] / loaded.length, a[2] + c.p[2] / loaded.length] as V3, [0, 0, 0] as V3);
    // unknowns t (3), w (3): d_rigid(p) = t + w × (p − c0); match the vertical displacement of each contact (horizontal weakly)
    const rows: number[][] = [], rhs: number[] = [];
    for (const c of loaded) {
      const r = sub(c.p, c0), d = rawDisp(c.p, `${c.module}:${c.seg}`);
      // w × r = (w_y r_z − w_z r_y, w_z r_x − w_x r_z, w_x r_y − w_y r_x)
      const comp = [[1, 0, 0, 0, r[2], -r[1]], [0, 1, 0, -r[2], 0, r[0]], [0, 0, 1, r[1], -r[0], 0]];
      const wt = [0.2, 1, 0.2];
      for (let k = 0; k < 3; k++) { rows.push(comp[k].map((v) => v * wt[k])); rhs.push(d[k] * wt[k]); }
    }
    const AtA = [0, 1, 2, 3, 4, 5].map((i) => [0, 1, 2, 3, 4, 5].map((j) => rows.reduce((s2, r) => s2 + r[i] * r[j], 0) + (i === j ? 1e-9 : 0)));
    const Atb = [0, 1, 2, 3, 4, 5].map((i) => rows.reduce((s2, r, k) => s2 + r[i] * rhs[k], 0));
    const sol = solveSym(AtA, Atb);
    if (sol) rigid = { t: [sol[0], sol[1], sol[2]], w: [sol[3], sol[4], sol[5]], c: c0 };
  }
  const dispOf = (p: V3, node: string): V3 => {
    const d = rawDisp(p, node);
    if (!rigid) return d;
    const wr = cross(rigid.w, sub(p, rigid.c));
    return [d[0] - rigid.t[0] - wr[0], d[1] - rigid.t[1] - wr[1], d[2] - rigid.t[2] - wr[2]];
  };
  let sagMm = 0; let sagWhere = '';
  let comS: V3 = [0, 0, 0];
  for (const m of mods) {
    for (const bd of m.geo.bodies) {
      const d = dispOf(bd.com, `${m.id}:${bd.seg}`);
      comS = [comS[0] + (bd.com[0] + d[0]) * bd.mass, comS[1] + (bd.com[1] + d[1]) * bd.mass, comS[2] + (bd.com[2] + d[2]) * bd.mass];
    }
    for (const [pid, pw] of Object.entries(m.geo.ports)) {
      const dm = len(dispOf(pw.pos, `${m.id}:${PORT_SEG[pid as PortId]}`)) * 1000;
      if (dm > sagMm) { sagMm = dm; sagWhere = `${m.id}.${pid}`; }
    }
  }
  for (const l of opts.extraLoads ?? []) { const d = dispOf(l.p, `${l.module}:${l.seg}`); comS = [comS[0] + (l.p[0] + d[0]) * l.kg, comS[1] + (l.p[1] + d[1]) * l.kg, comS[2] + (l.p[2] + d[2]) * l.kg]; }
  comS = M > 0 ? [comS[0] / M, comS[1] / M, comS[2] / M] : com;
  // ESTIMATES, shown as warnings - whether it really holds is decided by physics (MuJoCo, the Gravity button)
  if (flexWorst > 1) warnings.push(`estimate: ${flexWhere}'s PLA bracket would bend ${(flexWorst * C.flexMaxDeg).toFixed(1)}° sideways (it gives about ±${C.flexMaxDeg}°, then the print takes the load)`);
  if (receiverTiltDeg > C.receiverTiltMaxDeg) warnings.push(`estimate: the floor receiver would tilt ${receiverTiltDeg.toFixed(1)}° (its play is ±${C.receiverTiltMaxDeg}°)`);

  // ── stability, with the SAGGED centre of gravity ──
  let cogMarginMm = 999;
  let support: [number, number][] = [];
  let tipPushN = 999;
  let top = { y: -1, p: [0, 0, 0] as V3, node: '' };
  for (const m of mods) for (const sp of m.geo.spheres) if (sp.c[1] + sp.r > top.y) top = { y: sp.c[1] + sp.r, p: sp.c, node: `${m.id}:${sp.seg}` };
  if (supportedBy === 'floor-contact') {
    support = hull(contacts.map((c) => [c.p[0], c.p[2]] as [number, number]));
    cogMarginMm = insideMargin(support, [comS[0], comS[2]]) * 1000;
    if (cogMarginMm < CONFIG.limits.cogMarginMm) reasons.push(`centre of gravity is ${cogMarginMm.toFixed(0)} mm inside the support area, counting the sag (needs ≥ ${CONFIG.limits.cogMarginMm} mm)`);
    // a push at the top tips it over the nearest support edge: push × height = weight × margin
    tipPushN = (M * G * Math.max(0, cogMarginMm / 1000)) / Math.max(0.05, top.y);
    // standing but FRAGILE (a straight module on its pad really stands, but a touch tips it): allowed, flagged
    if (cogMarginMm >= CONFIG.limits.cogMarginMm && tipPushN < CONFIG.robustness.minTipPushN) warnings.push(`fragile (estimate): a ${tipPushN.toFixed(1)} N touch at the top (${(top.y * 1000).toFixed(0)} mm high) tips it over`);
  } else if (supportedBy === 'nothing') {
    cogMarginMm = -999; tipPushN = 0; reasons.push('nothing holds it up');
  }
  if (supportedBy !== 'nothing' && !balanced && supportedBy === 'floor-contact' && cogMarginMm >= 0) {
    reasons.push('the floor contacts cannot balance it');
  }

  // ── touch test (opt-in: it re-solves 4 times): a push at the top must not make a servo slip ──
  let touchWorstPct: number | undefined;
  if (opts.touch && supportedBy !== 'nothing') {
    const F = CONFIG.robustness.touchN; let tw = 0; let touchWhere = '';
    for (const dir of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] as V3[]) {
      const loads: Load[] = [...masses, { node: top.node, p: top.p, f: [dir[0] * F, 0, dir[2] * F] }];
      const s2 = solve(loads);
      const e2 = externalsOf(loads, s2.x);
      momentsOf(e2.external, e2.anchorMoments).forEach((t, k) => {
        const pct = (Math.abs(dot(t, jointList[k].j.axis)) / CONFIG.limits.stallTorqueNm) * 100;
        if (pct > tw) { tw = pct; touchWhere = `${jointList[k].m.id} ${JOINTS[jointList[k].ji]}`; }
      });
    }
    touchWorstPct = tw;
    if (tw > 100) warnings.push(`estimate: a ${F} N touch at the top would make ${touchWhere} slip (${tw.toFixed(0)}% of stall)`);
  }

  // ── joint limits ──
  let minJointMarginDeg = 999;
  for (const m of mods) {
    const p = cfg.pose[m.id];
    for (const jn of JOINTS) {
      const off = Math.abs(p[jn] - 180);
      const lim = isBend(jn) ? CONFIG.limits.bendDeg : CONFIG.limits.twistDeg;
      minJointMarginDeg = Math.min(minJointMarginDeg, lim - off);
      if (isBend(jn) && off > PLAN_BEND_DEG + 1e-9) reasons.push(`${m.id} ${jn} at ${(p[jn] - 180).toFixed(1)}° is past the planning limit ±${PLAN_BEND_DEG.toFixed(1)}°`);
      if (!isBend(jn) && off > CONFIG.limits.twistDeg + 1e-9) reasons.push(`${m.id} ${jn} is past ±180°`);
    }
  }

  // ── collisions ──
  const excluded = new Set<string>();
  const pairs = asm.locks.filter((l) => !isFloorRef(l.edge.a)).map((l) => ({ a: l.edge.a as { module: ModuleId; port: PortId }, b: l.edge.b }));
  if (opts.pendingDock) pairs.push(opts.pendingDock);
  for (const l of pairs.map((p) => ({ edge: p }))) {
    const a = l.edge.a as { module: ModuleId; port: PortId };
    for (let da = -1; da <= 1; da++) for (let db = -1; db <= 1; db++) {
      const x1 = `${a.module}:${PORT_SEG[a.port] + da}`, x2 = `${l.edge.b.module}:${PORT_SEG[l.edge.b.port] + db}`;
      excluded.add(`${x1}|${x2}`); excluded.add(`${x2}|${x1}`);
    }
  }
  const all = mods.flatMap((m) => m.geo.spheres.map((s) => ({ ...s, m: m.id })));
  const seen = new Set<string>();
  for (let i = 0; i < all.length; i++) {
    for (let k = i + 1; k < all.length; k++) {
      const a = all[i], c = all[k];
      if (a.m === c.m) {
        const d = Math.abs(a.seg - c.seg);
        if (d <= 1 || (Math.min(a.seg, c.seg) === 3 && Math.max(a.seg, c.seg) === 5)) continue;
      } else if (excluded.has(`${a.m}:${a.seg}|${c.m}:${c.seg}`)) continue;
      const gap = len(sub(a.c, c.c)) - a.r - c.r;
      if (gap < -PENETRATION_TOL) {
        const key = `${a.m}:${a.seg}|${c.m}:${c.seg}`;
        if (!seen.has(key)) { seen.add(key); collisions.push(`${a.m} seg ${a.seg} hits ${c.m} seg ${c.seg} (${(-gap * 1000).toFixed(0)} mm)`); }
      }
    }
  }
  reasons.push(...collisions);
  if (asm.closureErrMm > 3) reasons.push(`a loop of locks does not close (${asm.closureErrMm.toFixed(1)} mm apart)`);
  for (const l of asm.locks) {
    if (l.closure && !l.tree && (l.closure.normalDot > -0.995 || l.closure.keyDeg > 5)) reasons.push('a loop lock is not square (faces or keys misaligned)');
  }

  return {
    ok: reasons.length === 0,
    reasons,
    warnings,
    fragile: warnings.some((w) => w.startsWith('fragile')),
    margins: { maxTorquePct: worst, cogMarginMm, minJointMarginDeg, sagMm, tipPushN },
    torques, contacts, com, totalMassKg: M, support, supportedBy, collisions,
    closureErrMm: asm.closureErrMm, assembly: asm,
    sag: { maxMm: sagMm, where: sagWhere, com: comS, flexUse: flexWorst, flexWhere, receiverTiltDeg },
    touchWorstPct,
  };
}
