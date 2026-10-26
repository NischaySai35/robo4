/**
 * topology.ts — every distinct way N modules can be locked together (brief §5 L2.2).
 *
 * Valid lock sets: connected; every lock has an END on at least one side; at most
 * one lock per port; no module locked to itself. Two lock sets are the SAME topology
 * when one becomes the other by
 *   - renaming the modules, and/or
 *   - turning a module over: its four 180° symmetries (identity; about the chain,
 *     which swaps the two faces; end over end, which swaps A↔B and spine 1↔2; and both).
 * Each topology is returned once, in a canonical form, with modules named M1..Mn.
 *
 * Counts (measured, see topology.test.ts): N=2 → 2 trees, N=3 → 10, N=4 → 51.
 */
import { type Edge, type PortId, PORTS, isEndPort } from './model';

type Port = [number, PortId];   // module index, port
type Lock = [Port, Port];

const SYMS: Record<PortId, PortId>[] = [
  { A: 'A', B: 'B', S1A: 'S1A', S1B: 'S1B', S2A: 'S2A', S2B: 'S2B' },
  { A: 'A', B: 'B', S1A: 'S1B', S1B: 'S1A', S2A: 'S2B', S2B: 'S2A' },
  { A: 'B', B: 'A', S1A: 'S2A', S1B: 'S2B', S2A: 'S1A', S2B: 'S1B' },
  { A: 'B', B: 'A', S1A: 'S2B', S1B: 'S2A', S2A: 'S1B', S2B: 'S1A' },
];
const PIDX: Record<PortId, number> = { A: 0, B: 1, S1A: 2, S1B: 3, S2A: 4, S2B: 5 };

function permutations(n: number): number[][] {
  if (n === 1) return [[0]];
  const out: number[][] = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}

function transforms(n: number): { perm: number[]; sym: number[] }[] {
  const out: { perm: number[]; sym: number[] }[] = [];
  const syms: number[][] = [[]];
  for (let i = 0; i < n; i++) {
    const next: number[][] = [];
    for (const s of syms) for (let k = 0; k < 4; k++) next.push([...s, k]);
    syms.splice(0, syms.length, ...next);
  }
  for (const perm of permutations(n)) for (const sym of syms) out.push({ perm, sym });
  return out;
}

const code = (p: Port) => p[0] * 6 + PIDX[p[1]];

function canonical(locks: Lock[], T: { perm: number[]; sym: number[] }[]): string {
  let best: string | null = null;
  for (const t of T) {
    const enc = locks.map(([a, b]) => {
      const x = t.perm[a[0]] * 6 + PIDX[SYMS[t.sym[a[0]]][a[1]]];
      const y = t.perm[b[0]] * 6 + PIDX[SYMS[t.sym[b[0]]][b[1]]];
      return x < y ? x * 64 + y : y * 64 + x;
    }).sort((u, v) => u - v).join(',');
    if (best === null || enc < best) best = enc;
  }
  return best ?? '';
}

function connected(locks: Lock[], n: number): boolean {
  const par = Array.from({ length: n }, (_, i) => i);
  const f = (a: number): number => (par[a] === a ? a : (par[a] = f(par[a])));
  for (const [a, b] of locks) par[f(a[0])] = f(b[0]);
  return new Set(par.map((_, i) => f(i))).size === 1;
}

/** Every distinct connected topology of n modules with exactly `n - 1 + extra` locks. */
export function enumerateTopologies(n: number, extra = 0): Edge[][] {
  if (n === 1) return extra === 0 ? [[]] : [];
  const T = transforms(n);
  const allLocks: Lock[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    for (const p of PORTS) for (const q of PORTS) if (isEndPort(p) || isEndPort(q)) allLocks.push([[i, p], [j, q]]);
  }
  const target = n - 1 + extra;
  let level = new Map<string, Lock[]>([['', []]]);
  for (let k = 1; k <= target; k++) {
    const next = new Map<string, Lock[]>();
    for (const locks of level.values()) {
      const used = new Set(locks.flatMap(([a, b]) => [code(a), code(b)]));
      for (const l of allLocks) {
        if (used.has(code(l[0])) || used.has(code(l[1]))) continue;
        const cand = [...locks, l];
        const c = canonical(cand, T);
        if (!next.has(c)) next.set(c, cand);
      }
    }
    level = next;
  }
  const out: Edge[][] = [];
  for (const [c, locks] of [...level.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (!connected(locks, n)) continue;
    void c;
    out.push(locks.map(([a, b]) => {
      // put the END first when only one side is an end (reads as "end onto side")
      const [x, y] = isEndPort(a[1]) ? [a, b] : [b, a];
      return { a: { module: `M${x[0] + 1}`, port: x[1] }, b: { module: `M${y[0] + 1}`, port: y[1] }, slot: 0, locked: true } as Edge;
    }));
  }
  return out;
}

/** A short human name for a topology, e.g. "M1.B→M2.A + M2.B→M3.S1A". */
export const topologyLabel = (t: Edge[]) =>
  t.map((e) => `${'floor' in e.a ? e.a.floor : `${e.a.module}.${e.a.port}`}→${e.b.module}.${e.b.port}`).join(' + ') || 'single module';

const T_CACHE = new Map<number, { perm: number[]; sym: number[] }[]>();

/**
 * Canonical key of a concrete lock graph: equal for two robots that are the same
 * shape up to renaming modules and turning modules over. Floor locks are kept as
 * "this module end sits in a floor receiver" (the receiver's identity is not part of
 * the shape).
 */
export function canonicalKey(edges: Edge[], modules: string[]): string {
  const n = modules.length;
  if (!T_CACHE.has(n)) T_CACHE.set(n, transforms(n));
  const T = T_CACHE.get(n)!;
  const idx = new Map(modules.map((m, i) => [m, i]));
  const locks: Lock[] = [];
  const floors: Port[] = [];
  for (const e of edges) {
    if (!e.locked) continue;
    if ('floor' in e.a) { floors.push([idx.get(e.b.module)!, e.b.port]); continue; }
    locks.push([[idx.get(e.a.module)!, e.a.port], [idx.get(e.b.module)!, e.b.port]]);
  }
  let best: string | null = null;
  for (const t of T) {
    const enc = locks.map(([a, b]) => {
      const x = t.perm[a[0]] * 6 + PIDX[SYMS[t.sym[a[0]]][a[1]]];
      const y = t.perm[b[0]] * 6 + PIDX[SYMS[t.sym[b[0]]][b[1]]];
      return x < y ? x * 64 + y : y * 64 + x;
    }).sort((u, v) => u - v).join(',');
    const fl = floors.map((p) => t.perm[p[0]] * 6 + PIDX[SYMS[t.sym[p[0]]][p[1]]]).sort((u, v) => u - v).join(',');
    const k = `${enc}|F${fl}`;
    if (best === null || k < best) best = k;
  }
  return best ?? '';
}
