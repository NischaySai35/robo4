/**
 * Shared test fixtures — small serial arms and a rest-pose FK map, used across the
 * physics / control / RL tests instead of each test file re-building its own copy.
 */
import { makeDocument, makeGeometry, GeometryType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';

/** 4 cubes stacked up +Y from y=1 (1 m apart), 3 revolute Z joints limited to ±1.5 rad. */
export function verticalArm() {
  const box = makeGeometry(GeometryType.BOX, { size: [0.3, 0.3, 0.3] });
  const links = [0, 1, 2, 3].map((i) => ({ name: `L${i + 1}`, geometry: box, transform: { position: [0, i + 1, 0], quaternion: [0, 0, 0, 1] } }));
  const joints = [0, 1, 2].map((i) => ({
    name: `J${i + 1}`, type: 'revolute', axis: [0, 0, 1],
    limit: { lower: -1.5, upper: 1.5, effort: 5, velocity: 1.2 },
    origin: { position: [0, 1, 0], quaternion: [0, 0, 0, 1] },
  }));
  const { doc, bodyIds } = buildSerialChain(makeDocument({ name: 'Arm' }), { name: 'Arm', links, joints });
  return { doc, bodyIds, tipId: bodyIds[bodyIds.length - 1] };
}

/** `links` 0.4×0.2×0.2 boxes along +X (0.5 m apart) at height `y`, revolute Z joints
 *  limited to ±`limit` rad (no limit when `limit` is null). */
export function horizontalArm({ links = 2, y = 1, limit = 1.5 as number | null } = {}) {
  const box = makeGeometry(GeometryType.BOX, { size: [0.4, 0.2, 0.2] });
  const ls = Array.from({ length: links }, (_, i) => ({
    name: `L${i + 1}`, geometry: box,
    transform: { position: [i * 0.5, y, 0], quaternion: [0, 0, 0, 1] },
  }));
  const joints = Array.from({ length: links - 1 }, (_, i) => ({
    name: `J${i + 1}`, type: 'revolute', axis: [0, 0, 1],
    ...(limit == null ? {} : { limit: { lower: -limit, upper: limit, effort: 5, velocity: 2 } }),
    origin: { position: [0.5, 0, 0], quaternion: [0, 0, 0, 1] },
  }));
  return buildSerialChain(makeDocument({ name: 'Arm' }), { name: 'Arm', links: ls, joints }).doc;
}

/** FK map straight from each body's stored transform (the rest pose). */
export function restFK(doc: any) {
  const fk = new Map<string, { position: number[]; quaternion: number[] }>();
  for (const b of Object.values(doc.bodies) as any[]) fk.set(b.id, { position: b.transform.position, quaternion: b.transform.quaternion });
  return fk;
}
