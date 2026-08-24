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
import type { Component } from '../model/entities';

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

/** Apply a transform/patch to many bodies as ONE undoable step.
 *  `patches` = [[bodyId, patch], …]. Used by multi-body gizmo drags. */
export function updateBodies(patches: any) {
  let prev: any[] = [];
  return command(
    'Update bodies',
    (doc: any) => {
      prev = [];
      let d = doc;
      for (const [id, patch] of patches) {
        const b = getBody(d, id);
        if (!b) continue;
        prev.push(b);
        d = putEntity(d, { ...b, ...patch });
      }
      return d;
    },
    (doc: any) => {
      let d = doc;
      for (const b of prev) d = putEntity(d, b);
      return d;
    },
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

// ── Joint profiles (shared "joint types" — Twist / Bend / …) ─────────────────────

export function addJointProfile(profile: any) {
  return command(
    `Add ${profile.name}`,
    (doc: any) => putEntity(doc, profile),
    (doc: any) => removeFrom(doc, 'jointProfiles', profile.id),
  );
}

/** Edit a shared joint profile — every joint referencing it inherits the change
 *  (the analysis reads the actuator from the profile), so all joints of that type
 *  stay in sync automatically. */
export function updateJointProfile(profileId: any, patch: any) {
  let prev: any = null;
  return command(
    'Update joint type',
    (doc: any) => {
      prev = doc.jointProfiles?.[profileId];
      if (!prev) return doc;
      return putEntity(doc, { ...prev, ...patch });
    },
    (doc: any) => (prev ? putEntity(doc, prev) : doc),
  );
}

/** Atomically create a profile AND assign it to a joint (single undo step). */
export function addJointProfileAndAssign(profile: any, jointId: any) {
  let prevJoint: any = null;
  return command(
    `Add ${profile.name}`,
    (doc: any) => {
      prevJoint = getJoint(doc, jointId);
      let d = putEntity(doc, profile);
      if (prevJoint) d = putEntity(d, { ...prevJoint, profileId: profile.id });
      return d;
    },
    (doc: any) => {
      let d = removeFrom(doc, 'jointProfiles', profile.id);
      if (prevJoint) d = putEntity(d, prevJoint);
      return d;
    },
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

// ── components ─────────────────────────────────────────────────────────────────

export function addComponent(component: Component) {
  return command(
    `Add ${component.name}`,
    (doc: any) => putEntity(doc, component),
    (doc: any) => removeFrom(doc, 'components', component.id),
  );
}

export function removeComponent(componentId: string) {
  let prev: any = null;
  let unassignedBodies: any[] = [];
  let unassignedJoints: any[] = [];
  return command(
    'Remove component',
    (doc: any) => {
      prev = (doc.components ?? {})[componentId];
      // Unassign all bodies/joints that belong to this component
      unassignedBodies = Object.values(doc.bodies).filter((b: any) => b.componentId === componentId);
      unassignedJoints = Object.values(doc.joints).filter((j: any) => j.componentId === componentId);
      let d = doc;
      for (const b of unassignedBodies) d = putEntity(d, { ...b, componentId: null });
      for (const j of unassignedJoints) d = putEntity(d, { ...j, componentId: null });
      return removeFrom(d, 'components', componentId);
    },
    (doc: any) => {
      let d = prev ? putEntity(doc, prev) : doc;
      for (const b of unassignedBodies) d = putEntity(d, b);
      for (const j of unassignedJoints) d = putEntity(d, j);
      return d;
    },
  );
}

/** Delete a component AND everything inside it (its bodies + joints, plus any
 *  joint that references one of those bodies even if the joint itself belongs to
 *  a different/no component — e.g. a connector-generated cross-module joint).
 *  Contrast with removeComponent(), which unassigns members instead of deleting them. */
export function removeComponentAndContents(componentId: string) {
  let prevComponent: any = null;
  let removedBodies: any[] = [];
  let removedJoints: any[] = [];
  return command(
    'Delete component',
    (doc: any) => {
      prevComponent = (doc.components ?? {})[componentId];
      removedBodies = Object.values(doc.bodies).filter((b: any) => b.componentId === componentId);
      const removedBodyIds = new Set(removedBodies.map((b: any) => b.id));
      removedJoints = Object.values(doc.joints).filter((j: any) =>
        j.componentId === componentId || removedBodyIds.has(j.parentBodyId) || removedBodyIds.has(j.childBodyId));
      let d = doc;
      for (const j of removedJoints) d = removeFrom(d, 'joints', j.id);
      for (const b of removedBodies) d = removeFrom(d, 'bodies', b.id);
      return removeFrom(d, 'components', componentId);
    },
    (doc: any) => {
      let d = prevComponent ? putEntity(doc, prevComponent) : doc;
      for (const b of removedBodies) d = putEntity(d, b);
      for (const j of removedJoints) d = putEntity(d, j);
      return d;
    },
  );
}

export function renameComponent(componentId: string, name: string) {
  let prev: any = null;
  return command(
    'Rename component',
    (doc: any) => {
      prev = (doc.components ?? {})[componentId];
      if (!prev) return doc;
      return putEntity(doc, { ...prev, name });
    },
    (doc: any) => (prev ? putEntity(doc, prev) : doc),
  );
}

export function toggleComponentCollapsed(componentId: string) {
  return command(
    'Toggle component',
    (doc: any) => {
      const c = (doc.components ?? {})[componentId];
      if (!c) return doc;
      return putEntity(doc, { ...c, collapsed: !c.collapsed });
    },
    (doc: any) => {
      const c = (doc.components ?? {})[componentId];
      if (!c) return doc;
      return putEntity(doc, { ...c, collapsed: !c.collapsed });
    },
  );
}

export function moveBodyToComponent(bodyId: string, componentId: string | null) {
  let prev: any = null;
  return command(
    'Move to component',
    (doc: any) => {
      prev = getBody(doc, bodyId);
      if (!prev) return doc;
      return putEntity(doc, { ...prev, componentId });
    },
    (doc: any) => (prev ? putEntity(doc, prev) : doc),
  );
}

export function moveJointToComponent(jointId: string, componentId: string | null) {
  let prev: any = null;
  return command(
    'Move joint to component',
    (doc: any) => {
      prev = getJoint(doc, jointId);
      if (!prev) return doc;
      return putEntity(doc, { ...prev, componentId });
    },
    (doc: any) => (prev ? putEntity(doc, prev) : doc),
  );
}

/** Reposition bodies AND add one new joint as a single undo step — used by the
 *  connector auto-snap tool (align a component onto another + physically join
 *  them). `patches` = [[bodyId, patch], …], same shape as updateBodies(). */
export function snapAndJoin(patches: [string, any][], joint: any) {
  let prevBodies: any[] = [];
  return command(
    joint.name ?? 'Snap connectors',
    (doc: any) => {
      prevBodies = [];
      let d = doc;
      for (const [id, patch] of patches) {
        const b = getBody(d, id);
        if (!b) continue;
        prevBodies.push(b);
        d = putEntity(d, { ...b, ...patch });
      }
      return putEntity(d, joint);
    },
    (doc: any) => {
      let d = removeFrom(doc, 'joints', joint.id);
      for (const b of prevBodies) d = putEntity(d, b);
      return d;
    },
  );
}

/** Bend existing joints (IK solution) AND add one new joint as a single undo step —
 *  used by the manual Assembly Mate when the two connectors are already connected
 *  through the model, so we close the loop by articulating instead of teleporting a
 *  component (which would tear the structure). */
export function bendAndJoin(jointValues: Record<string, any>, joint: any) {
  const prev: Record<string, any> = {};
  return command(
    joint.name ?? 'Snap (bend to connect)',
    (doc: any) => {
      let d = doc;
      for (const [id, v] of Object.entries(jointValues)) {
        const j = getJoint(d, id);
        if (!j) continue;
        prev[id] = j.state?.value ?? 0;
        d = putEntity(d, { ...j, state: { ...j.state, value: v } });
      }
      return putEntity(d, joint);
    },
    (doc: any) => {
      let d = removeFrom(doc, 'joints', joint.id);
      for (const [id, v] of Object.entries(prev)) {
        const j = getJoint(d, id);
        if (j) d = putEntity(d, { ...j, state: { ...j.state, value: v } });
      }
      return d;
    },
  );
}

/** Reverse of snapAndJoin: remove a snap joint AND move the detached module to a
 *  separated pose, as one undo step — so the two parts stay pulled apart instead
 *  of snapping back to their mated authored transforms after the joint is gone. */
export function detachAndSeparate(jointId: any, patches: [string, any][]) {
  let prevJoint: any = null;
  let prevBodies: any[] = [];
  return command(
    'Unlock connectors',
    (doc: any) => {
      prevJoint = doc.joints?.[jointId] ?? null;
      let d = removeFrom(doc, 'joints', jointId);
      prevBodies = [];
      for (const [id, patch] of patches) {
        const b = getBody(d, id);
        if (!b) continue;
        prevBodies.push(b);
        d = putEntity(d, { ...b, ...patch });
      }
      return d;
    },
    (doc: any) => {
      let d = doc;
      for (const b of prevBodies) d = putEntity(d, b);
      if (prevJoint) d = putEntity(d, prevJoint);
      return d;
    },
  );
}

/** Remove MANY lock joints at once AND separate the moved bodies — one undo step. Used to
 *  fully unlock two modules that are joined by more than one connector (a loop). */
export function detachManyAndSeparate(jointIds: any[], patches: [string, any][]) {
  let prevJoints: any[] = [];
  let prevBodies: any[] = [];
  return command(
    'Unlock connectors',
    (doc: any) => {
      prevJoints = jointIds.map((id) => doc.joints?.[id]).filter(Boolean);
      let d = doc;
      for (const id of jointIds) d = removeFrom(d, 'joints', id);
      prevBodies = [];
      for (const [id, patch] of patches) {
        const b = getBody(d, id);
        if (!b) continue;
        prevBodies.push(b);
        d = putEntity(d, { ...b, ...patch });
      }
      return d;
    },
    (doc: any) => {
      let d = doc;
      for (const b of prevBodies) d = putEntity(d, b);
      for (const j of prevJoints) d = putEntity(d, j);
      return d;
    },
  );
}

/** Remove lock joint(s) AND bend the existing joints (IK solution) so the unlocked connector
 *  separates while another lock still holds the modules — one undo step. */
export function detachAndBend(jointIds: any[], jointValues: Record<string, any>) {
  let prevJoints: any[] = [];
  const prevVals: Record<string, any> = {};
  return command(
    'Unlock connectors',
    (doc: any) => {
      prevJoints = jointIds.map((id) => doc.joints?.[id]).filter(Boolean);
      let d = doc;
      for (const id of jointIds) d = removeFrom(d, 'joints', id);
      for (const [id, v] of Object.entries(jointValues)) {
        const j = getJoint(d, id);
        if (!j) continue;
        prevVals[id] = j.state?.value ?? 0;
        d = putEntity(d, { ...j, state: { ...j.state, value: v } });
      }
      return d;
    },
    (doc: any) => {
      let d = doc;
      for (const [id, v] of Object.entries(prevVals)) { const j = getJoint(d, id); if (j) d = putEntity(d, { ...j, state: { ...j.state, value: v } }); }
      for (const j of prevJoints) d = putEntity(d, j);
      return d;
    },
  );
}

// ── Assembly Mates ──────────────────────────────────────────────────────────────

export function addAssemblyMate(mate: any) {
  return command(
    'Add assembly mate',
    (doc: any) => ({ ...doc, mates: [...(doc.mates ?? []), mate] }),
    (doc: any) => ({ ...doc, mates: (doc.mates ?? []).filter((m: any) => m.id !== mate.id) }),
  );
}

export function removeAssemblyMate(mateId: string) {
  let prev: any = null;
  return command(
    'Remove assembly mate',
    (doc: any) => {
      prev = (doc.mates ?? []).find((m: any) => m.id === mateId) ?? null;
      return { ...doc, mates: (doc.mates ?? []).filter((m: any) => m.id !== mateId) };
    },
    (doc: any) => (prev ? { ...doc, mates: [...(doc.mates ?? []), prev] } : doc),
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
    component: 'components',
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
