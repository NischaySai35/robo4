/**
 * RobotFK — scene-graph forward kinematics for the robotic arm.
 *
 * Chain: R1—J1(twist)—R2—J2(bend)—R3—J3(bend)—R4—J4(bend)—R5—J5(twist)—R6
 *
 * All rods share the same length (ROD_LENGTH). Geometries have their pivot at
 * the LEFT end (x=0), extending along +X to x=ROD_LENGTH.
 *
 * FK traversal:
 *   Forward  (bodyA === currentRodId): joint at (ROD_LENGTH,0,0), child rod at (0,0,0)
 *   Backward (bodyB === currentRodId): joint at (0,0,0), child rod at (-ROD_LENGTH,0,0)
 *
 * Rotation axes:
 *   Twist joints (J1,J5): rotation.x — spins around the rod's length axis (+X)
 *   Bend  joints (J2–J4): rotation.y — bends in the XZ plane
 */

import * as THREE from 'three';
import {
  ROD_LENGTH, ROD_LENGTHS, ROD_RADIUS, JOINT_RADIUS, ENDCAP_SIZE,
  ROD_IDS, JOINT_DEFS,
} from '../store/armStore.js';

// ── Shared geometries ─────────────────────────────────────────────────────────

// Rod cylinder lying along +X, pivot at left end (x=0).
// Each rod gets its own geometry so lengths can differ.
function _makeRodGeo(length) {
  const g = new THREE.CylinderGeometry(ROD_RADIUS, ROD_RADIUS, length, 16, 1);
  g.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
  g.applyMatrix4(new THREE.Matrix4().makeTranslation(length / 2, 0, 0));
  return g;
}

// End-rod cube, pivot at left face (x=0)
const _endcapGeo = (() => {
  const g = new THREE.BoxGeometry(ENDCAP_SIZE, ENDCAP_SIZE, ENDCAP_SIZE);
  g.applyMatrix4(new THREE.Matrix4().makeTranslation(ENDCAP_SIZE / 2, 0, 0));
  return g;
})();

const _sphereGeo   = new THREE.SphereGeometry(JOINT_RADIUS, 20, 20);
const _torusGeo    = new THREE.TorusGeometry(JOINT_RADIUS * 1.55, JOINT_RADIUS * 0.22, 10, 28);
const _twistSphere = new THREE.SphereGeometry(JOINT_RADIUS * 1.3, 20, 20);

// ── Material factories ────────────────────────────────────────────────────────

const MAT = {
  rod: () => new THREE.MeshStandardMaterial({ color: 0x7a8faa, roughness: 0.38, metalness: 0.55 }),
  rodRoot: () => new THREE.MeshStandardMaterial({
    color: 0xffaa22, roughness: 0.18, metalness: 0.75,
    emissive: 0xff8800, emissiveIntensity: 0.4,
  }),
  rodHover: () => new THREE.MeshStandardMaterial({
    color: 0x9eb8d0, roughness: 0.2, metalness: 0.88,
    emissive: 0x1a4488, emissiveIntensity: 0.22,
  }),
  endRod: () => new THREE.MeshStandardMaterial({
    color: 0xc9a020, roughness: 0.22, metalness: 0.78,
    emissive: 0x8a5a00, emissiveIntensity: 0.08,
  }),
  endRodRoot: () => new THREE.MeshStandardMaterial({
    color: 0xffcc44, roughness: 0.14, metalness: 0.82,
    emissive: 0xff9900, emissiveIntensity: 0.55,
  }),
  twistJoint: () => new THREE.MeshStandardMaterial({
    color: 0xdd6600, roughness: 0.25, metalness: 0.7,
    emissive: 0xcc4400, emissiveIntensity: 0.3,
  }),
  twistJointLimit: () => new THREE.MeshStandardMaterial({
    color: 0xff2200, roughness: 0.25, metalness: 0.6,
    emissive: 0xff2200, emissiveIntensity: 0.9,
  }),
  bendJoint: () => new THREE.MeshStandardMaterial({
    color: 0x2a3a52, roughness: 0.32, metalness: 0.78,
    emissive: 0x0055cc, emissiveIntensity: 0.18,
  }),
  bendJointLimit: () => new THREE.MeshStandardMaterial({
    color: 0xff2200, roughness: 0.2, metalness: 0.6,
    emissive: 0xff2200, emissiveIntensity: 0.9,
  }),
  jointRing: () => new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.3, metalness: 0.85 }),
};

export class RobotFK {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    // robotGroup is the single root added to the scene
    this.robotGroup = new THREE.Group();
    scene.add(this.robotGroup);

    // Per-rod material sets and mesh refs, keyed by rod ID
    this._rodMeshes = {}; // rodId → THREE.Mesh
    this._rodMats   = {}; // rodId → { normal, root, hover }

    // Joint Object3D nodes (for angle updates), keyed by joint ID
    this._jointNodes = {}; // jointId → THREE.Object3D (the pivot container)

    // Joint sphere meshes for limit-hit highlight, keyed by joint ID
    this._jointSphereMeshes = {}; // jointId → { mesh, normalMat, limitMat }

    // Tip markers for end-effector tracking
    this._tipR1 = null;
    this._tipR6 = null;

    // Last known root used for rebuild
    this._activeRootId = 'R1';

    this._build('R1', [0, 0, 0, 0, 0]);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Compute new joint angles + root transform that preserve the arm's VISUAL
   * world configuration when switching to newRootId as the fixed root.
   *
   * Works by converting every rod's world-space orientation into new local
   * angles via single-axis quaternion decomposition.
   *
   * @returns {{ newAngles: number[], rootPos: THREE.Vector3, rootQuat: THREE.Quaternion }}
   */
  computeAnglesForRoot(newRootId, mode = 'horizontal') {
    // Snapshot every rod's world quaternion and the new root's world position
    const worldQuats = {};
    for (const id of ROD_IDS) {
      const m = this._rodMeshes[id];
      worldQuats[id] = m
        ? m.getWorldQuaternion(new THREE.Quaternion())
        : new THREE.Quaternion();
    }
    const rootMesh = this._rodMeshes[newRootId];
    const rootPos  = rootMesh
      ? rootMesh.getWorldPosition(new THREE.Vector3())
      : new THREE.Vector3();
    const rootQuat = worldQuats[newRootId].clone();

    const newAngles = [0, 0, 0, 0, 0];
    const visited   = new Set();

    const traverseCalc = (rodId, parentWorldQuat) => {
      visited.add(rodId);
      for (let i = 0; i < JOINT_DEFS.length; i++) {
        const def     = JOINT_DEFS[i];
        const isFwd   = def.bodyA === rodId;
        const isBwd   = def.bodyB === rodId;
        if (!isFwd && !isBwd) continue;
        const childId = isFwd ? def.bodyB : def.bodyA;
        if (visited.has(childId)) continue;

        const childOldQuat = worldQuats[childId];

        // Both forward and backward: parentQuat × J_local = childOldQuat
        // (backward rods are placed at -len with NO Y-flip, so same formula applies)
        const J_relative = parentWorldQuat.clone().invert().multiply(childOldQuat);

        let theta;
        if (def.type === 'bend') {
          const lx = new THREE.Vector3(1, 0, 0).applyQuaternion(J_relative);
          if (mode === 'vertical') {
            // rotation.z=θ maps (1,0,0) → (cosθ, sinθ, 0)
            theta = Math.atan2(lx.y, lx.x);
          } else {
            // rotation.y=θ maps (1,0,0) → (cosθ, 0, -sinθ)
            theta = Math.atan2(-lx.z, lx.x);
          }
        } else {
          // rotation.x=θ maps (0,1,0) → (0, cosθ, sinθ)
          const ly = new THREE.Vector3(0, 1, 0).applyQuaternion(J_relative);
          theta = Math.atan2(ly.z, ly.y);
        }
        theta = Math.max(-def.limit, Math.min(def.limit, theta));
        newAngles[i] = theta;

        // Propagate accumulated parent quat for next step
        const axis = def.type === 'bend'
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(1, 0, 0);
        const jLocalQuat = new THREE.Quaternion().setFromAxisAngle(axis, theta);
        const childParentQuat = parentWorldQuat.clone().multiply(jLocalQuat);
        traverseCalc(childId, childParentQuat);
      }
    };

    traverseCalc(newRootId, rootQuat);
    return { newAngles, rootPos, rootQuat };
  }

  /**
   * Rebuild the scene-graph from the given root rod.
   * rootPos / rootQuat: world transform to give the robotGroup after rebuild
   * (omit / null for home-reset which snaps back to world origin).
   */
  rebuild(activeRootId, jointAngles, rootPos = null, rootQuat = null) {
    this._activeRootId = activeRootId;
    while (this.robotGroup.children.length > 0) {
      this.robotGroup.remove(this.robotGroup.children[0]);
    }
    this._rodMeshes  = {};
    this._rodMats    = {};
    this._jointNodes = {};
    this._jointSphereMeshes = {};
    this._tipR1 = null;
    this._tipR6 = null;

    this._build(activeRootId, jointAngles);

    this.robotGroup.position.copy(rootPos   ?? new THREE.Vector3());
    this.robotGroup.quaternion.copy(rootQuat ?? new THREE.Quaternion());
  }

  /**
   * Update joint rotations without rebuilding the hierarchy.
   * horizontal mode: bend joints rotate around Y (XZ plane)
   * vertical mode:   bend joints rotate around Z (XY plane)
   * @param {number[]} jointAngles
   * @param {'horizontal'|'vertical'} mode
   */
  updateAngles(jointAngles, mode = 'horizontal') {
    for (let i = 0; i < JOINT_DEFS.length; i++) {
      const def = JOINT_DEFS[i];
      const node = this._jointNodes[def.id];
      if (!node) continue;
      if (def.type === 'twist') {
        node.rotation.x = jointAngles[i];
      } else if (mode === 'vertical') {
        node.rotation.z = jointAngles[i];
        node.rotation.y = 0;
      } else {
        node.rotation.y = jointAngles[i];
        node.rotation.z = 0;
      }
    }
  }

  /**
   * Swap between normal/hover/root material on a rod mesh.
   */
  setHoverHighlight(rodId, active) {
    const mats = this._rodMats[rodId];
    if (!mats) return;
    // Root rod keeps its root material
    if (rodId === this._activeRootId) return;
    const mesh = this._rodMeshes[rodId];
    if (!mesh) return;
    mesh.material = active ? mats.hover : mats.normal;
  }

  /**
   * Turn a joint sphere red (limit hit) or back to its normal colour.
   * @param {string}  jointId  — 'J1' … 'J5'
   * @param {boolean} active
   */
  setLimitHighlight(jointId, active) {
    const entry = this._jointSphereMeshes[jointId];
    if (!entry) return;
    entry.mesh.material = active ? entry.limitMat : entry.normalMat;
  }

  /**
   * Flat array of rod meshes — used for raycasting.
   */
  get interactables() {
    return Object.values(this._rodMeshes);
  }

  /**
   * World-space position of the tip farthest from the active root.
   * Uses invisible tip markers on R1/R6.
   */
  getEndEffectorWorld() {
    // The end-effector is whichever of R1/R6 is NOT the active root
    const rootIdx = ROD_IDS.indexOf(this._activeRootId);
    const useR6   = rootIdx <= 2; // root is closer to R1 side → tip is R6

    const marker = useR6 ? this._tipR6 : this._tipR1;
    if (!marker) return { x: 0, y: 0, z: 0 };

    const wp = new THREE.Vector3();
    marker.getWorldPosition(wp);
    return { x: wp.x, y: wp.y, z: wp.z };
  }

  /**
   * World-space positions of the 5 joint pivots in the inner chain:
   * [J1, J2, J3, J4, J5] — used as FABRIK nodes for IK.
   * Excludes the endcap rod tips (P0/P6).
   * @returns {THREE.Vector3[5]}
   */
  getNodePositions() {
    this.robotGroup.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    return ['J1', 'J2', 'J3', 'J4', 'J5'].map(id => {
      const node = this._jointNodes[id];
      return node ? node.getWorldPosition(wp.clone()) : new THREE.Vector3();
    });
  }

  // ── Scene-graph builder ──────────────────────────────────────────────────────

  _build(rootId, jointAngles) {
    // Place the root rod's mesh at world origin, no parent rotation.
    // Then recursively attach joints and child rods outward from it.
    const rootMesh = this._makeRodMesh(rootId, true);
    // Root pivot is at x=0 of the root rod, which we put at the world origin
    rootMesh.position.set(0, 0, 0);
    this.robotGroup.add(rootMesh);

    // Add tip marker to R1 and R6 regardless of root
    if (rootId === 'R1') {
      this._tipR1 = this._makeTip();
      this._tipR1.position.set(this._rodLen('R1'), 0, 0);
      rootMesh.add(this._tipR1);
    } else if (rootId === 'R6') {
      this._tipR6 = this._makeTip();
      this._tipR6.position.set(0, 0, 0);
      rootMesh.add(this._tipR6);
    }

    // Traverse outward from the root
    this._traverseFrom(rootId, rootMesh, jointAngles, new Set([rootId]));
  }

  /**
   * Recursively attach joints and their child rods, fanning out from currentRodId.
   *
   * @param {string}         currentRodId
   * @param {THREE.Object3D} currentRodObj  — the parent Object3D for this rod
   * @param {number[]}       jointAngles
   * @param {Set<string>}    visited
   */
  _traverseFrom(currentRodId, currentRodObj, jointAngles, visited) {
    for (let i = 0; i < JOINT_DEFS.length; i++) {
      const def = JOINT_DEFS[i];
      const isForward  = def.bodyA === currentRodId;
      const isBackward = def.bodyB === currentRodId;
      if (!isForward && !isBackward) continue;

      const childRodId = isForward ? def.bodyB : def.bodyA;
      if (visited.has(childRodId)) continue;
      visited.add(childRodId);

      // Joint pivot Object3D — carries the rotation
      const jointPivot = new THREE.Object3D();
      jointPivot.name = def.id + '_pivot';

      // Joint visual (sphere ± rings) parented to the pivot
      this._addJointVisual(jointPivot, def);

      if (isForward) {
        jointPivot.position.set(this._rodLen(currentRodId), 0, 0);
      } else {
        jointPivot.position.set(0, 0, 0);
      }

      const angle = jointAngles[i] ?? 0;
      if (def.type === 'twist') {
        jointPivot.rotation.x = angle;
      } else {
        jointPivot.rotation.y = angle;
      }

      this._jointNodes[def.id] = jointPivot;
      currentRodObj.add(jointPivot);

      const childMesh = this._makeRodMesh(childRodId, false);

      if (isForward) {
        childMesh.position.set(0, 0, 0);
      } else {
        // Backward: child rod sits at -childLen so its RIGHT face (x=childLen local) lands on the joint.
        // No Y-flip needed — the rod's +X direction is maintained, angle conversion stays in ±limit range.
        childMesh.position.set(-this._rodLen(childRodId), 0, 0);
      }

      jointPivot.add(childMesh);

      // Tip markers for R1/R6 when they are NOT the root
      if (childRodId === 'R1') {
        const tip = this._makeTip();
        // Backward placement: R1 at (-ENDCAP_SIZE, 0, 0). Left face (x=0 local) = far tip.
        tip.position.set(0, 0, 0);
        childMesh.add(tip);
        this._tipR1 = tip;
      } else if (childRodId === 'R6') {
        const tip = this._makeTip();
        if (isForward) {
          tip.position.set(this._rodLen('R6'), 0, 0);
        } else {
          tip.position.set(0, 0, 0);
        }
        childMesh.add(tip);
        this._tipR6 = tip;
      }

      // Recurse
      this._traverseFrom(childRodId, childMesh, jointAngles, visited);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Chain length contributed by a rod. Endcaps are cubes; main rods use per-rod lengths. */
  _rodLen(rodId) {
    if (rodId === 'R1' || rodId === 'R6') return ENDCAP_SIZE;
    return ROD_LENGTHS[rodId] ?? ROD_LENGTH;
  }

  _makeRodMesh(rodId, isRoot) {
    const isEndRod = rodId === 'R1' || rodId === 'R6';
    const geo = isEndRod ? _endcapGeo : _makeRodGeo(this._rodLen(rodId));

    let normalMat, rootMat, hoverMat;
    if (isEndRod) {
      normalMat = MAT.endRod();
      rootMat   = MAT.endRodRoot();
      hoverMat  = MAT.rodHover();
    } else {
      normalMat = MAT.rod();
      rootMat   = MAT.rodRoot();
      hoverMat  = MAT.rodHover();
    }

    const mesh = new THREE.Mesh(geo, isRoot ? rootMat : normalMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'rod', id: rodId };
    mesh.name = rodId;

    this._rodMeshes[rodId] = mesh;
    this._rodMats[rodId]   = { normal: normalMat, root: rootMat, hover: hoverMat };
    return mesh;
  }

  _addJointVisual(pivot, def) {
    if (def.type === 'twist') {
      const normalMat = MAT.twistJoint();
      const limitMat  = MAT.twistJointLimit();
      const sphere = new THREE.Mesh(_twistSphere, normalMat);
      sphere.castShadow = true;
      pivot.add(sphere);
      this._jointSphereMeshes[def.id] = { mesh: sphere, normalMat, limitMat };
    } else {
      const normalMat = MAT.bendJoint();
      const limitMat  = MAT.bendJointLimit();
      const sphere = new THREE.Mesh(_sphereGeo, normalMat);
      sphere.castShadow = true;
      pivot.add(sphere);
      this._jointSphereMeshes[def.id] = { mesh: sphere, normalMat, limitMat };

      const r1 = new THREE.Mesh(_torusGeo, MAT.jointRing());
      r1.castShadow = true;
      pivot.add(r1);

      const r2 = new THREE.Mesh(_torusGeo, MAT.jointRing());
      r2.rotation.x = Math.PI / 2;
      r2.castShadow = true;
      pivot.add(r2);
    }
  }

  _makeTip() {
    // Invisible Object3D used only for world-position queries
    const obj = new THREE.Object3D();
    obj.name = 'tip_marker';
    return obj;
  }
}
