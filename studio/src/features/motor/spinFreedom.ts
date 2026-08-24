/**
 * spinFreedom — can a motor joint actually rotate continuously right now?
 *
 * A revolute motor can spin a full turn only if nothing else rigidly ties its two
 * sides together. In graph terms: the joint must be a BRIDGE — removing its edge
 * splits its two bodies into separate components. If the two bodies stay connected
 * through OTHER enabled joints (connector locks, other joints), those form a closed
 * loop that constrains the joint, so continuous rotation would tear the module apart.
 *
 * Example (the endlock case): a straight module M1 with module M2's BOTH endlocks
 * locked to M1's sides makes a loop M1–lockA–M2…–lockB–M1. Every joint on that loop
 * (M2's end motors included) is non-bridge → cannot spin. M1's own free ends are leaf
 * bridges → they can. `isDisabled` lets callers drop joints detached at an animation
 * time (connection keys) so the check reflects the CURRENT lock state.
 */
import type { Document } from '@/core/model/index';

export function canJointSpin(
  doc: Document,
  jointId: string,
  isDisabled?: (jid: string) => boolean,
): boolean {
  const j: any = (doc.joints as any)[jointId];
  if (!j || !j.parentBodyId || !j.childBodyId) return true;

  // Adjacency over every ENABLED joint except this one.
  const adj = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  };
  for (const [jid, jj] of Object.entries(doc.joints) as [string, any][]) {
    if (jid === jointId) continue;
    const off = isDisabled ? isDisabled(jid) : !!jj.state?.disabled;
    if (off) continue;
    const a = jj.parentBodyId, b = jj.childBodyId;
    if (!a || !b || !doc.bodies[a] || !doc.bodies[b]) continue;
    link(a, b); link(b, a);
  }

  // If the child is still reachable from the parent without this joint, it's in a loop.
  const goal = j.childBodyId as string;
  const seen = new Set<string>([j.parentBodyId as string]);
  const q: string[] = [j.parentBodyId as string];
  while (q.length) {
    const x = q.shift()!;
    if (x === goal) return false;      // alternate path exists → loop → cannot spin
    for (const n of adj.get(x) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); }
  }
  return true;                          // bridge → free to spin
}
