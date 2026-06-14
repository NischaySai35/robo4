/**
 * Screen-space Jacobian IK — Damped Least Squares (DLS).
 *
 * Maps 2-D screen-space cursor error to joint angle deltas via the kinematic
 * Jacobian, so dragging RIGHT on screen always moves the arm RIGHT on screen
 * regardless of camera angle.  No fixed-plane projection needed.
 *
 * Algorithm (per frame):
 *   1. s₀ = project(P_drag)                   ← drag-node screen pos (NDC)
 *   2. e  = (mouseNDC − pickupOffset) − s₀    ← screen-space error
 *   3. J[:,i] = (project(P_drag + axis_i × r · ε) − s₀) / ε
 *               where r = P_drag − P_joint_i   (moment arm)
 *   4. dθ = Jᵀ (J Jᵀ + λI)⁻¹ · e · gain
 *   5. Apply dθ + clamp to joint limits
 *
 * J Jᵀ is always 2×2 (2 screen axes × 2 screen axes) → closed-form inversion,
 * O(N) per frame for N active joints.
 *
 * References:
 *   Buss (2004) "Introduction to Inverse Kinematics with Jacobian Transpose …"
 *   Deo & Walker (1992) "Overview of Damped Least-Squares Methods …"
 */

import * as THREE from 'three';

const _vp = new THREE.Vector3();

/** Project world xyz to NDC {x, y} in [−1, 1]. */
function toNDC(wx, wy, wz, camera) {
  _vp.set(wx, wy, wz).project(camera);
  return { x: _vp.x, y: _vp.y };
}

/**
 * Solve one IK frame.
 *
 * @param {THREE.Vector3} dragPos
 *   World position of the joint node being pulled toward the cursor.
 *
 * @param {Array<{pos:THREE.Vector3, axis:THREE.Vector3}>} jointData
 *   World-space position and rotation axis for all 6 joints.
 *   Produced by RobotFK.getJointWorldData(mode).
 *
 * @param {number[]} activeJoints
 *   Indices (0–5) of joints on the kinematic path from anchor to dragPos.
 *   Only these joints contribute columns to J and receive angle updates.
 *
 * @param {THREE.Camera} camera
 *
 * @param {{x,y}} mouseNDC   Current mouse position in NDC.
 *
 * @param {{x,y}} pickupOffset
 *   (mouseNDC at drag-start) − (dragPos screen pos at drag-start).
 *   Subtracting this prevents a position jump when the user clicks
 *   anywhere on a rod rather than exactly on the joint node.
 *
 * @param {number[]} currentAngles   Current 6 joint angles (radians).
 * @param {Object[]} JOINT_DEFS      JOINT_DEFS array (for type + limit).
 * @param {number}   JOINT_LIMIT     Default bend-joint limit (radians).
 * @param {number}   lambda          DLS damping — higher = more stable near
 *                                   singularities, lower = more responsive.
 * @param {number}   gain            Speed multiplier: NDC-error × gain = rad.
 *
 * @returns {number[]} Updated angles (all 6, unchanged for non-active joints).
 */
// Maximum angular change per joint per frame — prevents singularity explosions.
const MAX_STEP = 0.05; // radians
// Cap how much screen error is acted on per frame — prevents violent corrections
// from fast mouse swipes.  0.08 NDC ≈ 4 % of screen width.
const MAX_ERR  = 0.08; // NDC units

export function solveJacobianIK(
  dragPos, jointData, activeJoints, camera,
  mouseNDC, pickupOffset,
  currentAngles, JOINT_DEFS, JOINT_LIMIT,
  lambda = 0.008,
  gain   = 0.5,
) {
  const N = activeJoints.length;
  if (N === 0) return [...currentAngles];

  // ── Screen position of the drag node ──────────────────────────────────────
  const s0 = toNDC(dragPos.x, dragPos.y, dragPos.z, camera);

  // ── Screen-space error (corrected for pickup offset) ──────────────────────
  // At drag-start: (mouseNDC − pickupOffset) = s0  →  error = 0 (no jump).
  // As user drags: error tracks how much the cursor has moved relative to where
  // the node was when dragging began.
  let ex = (mouseNDC.x - pickupOffset.x) - s0.x;
  let ey = (mouseNDC.y - pickupOffset.y) - s0.y;

  // Clamp error magnitude — prevents large per-frame corrections from fast swipes
  const errorMag = Math.sqrt(ex * ex + ey * ey);
  if (errorMag < 5e-4) return [...currentAngles]; // already converged
  if (errorMag > MAX_ERR) {
    const scale = MAX_ERR / errorMag;
    ex *= scale;
    ey *= scale;
  }

  // ── Build Jacobian (numerical, one project per active joint) ──────────────
  // J is stored flat: [Jx₀, Jy₀, Jx₁, Jy₁, …]
  const EPS = 0.006; // rad — small enough for linearity, large enough for precision
  const J   = new Float64Array(N * 2);

  for (let i = 0; i < N; i++) {
    const jIdx        = activeJoints[i];
    const { pos, axis } = jointData[jIdx];

    // Moment arm: from joint pivot to drag node
    const rx = dragPos.x - pos.x;
    const ry = dragPos.y - pos.y;
    const rz = dragPos.z - pos.z;

    // Velocity of drag node due to unit rotation of joint i:  v = axis × r
    const vx = axis.y * rz - axis.z * ry;
    const vy = axis.z * rx - axis.x * rz;
    const vz = axis.x * ry - axis.y * rx;

    // Perturbed screen position
    const sp = toNDC(
      dragPos.x + vx * EPS,
      dragPos.y + vy * EPS,
      dragPos.z + vz * EPS,
      camera,
    );

    J[i * 2]     = (sp.x - s0.x) / EPS;
    J[i * 2 + 1] = (sp.y - s0.y) / EPS;
  }

  // ── J Jᵀ (2×2 symmetric) + λI ────────────────────────────────────────────
  let a = lambda, b = 0, d = lambda; // [a b; b d]
  for (let i = 0; i < N; i++) {
    const jx = J[i * 2], jy = J[i * 2 + 1];
    a += jx * jx;
    b += jx * jy;
    d += jy * jy;
  }

  // Closed-form 2×2 inverse
  const det = a * d - b * b;
  if (Math.abs(det) < 1e-14) return [...currentAngles];

  // α = (J Jᵀ + λI)⁻¹ · (e · gain)
  const gex = ex * gain, gey = ey * gain;
  const ax  = (d * gex - b * gey) / det;
  const ay  = (-b * gex + a * gey) / det;

  // dθ = Jᵀ · α  (clamped to MAX_STEP to guard against singularity explosions)
  const newAngles = [...currentAngles];
  for (let i = 0; i < N; i++) {
    const jIdx = activeJoints[i];
    const def  = JOINT_DEFS[jIdx];
    const lim  = def.type === 'twist' ? Math.PI : JOINT_LIMIT;
    const dθ   = Math.max(-MAX_STEP, Math.min(MAX_STEP, J[i * 2] * ax + J[i * 2 + 1] * ay));
    newAngles[jIdx] = Math.max(-lim, Math.min(lim, currentAngles[jIdx] + dθ));
  }
  return newAngles;
}
