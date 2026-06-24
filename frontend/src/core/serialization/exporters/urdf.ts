/**
 * urdf.js — export the model graph to URDF (the ROS robot format).
 *
 * URDF is a TREE: each link (except the root) has exactly one parent joint. Our
 * model is a graph, so we take the first joint per child as its parent (extra
 * joints = loop closures, emitted as comments) and pick a root (a body that is no
 * joint's child). Geometry, limits, dynamics, materials, and a rough inertial come
 * straight from the model. Mesh bodies reference meshes/<name> (export the STL
 * separately for now). Node-testable (only three + analysis, relative imports).
 */
import * as THREE from 'three';
import { bodyMass, inertiaTensor } from '../../../kinematics/analysis';
import type { Document } from '@/core/model/index';

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

const san = (s: any) => String(s ?? 'x').replace(/[^A-Za-z0-9_]/g, '_');
const n = (v: any) => (Math.abs(v) < 1e-9 ? '0' : (+v).toFixed(6));

function rpy(quat: any) {
  _q.set(quat[0], quat[1], quat[2], quat[3]);
  _e.setFromQuaternion(_q, 'XYZ');
  return `${n(_e.x)} ${n(_e.y)} ${n(_e.z)}`;
}
const xyz = (p: any) => `${n(p[0])} ${n(p[1])} ${n(p[2])}`;

/**
 * Geometry XML with the body's transform scale baked into the dimensions — URDF
 * primitives have no scale field, so a scaled body would otherwise lose its size on
 * round-trip. URDF has no capsule/cone primitive, so those degrade to a cylinder
 * (the caller records a warning).
 */
function geometryXML(g: any, scale: number[] = [1, 1, 1]) {
  const [sx, sy, sz] = [Math.abs(scale[0] ?? 1), Math.abs(scale[1] ?? 1), Math.abs(scale[2] ?? 1)];
  const r = g?.radius ?? 0.5, len = g?.length ?? 1;
  switch (g?.type) {
    case 'box': { const s = g.size ?? [1, 1, 1]; return `<box size="${xyz([s[0] * sx, s[1] * sy, s[2] * sz])}"/>`; }
    case 'sphere': return `<sphere radius="${n(r * Math.max(sx, sy, sz))}"/>`;
    // our cylinder/capsule/cone run along local Z (matches URDF's cylinder Z axis).
    case 'cylinder': case 'capsule': case 'cone':
      return `<cylinder radius="${n(r * sx)}" length="${n(len * sz)}"/>`;
    case 'mesh': return `<mesh filename="meshes/${san(g.assetId ?? 'mesh')}.stl" scale="${xyz([sx, sy, sz])}"/>`;
    default: return `<box size="0.1 0.1 0.1"/>`;
  }
}

/** A URDF <origin> from a model origin ({position, quaternion}); identity if absent. */
function originXML(o: any) {
  const p = o?.position ?? [0, 0, 0];
  const q = o?.quaternion ?? [0, 0, 0, 1];
  return `<origin xyz="${xyz(p)}" rpy="${rpy(q)}"/>`;
}

function linkXML(body: any, doc: any) {
  const g = body.visual?.geometry ?? {};
  const scale = body.transform?.scale ?? [1, 1, 1];
  const vOrigin = originXML(body.visual?.origin);
  const mat = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
  const m = bodyMass(body, doc);
  const it = body.inertial && !body.inertial.auto ? body.inertial.inertia
    : inertiaTensor(g, body.transform?.scale, m);
  const com = body.inertial?.com ?? [0, 0, 0];
  const matXML = mat
    ? `\n      <material name="${san(mat.name)}"><color rgba="${n(mat.color[0])} ${n(mat.color[1])} ${n(mat.color[2])} ${n(mat.color[3] ?? 1)}"/></material>`
    : '';
  return `  <link name="${san(body.name)}">
    <visual>
      ${vOrigin}
      <geometry>${geometryXML(g, scale)}</geometry>${matXML}
    </visual>
    <collision>
      ${vOrigin}
      <geometry>${geometryXML(g, scale)}</geometry>
    </collision>
    <inertial>
      <origin xyz="${xyz(com)}" rpy="0 0 0"/>
      <mass value="${n(m)}"/>
      <inertia ixx="${n(it.ixx)}" ixy="${n(it.ixy)}" ixz="${n(it.ixz)}" iyy="${n(it.iyy)}" iyz="${n(it.iyz)}" izz="${n(it.izz)}"/>
    </inertial>
  </link>`;
}

function jointXML(j: any, doc: any) {
  const p = doc.bodies[j.parentBodyId], c = doc.bodies[j.childBodyId];
  const o = j.origin ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  const lim = j.limit ?? {};
  const needsLimit = j.type === 'revolute' || j.type === 'prismatic';
  const limXML = needsLimit
    ? `\n    <limit lower="${n(lim.lower ?? -3.14)}" upper="${n(lim.upper ?? 3.14)}" effort="${n(lim.effort ?? 0)}" velocity="${n(lim.velocity ?? 0)}"/>`
    : '';
  const dyn = j.dynamics ?? {};
  return `  <joint name="${san(j.name)}" type="${j.type}">
    <parent link="${san(p.name)}"/>
    <child link="${san(c.name)}"/>
    <origin xyz="${xyz(o.position)}" rpy="${rpy(o.quaternion)}"/>
    <axis xyz="${xyz(j.axis ?? [0, 0, 1])}"/>${limXML}
    <dynamics damping="${n(dyn.damping ?? 0)}" friction="${n(dyn.friction ?? 0)}"/>
  </joint>`;
}

export function exportURDF(doc: Document, name = 'tetrobot') {
  const bodies = Object.values(doc.bodies);
  const allJoints = Object.values(doc.joints);
  if (bodies.length === 0) return `<?xml version="1.0"?>\n<robot name="${san(name)}"/>\n`;

  // First joint per child = its parent; the rest are loop closures.
  const childParent = new Map<string, any>();
  const treeJoints: any[] = [];
  const loopJoints: any[] = [];
  for (const j of allJoints) {
    const pid = j.parentBodyId, cid = j.childBodyId;
    if (!pid || !cid || !doc.bodies[pid] || !doc.bodies[cid]) continue;
    if (childParent.has(cid)) loopJoints.push(j);
    else { childParent.set(cid, j); treeJoints.push(j); }
  }
  const roots = bodies.filter((b) => !childParent.has(b.id));

  const warns: string[] = [];
  if (roots.length > 1) warns.push(`Multiple roots (${roots.length}) — URDF needs one; first is the base.`);
  if (loopJoints.length) warns.push(`${loopJoints.length} loop joint(s) dropped: ${loopJoints.map((j) => san(j.name)).join(', ')}.`);
  // URDF has no capsule/cone primitive — they degrade to a cylinder of the same radius/length.
  const degraded = bodies.filter((b) => ['capsule', 'cone'].includes(b.visual?.geometry?.type)).map((b) => san(b.name));
  if (degraded.length) warns.push(`${degraded.length} capsule/cone link(s) exported as cylinder: ${degraded.join(', ')}.`);
  const meshes = bodies.filter((b) => b.visual?.geometry?.type === 'mesh').map((b) => san(b.name));
  if (meshes.length) warns.push(`${meshes.length} mesh link(s) reference external .stl (not embedded): ${meshes.join(', ')}.`);

  const header = warns.length ? `  <!-- WARNINGS: ${warns.join(' ')} -->\n` : '';
  const links = bodies.map((b) => linkXML(b, doc)).join('\n');
  const joints = treeJoints.map((j) => jointXML(j, doc)).join('\n');

  return `<?xml version="1.0"?>
<!-- Generated by TETROBOT -->
<robot name="${san(name)}">
${header}${links}
${joints}
</robot>
`;
}