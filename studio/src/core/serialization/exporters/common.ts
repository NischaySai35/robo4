/**
 * Shared bits of every robot-format exporter (URDF / SDF / MJCF / IDL).
 */
import type { Document } from '@/core/model/index';

/** A name safe for XML ids / message fields: anything not [A-Za-z0-9_] → '_'. */
export const san = (s: unknown, fallback = 'x') => String(s ?? fallback).replace(/[^A-Za-z0-9_]/g, '_');

/** Fixed 6-decimal number, with tiny values printed as exactly '0'. */
export const n = (v: any) => (Math.abs(v) < 1e-9 ? '0' : (+v).toFixed(6));

/** [lower, upper] for a ranged joint, ±3.14 when unset. */
export const limitRange = (j: any): [number, number] => [j.limit?.lower ?? -3.14, j.limit?.upper ?? 3.14];

/**
 * Graph → tree, the reduction all tree formats need: the FIRST joint naming a body as
 * its child is that body's parent joint; any later ones are loop closures. Joints whose
 * bodies are missing are skipped.
 */
export function jointTree(doc: Document) {
  const childParent = new Map<string, any>();   // childId -> parent joint
  const children = new Map<string, string[]>(); // parentId -> [childId]
  const treeJoints: any[] = [], loopJoints: any[] = [];
  for (const j of Object.values(doc.joints) as any[]) {
    const pid = j.parentBodyId, cid = j.childBodyId;
    if (!pid || !cid || !doc.bodies[pid] || !doc.bodies[cid]) continue;
    if (childParent.has(cid)) { loopJoints.push(j); continue; }
    childParent.set(cid, j);
    treeJoints.push(j);
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid)!.push(cid);
  }
  const roots = Object.values(doc.bodies).filter((b) => !childParent.has(b.id));
  return { childParent, children, treeJoints, loopJoints, roots };
}
