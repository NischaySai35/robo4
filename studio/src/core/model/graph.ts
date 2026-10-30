/**
 * graph.js — immutable document operations + graph queries + validation.
 *
 * The model is a GRAPH (loops allowed), not a tree — this is deliberate: modular
 * any-face-to-any-face robots form closed loops that URDF (tree-only) can't
 * express. Tree-only exporters (URDF) collapse this graph as a lossy view.
 *
 * All mutators are pure: they return a NEW document (structural sharing), never
 * mutating the input. This is what makes the command bus' undo/redo clean.
 */

import type { Document } from './entities';

// ── collection helpers ──────────────────────────────────────────────────────────

const COLLECTIONS = {
  body: 'bodies', joint: 'joints', jointProfile: 'jointProfiles', material: 'materials',
  asset: 'assets', frame: 'frames', constraint: 'constraints',
  component: 'components',
};

function collectionFor(entity: any) {
  const c = COLLECTIONS[entity.kind as keyof typeof COLLECTIONS];
  if (!c) throw new Error(`Unknown entity kind: ${entity.kind}`);
  return c;
}

/** Insert or replace an entity by its kind. Returns a new document. */
export function putEntity(doc: any, entity: any) {
  const c = collectionFor(entity);
  return { ...doc, [c]: { ...(doc[c] ?? {}), [entity.id]: entity } };
}

/** Remove an entity from a named collection by id. Returns a new document. */
export function removeFrom(doc: any, collection: any, id: any) {
  if (!doc[collection] || !(id in doc[collection])) return doc;
  const next = { ...doc[collection] };
  delete next[id];
  return { ...doc, [collection]: next };
}

// ── bodies ──────────────────────────────────────────────────────────────────────

export const listBodies = (doc: Document) => Object.values(doc.bodies);
export const getBody = (doc: Document, id: string) => doc.bodies[id] ?? null;

/** Joints that reference a body as parent or child. */
export const jointsOfBody = (doc: Document, bodyId: string) =>
  Object.values(doc.joints).filter(j => j.parentBodyId === bodyId || j.childBodyId === bodyId);

/** Body ids directly connected to bodyId via a joint. */
export function neighbors(doc: Document, bodyId: string) {
  const out = new Set<string>();
  for (const j of jointsOfBody(doc, bodyId)) {
    if (j.parentBodyId === bodyId && j.childBodyId) out.add(j.childBodyId);
    if (j.childBodyId === bodyId && j.parentBodyId) out.add(j.parentBodyId);
  }
  return [...out];
}

// ── joints ──────────────────────────────────────────────────────────────────────

export const listJoints = (doc: Document) => Object.values(doc.joints);
export const getJoint = (doc: Document, id: string) => doc.joints[id] ?? null;

// ── components ──────────────────────────────────────────────────────────────────

/** Bodies belonging to a Component, in insertion order. */
export const bodiesOfComponent = (doc: Document, componentId: string) =>
  Object.values(doc.bodies).filter(b => b.componentId === componentId);

/** Joints belonging to a Component, in insertion order. */
export const jointsOfComponent = (doc: Document, componentId: string) =>
  Object.values(doc.joints).filter(j => j.componentId === componentId);

/** A copy of `doc` with these joint values applied (immutable; transient poses). */
export function withJointValues<D extends { joints: Record<string, any> }>(doc: D, vals: Record<string, number>): D {
  const joints: any = { ...doc.joints };
  for (const [id, v] of Object.entries(vals)) {
    const j = joints[id];
    if (j) joints[id] = { ...j, state: { ...j.state, value: v } };
  }
  return { ...doc, joints };
}

/** A body/joint by id, else by name (exact, then substring; case-insensitive). */
export function findEntity(doc: Document, kind: 'body' | 'joint', key: unknown) {
  const collection: Record<string, { name: string }> = kind === 'joint' ? doc.joints : doc.bodies;
  if (typeof key === 'string' && collection[key]) return collection[key] as any;
  const needle = String(key || '').toLowerCase();
  if (!needle) return null;
  return (Object.values(collection).find((e) => e.name.toLowerCase() === needle || e.name.toLowerCase().includes(needle)) ?? null) as any;
}

/** Bodies + joints grouped per Component (doc order), plus the ones in no (existing) Component. */
export function componentGroups(doc: Document) {
  const comps = doc.components ?? {};
  const bodies = Object.values(doc.bodies), joints = Object.values(doc.joints);
  const loose = (e: { componentId?: string | null }) => !e.componentId || !comps[e.componentId];
  return {
    groups: Object.values(comps).map((comp) => ({
      comp,
      bodies: bodies.filter((b) => b.componentId === comp.id),
      joints: joints.filter((j) => j.componentId === comp.id),
    })),
    unassigned: { bodies: bodies.filter(loose), joints: joints.filter(loose) },
  };
}

// ── graph algorithms ────────────────────────────────────────────────────────────

/** Connected components of the body graph (over joints). Returns array of Set<bodyId>. */
export function assemblies(doc: Document) {
  const ids = Object.keys(doc.bodies);
  const seen = new Set();
  const comps: Set<string>[] = [];
  for (const start of ids) {
    if (seen.has(start)) continue;
    const comp = new Set([start]);
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const nb of neighbors(doc, cur)) {
        if (!seen.has(nb)) { seen.add(nb); comp.add(nb); queue.push(nb); }
      }
    }
    comps.push(comp);
  }
  return comps;
}

/** BFS body-path from a→b over the joint graph (inclusive), or null. */
export function pathBetween(doc: Document, aId: string, bId: string) {
  if (aId === bId) return [aId];
  const prev = new Map<string, string | null>([[aId, null]]);
  const queue = [aId];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === bId) break;
    for (const nb of neighbors(doc, cur)) {
      if (!prev.has(nb)) { prev.set(nb, cur); queue.push(nb); }
    }
  }
  if (!prev.has(bId)) return null;
  const path: string[] = [];
  for (let n: string | null | undefined = bId; n != null; n = prev.get(n)) path.unshift(n);
  return path;
}

// ── validation ──────────────────────────────────────────────────────────────────

/** Structural validation. Returns { ok, errors:[], warnings:[] }. */
export function validate(doc: Document) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!doc || doc.kind !== 'document') {
    return { ok: false, errors: ['Not a document'], warnings };
  }

  for (const j of Object.values(doc.joints)) {
    if (!j.parentBodyId || !doc.bodies[j.parentBodyId]) {
      errors.push(`Joint ${j.id} has invalid parentBodyId (${j.parentBodyId})`);
    }
    if (!j.childBodyId || !doc.bodies[j.childBodyId]) {
      errors.push(`Joint ${j.id} has invalid childBodyId (${j.childBodyId})`);
    }
    if (j.parentBodyId && j.parentBodyId === j.childBodyId) {
      errors.push(`Joint ${j.id} connects a body to itself`);
    }
  }

  for (const b of Object.values(doc.bodies)) {
    const g = b.visual?.geometry;
    if (g?.type === 'mesh' && g.assetId && !doc.assets[g.assetId]) {
      warnings.push(`Body ${b.id} references missing asset ${g.assetId}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Quick scalar stats for UI/debug. */
export function stats(doc: Document) {
  return {
    bodies: Object.keys(doc.bodies).length,
    joints: Object.keys(doc.joints).length,
    materials: Object.keys(doc.materials).length,
    assets: Object.keys(doc.assets).length,
    assemblies: assemblies(doc).length,
  };
}