/**
 * ArmRenderer — positions and orients all arm objects
 * from the current FABRIK node array.
 *
 * Nodes: [N0, N1, N2, N3, N4]
 * Rods:  Rod[i] spans Node[i] → Node[i+1]
 * Joints: Joint[j] sits at Node[j+1]
 * EndCaps: EndCap[0] at Node[0], EndCap[1] at Node[4]
 */

import * as THREE from 'three';
import { ROD_LENGTH } from '@/state/armStore.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);

export class ArmRenderer {
  constructor(armGeometry) {
    this.geo = armGeometry;
    this._prevRootIdx = null;
  }

  /**
   * Update all mesh positions/orientations from node positions.
   *
   * @param {Array<{x,y,z}>} nodes     5 world-space positions
   * @param {number}         rootRod   which rod index is root
   * @param {number}         mode      'horizontal' | 'vertical'
   * @param {boolean[]}      limitHits which FABRIK nodes hit limits
   * @param {number}         dt        delta time in seconds
   */
  update(nodes, rootRod, mode, limitHits, dt) {
    this._updateRods(nodes, rootRod);
    this._updateJoints(nodes, mode, limitHits);
    this._updateEndCaps(nodes, rootRod);
    this.geo.tickFlash(dt);
  }

  _updateRods(nodes, rootRod) {
    if (this._prevRootIdx !== rootRod) {
      this.geo.setRootRod(rootRod, this._prevRootIdx !== null ? this._prevRootIdx : undefined);
      this._prevRootIdx = rootRod;
    }

    for (let i = 0; i < 4; i++) {
      const a = nodes[i], b = nodes[i + 1];
      _v1.set(a.x, a.y, a.z);
      _v2.set(b.x, b.y, b.z);
      _mid.addVectors(_v1, _v2).multiplyScalar(0.5);

      const rod = this.geo.rods[i];
      rod.position.copy(_mid);

      // Orient cylinder from a to b
      const dir = _v2.clone().sub(_v1).normalize();
      const length = _v1.distanceTo(_v2);

      // The rod geometry was baked to lie along X; align X-axis to dir
      if (dir.lengthSq() > 0.0001) {
        _quat.setFromUnitVectors(_xAxis, dir);
        rod.quaternion.copy(_quat);
      }

      // Scale to actual segment length (always ~ROD_LENGTH, but exact)
      rod.scale.set(length / ROD_LENGTH, 1, 1);
    }
  }

  _updateJoints(nodes, mode, limitHits) {
    for (let i = 0; i < 3; i++) {
      const jNode = nodes[i + 1]; // joint i sits at node i+1
      const joint = this.geo.joints[i];
      joint.position.set(jNode.x, jNode.y, jNode.z);

      // Rotate torus rings to align with the rotation axis of this mode
      // Horizontal → rotation axis is Y; Vertical → rotation axis is Z
      // The axis helper (vertical line) already shows Y by default.
      if (mode === 'vertical') {
        // Tilt so the axis indicator aligns with Z
        joint.rotation.set(Math.PI / 2, 0, 0);
      } else {
        joint.rotation.set(0, 0, 0);
      }

      // Flash if limit hit at this joint (limitHits[i+1] corresponds to joint i)
      if (limitHits && limitHits[i + 1]) {
        this.geo.triggerLimitFlash(i);
      }
    }
  }

  _updateEndCaps(nodes, rootRod) {
    const e0 = nodes[0], e1 = nodes[4];
    const ec = this.geo.endcaps;

    ec[0].position.set(e0.x, e0.y, e0.z);
    ec[1].position.set(e1.x, e1.y, e1.z);

    // When an endcap is the fixed root it must not rotate — it is a rigid mount.
    // Only orient non-root endcaps to face along their connected rod.
    if (rootRod !== -1) {
      _v1.set(nodes[1].x - e0.x, nodes[1].y - e0.y, nodes[1].z - e0.z).normalize();
      if (_v1.lengthSq() > 0.0001) ec[0].quaternion.setFromUnitVectors(_xAxis, _v1);
    }
    if (rootRod !== 4) {
      _v1.set(e1.x - nodes[3].x, e1.y - nodes[3].y, e1.z - nodes[3].z).normalize();
      if (_v1.lengthSq() > 0.0001) ec[1].quaternion.setFromUnitVectors(_xAxis, _v1);
    }
  }

  /** Compute root centre for trail origin. Handles endcap sentinels -1 and 4. */
  getRootCenter(nodes, rootRod) {
    if (rootRod < 0)  return { ...nodes[0] };             // left endcap root
    if (rootRod >= 4) return { ...nodes[4] };             // right endcap root
    const a = nodes[rootRod], b = nodes[rootRod + 1];
    return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5, z: (a.z + b.z) * 0.5 };
  }
}

