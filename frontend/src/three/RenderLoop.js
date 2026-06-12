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
import { solveIK } from '../math/fabrik.js';
import { ROD_IDS, JOINT_DEFS, ROD_LENGTH, ROD_LENGTHS, ENDCAP_SIZE, JOINT_LIMIT } from '../store/armStore.js';
import { bridge } from './cameraBridge.js';

const _SEG = [ROD_LENGTHS.R2, ROD_LENGTHS.R3, ROD_LENGTHS.R4, ROD_LENGTHS.R5, ROD_LENGTHS.R6];
const MAX_REACH      = ENDCAP_SIZE * 2 + _SEG.reduce((a, b) => a + b, 0);
const MAX_BEND_DELTA = 0.018; // rad per frame — keeps motion smooth

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

    // IK state
    this._ikTarget   = new THREE.Vector3();
    this._dragOffset = new THREE.Vector3();

    // Continuous drag state — updated by mouse events, consumed by _frame every tick.
    this._activeDragRodId = null;
    this._activeDragNdc   = new THREE.Vector2();

    bridge.getArmNodes = () =>
      this.robotFK.getNodePositions().map(v => ({ x: v.x, y: v.y, z: v.z }));

    this._setupInteractionCallbacks();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  /**
   * Project cursor NDC onto the arm's working plane.
   *   horizontal → y = 0  (XZ plane)
   *   vertical   → z = 0  (XY plane)
   * Returns null when ray is nearly parallel to the plane.
   */
  _cursorToPlane(ndc, mode = 'horizontal') {
    const cam     = this.scene.camera;
    const cursor3 = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(cam);
    const ray     = new THREE.Vector3().subVectors(cursor3, cam.position).normalize();

    if (mode === 'vertical') {
      if (Math.abs(ray.z) < 0.05) return null;
      const t = -cam.position.z / ray.z;
      if (t < 0.1 || t > 80) return null;
      return new THREE.Vector3(cam.position.x + ray.x * t, cam.position.y + ray.y * t, 0);
    } else {
      if (Math.abs(ray.y) < 0.05) return null;
      const t = -cam.position.y / ray.y;
      if (t < 0.1 || t > 80) return null;
      return new THREE.Vector3(cam.position.x + ray.x * t, 0, cam.position.z + ray.z * t);
    }
  }

  /** Rod index → inner-chain node index (J1..J6 = 0..5) for FABRIK target. */
  _ikDragNode(rodIdx, rootIdx) {
    if (rodIdx > rootIdx) return Math.min(rodIdx, 5);
    return Math.max(rodIdx - 1, 0);
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

    // Store the drag node's world position relative to the cursor (sticky pickup).
    // Also kick off continuous IK by recording the rod and current NDC.
    this.interaction.callbacks.onDragStart = (rodId, startNdc) => {
      this.scene.setOrbitEnabled(false);

      const state    = this.getStore();
      const mode     = state.mode || 'horizontal';
      const rootIdx  = ROD_IDS.indexOf(state.activeRootId);
      const rodIdx   = ROD_IDS.indexOf(rodId);
      const dragNode = this._ikDragNode(rodIdx, rootIdx);

      const joints      = this.robotFK.getNodePositions();
      const dragJointPt = joints[dragNode];

      if (startNdc && dragJointPt) {
        const cursorWorld = this._cursorToPlane(startNdc, mode);
        if (cursorWorld) {
          this._dragOffset.set(
            dragJointPt.x - cursorWorld.x,
            dragJointPt.y - cursorWorld.y,
            dragJointPt.z - cursorWorld.z,
          );
        } else {
          this._dragOffset.set(0, 0, 0);
        }
        this._ikTarget.copy(dragJointPt);
        this._activeDragNdc.set(startNdc.x, startNdc.y);
      } else {
        this._dragOffset.set(0, 0, 0);
        const ee = this.robotFK.getEndEffectorWorld();
        this._ikTarget.set(ee.x, ee.y, ee.z);
        if (startNdc) this._activeDragNdc.set(startNdc.x, startNdc.y);
      }

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

  // ── IK step (called every frame while dragging) ───────────────────────────────

  _runIKStep(rodId, ndc) {
    const state   = this.getStore();
    const mode    = state.mode || 'horizontal';
    const rootIdx = ROD_IDS.indexOf(state.activeRootId);
    const rodIdx  = ROD_IDS.indexOf(rodId);
    if (rodIdx === rootIdx) return; // can't drag the fixed root

    // 1. Update _ikTarget from cursor
    const cursorWorld = this._cursorToPlane(ndc, mode);
    if (cursorWorld) {
      this._ikTarget.set(
        cursorWorld.x + this._dragOffset.x,
        cursorWorld.y + this._dragOffset.y,
        cursorWorld.z + this._dragOffset.z,
      );
    }
    // If ray is parallel to plane, keep previous _ikTarget.

    // 2. FABRIK solve
    const innerNodes = this.robotFK.getNodePositions().map(v => ({ x: v.x, y: v.y, z: v.z }));
    const segLens    = _SEG.slice();
    const ikRoot     = rootIdx - 1;          // R1→-1, R2→0, …, R7→5
    const ikDragNode = this._ikDragNode(rodIdx, rootIdx);

    const { nodes: newInner } = solveIK(
      innerNodes, segLens, ikRoot, ikDragNode,
      { x: this._ikTarget.x, y: this._ikTarget.y, z: this._ikTarget.z },
      mode, JOINT_LIMIT,
      [state.jointAngles[0], state.jointAngles[5]],
    );

    // 3. Unroll FABRIK output before back-computing bend angles.
    //    Endcap roots (R1/R6) have a twist joint that tilts the arm out of the
    //    working plane. FABRIK internally unrolls+resolves+rerolls, but the
    //    returned nodes are in the rolled (tilted) 3-D positions. We unroll them
    //    here so that the Z (or Y for vertical) component in each segment is the
    //    pure in-plane bend component, not a mix of bend and roll.
    let computeNodes = newInner;
    if (mode === 'horizontal') {
      const _unroll = (rollAngle, pivotIdx, axisFromIdx) => {
        if (Math.abs(rollAngle) < 0.005) return;
        const pivot = innerNodes[pivotIdx];
        const adj   = innerNodes[axisFromIdx];
        const dx = adj.x - pivot.x, dy = adj.y - pivot.y, dz = adj.z - pivot.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 1e-10) return;
        const ax = dx / len, ay = dy / len, az = dz / len;
        const cos = Math.cos(-rollAngle), sin = Math.sin(-rollAngle);
        computeNodes = newInner.map(nd => {
          const px = nd.x - pivot.x, py = nd.y - pivot.y, pz = nd.z - pivot.z;
          const dot = px * ax + py * ay + pz * az;
          return {
            x: pivot.x + cos * px + sin * (ay * pz - az * py) + dot * (1 - cos) * ax,
            y: pivot.y + cos * py + sin * (az * px - ax * pz) + dot * (1 - cos) * ay,
            z: pivot.z + cos * pz + sin * (ax * py - ay * px) + dot * (1 - cos) * az,
          };
        });
      };
      if (rootIdx === 0) _unroll(state.jointAngles[0], 0, 1);
      else if (rootIdx === 6) _unroll(state.jointAngles[5], 5, 4);
    }

    // 4. Back-compute bend angles from FABRIK geometry.
    //
    //    Sign convention:
    //      horizontal — rotation.y = θ maps +X to (cosθ, 0, -sinθ).
    //        Bend measured as signedAngle2(d1, d2) in XZ = -θ  →  θ = -raw
    //      vertical   — rotation.z = θ maps +X to (cosθ, sinθ, 0).
    //        Bend measured in XY = +θ  →  θ = +raw
    //
    //    isBackward: when the traversal from the root reaches joint j
    //    in reverse (rootIdx > jointIdx), the "incoming" direction is
    //    flipped relative to the forward case. This negates the cross
    //    product, so the formula is: ideal = +raw (horizontal) instead
    //    of -raw. Equivalently: ideal = isBackward ? -signedRaw : signedRaw
    //    where signedRaw = -raw (horizontal).
    //
    //    Only update joints whose node-triplet overlaps the moved sub-chain.
    //    For middle roots, the joints on the "other side" of the anchor were
    //    NOT moved by FABRIK — but their unchanged nodes still produce a
    //    valid extraction (matches the current stored angle). The isBackward
    //    sign fix ensures unchanged backward joints also produce ideal =
    //    currentAngle, so they stay put and don't drift.

    const isVert    = mode === 'vertical';
    const newAngles = [...state.jointAngles];

    // Back-compute bend angles from FABRIK geometry.
    // Bend joints in new chain: J2 (ni=1), J3 (ni=2), J5 (ni=4).
    // Twist joints (J1, J4, J6) are handled separately via roll optimisation.
    for (let ni = 0; ni < JOINT_DEFS.length; ni++) {
      if (JOINT_DEFS[ni].type !== 'bend') continue;
      if (ni === 0 || ni >= computeNodes.length - 1) continue;

      const isBackward = rootIdx > ni;

      const d1x = computeNodes[ni].x     - computeNodes[ni - 1].x;
      const d1h = isVert
        ? (computeNodes[ni].y     - computeNodes[ni - 1].y)
        : (computeNodes[ni].z     - computeNodes[ni - 1].z);
      const d2x = computeNodes[ni + 1].x - computeNodes[ni].x;
      const d2h = isVert
        ? (computeNodes[ni + 1].y - computeNodes[ni].y)
        : (computeNodes[ni + 1].z - computeNodes[ni].z);

      const l1 = Math.sqrt(d1x * d1x + d1h * d1h);
      const l2 = Math.sqrt(d2x * d2x + d2h * d2h);
      if (l1 < 1e-10 || l2 < 1e-10) continue;

      const cross     = (d1x / l1) * (d2h / l2) - (d1h / l1) * (d2x / l2);
      const dot       = (d1x / l1) * (d2x / l2) + (d1h / l1) * (d2h / l2);
      const raw       = Math.atan2(cross, dot);
      const signedRaw = isVert ? raw : -raw;
      const ideal     = Math.max(-JOINT_LIMIT, Math.min(JOINT_LIMIT,
        isBackward ? -signedRaw : signedRaw,
      ));

      const prev  = state.jointAngles[ni];
      const delta = ideal - prev;

      const distToTarget = Math.abs(ni - ikDragNode);
      const rateScale    = distToTarget <= 1 ? 1.0 : distToTarget === 2 ? 0.65 : 0.4;
      const flipDamp     = Math.abs(delta) > Math.PI / 4 ? 0.2 : 1.0;
      const maxD         = MAX_BEND_DELTA * rateScale * flipDamp;
      newAngles[ni] = prev + Math.max(-maxD, Math.min(maxD, delta));
    }

    // 5. Twist-joint roll optimisation for endcap roots (horizontal mode only).
    //    Adjusts J1/J6 roll to put the IK target in the arm's plane of motion.
    if (mode === 'horizontal') {
      if (rootIdx === 0) {
        const j1   = innerNodes[0];
        const relY = this._ikTarget.y - j1.y;
        const relZ = this._ikTarget.z - j1.z;
        if (Math.sqrt(relY * relY + relZ * relZ) > 0.04) {
          const optRoll  = Math.atan2(-relY, relZ);
          const currRoll = state.jointAngles[0];
          let delta = optRoll - currRoll;
          if (delta >  Math.PI) delta -= 2 * Math.PI;
          if (delta < -Math.PI) delta += 2 * Math.PI;
          newAngles[0] = Math.max(-Math.PI, Math.min(Math.PI,
            currRoll + Math.max(-MAX_BEND_DELTA, Math.min(MAX_BEND_DELTA, delta)),
          ));
        }
      } else if (rootIdx === 6) {
        const j6   = innerNodes[5];
        const relY = this._ikTarget.y - j6.y;
        const relZ = this._ikTarget.z - j6.z;
        if (Math.sqrt(relY * relY + relZ * relZ) > 0.04) {
          const optRoll  = Math.atan2(relY, relZ);
          const currRoll = state.jointAngles[5];
          let delta = optRoll - currRoll;
          if (delta >  Math.PI) delta -= 2 * Math.PI;
          if (delta < -Math.PI) delta += 2 * Math.PI;
          newAngles[5] = Math.max(-Math.PI, Math.min(Math.PI,
            currRoll + Math.max(-MAX_BEND_DELTA, Math.min(MAX_BEND_DELTA, delta)),
          ));
        }
      }
    }

    // 6. Write angles to store
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
      for (let i = 0; i < 6; i++) this.act.setJointAngle(i, 0);
      this.act.setRootRod('R1');
      this._lastRootId = 'R1';
      this.robotFK.rebuild('R1', [0, 0, 0, 0, 0, 0], null, null);
      this._telemetry.seed([0, 0, 0, 0, 0, 0]);
      this.scene.render();
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
