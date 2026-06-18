/**
 * builders.js — higher-level model constructors (pure, framework-free).
 *
 * These assemble Bodies + Joints into the document. They're the foundation for
 * "generators" that emit a robot into the model — e.g. the fixed 6-servo ST3215
 * arm becomes one call to buildSerialChain, proving the generic model represents
 * the real robot without any bespoke kinematics class.
 */
import { makeBody, makeJoint, makeGeometry, GeometryType, JointType } from './entities.js';
import { putEntity } from './graph.js';

/**
 * Build a serial chain of links connected by joints and add it to `doc`.
 *
 * @param {object} doc
 * @param {object} spec
 * @param {string} [spec.name]   chain name prefix
 * @param {Array}  spec.links    [{ name?, geometry?, transform? }, ...] (N links)
 * @param {Array}  spec.joints   [{ name?, type?, axis?, limit?, origin? }, ...] (N-1 joints)
 *                                joint i connects link i (parent) → link i+1 (child)
 * @returns {{ doc, bodyIds:string[], jointIds:string[] }}
 */
export function buildSerialChain(doc, { name = 'Chain', links = [], joints = [] }) {
  let d = doc;
  const bodyIds = [];
  const jointIds = [];

  links.forEach((l, i) => {
    const body = makeBody({
      name: l.name ?? `${name} L${i + 1}`,
      transform: l.transform,
      visual: l.geometry
        ? { geometry: l.geometry, materialId: l.materialId ?? null, origin: undefined }
        : undefined,
    });
    // fall back to a default geometry/origin via factory if not provided
    if (!l.geometry) body.visual = makeBody().visual;
    d = putEntity(d, body);
    bodyIds.push(body.id);
  });

  joints.forEach((j, i) => {
    if (i + 1 >= bodyIds.length) return;
    const joint = makeJoint({
      name: j.name ?? `${name} J${i + 1}`,
      type: j.type ?? JointType.REVOLUTE,
      parentBodyId: bodyIds[i],
      childBodyId: bodyIds[i + 1],
      axis: j.axis ?? [0, 0, 1],
      limit: j.limit,
      origin: j.origin,
    });
    d = putEntity(d, joint);
    jointIds.push(joint.id);
  });

  return { doc: d, bodyIds, jointIds };
}

/** Convenience: a default box link geometry of a given size. */
export const boxLink = (name, size = [0.2, 0.2, 1]) => ({
  name,
  geometry: makeGeometry(GeometryType.BOX, { size }),
});
