/**
 * bodyOps — pure helpers that produce new Body objects for duplicate / mirror /
 * array operations. They never mutate; callers dispatch addBody/addBodies so the
 * ops are undoable. Asset references are shared (the same mesh data is reused).
 */
import { uid } from '@/core/model/index';

function cloneBody(body: any, overrides = {}) {
  const c = structuredClone(body);
  c.id = uid('body');
  // Connectors carry their own id (referenced by connectorSnap.ts / assembly
  // mates) — a structuredClone copy keeps the SAME id as the original, so two
  // copies of one module end up with identically-id'd connectors that then
  // both light up together when either one is picked/selected. Give each
  // copied connector a fresh id.
  if (c.meta?.connectors?.length) {
    c.meta = { ...c.meta, connectors: c.meta.connectors.map((con: any) => ({ ...con, id: uid('con') })) };
  }
  return { ...c, ...overrides };
}

/** A copy at the EXACT same place (Blender-style "Duplicate" → grab to move). */
export function duplicateInPlace(body: any) {
  return cloneBody(body, {
    name: `${body.name} copy`,
    transform: structuredClone(body.transform),
  });
}

/** A copy offset slightly so it's visible next to the original. */
export function duplicate(body: any) {
  const p = body.transform.position;
  return cloneBody(body, {
    name: `${body.name} copy`,
    transform: { ...structuredClone(body.transform), position: [p[0] + 0.6, p[1], p[2]] },
  });
}

/** Mirror across the world plane perpendicular to axis (0=X,1=Y,2=Z). */
export function mirror(body: any, axis: any) {
  const t = structuredClone(body.transform);
  t.position[axis] = -t.position[axis];
  t.scale[axis] = -t.scale[axis]; // negative scale flips the geometry
  return cloneBody(body, { name: `${body.name} mirror`, transform: t });
}

/** A joint copy remapped onto duplicated bodies (Blender-style "Duplicate" for components).
 *  `bodyIdRemap` maps original body id → duplicate body id; joint ends outside the
 *  remap (e.g. a joint to a body outside the copied set) keep pointing at the original.
 *  `jointIdRemap`, if given, maps original joint id → its already-assigned new id
 *  (build it up-front with one `uid('joint')` per joint so mimic refs resolve). */
export function duplicateJointInPlace(joint: any, bodyIdRemap: Map<string, string>, jointIdRemap?: Map<string, string>) {
  const c = structuredClone(joint);
  c.id = jointIdRemap?.get(joint.id) ?? uid('joint');
  c.name = `${joint.name} copy`;
  if (c.parentBodyId && bodyIdRemap.has(c.parentBodyId)) c.parentBodyId = bodyIdRemap.get(c.parentBodyId);
  if (c.childBodyId && bodyIdRemap.has(c.childBodyId)) c.childBodyId = bodyIdRemap.get(c.childBodyId);
  if (c.mimic?.jointId && jointIdRemap?.has(c.mimic.jointId)) c.mimic.jointId = jointIdRemap.get(c.mimic.jointId);
  return c;
}

/** Reassign `meta.servoId` on a set of (already-duplicated) joints so they don't
 *  collide with each other or with any servo id already used elsewhere in the
 *  doc — e.g. pasting/duplicating a component whose joints had servo ids 1-7
 *  would otherwise leave the copy pointing at the SAME physical servos.
 *  Continues numbering from the current highest assigned id. Joints that never
 *  had a servo id stay unassigned. */
export function reassignServoIds(joints: any[], doc: any) {
  let maxUsed = 0;
  for (const j of Object.values(doc.joints ?? {}) as any[]) {
    const id = Number(j.meta?.servoId);
    if (Number.isFinite(id) && id > maxUsed) maxUsed = id;
  }
  return joints.map((j) => {
    const id = Number(j.meta?.servoId);
    if (!Number.isFinite(id) || id <= 0) return j;
    maxUsed += 1;
    return { ...j, meta: { ...j.meta, servoId: maxUsed } };
  });
}

/** N-1 additional copies stepped by `offset` (array modifier). Returns the copies. */
export function array(body: any, count: any, offset: any) {
  const out: any[] = [];
  for (let i = 1; i < count; i++) {
    const t = structuredClone(body.transform);
    t.position = [
      t.position[0] + offset[0] * i,
      t.position[1] + offset[1] * i,
      t.position[2] + offset[2] * i,
    ];
    out.push(cloneBody(body, { name: `${body.name} ${i + 1}`, transform: t }));
  }
  return out;
}
