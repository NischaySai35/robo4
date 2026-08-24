/**
 * humanoid.ts — procedurally build a complete ~20-DOF bipedal humanoid as a
 * native model Document (so it serialises straight into a .nischay).
 *
 * Design (same proven recipe as the robot arm, scaled up):
 * • Load-bearing "bone" bodies are IDENTITY-oriented boxes, so every joint axis is
 *   a world axis (Y up, Z forward, X = robot's right) and the kinematics are
 *   trivially correct across ~50 bodies.
 * • Beauty is welded, non-load-bearing shells: CAPSULE limb sleeves, SPHERE joints,
 *   a sphere head. Welds take any orientation, so shells round out the silhouette
 *   without touching the kinematics — a clean white-panel / dark-joint look.
 * • Every movable joint is tagged `meta = { role, side }` so the action system
 *   (walk / jump / wave / home) can drive it by role without name matching.
 *
 * Kinematic tree (root = pelvis):
 *   pelvis → waist(pitch) → abdomen → chest(yaw) → chest
 *     chest → neck(yaw) → neck → head(pitch) → head
 *     chest → [L/R] shoulder(pitch) → hub → shoulder(roll) → upperarm
 *                   → elbow(pitch) → forearm → wrist(roll) → hand
 *   pelvis → [L/R] hip(pitch) → hub → hip(roll) → thigh
 *                   → knee(pitch) → shin → ankle(pitch) → foot
 */
import * as THREE from 'three';
import {
  makeBody, makeJoint, makeMaterial, makeDocument, makeGeometry, makeInertial,
  GeometryType, JointType, identityOrigin,
  type Body, type Joint, type Material, type Vec3, type Quat,
} from '@/core/model/index';
import { jointFramesForBodies } from '@/kinematics/modelFK';

const D = (deg: number) => (deg * Math.PI) / 180;
const Zc = new THREE.Vector3(0, 0, 1);
const qFor = (axis: Vec3): Quat => {
  const q = new THREE.Quaternion().setFromUnitVectors(Zc, new THREE.Vector3(...axis).normalize());
  return [q.x, q.y, q.z, q.w];
};
const Q_UP: Quat = qFor([0, 1, 0]); // capsule/cylinder length along Y
const Q_ID: Quat = [0, 0, 0, 1];

export function buildHumanoid() {
  // ── Materials ──────────────────────────────────────────────────────────────
  const shell  = makeMaterial({ name: 'Shell panel', color: [0.95, 0.96, 0.98, 1], metalness: 0.2,  roughness: 0.3,  density: 280 });
  const frame  = makeMaterial({ name: 'Frame',       color: [0.40, 0.43, 0.49, 1], metalness: 0.85, roughness: 0.35, density: 200 });
  const joint  = makeMaterial({ name: 'Joint',       color: [0.11, 0.12, 0.15, 1], metalness: 0.6,  roughness: 0.5,  density: 700 });
  const accent = makeMaterial({ name: 'Accent',      color: [0.10, 0.55, 1.00, 1], metalness: 0.4,  roughness: 0.3,  density: 300 });

  const bodies: Record<string, Body> = {};
  const joints: Record<string, Joint> = {};

  const box = (name: string, size: Vec3, pos: Vec3, mat: Material): Body => {
    const b = makeBody({
      name, transform: { position: pos, quaternion: Q_ID, scale: [1, 1, 1] },
      visual: { geometry: makeGeometry(GeometryType.BOX, { size }), materialId: mat.id, origin: identityOrigin() },
      inertial: makeInertial({ auto: true }),
    });
    bodies[b.id] = b; return b;
  };
  const prim = (name: string, geo: any, pos: Vec3, quat: Quat, mat: Material): Body => {
    const b = makeBody({
      name, transform: { position: pos, quaternion: quat, scale: [1, 1, 1] },
      visual: { geometry: geo, materialId: mat.id, origin: identityOrigin() },
      inertial: makeInertial({ auto: true }),
    });
    bodies[b.id] = b; return b;
  };

  const weld = (parent: Body, child: Body): Joint => {
    const { origin, childRest } = jointFramesForBodies(parent, child, null as any);
    const j = makeJoint({ name: `${parent.name} ⨯ ${child.name}`, type: JointType.FIXED, parentBodyId: parent.id, childBodyId: child.id, origin, childRest });
    joints[j.id] = j; return j;
  };
  const revolute = (
    name: string, parent: Body, child: Body, axis: Vec3, pivot: Vec3,
    loDeg: number, hiDeg: number, role: string, side: string | null = null,
  ): Joint => {
    const { origin, childRest } = jointFramesForBodies(parent, child, pivot as any);
    const j = makeJoint({
      name, type: JointType.REVOLUTE, parentBodyId: parent.id, childBodyId: child.id,
      axis, origin, childRest, limit: { lower: D(loDeg), upper: D(hiDeg), effort: 3, velocity: 3 },
      meta: { role, side },
    });
    joints[j.id] = j; return j;
  };

  // Cosmetic helpers (welded to a host bone).
  const sleeve = (host: Body, r: number, len: number, center: Vec3, mat = shell) => {
    const c = prim(`${host.name} sleeve`, makeGeometry(GeometryType.CAPSULE, { radius: r, length: Math.max(0.01, len - 2 * r) }), center, Q_UP, mat);
    weld(host, c);
  };
  const ball = (host: Body, r: number, pos: Vec3, mat = joint) => {
    weld(host, prim(`${host.name} ball`, makeGeometry(GeometryType.SPHERE, { radius: r }), pos, Q_ID, mat));
  };

  // ── Torso / head ─────────────────────────────────────────────────────────────
  const pelvis  = box('Pelvis',  [0.25, 0.13, 0.17], [0, 0.95, 0], shell);
  ball(pelvis, 0.085, [0, 0.95, 0], frame); // hip yoke
  const abdomen = box('Abdomen', [0.17, 0.15, 0.14], [0, 1.10, 0], frame);
  sleeve(abdomen, 0.085, 0.16, [0, 1.10, 0], joint); // waist column
  const chest   = box('Chest',   [0.32, 0.27, 0.16], [0, 1.37, 0], shell);
  const neck    = box('Neck',    [0.07, 0.08, 0.07], [0, 1.565, 0], joint);
  const head    = prim('Head',   makeGeometry(GeometryType.SPHERE, { radius: 0.115 }), [0, 1.70, 0], Q_ID, shell);
  ball(head, 0.022, [0.045, 1.71, 0.105], accent); // eyes
  ball(head, 0.022, [-0.045, 1.71, 0.105], accent);
  // Chest detailing: shoulder pauldrons + a glowing core, no bulky front bulge.
  ball(chest, 0.085, [0.20, 1.49, 0], shell);
  ball(chest, 0.085, [-0.20, 1.49, 0], shell);
  weld(chest, prim('Core', makeGeometry(GeometryType.SPHERE, { radius: 0.045 }), [0, 1.36, 0.085], Q_ID, accent));

  revolute('Waist (pitch)', pelvis,  abdomen, [1, 0, 0], [0, 1.02, 0], -35, 60, 'waist_pitch');
  revolute('Chest (yaw)',   abdomen, chest,   [0, 1, 0], [0, 1.22, 0], -60, 60, 'chest_yaw');
  revolute('Neck (yaw)',    chest,   neck,    [0, 1, 0], [0, 1.53, 0], -80, 80, 'neck_yaw');
  revolute('Head (pitch)',  neck,    head,    [1, 0, 0], [0, 1.60, 0], -40, 40, 'head_pitch');

  // ── Arms (mirror) ──────────────────────────────────────────────────────────────
  const buildArm = (side: 'L' | 'R', sx: number) => {
    const sh = 0.20 * sx;
    const hub = box(`${side} shoulder hub`, [0.09, 0.09, 0.09], [sh, 1.47, 0], joint);
    revolute(`${side} shoulder (pitch)`, chest, hub, [1, 0, 0], [sh, 1.48, 0], -180, 120, 'shoulder_pitch', side);
    const ua = box(`${side} upper arm`, [0.07, 0.42, 0.08], [sh, 1.26, 0], frame);
    revolute(`${side} shoulder (roll)`, hub, ua, [0, 0, 1], [sh, 1.46, 0], sx > 0 ? -30 : -120, sx > 0 ? 120 : 30, 'shoulder_roll', side);
    ball(ua, 0.075, [sh, 1.46, 0]); sleeve(ua, 0.058, 0.40, [sh, 1.26, 0]);
    const fa = box(`${side} forearm`, [0.06, 0.36, 0.07], [sh, 0.87, 0], frame);
    revolute(`${side} elbow (pitch)`, ua, fa, [1, 0, 0], [sh, 1.05, 0], 0, 150, 'elbow', side);
    ball(fa, 0.055, [sh, 1.05, 0]); sleeve(fa, 0.048, 0.34, [sh, 0.87, 0]);
    const hand = box(`${side} hand`, [0.05, 0.11, 0.085], [sh, 0.63, 0], shell);
    revolute(`${side} wrist (roll)`, fa, hand, [0, 1, 0], [sh, 0.69, 0], -90, 90, 'wrist', side);
  };
  buildArm('L', 1);
  buildArm('R', -1);

  // ── Legs (mirror) ──────────────────────────────────────────────────────────────
  const buildLeg = (side: 'L' | 'R', sx: number) => {
    const hx = 0.10 * sx;
    const hub = box(`${side} hip hub`, [0.11, 0.11, 0.11], [hx, 0.895, 0], joint);
    revolute(`${side} hip (pitch)`, pelvis, hub, [1, 0, 0], [hx, 0.90, 0], -120, 60, 'hip_pitch', side);
    const thigh = box(`${side} thigh`, [0.10, 0.42, 0.11], [hx, 0.69, 0], frame);
    revolute(`${side} hip (roll)`, hub, thigh, [0, 0, 1], [hx, 0.89, 0], sx > 0 ? -20 : -45, sx > 0 ? 45 : 20, 'hip_roll', side);
    ball(thigh, 0.095, [hx, 0.89, 0]); sleeve(thigh, 0.078, 0.40, [hx, 0.69, 0]);
    const shin = box(`${side} shin`, [0.08, 0.40, 0.09], [hx, 0.28, 0], frame);
    revolute(`${side} knee (pitch)`, thigh, shin, [1, 0, 0], [hx, 0.48, 0], 0, 150, 'knee', side);
    ball(shin, 0.07, [hx, 0.48, 0]); sleeve(shin, 0.062, 0.38, [hx, 0.28, 0]);
    const foot = box(`${side} foot`, [0.10, 0.06, 0.24], [hx, 0.04, 0.05], shell);
    revolute(`${side} ankle (pitch)`, shin, foot, [1, 0, 0], [hx, 0.08, 0], -45, 45, 'ankle', side);
    ball(foot, 0.05, [hx, 0.08, 0], joint);
  };
  buildLeg('L', 1);
  buildLeg('R', -1);

  return makeDocument({
    name: 'TETROBOT Humanoid',
    bodies, joints,
    materials: { [shell.id]: shell, [frame.id]: frame, [joint.id]: joint, [accent.id]: accent },
    meta: { robot: 'humanoid', rootBodyId: pelvis.id },
  });
}

export function buildHumanoidProject() {
  return {
    format: 'tetrobot-project', version: 1, app: 'TETROBOT', savedAt: new Date().toISOString(),
    scene: { activeModuleId: null, nextId: 1, modules: [], welds: [] },
    model: buildHumanoid(),
    animation: { duration: 4, tracks: {} },
  };
}
