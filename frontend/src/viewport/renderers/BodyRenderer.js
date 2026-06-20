/**
 * BodyRenderer — turns model Bodies into Three.js objects and keeps them in sync.
 *
 * The generic renderer the platform is built on: give it the model document, it
 * diff-updates a THREE.Group (create / update / remove per Body). Each body gets a
 * container Group holding either a primitive mesh or a loaded mesh asset (STL/OBJ
 * via AssetCache). Materials, transforms, and selection highlight are applied
 * across every mesh in the container. Unlike the bespoke RobotFK, it renders ANY
 * model.
 */
import * as THREE from 'three';
import { GeometryType } from '@/core/model/index.js';
import { getAssetObject } from '@/viewport/renderers/AssetCache.js';

const _picker = new THREE.Raycaster();
const DEFAULT_COLOR = [0.62, 0.66, 0.72, 1];
const HILITE = new THREE.Color(0x2f7dff);
const BLACK = new THREE.Color(0x000000);

function primitiveGeometry(g) {
  switch (g?.type) {
    case GeometryType.BOX: { const [x, y, z] = g.size ?? [1, 1, 1]; return new THREE.BoxGeometry(x, y, z); }
    case GeometryType.SPHERE: return new THREE.SphereGeometry(g.radius ?? 0.5, 28, 18);
    case GeometryType.CYLINDER: { const geo = new THREE.CylinderGeometry(g.radius ?? 0.5, g.radius ?? 0.5, g.length ?? 1, 28); geo.rotateX(Math.PI / 2); return geo; }
    case GeometryType.CAPSULE: { const geo = new THREE.CapsuleGeometry(g.radius ?? 0.5, g.length ?? 1, 6, 16); geo.rotateX(Math.PI / 2); return geo; }
    case GeometryType.CONE: { const geo = new THREE.ConeGeometry(g.radius ?? 0.5, g.length ?? 1, 28); geo.rotateX(Math.PI / 2); return geo; }
    case GeometryType.TORUS: { const geo = new THREE.TorusGeometry(g.radius ?? 0.5, g.tube ?? 0.18, 16, 40); return geo; }
    case GeometryType.PLANE: { const [w, h] = g.size ?? [1, 1]; return new THREE.PlaneGeometry(w, h); }
    case GeometryType.CIRCLE: return new THREE.CircleGeometry(g.radius ?? 0.5, 40);
    default: return new THREE.BoxGeometry(0.4, 0.4, 0.4);
  }
}

// What changes force a rebuild of a body's visual child.
const visualSignature = (body) => JSON.stringify({ g: body.visual?.geometry ?? {}, a: body.visual?.geometry?.assetId ?? body.assetId ?? null });

export class BodyRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'model-bodies';
    scene.add(this.group);
    this._entries = new Map(); // bodyId -> { container, sig }
    this._selectedId = null;
  }

  sync(doc, fk = null) {
    const seen = new Set();

    for (const body of Object.values(doc.bodies)) {
      seen.add(body.id);
      const sig = visualSignature(body);
      let entry = this._entries.get(body.id);

      if (!entry) {
        const container = new THREE.Group();
        container.userData = { bodyId: body.id, isModelBody: true };
        this.group.add(container);
        entry = { container, sig: null };
        this._entries.set(body.id, entry);
      }
      if (entry.sig !== sig) {
        this._buildVisual(entry.container, body, doc);
        entry.sig = sig;
      }
      this._applyMaterial(entry.container, body, doc);
      // Use FK world (pos+rot) when available; child's own scale always.
      const w = fk?.get(body.id);
      this._applyTransform(entry.container, {
        position: w ? w.position : body.transform.position,
        quaternion: w ? w.quaternion : body.transform.quaternion,
        scale: body.transform.scale,
      });
    }

    for (const [id, entry] of this._entries) {
      if (!seen.has(id)) {
        this._disposeContainer(entry.container);
        this.group.remove(entry.container);
        this._entries.delete(id);
      }
    }
    this._refreshHighlight();
  }

  _buildVisual(container, body, doc) {
    // clear old children
    for (const c of [...container.children]) { container.remove(c); this._disposeObject(c); }

    const g = body.visual?.geometry;
    let child = null;
    // Edited mesh override (from Edit Mode) takes precedence — plain positions/indices.
    if (g?.editMesh?.positions?.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(g.editMesh.positions), 3));
      if (g.editMesh.indices?.length) geo.setIndex(g.editMesh.indices);
      geo.computeVertexNormals();
      child = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
    }
    if (!child && g?.type === GeometryType.MESH) {
      const assetId = g.assetId ?? body.assetId;
      const asset = assetId ? doc.assets[assetId] : null;
      child = asset ? getAssetObject(asset) : null;
      if (g.scale) child?.scale.set(g.scale[0], g.scale[1], g.scale[2]);
    }
    if (!child) child = new THREE.Mesh(primitiveGeometry(g), new THREE.MeshStandardMaterial());

    child.traverse?.((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    container.add(child);
  }

  _forEachMesh(container, fn) {
    container.traverse((o) => { if (o.isMesh) fn(o); });
  }

  _applyMaterial(container, body, doc) {
    const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
    const [r, gg, b, a] = m?.color ?? DEFAULT_COLOR;
    this._forEachMesh(container, (mesh) => {
      if (!mesh.material || Array.isArray(mesh.material)) return;
      mesh.material.color.setRGB(r, gg, b);
      mesh.material.metalness = m?.metalness ?? 0.45;
      mesh.material.roughness = m?.roughness ?? 0.45;
      mesh.material.opacity = a ?? 1;
      mesh.material.transparent = (a ?? 1) < 1;
    });
  }

  _applyTransform(obj, t) {
    if (!t) return;
    const [px, py, pz] = t.position ?? [0, 0, 0];
    const [qx, qy, qz, qw] = t.quaternion ?? [0, 0, 0, 1];
    const [sx, sy, sz] = t.scale ?? [1, 1, 1];
    obj.position.set(px, py, pz);
    obj.quaternion.set(qx, qy, qz, qw);
    obj.scale.set(sx, sy, sz);
  }

  setSelected(bodyId) { this._selectedId = bodyId; this._refreshHighlight(); }

  _refreshHighlight() {
    for (const [id, { container }] of this._entries) {
      const on = id === this._selectedId;
      this._forEachMesh(container, (mesh) => {
        if (!mesh.material || Array.isArray(mesh.material)) return;
        mesh.material.emissive = on ? HILITE : BLACK;
        mesh.material.emissiveIntensity = on ? 0.5 : 0;
      });
    }
  }

  /** Selection gizmo attaches to the body's container. */
  getMesh(bodyId) { return this._entries.get(bodyId)?.container ?? null; }

  /** Raycast all model bodies; returns the hit bodyId or null (for canvas picking). */
  pickBodyAt(ndc, camera) {
    const objs = [];
    for (const { container } of this._entries.values()) objs.push(container);
    if (!objs.length) return null;
    _picker.setFromCamera(ndc, camera);
    const hits = _picker.intersectObjects(objs, true);
    for (const h of hits) {
      let o = h.object;
      while (o) { if (o.userData?.bodyId) return o.userData.bodyId; o = o.parent; }
    }
    return null;
  }

  /** Raycast bodies and return the hit face as { bodyId, point, normal } in world
   *  space (for the mate tool), or null. */
  pickFaceAt(ndc, camera) {
    const objs = [];
    for (const { container } of this._entries.values()) objs.push(container);
    if (!objs.length) return null;
    _picker.setFromCamera(ndc, camera);
    const hits = _picker.intersectObjects(objs, true);
    for (const h of hits) {
      if (!h.face) continue;
      let o = h.object, bodyId = null;
      while (o) { if (o.userData?.bodyId) { bodyId = o.userData.bodyId; break; } o = o.parent; }
      if (!bodyId) continue;
      const normal = h.face.normal.clone()
        .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld))
        .normalize();
      return { bodyId, point: h.point.clone(), normal };
    }
    return null;
  }

  _disposeObject(o) {
    o.traverse?.((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose?.());
    });
    if (o.isMesh) { o.geometry?.dispose(); o.material?.dispose?.(); }
  }
  _disposeContainer(container) { for (const c of container.children) this._disposeObject(c); }

  dispose() {
    for (const { container } of this._entries.values()) this._disposeContainer(container);
    this._entries.clear();
    this.scene.remove(this.group);
  }
}
