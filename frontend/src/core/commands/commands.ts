/**
 * commands.js — concrete, reversible edits to the model.
 *
 * Each factory returns { label, redo(doc)->doc, undo(doc)->doc }. Forward ops use
 * the pure document helpers from ../model/graph.js; undo restores captured state.
 * Add new editing capabilities here — the GUI, scripting, and AI all funnel through
 * these same commands, so undo/redo and history stay uniform.
 */
import { putEntity, removeFrom, getBody, getJoint, jointsOfBody } from '../model/graph';
import { command } from './commandBus';

// ── bodies ──────────────────────────────────────────────────────────────────────

export function addBody(body: any) {
  return command(
    `Add ${body.name}`,
    (doc: any) => putEntity(doc, body),
    (doc: any) => removeFrom(doc, 'bodies', body.id),
  );
}

/** Remove a body and every joint touching it (captured for undo). */
export function removeBody(bodyId: any) {
  let removedBody: any = null;
  let removedJoints: any[] = [];
  return command(
    'Remove body',
    (doc: any) => {
      removedBody = getBody(doc, bodyId);
      removedJoints = jointsOfBody(doc, bodyId);
      let d = doc;
      for (const j of removedJoints) d = removeFrom(d, 'joints', j.id);
      return removeFrom(d, 'bodies', bodyId);
    },
    (doc: any) => {
      let d = doc;
      if (removedBody) d = putEntity(d, removedBody);
      for (const j of removedJoints) d = putEntity(d, j);
      return d;
    },
  );
}

/** Shallow-merge a patch into a body (e.g. transform, name, material). */
export function updateBody(bodyId: any, patch: any) {
  let prev: any = null;
  return command(
    'Update body',
    (doc: any) => {
      prev = getBody(doc, bodyId);
      if (!prev) return doc;
      return putEntity(doc, { ...prev, ...patch });
    },
    (doc: any) => (prev ? putEntity(doc, prev) : doc),
  );
}

/** Reorder a collection ('bodies' | 'joints') to match the given id order.
 *  Rebuilds the id→entity map in the new key order (Object key order = list order).
 */
export function reorderCollection(collection: any, idsInOrder: any) {
  let prevOrder: any = null;
  const rebuild = (doc: any, order: any) => {
    const src = doc[collection] ?? {};
    const next: Record<string, any> = {};
    for (const id of order) if (src[id]) next[id] = src[id];
    // keep any ids not mentioned (safety) at the end
    for (const id of Object.keys(src)) if (!(id in next)) next[id] = src[id];
    return { ...doc, [collection]: next };
  };
  return command(
    'Reorder',
    (doc: any) => { prevOrder = Object.keys(doc[collection] ?? {}); return rebuild(doc, idsInOrder); },
    (doc: any) => rebuild(doc, prevOrder),
  );
}

// ── joints ──────────────────────────────────────────────────────────────────────

export function addJoint(joint: any) {
  return command(
    `Add ${joint.name}`,
    (doc: any) => putEntity(doc, joint),
    (doc: any) => removeFrom(doc, 'joints', joint.id),
  );
}

export function removeJoint(jointId: any) {
  let prev: any = null;
  return command(
    'Remove joint',
    (doc: any) => { prev = getJoint(doc, jointId); return removeFrom(doc, 'joints', jointId); },
    (doc: any) => (prev ? putEntity(doc, prev) : doc),
  );
}

export function updateJoint(jointId: any, patch: any) {
  let prev: any = null;
  return command(
    'Update joint',
    (doc: any) => {
      prev = getJoint(doc, jointId);
      if (!prev) return doc;
      return putEntity(doc, { ...prev, ...patch });
    },
    (doc: any) => (prev ? putEntity(doc, prev) : doc),
  );
}

/** Set many joint values at once (e.g. an IK solution) as one undoable step. */
export function setJointValues(values: any) {
  const prev: Record<string, any> = {};
  return command(
    'Solve IK',
    (doc: any) => Object.entries(values).reduce((d, [id, v]) => {
      const j = getJoint(d, id);
      if (!j) return d;
      prev[id] = j.state?.value ?? 0;
      return putEntity(d, { ...j, state: { ...j.state, value: v } });
    }, doc),
    (doc: any) => Object.entries(prev).reduce((d, [id, v]) => {
      const j = getJoint(d, id);
      return j ? putEntity(d, { ...j, state: { ...j.state, value: v } }) : d;
    }, doc),
  );
}

/** Set a joint's current articulation value (rad or m). */
export function setJointValue(jointId: any, value: any) {
  let prev: any = null;
  return command(
    'Move joint',
    (doc: any) => {
      const j = getJoint(doc, jointId);
      if (!j) return doc;
      prev = j.state?.value ?? 0;
      return putEntity(doc, { ...j, state: { ...j.state, value } });
    },
    (doc: any) => {
      const j = getJoint(doc, jointId);
      if (!j || prev == null) return doc;
      return putEntity(doc, { ...j, state: { ...j.state, value: prev } });
    },
  );
}

// ── materials / assets (generic put/remove) ─────────────────────────────────────

export function addMaterial(material: any) {
  return command(
    `Add ${material.name}`,
    (doc: any) => putEntity(doc, material),
    (doc: any) => removeFrom(doc, 'materials', material.id),
  );
}

export function addAsset(asset: any) {
  return command(
    `Import ${asset.name}`,
    (doc: any) => putEntity(doc, asset),
    (doc: any) => removeFrom(doc, 'assets', asset.id),
  );
}

export function updateMaterial(id: any, patch: any) {
  let prev: any = null;
  return command(
    'Edit material',
    (doc: any) => { prev = doc.materials[id]; return prev ? putEntity(doc, { ...prev, ...patch }) : doc; },
    (doc: any) => (prev ? putEntity(doc, prev) : doc),
  );
}

/** Atomically add a material and assign it to a body (single undo step). */
export function setBodyMaterial(bodyId: any, material: any) {
  let prevBody: any = null;
  return command(
    'Set material',
    (doc: any) => {
      prevBody = getBody(doc, bodyId);
      if (!prevBody) return doc;
      const d = putEntity(doc, material);
      return putEntity(d, { ...prevBody, visual: { ...prevBody.visual, materialId: material.id } });
    },
    (doc: any) => {
      const d = removeFrom(doc, 'materials', material.id);
      return prevBody ? putEntity(d, prevBody) : d;
    },
  );
}

/** Add several bodies at once (for array/duplicate). */
export function addBodies(bodies: any) {
  return command(
    `Add ${bodies.length} bodies`,
    (doc: any) => bodies.reduce((d: any, b: any) => putEntity(d, b), doc),
    (doc: any) => bodies.reduce((d: any, b: any) => removeFrom(d, 'bodies', b.id), doc),
  );
}

/** Add mixed model entities as one undoable operation (AI/scripting/generators). */
export function addEntities(entities: any, label = `Add ${entities.length} entities`) {
  const collectionByKind = {
    body: 'bodies',
    joint: 'joints',
    material: 'materials',
    asset: 'assets',
    frame: 'frames',
    constraint: 'constraints',
  };
  return command(
    label,
    (doc: any) => entities.reduce((d: any, entity: any) => putEntity(d, entity), doc),
    (doc: any) => entities.reduceRight((d: any, entity: any) => {
      const collection = collectionByKind[entity.kind as keyof typeof collectionByKind];
      return collection ? removeFrom(d, collection, entity.id) : d;
    }, doc),
  );
}
