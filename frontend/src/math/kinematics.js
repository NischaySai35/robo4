/**
 * Forward kinematics — pure math, no Three.js.
 *
 * Given joint angles and the fixed root rod, compute all 5 node world positions.
 * This is used to verify / reconstruct positions after FABRIK solves.
 */

import { ROD_LENGTH } from '../store/armStore.js';

const L = ROD_LENGTH;

/** Rotation matrix 2×2 by angle θ. */
function rot2(theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return { c, s };
}

/** Apply rotation to 2D direction vector. */
function rotateDir(dir, theta) {
  const { c, s } = rot2(theta);
  return { x: dir.x * c - dir.y * s, y: dir.x * s + dir.y * c };
}

/**
 * Compute all node world positions from joint angles.
 *
 * @param {number[]} angles     joint angles (length 3)
 * @param {number}   rootRod   which rod is fixed (0-3)
 * @param {{x,y,z}}  rootStart world position of root rod's left node
 * @param {{x,y,z}}  rootEnd   world position of root rod's right node
 * @param {string}   mode      'horizontal' | 'vertical'
 * @returns {Array<{x,y,z}>}   5 world-space node positions
 */
export function forwardKinematics(angles, rootRod, rootStart, rootEnd, mode) {
  const nodes = new Array(5);
  nodes[rootRod] = { ...rootStart };
  nodes[rootRod + 1] = { ...rootEnd };

  // Root rod direction (2D)
  let dirFwd, dirBwd;
  if (mode === 'horizontal') {
    dirFwd = normalize2D({ x: rootEnd.x - rootStart.x, y: rootEnd.z - rootStart.z });
    dirBwd = { x: -dirFwd.x, y: -dirFwd.y };
  } else {
    dirFwd = normalize2D({ x: rootEnd.x - rootStart.x, y: rootEnd.y - rootStart.y });
    dirBwd = { x: -dirFwd.x, y: -dirFwd.y };
  }

  // Propagate right (rootRod+1 → 4)
  let dir = dirFwd;
  for (let i = rootRod + 1; i < 4; i++) {
    const angle = angles[i - 1]; // joint i-1 connects rod i-1 and rod i
    dir = rotateDir(dir, angle);
    if (mode === 'horizontal') {
      nodes[i + 1] = {
        x: nodes[i].x + dir.x * L,
        y: nodes[i].y,
        z: nodes[i].z + dir.y * L,
      };
    } else {
      nodes[i + 1] = {
        x: nodes[i].x + dir.x * L,
        y: nodes[i].y + dir.y * L,
        z: nodes[i].z,
      };
    }
  }

  // Propagate left (rootRod → 0)
  dir = dirBwd;
  for (let i = rootRod; i > 0; i--) {
    const angle = -angles[i - 1]; // mirror
    dir = rotateDir(dir, angle);
    if (mode === 'horizontal') {
      nodes[i - 1] = {
        x: nodes[i].x + dir.x * L,
        y: nodes[i].y,
        z: nodes[i].z + dir.y * L,
      };
    } else {
      nodes[i - 1] = {
        x: nodes[i].x + dir.x * L,
        y: nodes[i].y + dir.y * L,
        z: nodes[i].z,
      };
    }
  }

  return nodes;
}

function normalize2D(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len < 1e-10 ? { x: 1, y: 0 } : { x: v.x / len, y: v.y / len };
}

/**
 * Compute max reach from a given root rod index.
 * The arm can reach at most (total chain length) from the root's midpoint.
 */
export function maxReach(rootRod) {
  // From root center: max to each free end
  const leftLen = rootRod * L;          // rods 0 … rootRod-1
  const rightLen = (3 - rootRod) * L;   // rods rootRod+1 … 3
  return Math.max(leftLen, rightLen) + L * 0.5;
}

/** Compute distance between two 3D points. */
export function dist3(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}
