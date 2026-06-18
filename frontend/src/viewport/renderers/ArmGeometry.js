/**
 * ArmGeometry — builds and owns all Three.js objects for the robotic arm.
 *
 * Structure: EndCap ─── Rod ─── Joint ─── Rod ─── Joint ─── Rod ─── Joint ─── Rod ─── EndCap
 * Indices:   endcap[0]  rod[0]  joint[0]  rod[1]  joint[1]  rod[2]  joint[2]  rod[3]  endcap[1]
 *
 * Each object has a userData.type and userData.index for raycasting.
 */

import * as THREE from 'three';
import { ROD_LENGTH, ROD_RADIUS, JOINT_RADIUS, ENDCAP_SIZE } from '@/state/armStore.js';

// ── Material palette ──────────────────────────────────────────────────────────

const MAT = {
  rod: () => new THREE.MeshStandardMaterial({
    color: 0x7a8faa,
    roughness: 0.38,
    metalness: 0.55,
  }),
  rodRoot: () => new THREE.MeshStandardMaterial({
    color: 0xffaa22,
    roughness: 0.18,
    metalness: 0.75,
    emissive: 0xff8800,
    emissiveIntensity: 0.4,
  }),
  rodHover: () => new THREE.MeshStandardMaterial({
    color: 0x9eb8d0,
    roughness: 0.2,
    metalness: 0.88,
    emissive: 0x1a4488,
    emissiveIntensity: 0.22,
  }),
  rodHighlight: () => new THREE.MeshStandardMaterial({
    color: 0x00e8ff,
    roughness: 0.15,
    metalness: 0.7,
    emissive: 0x00ccee,
    emissiveIntensity: 0.45,
  }),
  jointSphere: () => new THREE.MeshStandardMaterial({
    color: 0x2a3a52,
    roughness: 0.32,
    metalness: 0.78,
    emissive: 0x0055cc,
    emissiveIntensity: 0.18,
  }),
  jointRing: () => new THREE.MeshStandardMaterial({
    color: 0x445566,
    roughness: 0.3,
    metalness: 0.85,
  }),
  endcap: () => new THREE.MeshStandardMaterial({
    color: 0xc9a020,
    roughness: 0.22,
    metalness: 0.78,
    emissive: 0x8a5a00,
    emissiveIntensity: 0.08,
  }),
  endcapRoot: () => new THREE.MeshStandardMaterial({
    color: 0xffcc44,
    roughness: 0.14,
    metalness: 0.82,
    emissive: 0xff9900,
    emissiveIntensity: 0.55,
  }),
  axisLine: (color) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 }),
  trail: () => new THREE.LineDashedMaterial({
    color: 0x00e8ff,
    dashSize: 0.12,
    gapSize: 0.06,
    transparent: true,
    opacity: 0.55,
  }),
};

// Shared geometries (reused across instances)
const GEO = {
  rod: new THREE.CylinderGeometry(ROD_RADIUS, ROD_RADIUS, ROD_LENGTH, 16, 1),
  jointSphere: new THREE.SphereGeometry(JOINT_RADIUS, 20, 20),
  jointTorus: new THREE.TorusGeometry(JOINT_RADIUS * 1.55, JOINT_RADIUS * 0.22, 10, 28),
  endcap: new THREE.BoxGeometry(ENDCAP_SIZE, ENDCAP_SIZE, ENDCAP_SIZE),
};

// Rotate the cylinder to lie along the X axis (THREE's CylinderGeometry is along Y)
GEO.rod.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));

export class ArmGeometry {
  constructor(scene) {
    this.scene = scene;
    this.rods = [];
    this.joints = [];
    this.endcaps = [];
    this.axisHelpers = [];
    this.trailLine = null;
    this.trailPoints = null;

    // Store individual materials so we can swap them
    this._rodMats = [];
    this._jointSphereMats = [];
    this._jointFlashTimers = []; // for limit-hit flash animation

    this._build();
  }

  _build() {
    const scene = this.scene;

    // ── Rods ─────────────────────────────────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const mat = MAT.rod();
      const mesh = new THREE.Mesh(GEO.rod, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'rod', index: i };
      scene.add(mesh);
      this.rods.push(mesh);
      this._rodMats.push({ normal: mat, root: MAT.rodRoot(), hover: MAT.rodHover(), highlight: MAT.rodHighlight() });
    }

    // ── Joints ────────────────────────────────────────────────────────────────
    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      group.userData = { type: 'joint', index: i };

      const spMat = MAT.jointSphere();
      const sphere = new THREE.Mesh(GEO.jointSphere, spMat);
      sphere.castShadow = true;
      sphere.userData = { type: 'joint', index: i };
      group.add(sphere);
      this._jointSphereMats.push(spMat);
      this._jointFlashTimers.push(0);

      // Two perpendicular torus rings
      const r1Mat = MAT.jointRing();
      const ring1 = new THREE.Mesh(GEO.jointTorus, r1Mat);
      ring1.castShadow = true;
      group.add(ring1);

      const r2Mat = MAT.jointRing();
      const ring2 = new THREE.Mesh(GEO.jointTorus, r2Mat);
      ring2.rotation.x = Math.PI / 2; // perpendicular
      ring2.castShadow = true;
      group.add(ring2);

      // Axis indicator — a short arrow along the rotation axis
      const axisGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -JOINT_RADIUS * 2.2, 0),
        new THREE.Vector3(0, JOINT_RADIUS * 2.2, 0),
      ]);
      const axisLine = new THREE.Line(axisGeo, MAT.axisLine(0x44aaff));
      axisLine.userData.isAxisHelper = true;
      group.add(axisLine);
      this.axisHelpers.push(axisLine);

      scene.add(group);
      this.joints.push(group);
    }

    // ── End caps (pivot-joint cubes) ──────────────────────────────────────────
    this._endcapMats = [];
    for (let i = 0; i < 2; i++) {
      const mat = MAT.endcap();
      const rootMat = MAT.endcapRoot();
      this._endcapMats.push({ normal: mat, root: rootMat });

      const mesh = new THREE.Mesh(GEO.endcap, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'endcap', index: i };
      scene.add(mesh);
      this.endcaps.push(mesh);
    }

    // ── Trail line ─────────────────────────────────────────────────────────────
    const trailGeo = new THREE.BufferGeometry();
    const trailPts = new Float32Array(6); // 2 points × 3 coords
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPts, 3));
    this.trailLine = new THREE.Line(trailGeo, MAT.trail());
    this.trailLine.computeLineDistances();
    this.trailLine.visible = false;
    this.scene.add(this.trailLine);
    this.trailPoints = trailPts;
  }

  /** Update which rod/endcap is visually root. rootIdx -1 = left cube, 4 = right cube. */
  setRootRod(rootIdx, prevRootIdx) {
    // Clear previous root highlight
    if (prevRootIdx !== undefined && prevRootIdx !== rootIdx) {
      if (prevRootIdx === -1) {
        this.endcaps[0].material = this._endcapMats[0].normal;
      } else if (prevRootIdx === 4) {
        this.endcaps[1].material = this._endcapMats[1].normal;
      } else if (prevRootIdx >= 0 && prevRootIdx < this.rods.length) {
        this.rods[prevRootIdx].material = this._rodMats[prevRootIdx].normal;
      }
    }
    // Apply new root highlight
    if (rootIdx === -1) {
      this.endcaps[0].material = this._endcapMats[0].root;
    } else if (rootIdx === 4) {
      this.endcaps[1].material = this._endcapMats[1].root;
    } else if (rootIdx >= 0 && rootIdx < this.rods.length) {
      this.rods[rootIdx].material = this._rodMats[rootIdx].root;
    }
  }

  /** Highlight the currently dragged object (overrides hover). */
  setDragHighlight(type, index, active) {
    if (type === 'rod' && index !== undefined) {
      this.rods[index].material = active
        ? this._rodMats[index].highlight
        : this._rodMats[index].normal;
    }
    if (type === 'joint' && index !== undefined) {
      const mat = this._jointSphereMats[index];
      if (mat) {
        mat.emissive.setHex(active ? 0x00ccee : 0x0044aa);
        mat.emissiveIntensity = active ? 0.55 : 0.15;
      }
    }
    if (type === 'endcap' && index !== undefined) {
      const mat = this.endcaps[index]?.material;
      if (mat) {
        mat.emissive?.setHex(active ? 0x00aacc : 0x8a5a00);
        mat.emissiveIntensity = active ? 0.4 : 0.08;
      }
    }
  }

  /**
   * Apply hover highlight to a hovered (but not dragged) object.
   * Pass active=false to clear the hover on the previous object.
   * Does NOT override drag highlight or root material.
   */
  setHoverHighlight(type, index, active, rootRodIndex) {
    if (type === 'rod' && index !== undefined) {
      // Skip root rod — it has its own permanent glow
      if (index === rootRodIndex) return;
      // Skip if currently being drag-highlighted (drag state wins)
      this.rods[index].material = active
        ? this._rodMats[index].hover
        : this._rodMats[index].normal;
    }
    if (type === 'joint' && index !== undefined) {
      const mat = this._jointSphereMats[index];
      if (mat && this._jointFlashTimers[index] <= 0) {
        mat.emissive.setHex(active ? 0x0088dd : 0x0044aa);
        mat.emissiveIntensity = active ? 0.38 : 0.15;
      }
    }
    if (type === 'endcap' && index !== undefined) {
      // Skip root endcap — it has its own permanent glow
      const isRoot = (rootRodIndex === -1 && index === 0) || (rootRodIndex === 4 && index === 1);
      if (isRoot) return;
      const mat = this.endcaps[index]?.material;
      if (mat) {
        mat.emissive?.setHex(active ? 0xddaa00 : 0x8a5a00);
        mat.emissiveIntensity = active ? 0.28 : 0.08;
      }
    }
  }

  /** Flash a joint red momentarily when it hits its limit. */
  triggerLimitFlash(jointIdx) {
    const mat = this._jointSphereMats[jointIdx];
    if (!mat) return;
    mat.emissive.setHex(0xff2200);
    mat.emissiveIntensity = 1.2;
    this._jointFlashTimers[jointIdx] = 1.0; // will decay in tick()
  }

  /** Call each frame to animate flash decay. */
  tickFlash(dt) {
    for (let i = 0; i < this._jointFlashTimers.length; i++) {
      const t = this._jointFlashTimers[i];
      if (t <= 0) continue;
      this._jointFlashTimers[i] = Math.max(0, t - dt * 3.5);
      const mat = this._jointSphereMats[i];
      if (t > 0) {
        mat.emissive.setHex(0x0044aa);
        mat.emissiveIntensity = 0.15 + t * 1.05;
        // Transition color: red → blue
        const r = Math.round(0x00 + t * 0xff);
        const g = Math.round(0x44 - t * 0x44);
        mat.emissive.setRGB(r / 255, g / 255, 0xaa / 255);
      } else {
        mat.emissive.setHex(0x0044aa);
        mat.emissiveIntensity = 0.15;
      }
    }
  }

  /** Update trail line (root center → drag target). */
  setTrail(rootCenter, dragTarget, visible) {
    this.trailLine.visible = visible;
    if (!visible) return;
    const pos = this.trailPoints;
    pos[0] = rootCenter.x; pos[1] = rootCenter.y; pos[2] = rootCenter.z;
    pos[3] = dragTarget.x; pos[4] = dragTarget.y; pos[5] = dragTarget.z;
    this.trailLine.geometry.attributes.position.needsUpdate = true;
    this.trailLine.computeLineDistances();
  }

  /** Return all ray-testable meshes (for raycasting). */
  get interactables() {
    return [
      ...this.rods,
      ...this.joints.flatMap(g => g.children.filter(c => !c.userData.isAxisHelper)),
      ...this.endcaps,
    ];
  }

  dispose() {
    Object.values(GEO).forEach(g => g.dispose());
  }
}
