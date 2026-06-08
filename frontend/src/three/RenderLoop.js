/**
 * RenderLoop — main animation loop for FK-based arm simulator.
 *
 * Each frame:
 *   1. Check pendingHome → reset angles + root → rebuild
 *   2. Check if activeRootId changed → rebuild
 *   3. Read jointAngles → updateAngles
 *   4. Compute telemetry
 *   5. Compute end-effector position + reachPercent
 *   6. Write telemetry + endEffector to store
 *   7. Render
 */

import * as THREE from 'three';
import { TelemetryTracker } from '../math/telemetry.js';
import { solveIK } from '../math/fabrik.js';
import { ROD_IDS, JOINT_DEFS, ROD_LENGTH, ENDCAP_SIZE, JOINT_LIMIT } from '../store/armStore.js';
import { bridge } from './cameraBridge.js';

// Max reach: 4 normal rods + 2 endcap cubes fully extended
const MAX_REACH = ENDCAP_SIZE * 2 + ROD_LENGTH * 4;

export class RenderLoop {
  /**
   * @param {SceneManager} scene
   * @param {RobotFK}      robotFK
   * @param {Interaction}  interaction
   * @param {Function}     getStore       — () => Zustand store snapshot
   * @param {Object}       storeActions   — { setJointTelemetry, setStatus, updateEndEffector,
   *                                          setRootRod, clearPendingHome }
   */
  constructor(scene, robotFK, interaction, getStore, storeActions) {
    this.scene    = scene;
    this.robotFK  = robotFK;
    this.interaction = interaction;
    this.getStore = getStore;
    this.act      = storeActions;

    this._telemetry   = new TelemetryTracker(5);
    this._raf         = null;
    this._lastRootId  = 'R1'; // matches initial store state; avoids spurious rebuild on frame 1
    this._ikTarget    = new THREE.Vector3();
    this._dragOffset  = new THREE.Vector3(); // offset from cursor world to drag joint (sticky pickup)

    // Expose arm node positions to the bridge so ViewControls/fitCamera can use them
    bridge.getArmNodes = () => {
      const positions = this.robotFK.getNodePositions();
      return positions.map(v => ({ x: v.x, y: v.y, z: v.z }));
    };

    this._setupInteractionCallbacks();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Project cursor NDC to the arm's working plane.
   * horizontal: y=0 (XZ plane)
   * vertical:   z=0 (XY plane)
   * Returns null when ray is nearly parallel to the plane (camera too low/flat).
   */
  _cursorToPlane(ndc, mode = 'horizontal') {
    const cam = this.scene.camera;
    const cursor3d = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(cam);
    const rayDir   = new THREE.Vector3().subVectors(cursor3d, cam.position).normalize();

    if (mode === 'vertical') {
      if (Math.abs(rayDir.z) < 0.05) return null;
      const t = -cam.position.z / rayDir.z;
      if (t < 0.1 || t > 80) return null;
      return new THREE.Vector3(
        cam.position.x + rayDir.x * t,
        cam.position.y + rayDir.y * t,
        0,
      );
    } else {
      if (Math.abs(rayDir.y) < 0.05) return null;
      const t = -cam.position.y / rayDir.y;
      if (t < 0.1 || t > 80) return null;
      return new THREE.Vector3(
        cam.position.x + rayDir.x * t,
        0,
        cam.position.z + rayDir.z * t,
      );
    }
  }

  /** Map rodIdx → inner-chain node index for FABRIK target. */
  _ikDragNode(rodIdx, rootIdx) {
    if (rodIdx > rootIdx) return Math.min(rodIdx, 4);     // pull far-side joint of the rod
    return Math.max(rodIdx - 1, 0);                        // pull near-side joint of the rod
  }

  // ── Interaction callbacks ──────────────────────────────────────────────────

  _setupInteractionCallbacks() {
    this.interaction.callbacks.onHoverChange = (rodId, active) => {
      this.robotFK.setHoverHighlight(rodId, active);
    };

    this.interaction.callbacks.onRootClick = (rodId) => {
      this.act.setRootRod(rodId);
    };

    this.interaction.callbacks.onDragStart = (rodId, startNdc) => {
      this.scene.setOrbitEnabled(false);

      const state   = this.getStore();
      const mode    = state.mode || 'horizontal';
      const rootIdx = ROD_IDS.indexOf(state.activeRootId);
      const rodIdx  = ROD_IDS.indexOf(rodId);
      const dragNode = this._ikDragNode(rodIdx, rootIdx);

      // Get drag joint world position
      const joints = this.robotFK.getNodePositions();
      const dragJointPos = joints[dragNode];

      if (startNdc) {
        // Project cursor to arm plane at drag start
        const cursorWorld = this._cursorToPlane(startNdc, mode);
        if (cursorWorld && dragJointPos) {
          // "Sticky" offset: keep the clicked point on the arm under the cursor
          this._dragOffset.set(
            dragJointPos.x - cursorWorld.x,
            dragJointPos.y - cursorWorld.y,
            dragJointPos.z - cursorWorld.z,
          );
          this._ikTarget.copy(dragJointPos);
        } else {
          this._dragOffset.set(0, 0, 0);
          this._ikTarget.copy(dragJointPos ?? this.robotFK.getEndEffectorWorld());
        }
      } else {
        this._dragOffset.set(0, 0, 0);
        const ee = this.robotFK.getEndEffectorWorld();
        this._ikTarget.set(ee.x, ee.y, ee.z);
      }
    };

    this.interaction.callbacks.onDrag = (rodId, _dx, _dy, ndc) => {
      const state   = this.getStore();
      const mode    = state.mode || 'horizontal';
      const rootIdx = ROD_IDS.indexOf(state.activeRootId);
      const rodIdx  = ROD_IDS.indexOf(rodId);
      if (rodIdx === rootIdx) return;

      // Project cursor to arm working plane and apply sticky offset
      if (ndc) {
        const cursorWorld = this._cursorToPlane(ndc, mode);
        if (cursorWorld) {
          this._ikTarget.set(
            cursorWorld.x + this._dragOffset.x,
            cursorWorld.y + this._dragOffset.y,
            cursorWorld.z + this._dragOffset.z,
          );
        }
        // else: ray nearly parallel to plane — keep current target
      }

      // 5-node inner chain: [J1, J2, J3, J4, J5] world positions
      const inner5   = this.robotFK.getNodePositions().map(v => ({ x: v.x, y: v.y, z: v.z }));
      const segLens5 = [ROD_LENGTH, ROD_LENGTH, ROD_LENGTH, ROD_LENGTH];

      // R1=0→ikRoot=-1, R2=1→0, …, R6=5→4
      const ikRoot     = rootIdx - 1;
      const ikDragNode = this._ikDragNode(rodIdx, rootIdx);

      const { nodes: newInner } = solveIK(
        inner5, segLens5, ikRoot, ikDragNode,
        { x: this._ikTarget.x, y: this._ikTarget.y, z: this._ikTarget.z },
        mode, JOINT_LIMIT,
        [state.jointAngles[0], state.jointAngles[4]],
      );

      // Back-compute bend joint angles from FABRIK result geometry.
      // horizontal — rotation.y=θ:  signedAngle(d1,d2) in XZ = −θ  →  θ = −atan2(cross,dot)
      // vertical   — rotation.z=θ:  signedAngle(d1,d2) in XY =  θ  →  θ =  atan2(cross,dot)
      const isVert = mode === 'vertical';
      const newAngles = [...state.jointAngles];
      for (let j = 0; j < 3; j++) {
        const ni  = j + 1;
        const d1x = newInner[ni].x - newInner[ni - 1].x;
        const d1h = isVert
          ? (newInner[ni].y - newInner[ni - 1].y)
          : (newInner[ni].z - newInner[ni - 1].z);
        const d2x = newInner[ni + 1].x - newInner[ni].x;
        const d2h = isVert
          ? (newInner[ni + 1].y - newInner[ni].y)
          : (newInner[ni + 1].z - newInner[ni].z);
        const l1  = Math.sqrt(d1x * d1x + d1h * d1h);
        const l2  = Math.sqrt(d2x * d2x + d2h * d2h);
        if (l1 > 1e-10 && l2 > 1e-10) {
          const cross = (d1x / l1) * (d2h / l2) - (d1h / l1) * (d2x / l2);
          const dot   = (d1x / l1) * (d2x / l2) + (d1h / l1) * (d2h / l2);
          const raw   = Math.atan2(cross, dot);
          newAngles[j + 1] = Math.max(-JOINT_LIMIT, Math.min(JOINT_LIMIT,
            isVert ? raw : -raw,
          ));
        }
      }

      for (let i = 0; i < 5; i++) this.act.setJointAngle(i, newAngles[i]);
    };

    this.interaction.callbacks.onDragEnd = () => {
      this.scene.setOrbitEnabled(true);
    };
  }

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
    const s = this.getStore();
    const mode = s.mode || 'horizontal';

    // ── Home ─────────────────────────────────────────────────────────────────
    if (s.pendingHome) {
      this.act.clearPendingHome();
      for (let i = 0; i < 5; i++) this.act.setJointAngle(i, 0);
      this.act.setRootRod('R1');
      this._lastRootId = 'R1';
      // null rootPos/rootQuat → snaps robotGroup back to world origin
      this.robotFK.rebuild('R1', [0, 0, 0, 0, 0], null, null);
      this.scene.render();
      return;
    }

    // ── Root change — convert angles to new frame so arm looks identical ──────
    let activeAngles = s.jointAngles;
    if (s.activeRootId !== this._lastRootId) {
      const { newAngles, rootPos, rootQuat } =
        this.robotFK.computeAnglesForRoot(s.activeRootId, mode);

      // Write converted angles back to store (one call per joint)
      for (let i = 0; i < 5; i++) this.act.setJointAngle(i, newAngles[i]);

      this._lastRootId = s.activeRootId;
      this.robotFK.rebuild(s.activeRootId, newAngles, rootPos, rootQuat);
      activeAngles = newAngles; // use converted angles for the rest of this frame
    }

    // ── FK update ─────────────────────────────────────────────────────────────
    this.robotFK.updateAngles(activeAngles, mode);

    // ── Telemetry ─────────────────────────────────────────────────────────────
    // Compute limitHit directly from angle vs limit (store flag lags one frame)
    const limitHits = activeAngles.map((a, i) => Math.abs(a) >= JOINT_DEFS[i].limit - 0.01);
    const telemetry = this._telemetry.update(activeAngles, limitHits, now);
    this.act.setJointTelemetry(telemetry);

    // ── Joint limit highlight (3-D spheres) ───────────────────────────────────
    for (let i = 0; i < JOINT_DEFS.length; i++) {
      this.robotFK.setLimitHighlight(JOINT_DEFS[i].id, limitHits[i]);
    }

    // ── End effector ──────────────────────────────────────────────────────────
    const eePos   = this.robotFK.getEndEffectorWorld();
    const rootPos = this.robotFK.robotGroup.position;
    const dx = eePos.x - rootPos.x;
    const dy = eePos.y - rootPos.y;
    const dz = eePos.z - rootPos.z;
    const dist     = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const reachPct = Math.min(dist / MAX_REACH, 1.0) * 100;
    this.act.updateEndEffector(eePos, reachPct);

    // ── Render ────────────────────────────────────────────────────────────────
    this.scene.render();
  }

}
