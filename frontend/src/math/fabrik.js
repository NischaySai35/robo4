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

/** Signed angle from direction a→b, range (−π, π]. */
function signedAngle2(ax, ay, bx, by) {
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}

/**
 * Clamp angle to [−limit, +limit] with two-layer snap prevention.
 *
 * Layer 1 — wrap detection:
 *   signedAngle2 returns values in (−π, π].  When a joint is near +limit and
 *   the drag pushes further, the angle wraps to ≈−(2π−limit), causing an
 *   instant snap to −limit.  We detect sign-flips with large magnitude and
 *   unwrap before clamping.
 *
 * Layer 2 — per-iteration rate limit (MAX_DELTA_PER_ITER):
 *   Even if wrap detection fails (the forward pass can create angles with the
 *   "right" sign but wrong magnitude), the angle is forbidden from changing by
 *   more than MAX_DELTA per FABRIK iteration.  With 20 iterations, the arm can
 *   move at most 20 × 0.15 = 3 rad = 172° per frame — enough for any realistic
 *   drag but impossible for a +100°→−100° snap (200°) to complete in one frame.
 *
 * prevAngle: clamped angle from the previous iteration (seeded from geometry
 *            before the first iteration so cross-frame memory is available).
 */
// Rate limit at centre of range (joint near 0°) — fast, responsive.
const RATE_CENTER = 0.07;
// Rate limit at the joint limit boundary — very slow, prevents drift-through-zero.
const RATE_AT_LIM = 0.004;
// Sign-flips are only treated as natural zero-crossings within this band.
const ZERO_CROSS_BAND = 0.30; // rad ≈ 17°

/**
 * Clamp angle to [−limit, +limit].
 *
 * Anti-snap strategy:
 *  1. Sign-flip freeze: if prevAngle is far from zero and the raw angle flips sign,
 *     it is a FABRIK geometry distortion, not real motion — freeze in place.
 *  2. Smooth adaptive rate: the per-iteration rate limit interpolates linearly from
 *     RATE_AT_LIM (at ±limit) to RATE_CENTER (at 0).  No hard boundary, no jitter.
 *     A joint at ±100° can drift at most RATE_AT_LIM × 20 = 4.6° per frame, so it
 *     can never cross zero within a single frame regardless of what FABRIK produces.
 *  3. Reach-limit hard-freeze (passed in via `freeze`): when the target is beyond
 *     chain reach AND the joint is already at its limit, hold it completely fixed.
 */
function clampAngle(angle, limit, prevAngle, freeze = false) {
  if (freeze && prevAngle !== null) {
    return { clamped: prevAngle, hitLimit: true };
  }

  let a = angle;

  if (prevAngle !== null) {
    const signFlipped = prevAngle !== 0 && Math.sign(a) !== Math.sign(prevAngle);

    if (signFlipped) {
      if (Math.abs(a) > Math.PI * 0.65) {
        // Large reflex angle — atan2 wrap-around artifact.  Unwrap.
        a += a < 0 ? 2 * Math.PI : -2 * Math.PI;
      } else if (Math.abs(prevAngle) > ZERO_CROSS_BAND) {
        // Sign flip far from zero → FABRIK distortion.  Freeze in place.
        a = prevAngle;
      }
      // else: near zero — natural crossing, fall through to rate-limit
    }

    // Smooth adaptive rate: linearly slower as joint approaches its limit.
    // t=0 at centre → RATE_CENTER.  t=1 at limit → RATE_AT_LIM.  No step, no jitter.
    const t = Math.min(Math.abs(prevAngle) / limit, 1);
    const rate = RATE_AT_LIM + (RATE_CENTER - RATE_AT_LIM) * (1 - t);

    const d = a - prevAngle;
    if (Math.abs(d) > rate) {
      a = prevAngle + Math.sign(d) * rate;
    }
  }

  if (a >  limit) return { clamped:  limit, hitLimit: true };
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
 * Design:
 *  • Forward pass reaches the ENTIRE chain (both directions from targetIdx).
 *  • Backward pass constrains the ENTIRE chain from the anchor outward —
 *    not just anchor→target.  This ensures every joint stays within ±limit
 *    regardless of which node is being dragged (no "unconstrained tail").
 *  • lastAngles[] is seeded from the current geometry before the first
 *    iteration so wrap-detection has cross-frame memory from frame 1.
 *
 * @param {Array<{x,y}>} pts2       2-D points
 * @param {Array<number>} segLens   segment lengths (length = pts2.length − 1)
 * @param {number}        anchorIdx fixed anchor index
 * @param {number}        targetIdx node being pulled toward `target`
 * @param {{x,y}}         target
 * @param {number}        limit     per-joint angular limit (radians)
 * @param {{x,y}|null}    anchorDir incoming direction of the root rod,
 *                                  constrains the first joint from anchor.
 */
function fabrik2D(pts2, segLens, anchorIdx, targetIdx, target, limit, anchorDir = null) {
  const n = pts2.length;
  const pts = pts2.map(p => ({ ...p }));
  const limitHits = new Array(n).fill(false);

  // ── Seed lastAngles from current geometry (cross-frame wrap detection) ─────
  // We measure the angle at each constrained joint BEFORE any FABRIK movement.
  // This gives the wrap-detector a valid "previous angle" from frame 1.
  const lastAngles = new Array(n).fill(null);

  function seedAngle(i, inX, inY) {
    const prev = pts[i - 1], curr = pts[i];
    const dx = curr.x - prev.x, dy = curr.y - prev.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 1e-10) lastAngles[i] = signedAngle2(inX, inY, dx / d, dy / d);
  }

  if (targetIdx > anchorIdx) {
    // Rightward chain: seed from anchorIdx+1 all the way to n-1
    for (let i = anchorIdx + 1; i < n; i++) {
      if (i === anchorIdx + 1 && anchorDir) {
        seedAngle(i, anchorDir.x, anchorDir.y);
      } else {
        const pp = pts[i - 2], prev = pts[i - 1];
        const inDx = prev.x - pp.x, inDy = prev.y - pp.y;
        const inLen = Math.sqrt(inDx * inDx + inDy * inDy);
        if (inLen > 1e-10) seedAngle(i, inDx / inLen, inDy / inLen);
      }
    }
  } else {
    // Leftward chain: seed from anchorIdx-1 all the way to 0
    for (let i = anchorIdx - 1; i >= 0; i--) {
      if (i === anchorIdx - 1 && anchorDir) {
        const curr = pts[i], prev = pts[i + 1];
        const dx = curr.x - prev.x, dy = curr.y - prev.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1e-10) lastAngles[i] = signedAngle2(anchorDir.x, anchorDir.y, dx / d, dy / d);
      } else {
        const pp = pts[i + 2], prev = pts[i + 1];
        const inDx = prev.x - pp.x, inDy = prev.y - pp.y;
        const inLen = Math.sqrt(inDx * inDx + inDy * inDy);
        if (inLen > 1e-10) {
          const curr = pts[i];
          const dx = curr.x - prev.x, dy = curr.y - prev.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 1e-10) lastAngles[i] = signedAngle2(inDx / inLen, inDy / inLen, dx / d, dy / d);
        }
      }
    }
  }

  // Snapshot angles before any iteration — used to preserve tail joints
  const seedAngles = lastAngles.slice();

  // ── Reachability clamp (only for anchor→target segment count) ─────────────
  const chainLo = Math.min(anchorIdx, targetIdx);
  const chainHi = Math.max(anchorIdx, targetIdx);
  const subLen = segLens.slice(chainLo, chainHi).reduce((s, l) => s + l, 0);
  const dToTarget = dist2(pts[anchorIdx], target);
  let effectiveTarget = { ...target };
  const atReachLimit = dToTarget >= subLen * 0.95; // target at/near chain reach
  if (dToTarget > subLen) {
    const dir = normalize2({ x: target.x - pts[anchorIdx].x, y: target.y - pts[anchorIdx].y });
    effectiveTarget = { x: pts[anchorIdx].x + dir.x * subLen, y: pts[anchorIdx].y + dir.y * subLen };
  }

  // ── All-joints-at-limit + reach-limit early exit ──────────────────────────
  // When every constrained joint is already pinned at its limit AND the drag
  // target is at/near chain reach, FABRIK cannot converge — it just distorts
  // the geometry and slowly drifts joints away from their limits (same-sign
  // drift).  Return current positions immediately.
  // When the target is within reach the user may be dragging back to release
  // joints, so we let FABRIK run normally in that case.
  if (atReachLimit) {
    let allAtLimit = true;
    if (targetIdx > anchorIdx) {
      for (let i = anchorIdx + 1; i < n; i++) {
        if (lastAngles[i] === null || Math.abs(lastAngles[i]) < limit - 0.02) {
          allAtLimit = false; break;
        }
      }
    } else {
      for (let i = anchorIdx - 1; i >= 0; i--) {
        if (lastAngles[i] === null || Math.abs(lastAngles[i]) < limit - 0.02) {
          allAtLimit = false; break;
        }
      }
    }
    if (allAtLimit) {
      if (targetIdx > anchorIdx) {
        for (let i = anchorIdx + 1; i < n; i++) limitHits[i - 1] = true;
      } else {
        for (let i = anchorIdx - 1; i >= 0; i--) limitHits[i + 1] = true;
      }
      return { pts, limitHits };
    }
  }

  const anchorPt = { ...pts[anchorIdx] };

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // ── Forward pass: reach entire chain toward effectiveTarget ───────────────
    pts[targetIdx] = { ...effectiveTarget };

    if (targetIdx > anchorIdx) {
      // Reach backward: targetIdx → anchorIdx
      for (let i = targetIdx - 1; i >= anchorIdx; i--) {
        const d = dist2(pts[i + 1], pts[i]);
        if (d < 1e-10) continue;
        pts[i] = lerp2(pts[i + 1], pts[i], segLens[i] / d);
      }
      // Reach forward: targetIdx → n-1 (so tail nodes start near their last position)
      for (let i = targetIdx + 1; i < n; i++) {
        const d = dist2(pts[i - 1], pts[i]);
        if (d < 1e-10) continue;
        pts[i] = lerp2(pts[i - 1], pts[i], segLens[i - 1] / d);
      }
    } else {
      // Reach forward: targetIdx → anchorIdx
      for (let i = targetIdx + 1; i <= anchorIdx; i++) {
        const d = dist2(pts[i - 1], pts[i]);
        if (d < 1e-10) continue;
        pts[i] = lerp2(pts[i - 1], pts[i], segLens[i - 1] / d);
      }
      // Reach backward: targetIdx → 0
      for (let i = targetIdx - 1; i >= 0; i--) {
        const d = dist2(pts[i + 1], pts[i]);
        if (d < 1e-10) continue;
        pts[i] = lerp2(pts[i + 1], pts[i], segLens[i] / d);
      }
    }

    // ── Backward pass: restore anchor, constrain ENTIRE chain ─────────────────
    // Every joint — both between anchor and target AND in the "tail" beyond
    // the drag point — is angle-clamped.  No joint is ever left unconstrained.
    pts[anchorIdx] = { ...anchorPt };

    if (targetIdx > anchorIdx) {
      // Walk from anchor to end of chain (full rightward propagation)
      for (let i = anchorIdx + 1; i < n; i++) {
        const prev = pts[i - 1];
        const segLen = segLens[i - 1];
        const d = dist2(prev, pts[i]);
        let dx, dy;
        if (d < 1e-10) { dx = 1; dy = 0; }
        else { dx = (pts[i].x - prev.x) / d; dy = (pts[i].y - prev.y) / d; }

        // Incoming direction for constraint
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
          let clamped, hitLimit;
          if (i > targetIdx && seedAngles[i] !== null) {
            // Tail beyond drag point: preserve pre-drag angle so only the
            // primary sub-chain (anchor → targetIdx) moves.
            clamped  = Math.max(-limit, Math.min(limit, seedAngles[i]));
            hitLimit = Math.abs(clamped) >= limit - 0.01;
          } else {
            const raw = signedAngle2(inX, inY, dx, dy);
            const freeze = atReachLimit && lastAngles[i] !== null && Math.abs(lastAngles[i]) >= limit - 0.01;
            ({ clamped, hitLimit } = clampAngle(raw, limit, lastAngles[i], freeze));
          }
          lastAngles[i] = clamped;
          if (hitLimit) limitHits[i - 1] = true;
          const cos = Math.cos(clamped), sin = Math.sin(clamped);
          dx = inX * cos - inY * sin;
          dy = inX * sin + inY * cos;
        }

        pts[i] = { x: prev.x + dx * segLen, y: prev.y + dy * segLen };
      }
    } else {
      // Walk from anchor to start of chain (full leftward propagation)
      for (let i = anchorIdx - 1; i >= 0; i--) {
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
          let clamped, hitLimit;
          if (i < targetIdx && seedAngles[i] !== null) {
            // Tail beyond drag point (leftward chain): preserve pre-drag angle
            clamped  = Math.max(-limit, Math.min(limit, seedAngles[i]));
            hitLimit = Math.abs(clamped) >= limit - 0.01;
          } else {
            const raw = signedAngle2(inX, inY, dx, dy);
            const freeze = atReachLimit && lastAngles[i] !== null && Math.abs(lastAngles[i]) >= limit - 0.01;
            ({ clamped, hitLimit } = clampAngle(raw, limit, lastAngles[i], freeze));
          }
          lastAngles[i] = clamped;
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

export function solveIK(nodes3d, segLens, rootRod, dragNode, dragTarget, mode, limit) {
  const anchorL = rootRod;
  const anchorR = rootRod + 1;

  const pts2 = nodes3d.map(n => to2D(n, mode));
  const target2 = to2D(dragTarget, mode);

  // Root-rod direction (anchorL → anchorR) used as the incoming reference
  // for the first joint adjacent to the anchor in each sub-chain.
  const rdx = pts2[anchorR].x - pts2[anchorL].x;
  const rdy = pts2[anchorR].y - pts2[anchorL].y;
  const rLen = Math.sqrt(rdx * rdx + rdy * rdy);
  const rootDir = rLen > 1e-10 ? { x: rdx / rLen, y: rdy / rLen } : { x: 1, y: 0 };

  let pts2Result = pts2.map(p => ({ ...p }));
  const limitHits = new Array(nodes3d.length).fill(false);

  if (dragNode <= anchorL) {
    // Left sub-chain: nodes [0 … anchorL], anchor = anchorL
    const leftDir = { x: -rootDir.x, y: -rootDir.y };
    const sub = pts2.slice(0, anchorL + 1);
    const subLens = segLens.slice(0, anchorL);
    if (sub.length >= 2) {
      const { pts, limitHits: lh } = fabrik2D(sub, subLens, anchorL, dragNode, target2, limit, leftDir);
      for (let i = 0; i <= anchorL; i++) pts2Result[i] = pts[i];
      for (let i = 0; i <= anchorL; i++) if (lh[i]) limitHits[i] = true;
    }
  } else if (dragNode >= anchorR) {
    // Right sub-chain: nodes [anchorR … N-1], anchor = index 0 in sub
    const sub = pts2.slice(anchorR);
    const subLens = segLens.slice(anchorR);
    const localTarget = dragNode - anchorR;
    if (sub.length >= 2) {
      const { pts, limitHits: lh } = fabrik2D(sub, subLens, 0, localTarget, target2, limit, rootDir);
      for (let i = 0; i < sub.length; i++) pts2Result[anchorR + i] = pts[i];
      for (let i = 0; i < sub.length; i++) if (lh[i]) limitHits[anchorR + i] = true;
    }
  }

  // Reconstruct 3-D positions (anchor nodes are always fixed)
  const nodes = nodes3d.map((n3, i) => {
    if (i === anchorL || i === anchorR) return { ...n3 };
    return from2D(pts2Result[i], n3, mode);
  });

  return { nodes, limitHits };
}

/**
 * Extract per-joint display angles from node positions.
 * Joint j is the bend at node j+1 between segments j→j+1 and j+1→j+2.
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
