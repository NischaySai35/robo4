/**
 * rules.ts — the connector rules every layer must obey (brief §3–4).
 *
 *   - a lock joins an END (A/B) to an END or a SIDE receiver, or an END to a floor
 *     receiver. side↔side is impossible: only ends carry a lock rotor.
 *   - each port carries at most one lock.
 *   - a module never locks to itself.
 *   - the active modules form ONE connected robot (through module↔module locks).
 */
import { type Config, type Edge, type PortId, type ModuleId, isEndPort, isFloorRef, PORTS } from './model';

export function edgeProblem(e: Edge): string | null {
  if (isFloorRef(e.a)) return isEndPort(e.b.port) ? null : `${e.b.module}.${e.b.port} is a side receiver: only an END can lock to a floor receiver`;
  if (e.a.module === e.b.module) return `${e.a.module} cannot lock to itself`;
  if (!isEndPort(e.a.port) && !isEndPort(e.b.port)) {
    return `${e.a.module}.${e.a.port}–${e.b.module}.${e.b.port} is side↔side: two receivers cannot lock (only ends have a lock rotor)`;
  }
  return null;
}

export const edgeIsValid = (e: Edge) => edgeProblem(e) === null;

export function configProblems(c: Config): string[] {
  const out: string[] = [];
  const active = new Set(c.modules.filter((m) => !c.unused.includes(m)));
  const used = new Map<string, number>();
  const mark = (m: ModuleId, p: PortId) => { const k = `${m}.${p}`; used.set(k, (used.get(k) ?? 0) + 1); };
  for (const e of c.edges) {
    if (!e.locked) continue;
    const p = edgeProblem(e);
    if (p) out.push(p);
    for (const r of isFloorRef(e.a) ? [e.b] : [e.a, e.b]) {
      if (!c.modules.includes(r.module)) out.push(`unknown module ${r.module}`);
      else if (!active.has(r.module)) out.push(`${r.module} is parked (unused) but has a lock`);
      if (!PORTS.includes(r.port)) out.push(`unknown port ${r.port}`);
      mark(r.module, r.port);
    }
  }
  for (const [k, n] of used) if (n > 1) out.push(`${k} carries ${n} locks (one per port)`);
  for (const m of active) if (!c.pose[m]) out.push(`${m} has no pose`);

  // one piece
  const ids = [...active];
  if (ids.length > 1) {
    const parent = new Map(ids.map((m) => [m, m]));
    const find = (m: string): string => { while (parent.get(m) !== m) m = parent.get(m)!; return m; };
    for (const e of c.edges) {
      if (!e.locked || isFloorRef(e.a)) continue;
      if (active.has(e.a.module) && active.has(e.b.module)) parent.set(find(e.a.module), find(e.b.module));
    }
    const roots = new Set(ids.map(find));
    if (roots.size > 1) {
      // separate pieces are fine only if every piece is held by a floor receiver
      // (e.g. two modules each standing in their own receiver, about to dock)
      const anchoredRoots = new Set(c.edges.filter((e) => e.locked && isFloorRef(e.a) && active.has(e.b.module)).map((e) => find(e.b.module)));
      const loose = [...roots].filter((r) => !anchoredRoots.has(r));
      if (loose.length) out.push(`the robot is in ${roots.size} separate pieces and ${loose.length} of them is held by nothing`);
    }
  }
  return out;
}
