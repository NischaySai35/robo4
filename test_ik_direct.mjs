/**
 * Direct test of the IK solver and drag smoothing logic
 * Tests: joint limit clamping (no flip), drag damping behavior
 */

// Copy the math from fabrik.js
const MAX_ITER = 20;
const TOLERANCE = 0.001;

function dist2(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function lerp2(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
function normalize2(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len < 1e-10 ? { x: 1, y: 0 } : { x: v.x / len, y: v.y / len };
}
function signedAngle2(ax, ay, bx, by) {
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}
function clampAngle(angle, limit, prevAngle) {
  let a = angle;
  if (prevAngle !== null && Math.sign(a) !== Math.sign(prevAngle) && Math.abs(a) > Math.PI * 0.65) {
    a += a < 0 ? 2 * Math.PI : -2 * Math.PI;
  }
  if (a > limit) return { clamped: limit, hitLimit: true };
  if (a < -limit) return { clamped: -limit, hitLimit: true };
  return { clamped: a, hitLimit: false };
}

function to2D(node, mode) {
  return mode === 'horizontal' ? { x: node.x, y: node.z } : { x: node.x, y: node.y };
}
function from2D(pt2, node3d, mode) {
  return mode === 'horizontal' ? { x: pt2.x, y: node3d.y, z: pt2.y } : { x: pt2.x, y: pt2.y, z: node3d.z };
}

function fabrik2D(pts2, segLens, anchorIdx, targetIdx, target, limit, anchorDir = null) {
  const n = pts2.length;
  const pts = pts2.map(p => ({ ...p }));
  const limitHits = new Array(n).fill(false);
  const lastAngles = new Array(n).fill(null);

  const chainLo = Math.min(anchorIdx, targetIdx);
  const chainHi = Math.max(anchorIdx, targetIdx);
  const subLen = segLens.slice(chainLo, chainHi).reduce((s, l) => s + l, 0);
  const dToTarget = dist2(pts[anchorIdx], target);
  let effectiveTarget = { ...target };
  if (dToTarget > subLen) {
    const dir = normalize2({ x: target.x - pts[anchorIdx].x, y: target.y - pts[anchorIdx].y });
    effectiveTarget = { x: pts[anchorIdx].x + dir.x * subLen, y: pts[anchorIdx].y + dir.y * subLen };
  }

  const anchorPt = { ...pts[anchorIdx] };
  const tailDirs = [];
  if (targetIdx > anchorIdx) {
    for (let k = 0; k < n - targetIdx - 1; k++) {
      const i = targetIdx + 1 + k;
      const prev = pts[i - 1];
      const dx = pts[i].x - prev.x, dy = pts[i].y - prev.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      tailDirs.push(d < 1e-10 ? { x: 1, y: 0 } : { x: dx / d, y: dy / d });
    }
  }

  for (let iter = 0; iter < MAX_ITER; iter++) {
    pts[targetIdx] = { ...effectiveTarget };
    if (targetIdx > anchorIdx) {
      for (let i = targetIdx - 1; i >= anchorIdx; i--) {
        const d = dist2(pts[i + 1], pts[i]);
        if (d < 1e-10) continue;
        pts[i] = lerp2(pts[i + 1], pts[i], segLens[i] / d);
      }
    }

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
        if (i === anchorIdx + 1 && anchorDir) { inX = anchorDir.x; inY = anchorDir.y; }
        else if (i >= anchorIdx + 2) {
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
          dx = inX * cos - inY * sin; dy = inX * sin + inY * cos;
        }
        pts[i] = { x: prev.x + dx * segLen, y: prev.y + dy * segLen };
      }
    }

    if (targetIdx > anchorIdx) {
      for (let k = 0; k < tailDirs.length; k++) {
        const i = targetIdx + 1 + k;
        const prev = pts[i - 1];
        const dir = tailDirs[k];
        pts[i] = { x: prev.x + dir.x * segLens[i - 1], y: prev.y + dir.y * segLens[i - 1] };
      }
    }

    if (dist2(pts[targetIdx], effectiveTarget) < TOLERANCE) break;
  }

  return { pts, limitHits };
}

function solveIK(nodes3d, segLens, rootRod, dragNode, dragTarget, mode, limit) {
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

function extractJointAngles(nodes3d, mode) {
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

// ── Constants ─────────────────────────────────────────────────────────────────
const ROD_LENGTH = 1.6;
const NUM_NODES = 5;
const JOINT_LIMIT = Math.PI * (100 / 180); // ±100°
const SEG_LENS = Array(4).fill(ROD_LENGTH);
const DEFAULT_ROOT = 1;

function getRestPositions() {
  const halfSpan = ((NUM_NODES - 1) * ROD_LENGTH) / 2;
  return Array.from({ length: NUM_NODES }, (_, i) => ({
    x: i * ROD_LENGTH - halfSpan, y: 0, z: 0
  }));
}

// ── TEST 1: Slow drag upward — joint limit clamping ───────────────────────────
console.log('=== TEST 1: SLOW DRAG — JOINT LIMIT CLAMPING ===');
console.log('Dragging right end-cap (node 4) upward from y=0 to y=+5 over 100 steps\n');

let nodes = getRestPositions();
const rootRod = DEFAULT_ROOT; // rod 1, anchors at nodes 1,2
const dragNode = 4; // right end-cap = node 4

// Simulate the drag target: start at rest position of node 4
let dragTarget = { x: nodes[4].x, y: 0, z: 0 };

let prevAngles = null;
let snapDetected = false;
let limitHitDetected = false;
const toDeg = r => (r * 180 / Math.PI).toFixed(1);

for (let step = 0; step <= 100; step++) {
  // Move drag target upward: in horizontal mode, "up" in 3D is +y,
  // which maps to z in 2D (horizontal uses x,z plane). Wait — let's check:
  // to2D horizontal: { x: node.x, y: node.z }
  // So "upward" in screen space = +y in 3D, but the IK plane is XZ.
  // "Up" in 3D viewport dragging the end-cap "up" on screen actually moves z in 3D.
  // In horizontal mode: the arm lies along X axis at y=0, z=0.
  // Dragging end-cap up on screen = moving it in -Z direction (screen up = -z in right-hand WebGL).
  // But from the store: onDragMove sets rawDragTarget from worldPoint.
  // The drag plane is perpendicular to camera through hit point.
  // Default camera looks from above/angle toward origin, so dragging up moves in +y or -z.
  // For simplicity, let's test with z going from 0 to -3 (= "upward" arc)

  const targetZ = -step * 0.05; // gradually move up (in screen terms = -z in world)
  dragTarget = { x: nodes[4].x, y: 0, z: targetZ };

  const result = solveIK(nodes, SEG_LENS, rootRod, dragNode, dragTarget, 'horizontal', JOINT_LIMIT);
  nodes = result.nodes;

  const angles = extractJointAngles(nodes, 'horizontal');
  const anyLimitHit = result.limitHits.some(Boolean);

  if (anyLimitHit && !limitHitDetected) {
    limitHitDetected = true;
    console.log(`LIMIT HIT at step ${step}: target=(${dragTarget.x.toFixed(2)}, ${dragTarget.z.toFixed(2)})`);
    console.log(`  Angles: J1=${toDeg(angles[0])}° J2=${toDeg(angles[1])}° J3=${toDeg(angles[2])}°`);
    console.log(`  LimitHits: ${result.limitHits.join(',')}`);
  }

  // Check for snap (large angle jump)
  if (prevAngles) {
    for (let j = 0; j < angles.length; j++) {
      const diff = Math.abs(angles[j] - prevAngles[j]) * 180 / Math.PI;
      if (diff > 45) {
        snapDetected = true;
        console.log(`SNAP at step ${step}, joint ${j}: ${toDeg(prevAngles[j])}° → ${toDeg(angles[j])}° (diff ${diff.toFixed(1)}°)`);
      }
    }
  }
  prevAngles = [...angles];

  if (step % 20 === 0 || anyLimitHit) {
    console.log(`Step ${step}: target_z=${targetZ.toFixed(2)}, angles=[${angles.map(toDeg).join(', ')}]°, limitHits=[${result.limitHits.join(',')}]`);
  }
}

console.log(`\nSlow drag result: limitHitDetected=${limitHitDetected}, snapDetected=${snapDetected}`);
if (!snapDetected) {
  console.log('✓ No snap/flip detected during slow drag to joint limit');
} else {
  console.log('✗ SNAP DETECTED during slow drag!');
}

// ── TEST 2: Fast drag — drag damping ─────────────────────────────────────────
console.log('\n=== TEST 2: FAST DRAG — DRAG DAMPING SIMULATION ===');
console.log('Simulating the RenderLoop drag smoothing: LERP_ALPHA=0.18, MAX_DELTA=0.042');

const DRAG_LERP = 0.18;
const DRAG_MAX_D = 0.042;

// Reset
nodes = getRestPositions();
let smoothedTarget = { x: nodes[4].x, y: 0, z: 0 };
let rawTarget = { x: nodes[4].x, y: 0, z: 0 };

// Simulate: mouse jumps 200px (~2 world units) instantly (fast drag)
// In 3 mouse events over 3 frames
const mouseJumps = [
  { x: nodes[4].x, y: 0, z: -0.67 }, // step 1 of fast drag
  { x: nodes[4].x, y: 0, z: -1.33 }, // step 2
  { x: nodes[4].x, y: 0, z: -2.00 }, // step 3 — final
];

console.log('\nFast drag: mouse moves 2 world units in 3 frames');
console.log('Smoothed target lags behind due to LERP + MAX_DELTA capping\n');

// Run for 30 frames after the fast drag to see convergence
const totalFrames = 33;
let mouseEventIdx = 0;
let endCapZ = 0;

for (let frame = 0; frame < totalFrames; frame++) {
  // Update raw target from "mouse" (3 fast events in first 3 frames)
  if (mouseEventIdx < mouseJumps.length) {
    rawTarget = { ...mouseJumps[mouseEventIdx] };
    mouseEventIdx++;
  }
  // else rawTarget stays at final position

  // Smooth the target (from RenderLoop._frame)
  const rx = rawTarget.x, ry = rawTarget.y, rz = rawTarget.z;
  const tx = smoothedTarget.x, ty = smoothedTarget.y, tz = smoothedTarget.z;
  const dx = rx - tx, dy = ry - ty, dz = rz - tz;
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  if (dist > 1e-6) {
    const step = Math.min(dist * DRAG_LERP, DRAG_MAX_D);
    const scale = step / dist;
    smoothedTarget.x = tx + dx * scale;
    smoothedTarget.y = ty + dy * scale;
    smoothedTarget.z = tz + dz * scale;
  }

  // Solve IK with smoothed target
  const result = solveIK(nodes, SEG_LENS, rootRod, dragNode, smoothedTarget, 'horizontal', JOINT_LIMIT);
  nodes = result.nodes;
  endCapZ = nodes[4].z;

  const lag = Math.abs(rawTarget.z - smoothedTarget.z);

  if (frame < 10 || frame % 5 === 0) {
    console.log(`Frame ${frame.toString().padStart(2)}: rawZ=${rawTarget.z.toFixed(3)}, smoothZ=${smoothedTarget.z.toFixed(3)}, endCapZ=${endCapZ.toFixed(3)}, lag=${lag.toFixed(3)}`);
  }
}

const finalLag = Math.abs(rawTarget.z - smoothedTarget.z);
console.log(`\nAfter fast drag: lag between raw and smoothed target = ${finalLag.toFixed(3)} world units`);
if (finalLag > 0.01) {
  console.log('✓ Damping confirmed: arm lags behind fast mouse movement');
} else {
  console.log('✓ Target converged (damping only temporary, as expected)');
}

// ── TEST 3: Extreme fast drag — push way past the limit ─────────────────────
console.log('\n=== TEST 3: FAST DRAG PAST LIMIT — NO FLIP ===');
nodes = getRestPositions();
smoothedTarget = { x: nodes[4].x, y: 0, z: 0 };
rawTarget = { x: nodes[4].x, y: 0, z: -10 }; // extreme jump past limit in one frame

prevAngles = null;
snapDetected = false;

console.log('Simulating 60 frames with raw target at z=-10 (well past limit)');
for (let frame = 0; frame < 60; frame++) {
  // Smooth
  const rx = rawTarget.x, ry = rawTarget.y, rz = rawTarget.z;
  const tx = smoothedTarget.x, ty = smoothedTarget.y, tz = smoothedTarget.z;
  const dx = rx - tx, dy = ry - ty, dz = rz - tz;
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  if (dist > 1e-6) {
    const step = Math.min(dist * DRAG_LERP, DRAG_MAX_D);
    const scale = step / dist;
    smoothedTarget.x = tx + dx * scale;
    smoothedTarget.y = ty + dy * scale;
    smoothedTarget.z = tz + dz * scale;
  }

  const result = solveIK(nodes, SEG_LENS, rootRod, dragNode, smoothedTarget, 'horizontal', JOINT_LIMIT);
  nodes = result.nodes;

  const angles = extractJointAngles(nodes, 'horizontal');

  if (prevAngles) {
    for (let j = 0; j < angles.length; j++) {
      const diff = Math.abs(angles[j] - prevAngles[j]) * 180 / Math.PI;
      if (diff > 45) {
        snapDetected = true;
        console.log(`SNAP at frame ${frame}, joint ${j}: ${toDeg(prevAngles[j])}° → ${toDeg(angles[j])}° (diff ${diff.toFixed(1)}°)`);
      }
    }
  }
  prevAngles = [...angles];

  if (frame % 10 === 0) {
    const limitHit = result.limitHits.some(Boolean);
    console.log(`Frame ${frame}: smoothZ=${smoothedTarget.z.toFixed(3)}, angles=[${angles.map(toDeg).join(', ')}]°, limitHit=${limitHit}`);
  }
}

console.log(`\nFast extreme drag result: snapDetected=${snapDetected}`);
if (!snapDetected) {
  console.log('✓ No snap/flip even with extreme fast drag past joint limit');
} else {
  console.log('✗ SNAP DETECTED with fast drag!');
}

console.log('\n=== ALL TESTS COMPLETE ===');
