/**
 * RenderLoop — the main animation loop.
 *
 * This is the single bridge between Three.js and the Zustand store.
 * Each frame it:
 *   1. Reads drag target from local state (set by Interaction callbacks)
 *   2. Runs FABRIK if dragging
 *   3. Updates arm meshes via ArmRenderer
 *   4. Computes telemetry via TelemetryTracker
 *   5. Writes telemetry + end-effector + status to Zustand store
 *   6. Renders via SceneManager
 */

import * as THREE from 'three';
import { solveIK, extractJointAngles } from '../math/fabrik.js';
import { dist3 } from '../math/kinematics.js';
import { TelemetryTracker } from '../math/telemetry.js';
import { ROD_LENGTH, NUM_JOINTS, DEFAULT_ROOT, getRestPositions, JOINT_LIMIT } from '../store/armStore.js';

const SEG_LENS = Array(4).fill(ROD_LENGTH);
// Max reach = 3 rods extending from the root rod's midpoint
const MAX_REACH = ROD_LENGTH * 3.5;

export class RenderLoop {
  /**
   * @param {SceneManager}  scene
   * @param {ArmGeometry}   armGeo
   * @param {ArmRenderer}   armRend
   * @param {Interaction}   interaction
   * @param {Function}      getStore   () => Zustand store snapshot
   * @param {Object}        storeActions  { setNodePositions, setJointTelemetry, ... }
   */
  constructor(scene, armGeo, armRend, interaction, getStore, storeActions) {
    this.scene = scene;
    this.armGeo = armGeo;
    this.armRend = armRend;
    this.interaction = interaction;
    this.getStore = getStore;
    this.act = storeActions;

    this._telemetry = new TelemetryTracker(NUM_JOINTS);
    this._raf = null;
    this._lastTime = 0;

    // Local drag state (not in store to avoid React re-renders every mouse move)
    this._dragActive = false;
    this._dragNodeIndex = null;
    this._dragTarget = { x: 0, y: 0, z: 0 };
    this._draggedType = null;
    this._draggedIndex = null;

    // Animate nodes for smooth mode transitions
    this._animating = false;
    this._animFrom = null;
    this._animTo = null;
    this._animStart = 0;
    this._animDuration = 700;

    // Limit-hit debounce
    this._limitHitCooldown = 0;

    this._setupInteractionCallbacks();
  }

  _setupInteractionCallbacks() {
    const store = this.getStore();

    this.interaction.callbacks.onHoverChange = (type, index, active) => {
      const s = this.getStore();
      this.armGeo.setHoverHighlight(type, index, active, s.rootRodIndex);
    };

    this.interaction.callbacks.onDragStart = (type, index, worldPoint) => {
      const s = this.getStore();
      if (type === 'rod' && index === s.rootRodIndex) return; // root rod not draggable

      // Map object to FABRIK drag node
      const dragNode = this._objectToDragNode(type, index, s.rootRodIndex);
      if (dragNode === null) return;

      // Clear any hover highlight before drag highlight takes over
      this.armGeo.setHoverHighlight(type, index, false, s.rootRodIndex);

      this._dragActive = true;
      this._dragNodeIndex = dragNode;
      this._dragTarget = { x: worldPoint.x, y: worldPoint.y, z: worldPoint.z };
      this._draggedType = type;
      this._draggedIndex = index;

      this.act.setDragging(true, dragNode, `${type}-${index}`);
      this.act.setStatus('solving');
      this.scene.setOrbitEnabled(false);

      this.armGeo.setDragHighlight(type, index, true);
    };

    this.interaction.callbacks.onDragMove = (worldPoint) => {
      if (!this._dragActive) return;
      this._dragTarget = { x: worldPoint.x, y: worldPoint.y, z: worldPoint.z };
      // Keep arm above the ground plane in vertical mode
      if (this.getStore().mode === 'vertical') {
        this._dragTarget.y = Math.max(this._dragTarget.y, -2.6);
      }
    };

    this.interaction.callbacks.onDragEnd = () => {
      if (this._dragActive) {
        this.armGeo.setDragHighlight(this._draggedType, this._draggedIndex, false);
      }
      this._dragActive = false;
      this._dragNodeIndex = null;
      this.act.setDragging(false);
      this.act.setStatus('idle');
      this.scene.setOrbitEnabled(true);
      this.armGeo.setTrail(null, null, false);
    };

    this.interaction.callbacks.onRootClick = (rodIndex) => {
      const s = this.getStore();
      if (rodIndex === s.rootRodIndex) return;
      // Switch root in-place — arm stays where it is, only root indicator changes
      this.act.setRootRod(rodIndex);
    };
  }

  /**
   * Map clicked object to FABRIK node index that will be dragged.
   * Root sub-chain boundary nodes cannot be dragged.
   */
  _objectToDragNode(type, index, rootRod) {
    const anchorL = rootRod;
    const anchorR = rootRod + 1;

    if (type === 'endcap') {
      // index 0 = left end cap = node 0; index 1 = right end cap = node 4
      const nodeIdx = index === 0 ? 0 : 4;
      if (nodeIdx === anchorL || nodeIdx === anchorR) return null;
      return nodeIdx;
    }

    if (type === 'rod') {
      // Rod i spans node i → node i+1
      if (index === rootRod) return null;
      return index < rootRod ? index : index + 1;
    }

    if (type === 'joint') {
      // Joint j is at node j+1
      const nodeIdx = index + 1;
      if (nodeIdx === anchorL || nodeIdx === anchorR) return null;
      return nodeIdx;
    }

    return null;
  }

  _startAnimation(fromNodes, toNodes, onComplete) {
    this._animating = true;
    this._animFrom = fromNodes.map(n => ({ ...n }));
    this._animTo = toNodes.map(n => ({ ...n }));
    this._animStart = performance.now();
    this._animOnComplete = onComplete;
  }

  _tickAnimation(now) {
    if (!this._animating) return null;
    const t = Math.min((now - this._animStart) / this._animDuration, 1);
    const ease = easeInOutCubic(t);

    const nodes = this._animFrom.map((from, i) => ({
      x: lerp(from.x, this._animTo[i].x, ease),
      y: lerp(from.y, this._animTo[i].y, ease),
      z: lerp(from.z, this._animTo[i].z, ease),
    }));

    if (t >= 1) {
      this._animating = false;
      this._animOnComplete?.();
    }

    return nodes;
  }

  start() {
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min((now - this._lastTime) / 1000, 0.1);
      this._lastTime = now;

      this._frame(now, dt);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _frame(now, dt) {
    const s = this.getStore();
    let nodes = s.nodePositions.map(n => ({ ...n }));
    let limitHits = new Array(5).fill(false);

    // ── Home action ───────────────────────────────────────────────────────────
    if (s.pendingHome && !this._animating && !this._dragActive) {
      this.act.clearPendingHome();
      const toNodes = getRestPositions(s.mode, DEFAULT_ROOT);
      this._startAnimation(s.nodePositions, toNodes, () => {
        this.act.setRootRod(DEFAULT_ROOT);
      });
    }

    // ── Animation (root switch, mode transition, home) ────────────────────────
    if (this._animating) {
      const animNodes = this._tickAnimation(now);
      if (animNodes) {
        nodes = animNodes;
        this.act.setNodePositions(nodes);
      }
    }

    // ── IK solve ──────────────────────────────────────────────────────────────
    if (this._dragActive && this._dragNodeIndex !== null && !this._animating) {
      const result = solveIK(
        nodes,
        SEG_LENS,
        s.rootRodIndex,
        this._dragNodeIndex,
        this._dragTarget,
        s.mode,
        s.jointLimit
      );
      nodes = result.nodes;
      limitHits = result.limitHits;
      this.act.setNodePositions(nodes);

      // Trail: root center → drag target
      const rootCenter = this.armRend.getRootCenter(nodes, s.rootRodIndex);
      this.armGeo.setTrail(rootCenter, this._dragTarget, true);

      // Status
      const anyLimit = limitHits.some(Boolean);
      this.act.setStatus(anyLimit ? 'limit_hit' : 'solving');
    }

    // ── Render geometry ───────────────────────────────────────────────────────
    this.armRend.update(nodes, s.rootRodIndex, s.mode, limitHits, dt);

    // ── Telemetry ─────────────────────────────────────────────────────────────
    const rawAngles = extractJointAngles(nodes, s.mode);
    const jointLimitHits = [limitHits[1], limitHits[2], limitHits[3]]; // joints 0,1,2
    const telemetry = this._telemetry.update(rawAngles, jointLimitHits, now);
    this.act.setJointTelemetry(telemetry);

    // ── End effector ──────────────────────────────────────────────────────────
    const rootMid = nodes[s.rootRodIndex];
    // The "far" free end from the root: use node 4 (right end) or node 0 if root is near right
    const eeNode = s.rootRodIndex >= 2 ? nodes[0] : nodes[4];
    const efDist = dist3(rootMid, eeNode);
    const reachPct = Math.min(efDist / MAX_REACH, 1.0) * 100;
    this.act.updateEndEffector(
      { x: eeNode.x, y: eeNode.y, z: eeNode.z },
      reachPct
    );

    // ── Render ────────────────────────────────────────────────────────────────
    this.scene.render();
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function lerp(a, b, t) { return a + (b - a) * t; }
