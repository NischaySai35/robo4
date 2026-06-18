/**
 * BodyRenderer — turns model Bodies into Three.js meshes and keeps them in sync.
 *
 * This is the generic renderer the platform is built on: give it the model
 * document, it diff-updates a THREE.Group (create / update / remove meshes per
 * Body, apply transforms + materials). Primitive geometries now; imported mesh
 * assets arrive in Phase 2. Unlike the bespoke RobotFK, this renders ANY model.
 */
import * as THREE from 'three';
import { GeometryType } from '@/core/model/index.js';

const DEFAULT_COLOR = [0.62, 0.66, 0.72, 1];
const HILITE = new THREE.Color(0x2f7dff);

function buildGeometry(g) {
  switch (g?.type) {
    case GeometryType.BOX: {
      const [x, y, z] = g.size ?? [1, 1, 1];
      return new THREE.BoxGeometry(x, y, z);
    }
    case GeometryType.SPHERE:
      return new THREE.SphereGeometry(g.radius ?? 0.5, 28, 18);
    case GeometryType.CYLINDER: {
      const geo = new THREE.CylinderGeometry(g.radius ?? 0.5, g.radius ?? 0.5, g.length ?? 1, 28);
      geo.rotateX(Math.PI / 2); // align length along local Z (URDF convention)
      return geo;
    }
    case GeometryType.CAPSULE: {
      const geo = new THREE.CapsuleGeometry(g.radius ?? 0.5, g.length ?? 1, 6, 16);
      geo.rotateX(Math.PI / 2);
      return geo;
    }
    case GeometryType.MESH:
    default:
      // Placeholder until Phase 2 loads real asset geometry.
      return new THREE.BoxGeometry(0.4, 0.4, 0.4);
  }
}

const geomSignature = (g) => JSON.stringify(g ?? {});

export class BodyRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'model-bodies';
    scene.add(this.group);
    this._meshes = new Map();    // bodyId -> { mesh, sig }
    this._selectedId = null;
  }

  /** Diff-sync all meshes to the document's bodies + materials. */
  sync(doc) {
    const seen = new Set();

    for (const body of Object.values(doc.bodies)) {
      seen.add(body.id);
      const g = body.visual?.geometry;
      const sig = geomSignature(g);
      let entry = this._meshes.get(body.id);

      if (!entry) {
        const mat = new THREE.MeshStandardMaterial();
        const mesh = new THREE.Mesh(buildGeometry(g), mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { bodyId: body.id, isModelBody: true };
        this.group.add(mesh);
        entry = { mesh, sig };
        this._meshes.set(body.id, entry);
      } else if (entry.sig !== sig) {
        entry.mesh.geometry.dispose();
        entry.mesh.geometry = buildGeometry(g);
        entry.sig = sig;
      }

      this._applyMaterial(entry.mesh, body, doc);
      this._applyTransform(entry.mesh, body.transform);
    }

    // Remove meshes for deleted bodies
    for (const [id, entry] of this._meshes) {
      if (!seen.has(id)) {
        this.group.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();
        this._meshes.delete(id);
      }
    }

    this._refreshHighlight();
  }

  _applyMaterial(mesh, body, doc) {
    const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
    const [r, gg, b, a] = m?.color ?? DEFAULT_COLOR;
    mesh.material.color.setRGB(r, gg, b);
    mesh.material.metalness = m?.metalness ?? 0.45;
    mesh.material.roughness = m?.roughness ?? 0.45;
    mesh.material.opacity = a ?? 1;
    mesh.material.transparent = (a ?? 1) < 1;
  }

  _applyTransform(mesh, t) {
    if (!t) return;
    const [px, py, pz] = t.position ?? [0, 0, 0];
    const [qx, qy, qz, qw] = t.quaternion ?? [0, 0, 0, 1];
    const [sx, sy, sz] = t.scale ?? [1, 1, 1];
    mesh.position.set(px, py, pz);
    mesh.quaternion.set(qx, qy, qz, qw);
    mesh.scale.set(sx, sy, sz);
  }

  setSelected(bodyId) {
    this._selectedId = bodyId;
    this._refreshHighlight();
  }

  _refreshHighlight() {
    for (const [id, { mesh }] of this._meshes) {
      const on = id === this._selectedId;
      mesh.material.emissive = on ? HILITE : new THREE.Color(0x000000);
      mesh.material.emissiveIntensity = on ? 0.5 : 0;
    }
  }

  getMesh(bodyId) { return this._meshes.get(bodyId)?.mesh ?? null; }

  dispose() {
    for (const { mesh } of this._meshes.values()) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this._meshes.clear();
    this.scene.remove(this.group);
  }
}
