/**
 * FABRIK IK solver — pure math, zero Three.js dependency.
 *
 * Coordinate conventions
 *   horizontal mode → plane is XZ, rotation axis is +Y
 *   vertical mode   → plane is XY, rotation axis is +Z
 */

const MAX_ITER = 25;
const TOLERANCE = 0.001;

// ── 2-D helpers ──────────────────────────────────────────────────────────────

function dist2(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp2(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function normalize2(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len < 1e-10 ? { x: 1, y: 0 } : { x: v.x / len, y: v.y / len };
}

/** Signed angle from direction a to direction b, range (−π, π]. */
function signedAngle2(ax, ay, bx, by) {
  const cross = ax * by - ay * bx;
  const dot = ax * bx + ay * by;
  return Math.atan2(cross, dot);
}

/** Clamp angle to [−limit, +limit], return { clamped, hitLimit }. */
function clampAngle(a, limit) {
  if (a > limit) return { clamped: limit, hitLimit: true };
  if (a < -limit) return { clamped: -limit, hitLimit: true };
  return { clamped: a, hitLimit: false };
}

// ── Projection helpers ───────────────────────────────────────────────────────

/** Extract 2D coords from 3D node, given mode. */
export function to2D(node, mode) {
  return mode === 'horizontal'
    ? { x: node.x, y: node.z }
    : { x: node.x, y: node.y };
}

/** Restore 3D from 2D result, preserving the out-of-plane coordinate. */
export function from2D(pt2, node3d, mode) {
  return mode === 'horizontal'
    ? { x: pt2.x, y: node3d.y, z: pt2.y }
    : { x: pt2.x, y: pt2.y, z: node3d.z };
}

// ── FABRIK ───────────────────────────────────────────────────────────────────

/**
 * Solve a sub-chain with FABRIK + per-joint angle constraints.
 *
 * @param {Array<{x,y}>} pts2       2-D points, length ≥ 2
 * @param {Array<number>} segLens   segment lengths, length = pts2.length − 1
 * @param {number}        anchorIdx fixed anchor index (always 0 or pts2.length-1)
 * @param {number}        targetIdx which node we're pulling toward `target`
 * @param {{x,y}}         target    desired position for targetIdx
 * @param {number}        limit     per-joint angular limit (radians)
 * @param {{x,y}|null}    anchorDir direction of the segment arriving at the anchor
 *                                  from outside the sub-chain (the root-rod direction).
 *                                  When provided, constrains the first joint adjacent to anchor.
 * @returns {{ pts: Array<{x,y}>, limitHits: Array<boolean> }}
 */
function fabrik2D(pts2, segLens, anchorIdx, targetIdx, target, limit, anchorDir = null) {
  const n = pts2.length;
  const pts = pts2.map(p => ({ ...p }));
  const limitHits = new Array(n).fill(false);

  // Clamp target to total reachable length from anchor
  const subLen = segLens.reduce((s, l) => s + l, 0);
  const dToTarget = dist2(pts[anchorIdx], target);
  let effectiveTarget = { ...target };
  if (dToTarget > subLen) {
    const dir = normalize2({ x: target.x - pts[anchorIdx].x, y: target.y - pts[anchorIdx].y });
    effectiveTarget = { x: pts[anchorIdx].x + dir.x * subLen, y: pts[anchorIdx].y + dir.y * subLen };
  }

  const anchorPt = { ...pts[anchorIdx] };

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // ── Forward pass: set target position, reach backward toward anchor ──
    pts[targetIdx] = { ...effectiveTarget };
    if (targetIdx > anchorIdx) {
      for (let i = targetIdx - 1; i >= anchorIdx; i--) {
        const d = dist2(pts[i + 1], pts[i]);
        if (d < 1e-10) continue;
        const r = segLens[i] / d;
        pts[i] = lerp2(pts[i + 1], pts[i], r);
      }
    } else {
      for (let i = targetIdx + 1; i <= anchorIdx; i++) {
        const d = dist2(pts[i - 1], pts[i]);
        if (d < 1e-10) continue;
        const r = segLens[i - 1] / d;
        pts[i] = lerp2(pts[i - 1], pts[i], r);
      }
    }

    // ── Backward pass: restore anchor, propagate toward target with constraints ──
    pts[anchorIdx] = { ...anchorPt };

    if (targetIdx > anchorIdx) {
      // Rightward chain: anchor at left, target at right
      for (let i = anchorIdx + 1; i <= targetIdx; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const segLen = segLens[i - 1];
        const d = dist2(prev, curr);
        if (d < 1e-10) { pts[i] = { x: prev.x + segLen, y: prev.y }; continue; }

        let dx = curr.x - prev.x, dy = curr.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;

        let inX = null, inY = null;
        if (i === anchorIdx + 1 && anchorDir) {
          // First joint: root-rod direction is the incoming reference
          inX = anchorDir.x; inY = anchorDir.y;
        } else if (i >= anchorIdx + 2) {
          const pp = pts[i - 2];
          const inDx = prev.x - pp.x, inDy = prev.y - pp.y;
          const inLen = Math.sqrt(inDx * inDx + inDy * inDy);
          if (inLen > 1e-10) { inX = inDx / inLen; inY = inDy / inLen; }
        }

        if (inX !== null) {
          const angle = signedAngle2(inX, inY, dx, dy);
          const { clamped, hitLimit } = clampAngle(angle, limit);
          if (hitLimit) limitHits[i - 1] = true;
          const cos = Math.cos(clamped), sin = Math.sin(clamped);
          dx = inX * cos - inY * sin;
          dy = inX * sin + inY * cos;
        }

        pts[i] = { x: prev.x + dx * segLen, y: prev.y + dy * segLen };
      }
    } else {
      // Leftward chain: anchor at right, target at left
      for (let i = anchorIdx - 1; i >= targetIdx; i--) {
        const prev = pts[i + 1];
        const curr = pts[i];
        const segLen = segLens[i];
        const d = dist2(prev, curr);
        if (d < 1e-10) { pts[i] = { x: prev.x - segLen, y: prev.y }; continue; }

        let dx = curr.x - prev.x, dy = curr.y - prev.y;
        const dlen = Math.sqrt(dx * dx + dy * dy);
        dx /= dlen; dy /= dlen;

        let inX = null, inY = null;
        if (i === anchorIdx - 1 && anchorDir) {
          // First joint from anchor: reversed root-rod direction is the incoming reference
          inX = anchorDir.x; inY = anchorDir.y;
        } else if (i <= anchorIdx - 2) {
          const pp = pts[i + 2];
          const inDx = prev.x - pp.x, inDy = prev.y - pp.y;
          const inLen = Math.sqrt(inDx * inDx + inDy * inDy);
          if (inLen > 1e-10) { inX = inDx / inLen; inY = inDy / inLen; }
        }

        if (inX !== null) {
          const angle = signedAngle2(inX, inY, dx, dy);
          const { clamped, hitLimit } = clampAngle(angle, limit);
          if (hitLimit) limitHits[i + 1] = true;
          const cos = Math.cos(clamped), sin = Math.sin(clamped);
          dx = inX * cos - inY * sin;
          dy = inX * sin + inY * cos;
        }

        pts[i] = { x: prev.x + dx * segLen, y: prev.y + dy * segLen };
      }
    }

    if (dist2(pts[targetIdx], effectiveTarget) < TOLERANCE) break;
  }

  return { pts, limitHits };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Solve the full arm IK.
 *
 * @param {Array<{x,y,z}>} nodes3d     current world-space node positions
 * @param {number[]}        segLens    segment lengths (length 4)
 * @param {number}          rootRod    root rod index (0-3)
 * @param {number}          dragNode   which node to pull toward dragTarget
 * @param {{x,y,z}}         dragTarget world-space drag target
 * @param {string}          mode       'horizontal' | 'vertical'
 * @param {number}          limit      joint angle limit (radians)
 * @returns {{ nodes: Array<{x,y,z}>, limitHits: Array<boolean> }}
 *   limitHits[i] is true when FABRIK node i (joint i-1) hit its limit
 */
export function solveIK(nodes3d, segLens, rootRod, dragNode, dragTarget, mode, limit) {
  // Root rod occupies segment rootRod: nodes[rootRod] → nodes[rootRod+1]
  const anchorL = rootRod;     // left anchor of root rod
  const anchorR = rootRod + 1; // right anchor of root rod

  const pts2 = nodes3d.map(n => to2D(n, mode));
  const target2 = to2D(dragTarget, mode);

  // Root-rod direction in 2D (anchorL → anchorR), used as anchorDir for sub-chains
  const rdx = pts2[anchorR].x - pts2[anchorL].x;
  const rdy = pts2[anchorR].y - pts2[anchorL].y;
  const rLen = Math.sqrt(rdx * rdx + rdy * rdy);
  const rootDir = rLen > 1e-10 ? { x: rdx / rLen, y: rdy / rLen } : { x: 1, y: 0 };

  let pts2Result = pts2.map(p => ({ ...p }));
  const limitHits = new Array(nodes3d.length).fill(false);

  if (dragNode <= anchorL) {
    // Left sub-chain: [0 … anchorL], anchor = anchorL
    // Incoming reference for left chain = direction from anchorR toward anchorL = -rootDir
    const leftAnchorDir = { x: -rootDir.x, y: -rootDir.y };
    const sub = pts2.slice(0, anchorL + 1);
    const subLens = segLens.slice(0, anchorL);
    const { pts, limitHits: lh } = fabrik2D(sub, subLens, anchorL, dragNode, target2, limit, leftAnchorDir);
    for (let i = 0; i <= anchorL; i++) pts2Result[i] = pts[i];
    for (let i = 0; i <= anchorL; i++) if (lh[i]) limitHits[i] = true;
  } else if (dragNode >= anchorR) {
    // Right sub-chain: [anchorR … N-1], anchor = anchorR (index 0 in sub)
    // Incoming reference for right chain = rootDir (anchorL → anchorR)
    const sub = pts2.slice(anchorR);
    const subLens = segLens.slice(anchorR);
    const localTarget = dragNode - anchorR;
    const { pts, limitHits: lh } = fabrik2D(sub, subLens, 0, localTarget, target2, limit, rootDir);
    for (let i = 0; i < sub.length; i++) pts2Result[anchorR + i] = pts[i];
    for (let i = 0; i < sub.length; i++) if (lh[i]) limitHits[anchorR + i] = true;
  }

  // Lift back to 3D (anchor nodes are fixed to their original 3D positions)
  const nodes = nodes3d.map((n3, i) => {
    // Keep anchor nodes completely unchanged (including out-of-plane coord)
    if (i === anchorL || i === anchorR) return { ...n3 };
    return from2D(pts2Result[i], n3, mode);
  });

  return { nodes, limitHits };
}

/**
 * Extract per-joint angles from a solved node array.
 * Joint j connects rod j and rod j+1, its angle is the
 * bend between segments (nodes[j]→nodes[j+1]) and (nodes[j+1]→nodes[j+2]).
 */
export function extractJointAngles(nodes3d, mode) {
  const pts2 = nodes3d.map(n => to2D(n, mode));
  const angles = [];
  for (let j = 0; j < NUM_JOINTS_FROM_NODES(nodes3d.length); j++) {
    const a = pts2[j], b = pts2[j + 1], c = pts2[j + 2];
    const d1 = normalize2({ x: b.x - a.x, y: b.y - a.y });
    const d2 = normalize2({ x: c.x - b.x, y: c.y - b.y });
    angles.push(signedAngle2(d1.x, d1.y, d2.x, d2.y));
  }
  return angles;
}

function NUM_JOINTS_FROM_NODES(n) { return n - 2; }
