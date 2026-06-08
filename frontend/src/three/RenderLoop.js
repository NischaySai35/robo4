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

    this._telemetry  = new TelemetryTracker(5);
    this._raf        = null;
    this._lastRootId = 'R1'; // matches initial store state; avoids spurious rebuild on frame 1
    this._ikTarget   = new THREE.Vector3();

    this._setupInteractionCallbacks();
  }

  _setupInteractionCallbacks() {
    this.interaction.callbacks.onHoverChange = (rodId, active) => {
      this.robotFK.setHoverHighlight(rodId, active);
    };

    this.interaction.callbacks.onRootClick = (rodId) => {
      this.act.setRootRod(rodId);
    };

    this.interaction.callbacks.onDragStart = () => {
      this.scene.setOrbitEnabled(false);
      // Seed IK target at current end-effector world position
      const ee = this.robotFK.getEndEffectorWorld();
      this._ikTarget.set(ee.x, ee.y, ee.z);
    };

    this.interaction.callbacks.onDrag = (rodId, dx, dy, _ndc) => {
      const state   = this.getStore();
      const rootIdx = ROD_IDS.indexOf(state.activeRootId);
      const rodIdx  = ROD_IDS.indexOf(rodId);
      if (rodIdx === rootIdx) return;

      // Move IK target by screen delta projected through camera right/up axes
      const cam      = this.scene.camera;
      const camRight = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const camUp    = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const dist     = cam.position.distanceTo(this._ikTarget);
      const scale    = 2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));

      this._ikTarget.addScaledVector(camRight, dx * scale * cam.aspect);
      this._ikTarget.addScaledVector(camUp,    dy * scale);
      this._ikTarget.y = 0; // keep on horizontal plane

      // 5-node inner chain: [J1, J2, J3, J4, J5] world positions
      const inner5   = this.robotFK.getNodePositions().map(v => ({ x: v.x, y: v.y, z: v.z }));
      const segLens5 = [ROD_LENGTH, ROD_LENGTH, ROD_LENGTH, ROD_LENGTH];

      // R1=0→ikRoot=-1, R2=1→0, …, R6=5→4
      const ikRoot     = rootIdx - 1;
      const ikDragNode = rodIdx > rootIdx ? 4 : 0;

      const { nodes: newInner } = solveIK(
        inner5, segLens5, ikRoot, ikDragNode,
        { x: this._ikTarget.x, y: this._ikTarget.y, z: this._ikTarget.z },
        'horizontal', JOINT_LIMIT,
        [state.jointAngles[0], state.jointAngles[4]],
      );

      // Back-compute bend joint angles (JOINT_DEFS 1,2,3 = J2,J3,J4).
      // FK: rotation.y=θ maps +X→(cosθ,0,-sinθ), so signedAngle_XZ = -θ → θ = -signedAngle_XZ
      const newAngles = [...state.jointAngles];
      for (let j = 0; j < 3; j++) {
        const ni  = j + 1;
        const d1x = newInner[ni].x - newInner[ni - 1].x;
        const d1z = newInner[ni].z - newInner[ni - 1].z;
        const d2x = newInner[ni + 1].x - newInner[ni].x;
        const d2z = newInner[ni + 1].z - newInner[ni].z;
        const l1  = Math.sqrt(d1x * d1x + d1z * d1z);
        const l2  = Math.sqrt(d2x * d2x + d2z * d2z);
        if (l1 > 1e-10 && l2 > 1e-10) {
          const cross = (d1x / l1) * (d2z / l2) - (d1z / l1) * (d2x / l2);
          const dot   = (d1x / l1) * (d2x / l2) + (d1z / l1) * (d2z / l2);
          newAngles[j + 1] = Math.max(-JOINT_LIMIT, Math.min(JOINT_LIMIT, -Math.atan2(cross, dot)));
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
        this.robotFK.computeAnglesForRoot(s.activeRootId);

      // Write converted angles back to store (one call per joint)
      for (let i = 0; i < 5; i++) this.act.setJointAngle(i, newAngles[i]);

      this._lastRootId = s.activeRootId;
      this.robotFK.rebuild(s.activeRootId, newAngles, rootPos, rootQuat);
      activeAngles = newAngles; // use converted angles for the rest of this frame
    }

    // ── FK update ─────────────────────────────────────────────────────────────
    this.robotFK.updateAngles(activeAngles);

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
