/**
 * sdf importer — read an SDF (Gazebo) <model> into our graph: <link> → Body at its model-frame <pose>, <joint> → Joint.
 * Unlike URDF, SDF is a graph, so ring-closing joints come in too. A joint's <pose> is its frame in the child link
 * (SDF's default), so origin = parent⁻¹ · child · pose and childRest = pose⁻¹; the axis is in the joint frame.
 * Poses relative to other frames, and axes expressed in other frames, are reported, not guessed. Uses the browser
 * DOMParser, like the URDF importer; reads what exporters/sdf.ts writes, which tools/test_sdf_import.py checks.
 */
import * as THREE from 'three';
import { makeBody, makeJoint, makeGeometry, GeometryType, JointType } from '@/core/model/index';

const nums = (s: string | null | undefined, d: number[]) => {
  const p = (s ?? '').trim().split(/\s+/).filter(Boolean).map(Number);
  return d.map((x, i) => (Number.isFinite(p[i]) ? p[i] : x));
};
const text = (el: Element | null | undefined, sel: string) => el?.querySelector(sel)?.textContent ?? null;
const poseMat = (el: Element | null | undefined) => {
  const [x, y, z, r, p, w] = nums(text(el, ':scope > pose'), [0, 0, 0, 0, 0, 0]);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r, p, w, 'XYZ')), new THREE.Vector3(1, 1, 1));
};
const split = (m: THREE.Matrix4) => {
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(); m.decompose(P, Q, new THREE.Vector3());
  return { position: P.toArray() as [number, number, number], quaternion: [Q.x, Q.y, Q.z, Q.w] as [number, number, number, number] };
};

const JOINT_TYPE: Record<string, string> = {
  revolute: JointType.REVOLUTE, continuous: JointType.CONTINUOUS, prismatic: JointType.PRISMATIC, fixed: JointType.FIXED,
};

function geometryFrom(g: Element | null, name: string, warnings: string[]) {
  const box = g?.querySelector('box'), cyl = g?.querySelector('cylinder'), sph = g?.querySelector('sphere'), mesh = g?.querySelector('mesh');
  if (box) return makeGeometry(GeometryType.BOX, { size: nums(text(box, 'size'), [0.1, 0.1, 0.1]) as [number, number, number] });
  if (cyl) return makeGeometry(GeometryType.CYLINDER, { radius: nums(text(cyl, 'radius'), [0.05])[0], length: nums(text(cyl, 'length'), [0.1])[0] });
  if (sph) return makeGeometry(GeometryType.SPHERE, { radius: nums(text(sph, 'radius'), [0.05])[0] });
  if (mesh) warnings.push(`${name}: mesh ${text(mesh, 'uri') ?? ''} replaced with a placeholder box (load the mesh separately).`);
  return makeGeometry(GeometryType.BOX, { size: [0.08, 0.08, 0.08] });
}

export interface SDFImport { robotName: string; entities: any[]; warnings: string[] }

export function parseSDF(xml: string): SDFImport {
  const dom = new DOMParser().parseFromString(xml, 'application/xml');
  const model = dom.querySelector('sdf > model, sdf > world > model');
  if (!model || dom.querySelector('parsererror')) throw new Error('Not an SDF robot: no <sdf><model> found.');
  const robotName = model.getAttribute('name') || 'sdf';
  const warnings: string[] = [];
  if (model.querySelector(':scope > include')) warnings.push('<include> models were skipped: import each model file on its own.');

  const world = new Map<string, THREE.Matrix4>();
  const bodies = new Map<string, any>();
  for (const link of Array.from(model.querySelectorAll(':scope > link'))) {
    const name = link.getAttribute('name') || `link_${bodies.size + 1}`;
    const rel = link.querySelector(':scope > pose')?.getAttribute('relative_to');
    if (rel && rel !== '__model__') warnings.push(`${name}: pose relative to "${rel}" read as relative to the model.`);
    const W = poseMat(link); world.set(name, W);
    const t = split(W);
    const mass = nums(text(link, 'inertial > mass'), [NaN])[0];
    const body = makeBody({
      name,
      transform: { position: t.position, quaternion: t.quaternion, scale: [1, 1, 1] },
      visual: { geometry: geometryFrom(link.querySelector('visual > geometry'), name, warnings), materialId: null, origin: split(poseMat(link.querySelector('visual'))) },
    });
    if (Number.isFinite(mass)) {
      // the file's own numbers, not ones worked out from the (maybe placeholder) shape
      const I = link.querySelector('inertial > inertia');
      const get = (k: string) => nums(text(I, k), [0])[0];
      body.inertial = { ...body.inertial, mass, auto: false, inertia: I ? { ixx: get('ixx'), ixy: get('ixy'), ixz: get('ixz'), iyy: get('iyy'), iyz: get('iyz'), izz: get('izz') } : body.inertial.inertia };
    }
    bodies.set(name, body);
  }

  const joints: any[] = [];
  for (const j of Array.from(model.querySelectorAll(':scope > joint'))) {
    const name = j.getAttribute('name') || `joint_${joints.length + 1}`;
    const raw = (j.getAttribute('type') || 'fixed').toLowerCase();
    if (!JOINT_TYPE[raw]) warnings.push(`${name}: joint type "${raw}" read as fixed.`);
    const parent = bodies.get(text(j, ':scope > parent') ?? ''), child = bodies.get(text(j, ':scope > child') ?? '');
    if (!parent || !child) { warnings.push(`${name}: parent or child link not found (a joint to "world" fixes a link in place), skipped.`); continue; }
    const rel = j.querySelector(':scope > pose')?.getAttribute('relative_to');
    if (rel && rel !== child.name) warnings.push(`${name}: pose relative to "${rel}" read as relative to the child link.`);
    const xyz = j.querySelector('axis > xyz');
    if (xyz?.getAttribute('expressed_in')) warnings.push(`${name}: axis expressed in "${xyz.getAttribute('expressed_in')}" read as in the joint frame.`);
    const P = poseMat(j);
    const J = world.get(child.name)!.clone().multiply(P);
    const type = JOINT_TYPE[raw] ?? JointType.FIXED;
    joints.push(makeJoint({
      name, type: type as any, parentBodyId: parent.id, childBodyId: child.id,
      axis: nums(xyz?.textContent, [0, 0, 1]) as [number, number, number],
      origin: split(world.get(parent.name)!.clone().invert().multiply(J)),
      childRest: split(P.clone().invert()),
      limit: {
        lower: nums(text(j, 'axis > limit > lower'), [type === JointType.REVOLUTE ? -Math.PI : 0])[0],
        upper: nums(text(j, 'axis > limit > upper'), [type === JointType.REVOLUTE ? Math.PI : 0])[0],
        effort: nums(text(j, 'axis > limit > effort'), [0])[0],
        velocity: nums(text(j, 'axis > limit > velocity'), [0])[0],
      },
    }));
  }
  return { robotName, entities: [...bodies.values(), ...joints], warnings };
}
