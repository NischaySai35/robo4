/**
 * commands.js — concrete, reversible edits to the model.
 *
 * Each factory returns { label, redo(doc)->doc, undo(doc)->doc }. Forward ops use
 * the pure document helpers from ../model/graph.js; undo restores captured state.
 * Add new editing capabilities here — the GUI, scripting, and AI all funnel through
 * these same commands, so undo/redo and history stay uniform.
 */
import { putEntity, removeFrom, getBody, getJoint, jointsOfBody } from '../model/graph.js';
import { command } from './commandBus.js';

// ── bodies ──────────────────────────────────────────────────────────────────────

export function addBody(body) {
  return command(
    `Add ${body.name}`,
    (doc) => putEntity(doc, body),
    (doc) => removeFrom(doc, 'bodies', body.id),
  );
}

/** Remove a body and every joint touching it (captured for undo). */
export function removeBody(bodyId) {
  let removedBody = null;
  let removedJoints = [];
  return command(
    'Remove body',
    (doc) => {
      removedBody = getBody(doc, bodyId);
      removedJoints = jointsOfBody(doc, bodyId);
      let d = doc;
      for (const j of removedJoints) d = removeFrom(d, 'joints', j.id);
      return removeFrom(d, 'bodies', bodyId);
    },
    (doc) => {
      let d = doc;
      if (removedBody) d = putEntity(d, removedBody);
      for (const j of removedJoints) d = putEntity(d, j);
      return d;
    },
  );
}

/** Shallow-merge a patch into a body (e.g. transform, name, material). */
export function updateBody(bodyId, patch) {
  let prev = null;
  return command(
    'Update body',
    (doc) => {
      prev = getBody(doc, bodyId);
      if (!prev) return doc;
      return putEntity(doc, { ...prev, ...patch });
    },
    (doc) => (prev ? putEntity(doc, prev) : doc),
  );
}

/** Reorder a collection ('bodies' | 'joints') to match the given id order.
 *  Rebuilds the id→entity map in the new key order (Object key order = list order).
 */
export function reorderCollection(collection, idsInOrder) {
  let prevOrder = null;
  const rebuild = (doc, order) => {
    const src = doc[collection] ?? {};
    const next = {};
    for (const id of order) if (src[id]) next[id] = src[id];
    // keep any ids not mentioned (safety) at the end
    for (const id of Object.keys(src)) if (!(id in next)) next[id] = src[id];
    return { ...doc, [collection]: next };
  };
  return command(
    'Reorder',
    (doc) => { prevOrder = Object.keys(doc[collection] ?? {}); return rebuild(doc, idsInOrder); },
    (doc) => rebuild(doc, prevOrder),
  );
}

// ── joints ──────────────────────────────────────────────────────────────────────

export function addJoint(joint) {
  return command(
    `Add ${joint.name}`,
    (doc) => putEntity(doc, joint),
    (doc) => removeFrom(doc, 'joints', joint.id),
  );
}

export function removeJoint(jointId) {
  let prev = null;
  return command(
    'Remove joint',
    (doc) => { prev = getJoint(doc, jointId); return removeFrom(doc, 'joints', jointId); },
    (doc) => (prev ? putEntity(doc, prev) : doc),
  );
}

export function updateJoint(jointId, patch) {
  let prev = null;
  return command(
    'Update joint',
    (doc) => {
      prev = getJoint(doc, jointId);
      if (!prev) return doc;
      return putEntity(doc, { ...prev, ...patch });
    },
    (doc) => (prev ? putEntity(doc, prev) : doc),
  );
}

/** Set many joint values at once (e.g. an IK solution) as one undoable step. */
export function setJointValues(values) {
  const prev = {};
  return command(
    'Solve IK',
    (doc) => Object.entries(values).reduce((d, [id, v]) => {
      const j = getJoint(d, id);
      if (!j) return d;
      prev[id] = j.state?.value ?? 0;
      return putEntity(d, { ...j, state: { ...j.state, value: v } });
    }, doc),
    (doc) => Object.entries(prev).reduce((d, [id, v]) => {
      const j = getJoint(d, id);
      return j ? putEntity(d, { ...j, state: { ...j.state, value: v } }) : d;
    }, doc),
  );
}

/** Set a joint's current articulation value (rad or m). */
export function setJointValue(jointId, value) {
  let prev = null;
  return command(
    'Move joint',
    (doc) => {
      const j = getJoint(doc, jointId);
      if (!j) return doc;
      prev = j.state?.value ?? 0;
      return putEntity(doc, { ...j, state: { ...j.state, value } });
    },
    (doc) => {
      const j = getJoint(doc, jointId);
      if (!j || prev == null) return doc;
      return putEntity(doc, { ...j, state: { ...j.state, value: prev } });
    },
  );
}

// ── materials / assets (generic put/remove) ─────────────────────────────────────

export function addMaterial(material) {
  return command(
    `Add ${material.name}`,
    (doc) => putEntity(doc, material),
    (doc) => removeFrom(doc, 'materials', material.id),
  );
}

export function addAsset(asset) {
  return command(
    `Import ${asset.name}`,
    (doc) => putEntity(doc, asset),
    (doc) => removeFrom(doc, 'assets', asset.id),
  );
}

export function updateMaterial(id, patch) {
  let prev = null;
  return command(
    'Edit material',
    (doc) => { prev = doc.materials[id]; return prev ? putEntity(doc, { ...prev, ...patch }) : doc; },
    (doc) => (prev ? putEntity(doc, prev) : doc),
  );
}

/** Atomically add a material and assign it to a body (single undo step). */
export function setBodyMaterial(bodyId, material) {
  let prevBody = null;
  return command(
    'Set material',
    (doc) => {
      prevBody = getBody(doc, bodyId);
      if (!prevBody) return doc;
      const d = putEntity(doc, material);
      return putEntity(d, { ...prevBody, visual: { ...prevBody.visual, materialId: material.id } });
    },
    (doc) => {
      const d = removeFrom(doc, 'materials', material.id);
      return prevBody ? putEntity(d, prevBody) : d;
    },
  );
}

/** Add several bodies at once (for array/duplicate). */
export function addBodies(bodies) {
  return command(
    `Add ${bodies.length} bodies`,
    (doc) => bodies.reduce((d, b) => putEntity(d, b), doc),
    (doc) => bodies.reduce((d, b) => removeFrom(d, 'bodies', b.id), doc),
  );
}

/** Add mixed model entities as one undoable operation (AI/scripting/generators). */
export function addEntities(entities, label = `Add ${entities.length} entities`) {
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
    (doc) => entities.reduce((d, entity) => putEntity(d, entity), doc),
    (doc) => entities.reduceRight((d, entity) => {
      const collection = collectionByKind[entity.kind];
      return collection ? removeFrom(d, collection, entity.id) : d;
    }, doc),
  );
}
