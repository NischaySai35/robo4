/**
 * RenderLoop — main animation loop for FK-based arm simulator.
 *
 * Each frame:
 *   1. pendingHome  → reset
 *   2. Root change  → atomic rebuild (setRootAndAngles)
 *   3. Continuous IK (if dragging) → _runIKStep
 *   4. FK update → updateAngles
 *   5. Telemetry
 *   6. End-effector
 *   7. Render
 */

import * as THREE from 'three';
import { TelemetryTracker } from '../math/telemetry.js';
import { solveJacobianIK } from '../math/jacobianIK.js';
import { ROD_IDS, JOINT_DEFS, ROD_LENGTH, ROD_LENGTHS, ENDCAP_SIZE, JOINT_LIMIT } from '../store/armStore.js';
import { bridge } from './cameraBridge.js';

const _SEG      = [ROD_LENGTHS.R2, ROD_LENGTHS.R3, ROD_LENGTHS.R4, ROD_LENGTHS.R5, ROD_LENGTHS.R6];
const MAX_REACH = ENDCAP_SIZE * 2 + _SEG.reduce((a, b) => a + b, 0);

// Reusable targets for home animation (avoid per-frame allocation)
const _ZERO_VEC      = new THREE.Vector3(0, 0, 0);
const _IDENTITY_QUAT = new THREE.Quaternion(0, 0, 0, 1);

export class RenderLoop {
  constructor(scene, robotFK, interaction, getStore, storeActions) {
    this.scene       = scene;
    this.robotFK     = robotFK;
    this.interaction = interaction;
    this.getStore    = getStore;
    this.act         = storeActions;

    this._telemetry  = new TelemetryTracker(6);
    this._raf        = null;
    this._lastRootId = 'R1';

    // Drag / IK state
    this._activeDragRodId = null;
    this._activeDragNdc   = new THREE.Vector2();
    // Screen-space pickup offset: (mouseNDC at drag-start) − (node NDC at drag-start).
    // Keeps the arm from jumping when the user clicks anywhere on a rod body.
    this._pickupOffset    = { x: 0, y: 0 };

    // Home animation state — null when idle
    this._homeAnim = null;

    bridge.getArmNodes = () =>
      this.robotFK.getNodePositions().map(v => ({ x: v.x, y: v.y, z: v.z }));

    this._setupInteractionCallbacks();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  /**
   * Map rod index → joint-node index (0–5) that best represents the
   * "reachable end" of the rod for IK targeting.
   *   Forward  (rodIdx > rootIdx): far joint of the dragged rod → min(rodIdx, 5)
   *   Backward (rodIdx < rootIdx): near joint of the dragged rod → max(rodIdx-1, 0)
   */
  _ikDragNode(rodIdx, rootIdx) {
    return rodIdx > rootIdx ? Math.min(rodIdx, 5) : Math.max(rodIdx - 1, 0);
  }

  /**
   * Joints that lie on the kinematic path from the anchor rod to dragNodeIdx.
   * Only these joints get angle updates; others stay frozen.
   *
   *   Forward  (rodIdx > rootIdx): j ∈ [rootIdx, dragNodeIdx)
   *   Backward (rodIdx < rootIdx): j ∈ (dragNodeIdx, rootIdx)
   *
   * Derivation: rotating joint j (pivot at node j) moves all nodes on the
   * free side.  For forward traversal, node d (d > j) is reachable from j
   * iff j < d and j >= rootIdx (j is past the anchor).  Backward is symmetric.
   */
  _activeJoints(rodIdx, rootIdx, dragNodeIdx) {
    const active = [];
    if (rodIdx > rootIdx) {
      for (let j = rootIdx; j < dragNodeIdx; j++) active.push(j);
    } else {
      for (let j = dragNodeIdx + 1; j < rootIdx; j++) active.push(j);
    }
    return active;
  }

  // ── Interaction callbacks ──────────────────────────────────────────────────────

  _setupInteractionCallbacks() {
    this.interaction.callbacks.onHoverChange = (rodId, active) => {
      this.robotFK.setHoverHighlight(rodId, active);
    };

    // Atomic root change: compute new angles + apply together in one store write
    // so LeftPanel never sees a frame where rootId is new but angles are still old.
    this.interaction.callbacks.onRootClick = (rodId) => {
      const state = this.getStore();
      if (rodId === state.activeRootId) return;
      const mode = state.mode || 'horizontal';
      const { newAngles, rootPos, rootQuat } =
        this.robotFK.computeAnglesForRoot(rodId, mode);
      this.act.setRootAndAngles(rodId, newAngles);
      this._lastRootId = rodId;
      this.robotFK.rebuild(rodId, newAngles, rootPos, rootQuat);
      this._telemetry.seed(newAngles);
    };

    this.interaction.callbacks.onDragStart = (rodId, startNdc) => {
      this.scene.setOrbitEnabled(false);
      this._homeAnim = null; // cancel any home animation

      const state       = this.getStore();
      const rootIdx     = ROD_IDS.indexOf(state.activeRootId);
      const rodIdx      = ROD_IDS.indexOf(rodId);
      const dragNodeIdx = this._ikDragNode(rodIdx, rootIdx);

      // Compute screen-space pickup offset so the node doesn't snap to the
      // cursor if the user clicked somewhere other than the joint sphere.
      const joints   = this.robotFK.getNodePositions();
      const P        = joints[dragNodeIdx];
      const nodeNdc  = new THREE.Vector3(P.x, P.y, P.z).project(this.scene.camera);

      this._pickupOffset = startNdc
        ? { x: startNdc.x - nodeNdc.x, y: startNdc.y - nodeNdc.y }
        : { x: 0, y: 0 };

      if (startNdc) this._activeDragNdc.set(startNdc.x, startNdc.y);
      this._activeDragRodId = rodId;
    };

    // Only record the latest cursor NDC — _frame runs IK every tick.
    this.interaction.callbacks.onDrag = (_rodId, _dx, _dy, ndc) => {
      if (ndc) this._activeDragNdc.set(ndc.x, ndc.y);
    };

    this.interaction.callbacks.onDragEnd = () => {
      this._activeDragRodId = null;
      this.scene.setOrbitEnabled(true);
    };
  }

  // ── Jacobian IK step (called every frame while dragging) ─────────────────────

  _runIKStep(rodId, mouseNDC) {
    const state   = this.getStore();
    const mode    = state.mode || 'horizontal';
    const rootIdx = ROD_IDS.indexOf(state.activeRootId);
    const rodIdx  = ROD_IDS.indexOf(rodId);
    if (rodIdx === rootIdx) return;

    const dragNodeIdx  = this._ikDragNode(rodIdx, rootIdx);
    const activeJoints = this._activeJoints(rodIdx, rootIdx, dragNodeIdx);
    if (activeJoints.length === 0) return;

    // Current world position of the dragged joint node
    const joints = this.robotFK.getNodePositions();
    const P      = joints[dragNodeIdx];
    const dragPos = new THREE.Vector3(P.x, P.y, P.z);

    // World-space rotation axes for all joints (needed by Jacobian)
    const jointData = this.robotFK.getJointWorldData(mode);

    const newAngles = solveJacobianIK(
      dragPos, jointData, activeJoints,
      this.scene.camera,
      { x: mouseNDC.x, y: mouseNDC.y },
      this._pickupOffset,
      state.jointAngles, JOINT_DEFS, JOINT_LIMIT,
      /* lambda */ 0.008,
      /* gain   */ 0.5,
    );

    for (let i = 0; i < 6; i++) this.act.setJointAngle(i, newAngles[i]);
  }

  // ── Loop ──────────────────────────────────────────────────────────────────────

  start() {
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      this._frame(now);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _frame(now) {
    const s    = this.getStore();
    const mode = s.mode || 'horizontal';

    // ── Home ──────────────────────────────────────────────────────────────────────
    if (s.pendingHome) {
      this.act.clearPendingHome();
      this._activeDragRodId = null; // cancel any active drag

      let startAngles = [...s.jointAngles];
      let startPos    = this.robotFK.robotGroup.position.clone();
      let startQuat   = this.robotFK.robotGroup.quaternion.clone();

      // Switch to R1 root first so the animation plays from the correct frame
      if (s.activeRootId !== 'R1') {
        const { newAngles, rootPos, rootQuat } =
          this.robotFK.computeAnglesForRoot('R1', mode);
        this.act.setRootAndAngles('R1', newAngles);
        this._lastRootId = 'R1';
        this.robotFK.rebuild('R1', newAngles, rootPos, rootQuat);
        this._telemetry.seed(newAngles);
        startAngles = newAngles;
        startPos    = rootPos.clone();
        startQuat   = rootQuat.clone();
      }

      // Scale duration to travel distance: 400–1100 ms
      const maxDelta = Math.max(0.01, ...startAngles.map(a => Math.abs(a)));
      const duration = 400 + maxDelta * (700 / Math.PI);
      this._homeAnim = { startAngles, startPos, startQuat, startTime: now, duration };
    }

    // ── Home animation ────────────────────────────────────────────────────────────
    if (this._homeAnim) {
      const { startAngles, startPos, startQuat, startTime, duration } = this._homeAnim;
      const raw = Math.min((now - startTime) / duration, 1.0);
      // Ease-in-out cubic: zero vel at start and end, smooth peak in the middle
      const t = raw < 0.5
        ? 4 * raw * raw * raw
        : 1 - Math.pow(-2 * raw + 2, 3) / 2;

      const animAngles = startAngles.map(a => a * (1 - t));

      // Drive store angles (keeps joint cards in sync)
      for (let i = 0; i < 6; i++) this.act.setJointAngle(i, animAngles[i]);

      // Drive scene directly
      this.robotFK.updateAngles(animAngles, mode);
      this.robotFK.robotGroup.position.lerpVectors(startPos, _ZERO_VEC, t);
      this.robotFK.robotGroup.quaternion.slerpQuaternions(startQuat, _IDENTITY_QUAT, t);

      // Telemetry
      const limitHits = animAngles.map((a, i) => Math.abs(a) >= JOINT_DEFS[i].limit - 0.01);
      const telemetry = this._telemetry.update(animAngles, limitHits, now);
      this.act.setJointTelemetry(telemetry);
      for (let i = 0; i < JOINT_DEFS.length; i++) {
        this.robotFK.setLimitHighlight(JOINT_DEFS[i].id, limitHits[i]);
      }

      // End effector
      const eePos   = this.robotFK.getEndEffectorWorld();
      const grpPos  = this.robotFK.robotGroup.position;
      const dx = eePos.x - grpPos.x, dy = eePos.y - grpPos.y, dz = eePos.z - grpPos.z;
      this.act.updateEndEffector(eePos, Math.min(Math.sqrt(dx*dx+dy*dy+dz*dz) / MAX_REACH, 1.0) * 100);

      this.scene.render();

      if (raw >= 1.0) {
        // Snap to exact home and clean up
        this._homeAnim = null;
        for (let i = 0; i < 6; i++) this.act.setJointAngle(i, 0);
        this.robotFK.updateAngles([0, 0, 0, 0, 0, 0], mode);
        this.robotFK.robotGroup.position.set(0, 0, 0);
        this.robotFK.robotGroup.quaternion.identity();
        this._telemetry.seed([0, 0, 0, 0, 0, 0]);
      }
      return;
    }

    // ── Root change safety net ─────────────────────────────────────────────────────
    // onRootClick handles this atomically, but if root changes through some other
    // path (e.g., home button), re-sync here.
    let activeAngles = s.jointAngles;
    if (s.activeRootId !== this._lastRootId) {
      const { newAngles, rootPos, rootQuat } =
        this.robotFK.computeAnglesForRoot(s.activeRootId, mode);
      this.act.setRootAndAngles(s.activeRootId, newAngles);
      this._lastRootId = s.activeRootId;
      this.robotFK.rebuild(s.activeRootId, newAngles, rootPos, rootQuat);
      this._telemetry.seed(newAngles);
      activeAngles = newAngles;
    }

    // ── Continuous IK ─────────────────────────────────────────────────────────────
    // Runs every animation frame while a drag is active so the arm keeps
    // converging toward the cursor even when the mouse is stationary.
    if (this._activeDragRodId) {
      this._runIKStep(this._activeDragRodId, this._activeDragNdc);
      activeAngles = this.getStore().jointAngles; // re-read after IK wrote new values
    }

    // ── FK update ─────────────────────────────────────────────────────────────────
    this.robotFK.updateAngles(activeAngles, mode);

    // ── Telemetry ─────────────────────────────────────────────────────────────────
    const limitHits = activeAngles.map((a, i) => Math.abs(a) >= JOINT_DEFS[i].limit - 0.01);
    const telemetry = this._telemetry.update(activeAngles, limitHits, now);
    this.act.setJointTelemetry(telemetry);

    for (let i = 0; i < JOINT_DEFS.length; i++) {
      this.robotFK.setLimitHighlight(JOINT_DEFS[i].id, limitHits[i]);
    }

    // ── End effector ──────────────────────────────────────────────────────────────
    const eePos   = this.robotFK.getEndEffectorWorld();
    const rootPos = this.robotFK.robotGroup.position;
    const dx = eePos.x - rootPos.x, dy = eePos.y - rootPos.y, dz = eePos.z - rootPos.z;
    const dist     = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const reachPct = Math.min(dist / MAX_REACH, 1.0) * 100;
    this.act.updateEndEffector(eePos, reachPct);

    // ── Render ────────────────────────────────────────────────────────────────────
    this.scene.render();
  }
}
