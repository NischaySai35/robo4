/**
 * robotArm.ts — procedurally build a real, articulated 6-DOF desktop robot arm
 * as a native model Document (so it serializes straight into a .nischay).
 *
 * Design notes
 * ────────────
 * • Scale & mass are DESKTOP-realistic (≈0.6 m reach, hollow-shell densities), so
 *   the gravity-holding torques land in the ST3215 servo's range instead of the
 *   absurd hundreds-of-N·m a solid-steel arm produced.
 * • The load-bearing "spine" bodies (the ones a revolute joint connects) are kept
 *   at IDENTITY orientation, so each joint axis is expressed directly in WORLD
 *   axes (Y = up) and the kinematics stay trivially correct.
 * • Beauty comes from welded, non-load-bearing CYLINDER knuckles at every joint
 *   plus a turned base drum. Welds accept any orientation, so the cylinders are
 *   freely rotated to lie along their joint axis — giving the classic
 *   round-joint / slim-link industrial silhouette without risking the kinematics.
 * • Real materials carry densities and `inertial.auto = true`, so the Analysis /
 *   Stress overlay computes genuine per-joint load — the arm is a working rig.
 *
 * Chain (root → tool):
 *   base → [J1 waist Y] → waist → [J2 shoulder X] → bicep → [J3 elbow X] →
 *   forearm → [J4 roll Y] → wrist → [J5 pitch X] → flange → [J6 tool roll Y] →
 *   gripBase → (welded) fingerL / fingerR
 */
import * as THREE from 'three';
import {
  makeBody, makeJoint, makeMaterial, makeDocument, makeGeometry, makeInertial,
  GeometryType, JointType, identityOrigin,
  type Body, type Joint, type Material, type Vec3, type Quat,
} from '@/core/model/index';
import { jointFramesForBodies } from '@/kinematics/modelFK';

const D = (deg: number) => (deg * Math.PI) / 180;

// Cylinder meshes point along their local +Z; build quaternions that re-aim that
// axis at a desired world axis so a knuckle lies along its joint's rotation axis.
const Zc = new THREE.Vector3(0, 0, 1);
const qFor = (axis: Vec3): Quat => {
  const q = new THREE.Quaternion().setFromUnitVectors(Zc, new THREE.Vector3(...axis).normalize());
  return [q.x, q.y, q.z, q.w];
};
const Q_UP: Quat = qFor([0, 1, 0]); // cylinder length along Y (vertical drums)
const Q_X:  Quat = qFor([1, 0, 0]); // cylinder length along X (pitch knuckles)
const Q_ID: Quat = [0, 0, 0, 1];

export function buildRobotArm() {
  // ── Materials (densities tuned for a hollow desktop arm) ──────────────────
  const baseMat = makeMaterial({ name: 'Cast base',     color: [0.16, 0.17, 0.20, 1], metalness: 0.7, roughness: 0.5,  density: 1500 });
  const linkMat = makeMaterial({ name: 'Link shell',    color: [0.62, 0.66, 0.72, 1], metalness: 0.9, roughness: 0.25, density: 320 });
  const servo   = makeMaterial({ name: 'Servo housing', color: [0.95, 0.52, 0.10, 1], metalness: 0.4, roughness: 0.45, density: 700 });
  const trim    = makeMaterial({ name: 'Trim',          color: [0.10, 0.11, 0.13, 1], metalness: 0.5, roughness: 0.6,  density: 600 });

  const bodies: Record<string, Body> = {};
  const joints: Record<string, Joint> = {};

  const box = (name: string, size: Vec3, pos: Vec3, mat: Material): Body => {
    const b = makeBody({
      name,
      transform: { position: pos, quaternion: Q_ID, scale: [1, 1, 1] },
      visual: { geometry: makeGeometry(GeometryType.BOX, { size }), materialId: mat.id, origin: identityOrigin() },
      inertial: makeInertial({ auto: true }),
    });
    bodies[b.id] = b;
    return b;
  };

  const cyl = (name: string, radius: number, length: number, pos: Vec3, quat: Quat, mat: Material): Body => {
    const b = makeBody({
      name,
      transform: { position: pos, quaternion: quat, scale: [1, 1, 1] },
      visual: { geometry: makeGeometry(GeometryType.CYLINDER, { radius, length }), materialId: mat.id, origin: identityOrigin() },
      inertial: makeInertial({ auto: true }),
    });
    bodies[b.id] = b;
    return b;
  };

  const revolute = (name: string, parent: Body, child: Body, axis: Vec3, pivot: Vec3, loDeg: number, hiDeg: number): Joint => {
    const { origin, childRest } = jointFramesForBodies(parent, child, pivot as any);
    const j = makeJoint({
      name, type: JointType.REVOLUTE,
      parentBodyId: parent.id, childBodyId: child.id,
      axis, origin, childRest,
      limit: { lower: D(loDeg), upper: D(hiDeg), effort: 3, velocity: 3 },
    });
    joints[j.id] = j;
    return j;
  };

  const weld = (name: string, parent: Body, child: Body): Joint => {
    const { origin, childRest } = jointFramesForBodies(parent, child, null as any);
    const j = makeJoint({ name, type: JointType.FIXED, parentBodyId: parent.id, childBodyId: child.id, origin, childRest });
    joints[j.id] = j;
    return j;
  };

  // ── Spine (identity boxes; Y is up) ───────────────────────────────────────
  const base     = box('Base plate', [0.20, 0.035, 0.20], [0, 0.0175, 0], baseMat);
  const waist    = box('Waist',      [0.09, 0.05, 0.09],  [0, 0.105, 0],  linkMat);
  const bicep    = box('Upper arm',  [0.045, 0.20, 0.055],[0, 0.235, 0],  linkMat);
  const forearm  = box('Forearm',    [0.038, 0.17, 0.046],[0, 0.415, 0],  linkMat);
  const wrist    = box('Wrist',      [0.04, 0.045, 0.045],[0, 0.515, 0],  linkMat);
  const flange   = box('Flange',     [0.035, 0.028, 0.04],[0, 0.552, 0],  linkMat);
  const gripBase = box('Gripper base', [0.05, 0.028, 0.038], [0, 0.582, 0], servo);
  const fingerL  = box('Finger L',   [0.009, 0.05, 0.028], [ 0.017, 0.62, 0], trim);
  const fingerR  = box('Finger R',   [0.009, 0.05, 0.028], [-0.017, 0.62, 0], trim);

  // ── Decorative knuckles / drums (welded to the moving link they belong to) ──
  const baseDrum   = cyl('Base drum',   0.075, 0.05, [0, 0.06, 0],  Q_UP, baseMat);
  const waistDrum  = cyl('Waist drum',  0.055, 0.05, [0, 0.11, 0],  Q_UP, servo);
  const shoulderK  = cyl('Shoulder hub', 0.05, 0.085,[0, 0.13, 0],  Q_X,  servo);
  const elbowK     = cyl('Elbow hub',   0.04, 0.07,  [0, 0.32, 0],  Q_X,  servo);
  const rollK      = cyl('Forearm hub', 0.03, 0.05,  [0, 0.485, 0], Q_UP, servo);
  const wristK     = cyl('Wrist hub',   0.03, 0.058, [0, 0.53, 0],  Q_X,  servo);
  const toolK      = cyl('Tool hub',    0.026, 0.04, [0, 0.565, 0], Q_UP, servo);

  // ── 6 revolute DOF ────────────────────────────────────────────────────────
  revolute('J1 · Waist (yaw)',      base,    waist,    [0, 1, 0], [0, 0.06, 0],  -180, 180);
  revolute('J2 · Shoulder (pitch)', waist,   bicep,    [1, 0, 0], [0, 0.13, 0],  -100, 100);
  revolute('J3 · Elbow (pitch)',    bicep,   forearm,  [1, 0, 0], [0, 0.32, 0],  -150, 150);
  revolute('J4 · Forearm (roll)',   forearm, wrist,    [0, 1, 0], [0, 0.485, 0], -180, 180);
  revolute('J5 · Wrist (pitch)',    wrist,   flange,   [1, 0, 0], [0, 0.53, 0],  -115, 115);
  revolute('J6 · Tool (roll)',      flange,  gripBase, [0, 1, 0], [0, 0.565, 0], -180, 180);

  // ── Welds: knuckles onto the link they ride with, fingers onto the gripper ──
  weld('Base ⨯ drum',     base,     baseDrum);
  weld('Waist ⨯ drum',    waist,    waistDrum);
  weld('Bicep ⨯ hub',     bicep,    shoulderK);
  weld('Forearm ⨯ hub',   forearm,  elbowK);
  weld('Wrist ⨯ rollhub', wrist,    rollK);
  weld('Flange ⨯ hub',    flange,   wristK);
  weld('Grip ⨯ toolhub',  gripBase, toolK);
  weld('Grip ⨯ Finger L', gripBase, fingerL);
  weld('Grip ⨯ Finger R', gripBase, fingerR);

  const doc = makeDocument({
    name: 'TETROBOT 6-DOF Arm',
    bodies,
    joints,
    materials: { [baseMat.id]: baseMat, [linkMat.id]: linkMat, [servo.id]: servo, [trim.id]: trim },
    meta: { tipBodyId: gripBase.id }, // hint for drag-from-tip IK
  });

  return doc;
}

/** A full project object ready for bridge.loadScene / serialization. */
export function buildRobotArmProject() {
  return {
    format: 'tetrobot-project',
    version: 1,
    app: 'TETROBOT',
    savedAt: new Date().toISOString(),
    scene: { activeModuleId: null, nextId: 1, modules: [], welds: [] },
    model: buildRobotArm(),
    animation: { duration: 4, tracks: {} },
  };
}
