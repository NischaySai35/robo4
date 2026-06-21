/**
 * JointRenderer — draws each model Joint as an axis arrow + marker at its origin
 * (parent-body frame ∘ joint.origin). Lets you see where joints are and which way
 * their axis points. Selected joint is highlighted. Joints are few, so each sync
 * rebuilds — simple and cheap.
 */
import * as THREE from 'three';
import type { Document } from '@/core/model/index';

const SEL = 0xffaa00;
const NORMAL = 0x33d17a;

// Load heatmap: 0 → green, 0.5 → yellow, 1 → red.
function heatColor(t) {
  t = Math.max(0, Math.min(1, t));
  const r = t < 0.5 ? t * 2 : 1;
  const g = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
  return new THREE.Color(r, g, 0);
}

export class JointRenderer {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'model-joints';
    scene.add(this.group);
    this._selectedId = null;
    this._lastDoc = null;
    this._visible = new Set(); // joint ids to draw; empty → none (shown on selection)
    this._picker = new THREE.Raycaster();
  }

  _mat(t) {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(...(t.position ?? [0, 0, 0])),
      new THREE.Quaternion(...(t.quaternion ?? [0, 0, 0, 1])),
      new THREE.Vector3(...(t.scale ?? [1, 1, 1])),
    );
  }
  _originMat(o) {
    const oo = o ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
    return new THREE.Matrix4().compose(
      new THREE.Vector3(...(oo.position ?? [0, 0, 0])),
      new THREE.Quaternion(...(oo.quaternion ?? [0, 0, 0, 1])),
      new THREE.Vector3(1, 1, 1),
    );
  }

  sync(doc: Document, fk: any = null, loads: any = null) {
    this._lastDoc = doc;
    this._lastFk = fk;
    this._lastLoads = loads;
    for (const c of [...this.group.children]) { this.group.remove(c); this._dispose(c); }

    const maxTorque = loads
      ? Math.max(1e-6, ...[...loads.values()].map((l) => Math.abs(l.torque)))
      : 0;

    for (const j of Object.values(doc.joints)) {
      if (!j.parentBodyId) continue;
      const parent = doc.bodies[j.parentBodyId];
      if (!parent) continue;
      // Only draw a joint when it (or one of its bodies) is selected.
      if (!this._visible.has(j.id)) continue;

      const parentMat = fk?.get(j.parentBodyId)?.matrix?.clone() ?? this._mat(parent.transform);
      const world = parentMat.multiply(this._originMat(j.origin));
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      world.decompose(pos, quat, new THREE.Vector3());
      const dir = new THREE.Vector3(...(j.axis ?? [0, 0, 1])).normalize().applyQuaternion(quat);

      let color;
      if (j.id === this._selectedId) color = SEL;
      else if (loads) { const l = loads.get(j.id); color = l?.overload ? 0xff2200 : heatColor(Math.abs(l?.torque ?? 0) / maxTorque).getHex(); }
      else color = NORMAL;
      const node = new THREE.Group();
      node.position.copy(pos);
      node.userData = { jointId: j.id };

      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(), 0.9, color, 0.22, 0.12);
      arrow.traverse((o: any) => { if (o.material) { o.material.depthTest = false; } o.renderOrder = 999; });
      node.add(arrow);

      const sph = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 10),
        new THREE.MeshBasicMaterial({ color, depthTest: false }),
      );
      sph.renderOrder = 999;
      node.add(sph);

      this.group.add(node);
    }
  }

  setSelected(id) {
    this._selectedId = id;
    if (this._lastDoc) this.sync(this._lastDoc, this._lastFk, this._lastLoads); // recolor
  }

  /** Which joints are drawn (those touching the current selection). */
  setVisibleSet(set) {
    this._visible = set instanceof Set ? set : new Set(set ?? []);
    if (this._lastDoc) this.sync(this._lastDoc, this._lastFk, this._lastLoads);
  }

  /** Raycast visible joint arrows; returns the hit jointId or null. */
  pickJointAt(ndc, camera) {
    if (this.group.children.length === 0) return null;
    this._picker.setFromCamera(ndc, camera);
    const hits = this._picker.intersectObjects(this.group.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o) { if (o.userData?.jointId) return o.userData.jointId; o = o.parent; }
    }
    return null;
  }

  _dispose(o) {
    o.traverse?.((c) => { c.geometry?.dispose?.(); if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose?.()); });
  }

  dispose() {
    for (const c of this.group.children) this._dispose(c);
    this.scene.remove(this.group);
  }
}