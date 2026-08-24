/**
 * FABRIK IK solver — pure math, zero Three.js dependency.
 *
 * Coordinate conventions
 *   horizontal mode → plane is XZ, rotation axis is +Y
 *   vertical mode   → plane is XY, rotation axis is +Z
 */

const MAX_ITER = 20;
const TOLERANCE = 0.001;

// ── 3-D helpers ──────────────────────────────────────────────────────────────

/** Normalize 3-D vector; returns { x:1,y:0,z:0 } for degenerate input. */
function normalize3(v: any) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return len > 1e-10 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 1, y: 0, z: 0 };
}

/**
 * Rodrigues rotation: rotate point p around unit axis k at centre c.
 *   v_rot = v·cos + (k×v)·sin + k·(k·v)·(1−cos)
 */
function rotateAroundAxis(p: any, k: any, c: any, cosA: any, sinA: any) {
  const x = p.x - c.x, y = p.y - c.y, z = p.z - c.z;
  const dot = k.x * x + k.y * y + k.z * z;
  return {
    x: c.x + x * cosA + (k.y * z - k.z * y) * sinA + k.x * dot * (1 - cosA),
    y: c.y + y * cosA + (k.z * x - k.x * z) * sinA + k.y * dot * (1 - cosA),
    z: c.z + z * cosA + (k.x * y - k.y * x) * sinA + k.z * dot * (1 - cosA),
  };
}

// ── 2-D helpers ──────────────────────────────────────────────────────────────

function dist2(a: any, b: any) {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp2(a: any, b: any, t: any) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function normalize2(v: any) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len < 1e-10 ? { x: 1, y: 0 } : { x: v.x / len, y: v.y / len };
}

/** Signed angle from direction a→b, range (−π, π]. */
function signedAngle2(ax: any, ay: any, bx: any, by: any) {
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
function clampAngle(angle: any, limit: any, prevAngle: any, freeze = false) {
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

export function to2D(node: any, mode: any) {
  return mode === 'horizontal'
    ? { x: node.x, y: node.z }
    : { x: node.x, y: node.y };
}

export function from2D(pt2: any, node3d: any, mode: any) {
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
function fabrik2D(pts2: any, segLens: any, anchorIdx: any, targetIdx: any, target: any, limit: any, anchorDir: { x: number; y: number } | null = null) {
  const n = pts2.length;
  const pts = pts2.map((p: any) => ({ ...p }));
  const limitHits = new Array(n).fill(false);

  // ── Seed lastAngles from current geometry (cross-frame wrap detection) ─────
  // We measure the angle at each constrained joint BEFORE any FABRIK movement.
  // This gives the wrap-detector a valid "previous angle" from frame 1.
  const lastAngles = new Array(n).fill(null);

  function seedAngle(i: any, inX: any, inY: any) {
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
      } else if (i > anchorIdx + 1) {
        // Only when there's a prior segment to measure from
        const pp = pts[i - 2], prev = pts[i - 1];
        const inDx = prev.x - pp.x, inDy = prev.y - pp.y;
        const inLen = Math.sqrt(inDx * inDx + inDy * inDy);
        if (inLen > 1e-10) seedAngle(i, inDx / inLen, inDy / inLen);
      }
      // i === anchorIdx+1 with no anchorDir → first joint is free, leave null
    }
  } else {
    // Leftward chain: seed from anchorIdx-1 all the way to 0
    for (let i = anchorIdx - 1; i >= 0; i--) {
      if (i === anchorIdx - 1 && anchorDir) {
        const curr = pts[i], prev = pts[i + 1];
        const dx = curr.x - prev.x, dy = curr.y - prev.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1e-10) lastAngles[i] = signedAngle2(anchorDir.x, anchorDir.y, dx / d, dy / d);
      } else if (i < anchorIdx - 1) {
        // Only when there's a prior segment to measure from
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
      // i === anchorIdx-1 with no anchorDir → first joint is free, leave null
    }
  }

  // Snapshot angles before any iteration — used to preserve tail joints
  const seedAngles = lastAngles.slice();

  // ── Reachability clamp (only for anchor→target segment count) ─────────────
  const chainLo = Math.min(anchorIdx, targetIdx);
  const chainHi = Math.max(anchorIdx, targetIdx);
  const subLen = segLens.slice(chainLo, chainHi).reduce((s: any, l: any) => s + l, 0);
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
        let inX: number | null = null, inY: number | null = null;
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
          dx = (inX ?? 0) * cos - (inY ?? 0) * sin;
          dy = (inX ?? 0) * sin + (inY ?? 0) * cos;
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

        let inX: number | null = null, inY: number | null = null;
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
          dx = (inX ?? 0) * cos - (inY ?? 0) * sin;
          dy = (inX ?? 0) * sin + (inY ?? 0) * cos;
        }

        pts[i] = { x: prev.x + dx * segLen, y: prev.y + dy * segLen };
      }
    }

    if (dist2(pts[targetIdx], effectiveTarget) < TOLERANCE) break;
  }

  return { pts, limitHits };
}

// ── Public API ───────────────────────────────────────────────────────────────

// cubeRollAngles: [rollL, rollR] in radians, stored externally to avoid
// the ambiguity of deriving roll from geometry (atan2(y,-z) is wrong for
// arms bent in +Z).  Passed from the store every frame.
export function solveIK(nodes3d: any, segLens: any, rootRod: any, dragNode: any, dragTarget: any, mode: any, limit: any, cubeRollAngles: any) {
  const n = nodes3d.length;

  const isEndcapRoot = rootRod < 0 || rootRod >= n - 1;
  // For endcap (cube) roots: the adjacent rod is physically fixed — the cube is a
  // roll-only joint, it cannot bend the rod it's mounted on.  Treat that rod as
  // the anchor so FABRIK never tilts it.
  //   CUBE L (rootRod < 0)   → anchor = nodes 0–1 (first rod stays horizontal)
  //   CUBE R (rootRod >= n-1) → anchor = nodes (n-2)–(n-1) (last rod stays horizontal)
  const anchorL = rootRod < 0 ? 0    : (rootRod >= n - 1 ? n - 2 : rootRod);
  const anchorR = rootRod < 0 ? 1    : (rootRod >= n - 1 ? n - 1 : rootRod + 1);

  // Cube position: CUBE L = node 0 (anchorL), CUBE R = node n-1 (anchorR).
  // Roll rotates the free arm around X at the cube node.
  const cubeNodeIdx = rootRod < 0 ? 0 : n - 1;

  // For endcap roots in horizontal mode: unroll the arm to flat XZ using the
  // stored roll angle, run FABRIK, then re-roll back.  Using the stored angle
  // (not derived from geometry) avoids sign-ambiguity when the arm bends in +Z.
  let workNodes = nodes3d;
  let workTarget = dragTarget;
  let rollAngle = 0;
  let rollDir = { x: 1, y: 0, z: 0 }; // local rod-axis direction (updated below)
  const rollAnchor = (isEndcapRoot && mode === 'horizontal') ? nodes3d[cubeNodeIdx] : null;

  if (rollAnchor && cubeRollAngles) {
    const cubeIdx = rootRod < 0 ? 0 : 1;
    rollAngle = cubeRollAngles[cubeIdx] ?? 0;

    // Roll axis = actual direction of the rod connected to this cube.
    // For CUBE L: node0→node1; for CUBE R: node4→node3.
    const adjIdx = rootRod < 0 ? 1 : n - 2;
    const adj = nodes3d[adjIdx];
    rollDir = normalize3({ x: adj.x - rollAnchor.x, y: adj.y - rollAnchor.y, z: adj.z - rollAnchor.z });

    if (Math.abs(rollAngle) > 0.005) {
      const cosR = Math.cos(-rollAngle), sinR = Math.sin(-rollAngle);
      const unrollPt = (nd: any) => rotateAroundAxis(nd, rollDir, rollAnchor, cosR, sinR);
      workNodes  = nodes3d.map(unrollPt);
      workTarget = unrollPt(dragTarget);
    }
  }

  // 2-D projection on the (possibly unrolled) working frame.
  const pts2 = workNodes.map((nd: any) => to2D(nd, mode));
  const target2 = to2D(workTarget, mode);

  // Root-rod direction — only meaningful when there IS a root rod (not endcap).
  let rootDir = { x: 1, y: 0 };
  if (!isEndcapRoot) {
    const rdx = pts2[anchorR].x - pts2[anchorL].x;
    const rdy = pts2[anchorR].y - pts2[anchorL].y;
    const rLen = Math.sqrt(rdx * rdx + rdy * rdy);
    if (rLen > 1e-10) rootDir = { x: rdx / rLen, y: rdy / rLen };
  }

  let pts2Result = pts2.map((p: any) => ({ ...p }));
  const limitHits = new Array(n).fill(false);

  // For endcap roots, compute anchorDir from current geometry instead of null.
  // Without this, the first bend joint from the anchor has no seed for the rate-limiter
  // and can snap 180° in a single frame (visible jitter).
  function _anchorDirFromGeom(fromIdx: any, toIdx: any) {
    const dx = pts2[toIdx].x - pts2[fromIdx].x;
    const dy = pts2[toIdx].y - pts2[fromIdx].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    return len > 1e-10 ? { x: dx / len, y: dy / len } : null;
  }

  if (dragNode <= anchorL) {
    // Left sub-chain: nodes [0 … anchorL], anchor = anchorL
    const anchorDir = isEndcapRoot
      ? _anchorDirFromGeom(anchorR, anchorL) // backward root-rod direction
      : { x: -rootDir.x, y: -rootDir.y };
    const sub = pts2.slice(0, anchorL + 1);
    const subLens = segLens.slice(0, anchorL);
    if (sub.length >= 2) {
      const { pts, limitHits: lh } = fabrik2D(sub, subLens, anchorL, dragNode, target2, limit, anchorDir);
      for (let i = 0; i <= anchorL; i++) pts2Result[i] = pts[i];
      for (let i = 0; i <= anchorL; i++) if (lh[i]) limitHits[i] = true;
    }
  } else if (dragNode >= anchorR) {
    // Right sub-chain: nodes [anchorR … N-1], anchor = index 0 in sub
    const anchorDir = isEndcapRoot
      ? _anchorDirFromGeom(anchorL, anchorR) // forward root-rod direction
      : rootDir;
    const sub = pts2.slice(anchorR);
    const subLens = segLens.slice(anchorR);
    const localTarget = dragNode - anchorR;
    if (sub.length >= 2) {
      const { pts, limitHits: lh } = fabrik2D(sub, subLens, 0, localTarget, target2, limit, anchorDir);
      for (let i = 0; i < sub.length; i++) pts2Result[anchorR + i] = pts[i];
      for (let i = 0; i < sub.length; i++) if (lh[i]) limitHits[anchorR + i] = true;
    }
  }

  // Reconstruct 3-D positions in the working (unrolled) frame.
  let nodes = workNodes.map((n3: any, i: any) => {
    if (i === anchorL || i === anchorR) return { ...nodes3d[i] };
    return from2D(pts2Result[i], n3, mode);
  });

  // Re-roll: rotate FABRIK result back into the arm's actual rolled plane.
  // Use the same local rod axis (rollDir) that was used to unroll.
  if (rollAnchor && Math.abs(rollAngle) > 0.005) {
    const cosR = Math.cos(rollAngle), sinR = Math.sin(rollAngle);
    nodes = nodes.map((nd: any, i: any) => {
      if (i === anchorL || i === anchorR) return { ...nodes3d[i] };
      return rotateAroundAxis(nd, rollDir, rollAnchor, cosR, sinR);
    });
  }

  return { nodes, limitHits };
}

/**
 * Apply a desired angle to a single panel joint via forward kinematics.
 *
 * panelIdx 0 / 4 (CUBE joints): angle = X-axis roll angle.
 *   The cube sits at the rod tip and rotates on the rod — same axis as the rod
 *   which is world X (horizontal mode).  Dragging the arc rolls all downstream
 *   nodes around world X at the cube pivot.  Y and Z change; X is unchanged.
 *
 * panelIdx 1-3 (bend joints): angle = in-plane bend angle (XZ for horizontal,
 *   XY for vertical).  Rotation is applied to the free side of the chain.
 *   When the free side is to the LEFT of the pivot the incoming direction rotates
 *   by +δ, which changes the bend angle by −δ; we compensate by negating delta.
 */
// storedRoll: the current accumulated roll for the cube being moved, kept in the
// store rather than derived from geometry to avoid sign-ambiguity with +Z bends.
export function applyJointAngleDirect(nodes3d: any, mode: any, panelIdx: any, desiredAngle: any, rootRod: any, limit: any, storedRoll = 0) {
  const n = nodes3d.length;
  const isEndcap = panelIdx === 0 || panelIdx === n - 1;

  // ── CUBE joints: roll around the local rod axis ────────────────────────────
  if (isEndcap) {
    const pivot   = panelIdx === 0 ? nodes3d[0] : nodes3d[n - 1];
    const adjNode = panelIdx === 0 ? nodes3d[1] : nodes3d[n - 2]; // node at other end of connected rod
    const rotFrom = panelIdx === 0 ? 1 : 0;
    const rotTo   = panelIdx === 0 ? n - 1 : n - 2;

    // Roll axis = actual direction of the rod attached to this cube (not always world X).
    const rodDir = normalize3({ x: adjNode.x - pivot.x, y: adjNode.y - pivot.y, z: adjNode.z - pivot.z });

    const clampedAngle = Math.max(-Math.PI, Math.min(Math.PI, desiredAngle));
    const delta = clampedAngle - storedRoll;
    if (Math.abs(delta) < 1e-6) return nodes3d;

    const cosD = Math.cos(delta), sinD = Math.sin(delta);
    return nodes3d.map((n: any, i: any) => {
      if (i < rotFrom || i > rotTo) return n;
      return rotateAroundAxis(n, rodDir, pivot, cosD, sinD);
    });
  }

  // ── Bend joints: 2-D in-plane rotation ────────────────────────────────────
  const clamped = Math.max(-limit, Math.min(limit, desiredAngle));
  const pts2    = nodes3d.map((n: any) => to2D(n, mode));
  const nodeIdx = panelIdx; // 1, 2, or 3

  // Current bend angle at this joint
  const prev2 = pts2[nodeIdx - 1], curr2 = pts2[nodeIdx], next2 = pts2[nodeIdx + 1];
  const d1 = normalize2({ x: curr2.x - prev2.x, y: curr2.y - prev2.y });
  const d2 = normalize2({ x: next2.x - curr2.x, y: next2.y - curr2.y });
  const currentAngle = signedAngle2(d1.x, d1.y, d2.x, d2.y);

  const delta = clamped - currentAngle;

  // Determine free side (away from anchor)
  const anchorL = rootRod < 0 ? 0 : Math.min(rootRod, n - 1);

  let rotFrom, rotTo;
  if (nodeIdx > anchorL) {
    rotFrom = nodeIdx + 1; rotTo = n - 1; // right side is free
  } else {
    rotFrom = 0; rotTo = nodeIdx - 1; // left side is free
  }

  // When rotating the LEFT side, the INCOMING direction of the angle
  // measurement rotates by +δ → bend angle changes by −δ.  Negate to correct.
  const isLeftRotation = rotTo < nodeIdx;
  const rotDelta = isLeftRotation ? -delta : delta;
  const cos = Math.cos(rotDelta), sin = Math.sin(rotDelta);
  const pivot2 = pts2[nodeIdx];

  const newPts2 = pts2.slice();
  for (let i = rotFrom; i <= rotTo; i++) {
    const dx = pts2[i].x - pivot2.x, dy = pts2[i].y - pivot2.y;
    newPts2[i] = {
      x: pivot2.x + dx * cos - dy * sin,
      y: pivot2.y + dx * sin + dy * cos,
    };
  }

  return nodes3d.map((n3: any, i: any) => from2D(newPts2[i], n3, mode));
}

/**
 * Extract per-joint display angles from node positions.
 * Returns 5 values:
 *   [0] — CUBE L : X-roll angle at node 0 — how far the arm has spun around
 *                  world X at the left cube.  0 = arm flat in XZ plane.
 *   [1] — bend at node 1  (in-plane: segment 0→1  vs 1→2)
 *   [2] — bend at node 2  (in-plane: segment 1→2  vs 2→3)
 *   [3] — bend at node 3  (in-plane: segment 2→3  vs 3→4)
 *   [4] — CUBE R : X-roll angle at node 4 — same convention as CUBE L.
 *
 * Roll angle uses node 2 (arm midpoint) as the reference so that purely
 * in-plane (XZ) arm motion produces angle = 0 — the cube arcs stay still
 * when only bend joints move.
 */
// cubeRollAngles: [rollL, rollR] — passed from the store; avoids geometry-based
// computation which is sign-ambiguous for arms bent in the +Z direction.
export function extractJointAngles(nodes3d: any, mode: any, cubeRollAngles: any) {
  const rollL = cubeRollAngles ? (cubeRollAngles[0] ?? 0) : 0;
  const rollR = cubeRollAngles ? (cubeRollAngles[1] ?? 0) : 0;

  // Reference direction for determining the sign of bend angles.
  // Horizontal: starts as (0,−1,0). In the XZ plane, a bend toward +Z produces a
  // 3-D cross product (d1×d2) in the −Y direction; dotting with (0,−1,0) gives a
  // positive value → matches the positive sign from the 2-D signedAngle2 convention.
  // Vertical:   (0,0,+1) — arm bends in XY plane, cross points in ±Z.
  // Rolling the arm rigidly rotates both the cross products and the reference by the
  // same amount, so the sign is preserved — no unrolling needed.
  let ref = mode === 'horizontal' ? { x: 0, y: -1, z: 0 } : { x: 0, y: 0, z: 1 };

  if (mode === 'horizontal') {
    const origin = { x: 0, y: 0, z: 0 };
    if (Math.abs(rollL) > 0.001) {
      const rd = normalize3({ x: nodes3d[1].x - nodes3d[0].x, y: nodes3d[1].y - nodes3d[0].y, z: nodes3d[1].z - nodes3d[0].z });
      ref = rotateAroundAxis(ref, rd, origin, Math.cos(rollL), Math.sin(rollL));
    }
    if (Math.abs(rollR) > 0.001) {
      const last = nodes3d.length - 1;
      const rd = normalize3({ x: nodes3d[last - 1].x - nodes3d[last].x, y: nodes3d[last - 1].y - nodes3d[last].y, z: nodes3d[last - 1].z - nodes3d[last].z });
      ref = rotateAroundAxis(ref, rd, origin, Math.cos(rollR), Math.sin(rollR));
    }
  }

  const angles: number[] = [];
  angles.push(rollL);

  for (let j = 0; j < nodes3d.length - 2; j++) {
    const a = nodes3d[j], b = nodes3d[j + 1], c = nodes3d[j + 2];
    const d1 = normalize3({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z });
    const d2 = normalize3({ x: c.x - b.x, y: c.y - b.y, z: c.z - b.z });
    const dot = Math.max(-1, Math.min(1, d1.x * d2.x + d1.y * d2.y + d1.z * d2.z));
    const mag = Math.acos(dot);
    // Cross product d1 × d2 — its projection onto `ref` determines the sign.
    const cx = d1.y * d2.z - d1.z * d2.y;
    const cy = d1.z * d2.x - d1.x * d2.z;
    const cz = d1.x * d2.y - d1.y * d2.x;
    const sign = (cx * ref.x + cy * ref.y + cz * ref.z) >= 0 ? 1 : -1;
    angles.push(sign * mag);
  }

  angles.push(rollR);
  return angles; // length = nodes3d.length
}
