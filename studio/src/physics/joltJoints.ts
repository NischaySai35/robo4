/**
 * joltJoints — model Joint -> Jolt Constraint, and the position/velocity
 * motor-mode switching every "powered joint" sim (PhysicsSim, RLPhysicsWorld)
 * needs. Unlike the MuJoCo port's actuator-gain-array hack, Jolt's hinge/
 * slider constraints have a NATIVE motor (SetMotorState/SetTargetAngle/
 * SetTargetAngularVelocity) — this is meaningfully simpler and was verified
 * against the real WASM build before use (see MIGRATION notes).
 *
 * World-space pivot/axis computation mirrors PhysicsSim.ts's original Rapier
 * joint-building logic exactly (pivotW, a1/a2 in each body's local frame —
 * except Jolt's mSpace defaults to WorldSpace, so no local-frame conversion
 * is needed at all: just the world-space pivot and axis, directly).
 */
import * as THREE from 'three';
import { mat as matOf, originMat } from '@/kinematics/modelFK';
import type { JoltModule } from './joltLoader';
import { worldPointToLocal, worldDirToLocal } from './joltPose';

const IDENT_Q = { x: 0, y: 0, z: 0, w: 1 };


export interface JointWorldGeom {
  pivot: THREE.Vector3;
  axis: THREE.Vector3;
}

/** World-space pivot + axis for a joint, given each body's world matrix. */
export function jointWorldGeom(joint: any, parentWorldMat: THREE.Matrix4): JointWorldGeom {
  const pivotW = parentWorldMat.clone().multiply(originMat(joint.origin));
  const pivot = new THREE.Vector3().setFromMatrixPosition(pivotW);
  // Bug found live (session-long "wheel spins, whole chassis wobbles violently" symptom,
  // confirmed to persist with a single wheel and Rigid Mode on, ruling out friction/torque/
  // multi-wheel coordination): this used to rotate the axis by ONLY the joint's own local
  // origin quaternion, silently dropping the PARENT BODY'S world rotation — while `pivot`
  // (two lines up) correctly composes both. For any body that isn't sitting at perfect
  // world-identity rotation (i.e. almost every part of an assembled, non-trivial robot),
  // the hinge axis handed to the physics engine pointed somewhere other than the wheel's
  // actual physical spin axis — the constraint permanently fighting the shape's real
  // rotation, not something friction/damping/torque tuning could ever fix. Extract the full
  // world rotation from `pivotW` (already correctly composed) instead of re-deriving a
  // partial one, matching computeWheelGeometry's (correct) approach in dynamicSimTopology.ts.
  const worldQ = new THREE.Quaternion().setFromRotationMatrix(pivotW);
  const axis = new THREE.Vector3(...(joint.axis ?? [0, 0, 1])).applyQuaternion(worldQ).normalize();
  return { pivot, axis };
}

const MOTOR_MAX_TORQUE = 1e6;
// Frequency/damping for the position/velocity motor's internal spring —
// stiff enough to hold a commanded pose rigidly under gravity (tuned against
// a real falling-arm test, see PhysicsSim tests), matching the "arm holds
// its pose" feature carried over from Rapier and MuJoCo.
const MOTOR_FREQUENCY = 30;
const MOTOR_DAMPING = 2;

function makeMotorSettings(Jolt: JoltModule) {
  // set_X(...), not `=` — direct assignment on struct-valued fields (and nested structs
  // like mSpringSettings here) silently no-ops in this binding. Verified live: joints built
  // via this exact function (PhysicsSim's Editor-page physics) would have been anchored at
  // each body's own origin instead of the real pivot, same as the bug found in DynamicSim.
  const ms = new Jolt.MotorSettings();
  ms.set_mMaxTorqueLimit(MOTOR_MAX_TORQUE);
  ms.set_mMinTorqueLimit(-MOTOR_MAX_TORQUE);
  ms.set_mMaxForceLimit(MOTOR_MAX_TORQUE);
  ms.set_mMinForceLimit(-MOTOR_MAX_TORQUE);
  const spring = new Jolt.SpringSettings();
  spring.set_mMode(Jolt.ESpringMode_FrequencyAndDamping);
  spring.set_mFrequency(MOTOR_FREQUENCY);
  spring.set_mDamping(MOTOR_DAMPING);
  ms.set_mSpringSettings(spring);
  return ms;
}

export interface CreatedJoint {
  constraint: any;
  type: 'revolute' | 'continuous' | 'prismatic' | 'fixed';
}

/**
 * Create the Jolt constraint for a model joint between two ALREADY-CREATED
 * bodies, and add it to the physics system. revolute/continuous get a hinge
 * with a position+velocity-capable motor; prismatic gets a slider; anything
 * else (fixed, or an unrecognized type) gets a rigid FixedConstraint (weld).
 */
export function createJoint(
  Jolt: JoltModule, physicsSystem: any,
  joint: any, bodyA: any, bodyB: any, parentWorldMat: THREE.Matrix4,
  opts: {
    /** Always apply these [lower, upper] limits (any hinge/slider), instead of the joint's own. */
    limits?: [number, number];
    /** Keep Jolt's stock motor instead of the stiff hold-the-pose servo (RL world). */
    stockMotor?: boolean;
  } = {},
): CreatedJoint {
  const { pivot, axis } = jointWorldGeom(joint, parentWorldMat);
  // LocalToBodyCOM, not WorldSpace: verified live in DynamicSim's identical constraint code
  // that this binding's Create() doesn't correctly convert WorldSpace mPoint1/mPoint2 per
  // body (both ended up using the same body's transform). Pre-computing each body's local
  // anchor ourselves and using LocalToBodyCOM sidesteps that broken conversion entirely.
  const localA = worldPointToLocal(bodyA, pivot);
  const localB = worldPointToLocal(bodyB, pivot);
  // Axes also need to be in each body's LOCAL frame under LocalToBodyCOM.
  const axisA = worldDirToLocal(bodyA, axis);
  const axisB = worldDirToLocal(bodyB, axis);
  const lim = joint.limit;
  const ownLimits = Number.isFinite(lim?.lower) && Number.isFinite(lim?.upper) && lim.upper > lim.lower;
  const limits = opts.limits ?? (ownLimits ? [lim.lower, lim.upper] : null);

  if (joint.type === 'revolute' || joint.type === 'continuous') {
    const hs = new Jolt.HingeConstraintSettings();
    hs.set_mSpace(Jolt.EConstraintSpace_LocalToBodyCOM);
    hs.set_mPoint1(new Jolt.RVec3(localA.x, localA.y, localA.z));
    hs.set_mPoint2(new Jolt.RVec3(localB.x, localB.y, localB.z));
    hs.set_mHingeAxis1(new Jolt.Vec3(axisA.x, axisA.y, axisA.z));
    hs.set_mHingeAxis2(new Jolt.Vec3(axisB.x, axisB.y, axisB.z));
    if (limits && (joint.type === 'revolute' || opts.limits)) { hs.mLimitsMin = limits[0]; hs.mLimitsMax = limits[1]; }
    if (!opts.stockMotor) hs.set_mMotorSettings(makeMotorSettings(Jolt));
    const constraint = Jolt.castObject(hs.Create(bodyA, bodyB), Jolt.HingeConstraint);
    physicsSystem.AddConstraint(constraint);
    return { constraint, type: joint.type };
  }

  if (joint.type === 'prismatic') {
    const ss = new Jolt.SliderConstraintSettings();
    ss.set_mSpace(Jolt.EConstraintSpace_LocalToBodyCOM);
    ss.set_mPoint1(new Jolt.RVec3(localA.x, localA.y, localA.z));
    ss.set_mPoint2(new Jolt.RVec3(localB.x, localB.y, localB.z));
    ss.set_mSliderAxis1(new Jolt.Vec3(axisA.x, axisA.y, axisA.z));
    ss.set_mSliderAxis2(new Jolt.Vec3(axisB.x, axisB.y, axisB.z));
    if (limits) { ss.mLimitsMin = limits[0]; ss.mLimitsMax = limits[1]; }
    if (!opts.stockMotor) ss.set_mMotorSettings(makeMotorSettings(Jolt));
    const constraint = Jolt.castObject(ss.Create(bodyA, bodyB), Jolt.SliderConstraint);
    physicsSystem.AddConstraint(constraint);
    return { constraint, type: 'prismatic' };
  }

  // Fixed / anything else: rigid weld at the joint's current relative pose.
  const fs = new Jolt.FixedConstraintSettings();
  fs.set_mSpace(Jolt.EConstraintSpace_LocalToBodyCOM);
  fs.set_mPoint1(new Jolt.RVec3(localA.x, localA.y, localA.z));
  fs.set_mPoint2(new Jolt.RVec3(localB.x, localB.y, localB.z));
  const constraint = fs.Create(bodyA, bodyB);
  physicsSystem.AddConstraint(constraint);
  return { constraint, type: 'fixed' };
}

/** Hold a revolute/continuous hinge rigidly at `angle` (position-servo mode). */
export function setHingeTargetAngle(Jolt: JoltModule, constraint: any, angle: number) {
  constraint.SetMotorState(Jolt.EMotorState_Position);
  constraint.SetTargetAngle(angle);
}

/** Spin a revolute/continuous hinge at `radPerSec` (velocity-servo mode, e.g. a wheel). */
export function setHingeTargetVelocity(Jolt: JoltModule, constraint: any, radPerSec: number) {
  constraint.SetMotorState(Jolt.EMotorState_Velocity);
  constraint.SetTargetAngularVelocity(radPerSec);
}

/** Hold a prismatic slider rigidly at `pos` (position-servo mode). */
export function setSliderTargetPosition(Jolt: JoltModule, constraint: any, pos: number) {
  constraint.SetMotorState(Jolt.EMotorState_Position);
  constraint.SetTargetPosition(pos);
}

export { IDENT_Q };
