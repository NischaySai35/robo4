/**
 * urdf importer — parse a URDF (ROS robot description) XML into our graph model:
 * <link> → Body (geometry from <visual><geometry>), <joint> → Joint (parent/child,
 * type, axis, origin from xyz+rpy, limits). The kinematic tree is reproduced via the
 * joint origins (our FK derives child world poses from the chain). Mesh-referenced
 * links become a small placeholder box (a single .urdf doesn't carry its mesh files).
 *
 * Round-trips with our URDF exporter (both use XYZ-euler ↔ quaternion). Pure aside from
 * three for the rpy→quat math.
 */
import * as THREE from 'three';
import {
  makeBody, makeJoint, makeMaterial, makeGeometry, GeometryType, JointType, identityOrigin,
} from '@/core/model/index';

const num = (s: string | null, d = 0) => { const v = parseFloat(s ?? ''); return Number.isFinite(v) ? v : d; };
const vec3 = (s: string | null, d: [number, number, number] = [0, 0, 0]): [number, number, number] => {
  if (!s) return d;
  const p = s.trim().split(/\s+/).map(Number);
  return [p[0] ?? d[0], p[1] ?? d[1], p[2] ?? d[2]];
};
const rpyToQuat = (rpy: [number, number, number]): [number, number, number, number] => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rpy[0], rpy[1], rpy[2], 'XYZ'));
  return [q.x, q.y, q.z, q.w];
};

const JOINT_TYPE: Record<string, string> = {
  revolute: JointType.REVOLUTE, continuous: JointType.CONTINUOUS,
  prismatic: JointType.PRISMATIC, fixed: JointType.FIXED,
  floating: JointType.FIXED, planar: JointType.FIXED,
};

function geometryFrom(geoEl: Element | null): { geometry: any; isMesh: boolean } {
  const box = geoEl?.querySelector('box');
  const cyl = geoEl?.querySelector('cylinder');
  const sph = geoEl?.querySelector('sphere');
  const mesh = geoEl?.querySelector('mesh');
  if (box) return { geometry: makeGeometry(GeometryType.BOX, { size: vec3(box.getAttribute('size'), [0.1, 0.1, 0.1]) }), isMesh: false };
  if (cyl) return { geometry: makeGeometry(GeometryType.CYLINDER, { radius: num(cyl.getAttribute('radius'), 0.05), length: num(cyl.getAttribute('length'), 0.1) }), isMesh: false };
  if (sph) return { geometry: makeGeometry(GeometryType.SPHERE, { radius: num(sph.getAttribute('radius'), 0.05) }), isMesh: false };
  // mesh ref (or nothing): a small placeholder box — the external mesh isn't in the .urdf
  return { geometry: makeGeometry(GeometryType.BOX, { size: mesh ? [0.12, 0.12, 0.12] : [0.08, 0.08, 0.08] }), isMesh: !!mesh };
}

export interface URDFImport { robotName: string; entities: any[]; warnings: string[] }

export function parseURDF(xml: string): URDFImport {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const robot = doc.querySelector('robot');
  if (!robot || doc.querySelector('parsererror')) throw new Error('Not a valid URDF (no <robot> element).');
  const robotName = robot.getAttribute('name') || 'urdf';
  const warnings: string[] = [];

  // links → bodies (keyed by link name so joints can resolve them)
  const bodyByLink = new Map<string, any>();
  const materials: any[] = [];
  for (const link of Array.from(robot.querySelectorAll(':scope > link'))) {
    const name = link.getAttribute('name') || `link_${bodyByLink.size + 1}`;
    const visual = link.querySelector('visual');
    const { geometry, isMesh } = geometryFrom(visual?.querySelector('geometry') ?? null);
    if (isMesh) warnings.push(`${name}: mesh geometry replaced with a placeholder (load the .stl/.dae separately).`);

    // per-link material (colour)
    let materialId: string | null = null;
    const color = visual?.querySelector('material > color');
    if (color) {
      const rgba = (color.getAttribute('rgba') || '0.8 0.8 0.8 1').trim().split(/\s+/).map(Number);
      const m = makeMaterial({ name: `${name}_mat`, color: [rgba[0] ?? 0.8, rgba[1] ?? 0.8, rgba[2] ?? 0.8, rgba[3] ?? 1] });
      materials.push(m); materialId = m.id;
    }

    // visual origin (offset of the mesh within the link frame)
    const vo = visual?.querySelector('origin');
    const vOrigin = vo
      ? { position: vec3(vo.getAttribute('xyz')), quaternion: rpyToQuat(vec3(vo.getAttribute('rpy'))) }
      : identityOrigin();

    const body = makeBody({
      name,
      visual: { geometry, materialId, origin: vOrigin },
      transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
    });
    bodyByLink.set(name, body);
  }

  // joints
  const joints: any[] = [];
  const childLinks = new Set<string>();
  for (const j of Array.from(robot.querySelectorAll(':scope > joint'))) {
    const name = j.getAttribute('name') || `joint_${joints.length + 1}`;
    const rawType = (j.getAttribute('type') || 'fixed').toLowerCase();
    const type = JOINT_TYPE[rawType] ?? JointType.FIXED;
    if (!JOINT_TYPE[rawType]) warnings.push(`${name}: joint type "${rawType}" treated as fixed.`);
    const parentName = j.querySelector('parent')?.getAttribute('link') || '';
    const childName = j.querySelector('child')?.getAttribute('link') || '';
    const parent = bodyByLink.get(parentName), child = bodyByLink.get(childName);
    if (!parent || !child) { warnings.push(`${name}: parent/child link not found — skipped.`); continue; }
    childLinks.add(childName);

    const o = j.querySelector('origin');
    const origin = { position: vec3(o?.getAttribute('xyz') ?? null), quaternion: rpyToQuat(vec3(o?.getAttribute('rpy') ?? null)) };
    const axis = vec3(j.querySelector('axis')?.getAttribute('xyz') ?? null, [1, 0, 0]);
    const lim = j.querySelector('limit');
    const limit = {
      lower: num(lim?.getAttribute('lower') ?? null, type === JointType.REVOLUTE ? -Math.PI : 0),
      upper: num(lim?.getAttribute('upper') ?? null, type === JointType.REVOLUTE ? Math.PI : 0),
      effort: num(lim?.getAttribute('effort') ?? null, 0),
      velocity: num(lim?.getAttribute('velocity') ?? null, 0),
    };
    joints.push(makeJoint({
      name, type: type as any, parentBodyId: parent.id, childBodyId: child.id,
      axis, origin, childRest: identityOrigin(), limit,
    }));
  }

  // Root link (no joint's child) keeps its identity transform; nothing else to do —
  // our FK computes every child's world pose from the joint chain.
  const bodies = [...bodyByLink.values()];
  const roots = bodies.filter((b) => !childLinks.has(b.name));
  if (roots.length > 1) warnings.push(`${roots.length} root links — the first is treated as the base.`);

  return { robotName, entities: [...materials, ...bodies, ...joints], warnings };
}
