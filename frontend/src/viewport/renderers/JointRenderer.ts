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
function heatColor(t: any) {
  t = Math.max(0, Math.min(1, t));
  const r = t < 0.5 ? t * 2 : 1;
  const g = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
  return new THREE.Color(r, g, 0);
}

export class JointRenderer {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  constructor(scene: any) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'model-joints';
    scene.add(this.group);
    this._selectedId = null;
    this._lastDoc = null;
    this._visible = new Set(); // joint ids to draw; empty → none (shown on selection)
    this._picker = new THREE.Raycaster();
  }

  _mat(t: any) {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(...(t.position ?? [0, 0, 0])),
      new THREE.Quaternion(...(t.quaternion ?? [0, 0, 0, 1])),
      new THREE.Vector3(...(t.scale ?? [1, 1, 1])),
    );
  }
  _originMat(o: any) {
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

    // Scale the axis arrow + marker to the model so they read well on a small
    // desktop arm and a large rig alike (the old fixed 0.9 m arrow dwarfed small
    // models — that giant stray arrow sticking out of the part).
    const pts: any[] = [];
    if (fk?.values) for (const w of fk.values()) if (w?.position) pts.push(new THREE.Vector3(...w.position));
    let L = 1;
    if (pts.length) L = new THREE.Box3().setFromPoints(pts).getSize(new THREE.Vector3()).length() || 1;
    const aLen = Math.min(Math.max(L * 0.14, 0.04), 1.2);
    const aHead = aLen * 0.28;
    const aWidth = aLen * 0.16;
    const sphR = aLen * 0.09;

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

      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(), aLen, color, aHead, aWidth);
      arrow.traverse((o: any) => { if (o.material) { o.material.depthTest = false; } o.renderOrder = 999; });
      node.add(arrow);

      const sph = new THREE.Mesh(
        new THREE.SphereGeometry(sphR, 12, 10),
        new THREE.MeshBasicMaterial({ color, depthTest: false }),
      );
      sph.renderOrder = 999;
      node.add(sph);

      this.group.add(node);
    }
  }

  setSelected(id: any) {
    this._selectedId = id;
    if (this._lastDoc) this.sync(this._lastDoc, this._lastFk, this._lastLoads); // recolor
  }

  /** Which joints are drawn (those touching the current selection). */
  setVisibleSet(set: any) {
    this._visible = set instanceof Set ? set : new Set(set ?? []);
    if (this._lastDoc) this.sync(this._lastDoc, this._lastFk, this._lastLoads);
  }

  /** Raycast visible joint arrows; returns the hit jointId or null. */
  pickJointAt(ndc: any, camera: any) {
    if (this.group.children.length === 0) return null;
    this._picker.setFromCamera(ndc, camera);
    const hits = this._picker.intersectObjects(this.group.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o) { if (o.userData?.jointId) return o.userData.jointId; o = o.parent; }
    }
    return null;
  }

  _dispose(o: any) {
    o.traverse?.((c: any) => { c.geometry?.dispose?.(); if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m: any) => m.dispose?.()); });
  }

  dispose() {
    for (const c of this.group.children) this._dispose(c);
    this.scene.remove(this.group);
  }
}