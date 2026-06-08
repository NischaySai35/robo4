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

import { TelemetryTracker } from '../math/telemetry.js';
import { ROD_IDS, JOINT_DEFS, ROD_LENGTH, ENDCAP_SIZE } from '../store/armStore.js';

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
    };

    this.interaction.callbacks.onDrag = (rodId, dx, dy) => {
      const state = this.getStore();
      const rootIdx = ROD_IDS.indexOf(state.activeRootId);
      const rodIdx  = ROD_IDS.indexOf(rodId);
      if (rodIdx === rootIdx) return; // can't drag the root rod

      // Joint to control: the one between this rod and the root
      const jointIdx = rodIdx > rootIdx ? rodIdx - 1 : rodIdx;

      const def = JOINT_DEFS[jointIdx];
      // sensitivity: full screen width/height → ±π
      const delta = def.type === 'twist'
        ? dy * Math.PI * 2   // up/down controls twist
        : dx * Math.PI * 2;  // left/right controls bend

      const current = state.jointAngles[jointIdx];
      this.act.setJointAngle(jointIdx, current + delta);
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
    const limitHits = s.joints.map(j => j.limitHit ?? false);
    const telemetry = this._telemetry.update(activeAngles, limitHits, now);
    this.act.setJointTelemetry(telemetry);

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
