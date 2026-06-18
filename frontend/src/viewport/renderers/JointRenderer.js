/**
 * JointRenderer — draws each model Joint as an axis arrow + marker at its origin
 * (parent-body frame ∘ joint.origin). Lets you see where joints are and which way
 * their axis points. Selected joint is highlighted. Joints are few, so each sync
 * rebuilds — simple and cheap.
 */
import * as THREE from 'three';

const SEL = 0xffaa00;
const NORMAL = 0x33d17a;

export class JointRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'model-joints';
    scene.add(this.group);
    this._selectedId = null;
    this._lastDoc = null;
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

  sync(doc) {
    this._lastDoc = doc;
    for (const c of [...this.group.children]) { this.group.remove(c); this._dispose(c); }

    for (const j of Object.values(doc.joints)) {
      const parent = doc.bodies[j.parentBodyId];
      if (!parent) continue;

      const world = this._mat(parent.transform).multiply(this._originMat(j.origin));
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      world.decompose(pos, quat, new THREE.Vector3());
      const dir = new THREE.Vector3(...(j.axis ?? [0, 0, 1])).normalize().applyQuaternion(quat);

      const color = j.id === this._selectedId ? SEL : NORMAL;
      const node = new THREE.Group();
      node.position.copy(pos);

      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(), 0.9, color, 0.22, 0.12);
      arrow.traverse((o) => { if (o.material) { o.material.depthTest = false; } o.renderOrder = 999; });
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
    if (this._lastDoc) this.sync(this._lastDoc); // recolor
  }

  _dispose(o) {
    o.traverse?.((c) => { c.geometry?.dispose?.(); if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose?.()); });
  }

  dispose() {
    for (const c of this.group.children) this._dispose(c);
    this.scene.remove(this.group);
  }
}
