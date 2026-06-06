/**
 * FABRIK IK solver — pure math, zero Three.js dependency.
 *
 * Coordinate conventions
 *   horizontal mode → plane is XZ, rotation axis is +Y
 *   vertical mode   → plane is XY, rotation axis is +Z
 */

const MAX_ITER = 20;
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
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}

/**
 * Clamp angle to [−limit, +limit] with wrap-around detection.
 *
 * signedAngle2 returns values in (−π, π].  When the drag target is "past the
 * back" of a joint, atan2 wraps a +190° rotation to −170°, causing the clamp
 * to snap to −limit instead of +limit.
 *
 * Fix: if the raw angle's sign disagrees with prevAngle AND the magnitude is
 * large (> 120°), assume the angle has wrapped and correct it before clamping.
 */
function clampAngle(angle, limit, prevAngle) {
  let a = angle;
  if (prevAngle !== null &&
      Math.sign(a) !== Math.sign(prevAngle) &&
      Math.abs(a) > Math.PI * 0.65) {
    a += a < 0 ? 2 * Math.PI : -2 * Math.PI;
  }
  if (a > limit)  return { clamped: limit,  hitLimit: true };
  if (a < -limit) return { clamped: -limit, hitLimit: true };
  return { clamped: a, hitLimit: false };
}

// ── Projection helpers ───────────────────────────────────────────────────────

export function to2D(node, mode) {
  return mode === 'horizontal'
    ? { x: node.x, y: node.z }
    : { x: node.x, y: node.y };
}

export function from2D(pt2, node3d, mode) {
  return mode === 'horizontal'
    ? { x: pt2.x, y: node3d.y, z: pt2.y }
    : { x: pt2.x, y: pt2.y, z: node3d.z };
}

// ── FABRIK ───────────────────────────────────────────────────────────────────

/**
 * Solve a sub-chain with FABRIK + per-joint angle constraints.
 *
 * Design rules:
 *  1. Constraints apply ONLY between anchor and targetIdx.
 *  2. Nodes beyond targetIdx ("tail") move rigidly: each tail segment keeps the
 *     ABSOLUTE WORLD-SPACE DIRECTION it had at the start of this call.
 *     Tail dirs are captured once before iterations and never change.
 *     This prevents distant joints from snapping when dragging an intermediate node.
 *  3. clampAngle tracks the per-node history across FABRIK iterations to prevent
 *     the wrap-around sign-flip snap (+100° → −100°).
 */
function fabrik2D(pts2, segLens, anchorIdx, targetIdx, target, limit, anchorDir = null) {
  const n = pts2.length;
  const pts = pts2.map(p => ({ ...p }));
  const limitHits = new Array(n).fill(false);
  const lastAngles = new Array(n).fill(null); // per-node last clamped angle

  // Clamp target to reachable length of the anchor→target sub-segment only
  const chainLo = Math.min(anchorIdx, targetIdx);
  const chainHi = Math.max(anchorIdx, targetIdx);
  const subLen = segLens.slice(chainLo, chainHi).reduce((s, l) => s + l, 0);
  const dToTarget = dist2(pts[anchorIdx], target);
  let effectiveTarget = { ...target };
  if (dToTarget > subLen) {
    const dir = normalize2({ x: target.x - pts[anchorIdx].x, y: target.y - pts[anchorIdx].y });
    effectiveTarget = {
      x: pts[anchorIdx].x + dir.x * subLen,
      y: pts[anchorIdx].y + dir.y * subLen,
    };
  }

  const anchorPt = { ...pts[anchorIdx] };

  // Capture absolute tail-segment directions ONCE before any iteration.
  // For rightward chains (targetIdx > anchorIdx): tail is targetIdx+1 … n-1.
  // For leftward chains: tail is targetIdx-1 … 0.
  // Direction k = normalize(pts[tail_k] − pts[tail_k − 1]).
  const tailDirs = [];
  if (targetIdx > anchorIdx) {
    for (let k = 0; k < n - targetIdx - 1; k++) {
      const i = targetIdx + 1 + k;
      const prev = pts[i - 1];
      const dx = pts[i].x - prev.x, dy = pts[i].y - prev.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      tailDirs.push(d < 1e-10 ? { x: 1, y: 0 } : { x: dx / d, y: dy / d });
    }
  } else {
    for (let k = 0; k < targetIdx; k++) {
      const i = targetIdx - 1 - k;
      const next = pts[i + 1];
      const dx = pts[i].x - next.x, dy = pts[i].y - next.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      tailDirs.push(d < 1e-10 ? { x: -1, y: 0 } : { x: dx / d, y: dy / d });
    }
  }

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // ── Forward pass (anchor→target segment only) ─────────────────────────────
    // Tail nodes are intentionally NOT touched here; they will be placed rigidly.
    pts[targetIdx] = { ...effectiveTarget };
    if (targetIdx > anchorIdx) {
      for (let i = targetIdx - 1; i >= anchorIdx; i--) {
        const d = dist2(pts[i + 1], pts[i]);
        if (d < 1e-10) continue;
        pts[i] = lerp2(pts[i + 1], pts[i], segLens[i] / d);
      }
    } else {
      for (let i = targetIdx + 1; i <= anchorIdx; i++) {
        const d = dist2(pts[i - 1], pts[i]);
        if (d < 1e-10) continue;
        pts[i] = lerp2(pts[i - 1], pts[i], segLens[i - 1] / d);
      }
    }

    // ── Backward pass: restore anchor, apply constraints anchor → target ───────
    pts[anchorIdx] = { ...anchorPt };

    if (targetIdx > anchorIdx) {
      for (let i = anchorIdx + 1; i <= targetIdx; i++) {
        const prev = pts[i - 1];
        const segLen = segLens[i - 1];
        const d = dist2(prev, pts[i]);
        let dx, dy;
        if (d < 1e-10) { dx = 1; dy = 0; }
        else { dx = (pts[i].x - prev.x) / d; dy = (pts[i].y - prev.y) / d; }

        let inX = null, inY = null;
        if (i === anchorIdx + 1 && anchorDir) {
          inX = anchorDir.x; inY = anchorDir.y;
        } else if (i >= anchorIdx + 2) {
          const pp = pts[i - 2];
          const inDx = prev.x - pp.x, inDy = prev.y - pp.y;
          const inLen = Math.sqrt(inDx * inDx + inDy * inDy);
          if (inLen > 1e-10) { inX = inDx / inLen; inY = inDy / inLen; }
        }

        if (inX !== null) {
          const raw = signedAngle2(inX, inY, dx, dy);
          const { clamped, hitLimit } = clampAngle(raw, limit, lastAngles[i]);
          lastAngles[i] = clamped;
          if (hitLimit) limitHits[i - 1] = true;
          const cos = Math.cos(clamped), sin = Math.sin(clamped);
          dx = inX * cos - inY * sin;
          dy = inX * sin + inY * cos;
        }

        pts[i] = { x: prev.x + dx * segLen, y: prev.y + dy * segLen };
      }
    } else {
      for (let i = anchorIdx - 1; i >= targetIdx; i--) {
        const prev = pts[i + 1];
        const segLen = segLens[i];
        const d = dist2(prev, pts[i]);
        let dx, dy;
        if (d < 1e-10) { dx = -1; dy = 0; }
        else { dx = (pts[i].x - prev.x) / d; dy = (pts[i].y - prev.y) / d; }

        let inX = null, inY = null;
        if (i === anchorIdx - 1 && anchorDir) {
          inX = anchorDir.x; inY = anchorDir.y;
        } else if (i <= anchorIdx - 2) {
          const pp = pts[i + 2];
          const inDx = prev.x - pp.x, inDy = prev.y - pp.y;
          const inLen = Math.sqrt(inDx * inDx + inDy * inDy);
          if (inLen > 1e-10) { inX = inDx / inLen; inY = inDy / inLen; }
        }

        if (inX !== null) {
          const raw = signedAngle2(inX, inY, dx, dy);
          const { clamped, hitLimit } = clampAngle(raw, limit, lastAngles[i]);
          lastAngles[i] = clamped;
          if (hitLimit) limitHits[i + 1] = true;
          const cos = Math.cos(clamped), sin = Math.sin(clamped);
          dx = inX * cos - inY * sin;
          dy = inX * sin + inY * cos;
        }

        pts[i] = { x: prev.x + dx * segLen, y: prev.y + dy * segLen };
      }
    }

    // ── Rigid tail placement (frozen absolute directions) ─────────────────────
    // Place each tail node from the previously placed node using the frozen direction.
    // No angle constraint: the tail follows the drag point without any clamping.
    if (targetIdx > anchorIdx) {
      for (let k = 0; k < tailDirs.length; k++) {
        const i = targetIdx + 1 + k;
        const prev = pts[i - 1];
        const dir = tailDirs[k];
        pts[i] = { x: prev.x + dir.x * segLens[i - 1], y: prev.y + dir.y * segLens[i - 1] };
      }
    } else {
      for (let k = 0; k < tailDirs.length; k++) {
        const i = targetIdx - 1 - k;
        const next = pts[i + 1];
        const dir = tailDirs[k];
        pts[i] = { x: next.x + dir.x * segLens[i], y: next.y + dir.y * segLens[i] };
      }
    }

    if (dist2(pts[targetIdx], effectiveTarget) < TOLERANCE) break;
  }

  return { pts, limitHits };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function solveIK(nodes3d, segLens, rootRod, dragNode, dragTarget, mode, limit) {
  const anchorL = rootRod;
  const anchorR = rootRod + 1;

  const pts2 = nodes3d.map(n => to2D(n, mode));
  const target2 = to2D(dragTarget, mode);

  const rdx = pts2[anchorR].x - pts2[anchorL].x;
  const rdy = pts2[anchorR].y - pts2[anchorL].y;
  const rLen = Math.sqrt(rdx * rdx + rdy * rdy);
  const rootDir = rLen > 1e-10 ? { x: rdx / rLen, y: rdy / rLen } : { x: 1, y: 0 };

  let pts2Result = pts2.map(p => ({ ...p }));
  const limitHits = new Array(nodes3d.length).fill(false);

  if (dragNode <= anchorL) {
    const leftAnchorDir = { x: -rootDir.x, y: -rootDir.y };
    const sub = pts2.slice(0, anchorL + 1);
    const subLens = segLens.slice(0, anchorL);
    const { pts, limitHits: lh } = fabrik2D(sub, subLens, anchorL, dragNode, target2, limit, leftAnchorDir);
    for (let i = 0; i <= anchorL; i++) pts2Result[i] = pts[i];
    for (let i = 0; i <= anchorL; i++) if (lh[i]) limitHits[i] = true;
  } else if (dragNode >= anchorR) {
    const sub = pts2.slice(anchorR);
    const subLens = segLens.slice(anchorR);
    const localTarget = dragNode - anchorR;
    const { pts, limitHits: lh } = fabrik2D(sub, subLens, 0, localTarget, target2, limit, rootDir);
    for (let i = 0; i < sub.length; i++) pts2Result[anchorR + i] = pts[i];
    for (let i = 0; i < sub.length; i++) if (lh[i]) limitHits[anchorR + i] = true;
  }

  const nodes = nodes3d.map((n3, i) => {
    if (i === anchorL || i === anchorR) return { ...n3 };
    return from2D(pts2Result[i], n3, mode);
  });

  return { nodes, limitHits };
}

/**
 * Extract per-joint angles from node positions.
 * Joint j is the bend at node j+1 between segments j and j+1.
 */
export function extractJointAngles(nodes3d, mode) {
  const pts2 = nodes3d.map(n => to2D(n, mode));
  const angles = [];
  for (let j = 0; j < nodes3d.length - 2; j++) {
    const a = pts2[j], b = pts2[j + 1], c = pts2[j + 2];
    const d1 = normalize2({ x: b.x - a.x, y: b.y - a.y });
    const d2 = normalize2({ x: c.x - b.x, y: c.y - b.y });
    angles.push(signedAngle2(d1.x, d1.y, d2.x, d2.y));
  }
  return angles;
}
