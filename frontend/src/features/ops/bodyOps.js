/**
 * bodyOps — pure helpers that produce new Body objects for duplicate / mirror /
 * array operations. They never mutate; callers dispatch addBody/addBodies so the
 * ops are undoable. Asset references are shared (the same mesh data is reused).
 */
import { uid } from '@/core/model/index.js';

function cloneBody(body, overrides = {}) {
  const c = structuredClone(body);
  c.id = uid('body');
  return { ...c, ...overrides };
}

/** A copy at the EXACT same place (Blender-style "Duplicate" → grab to move). */
export function duplicateInPlace(body) {
  return cloneBody(body, {
    name: `${body.name} copy`,
    transform: structuredClone(body.transform),
  });
}

/** A copy offset slightly so it's visible next to the original. */
export function duplicate(body) {
  const p = body.transform.position;
  return cloneBody(body, {
    name: `${body.name} copy`,
    transform: { ...structuredClone(body.transform), position: [p[0] + 0.6, p[1], p[2]] },
  });
}

/** Mirror across the world plane perpendicular to axis (0=X,1=Y,2=Z). */
export function mirror(body, axis) {
  const t = structuredClone(body.transform);
  t.position[axis] = -t.position[axis];
  t.scale[axis] = -t.scale[axis]; // negative scale flips the geometry
  return cloneBody(body, { name: `${body.name} mirror`, transform: t });
}

/** N-1 additional copies stepped by `offset` (array modifier). Returns the copies. */
export function array(body, count, offset) {
  const out = [];
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
