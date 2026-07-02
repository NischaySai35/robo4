/**
 * ConnectorRenderer — draws every body's connectors (body.meta.connectors) as a
 * small marker + outward-normal arrow, always visible (not selection-gated like
 * JointRenderer) — the whole point is to let you SEE where a module's connectors
 * are and which way they face while you drag modules into alignment, before
 * Auto-Snap (connectorSnap.ts) can physically join them.
 *
 * Distinct magenta color keeps these visually separate from joint arrows (green/
 * amber) and the move/rotate gizmo (R/G/B).
 */
import * as THREE from 'three';
import type { Document } from '@/core/model/index';
import { listConnectors, getConnectorWorld } from '@/features/assembly/connectorSnap';
import { constantScreenSize } from '@/viewport/gizmoUtil';

// Size the marker as a fraction of the canvas height (not a fixed pixel count),
// so it stays a sensible proportion of the viewport at any zoom or window size
// rather than looking tiny once you zoom into a module. ~4.5% of canvas height.
const CON_HEIGHT_FRAC = 0.045;

const COLOR = 0xff33cc;
const SEL_COLOR = 0xffee33;

export class ConnectorRenderer {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  constructor(scene: any) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'model-connectors';
    scene.add(this.group);
    this._lastDoc = null;
    this._visible = true;
    this._picker = new THREE.Raycaster();
    // Default line-hit tolerance is ~1 world unit (1m in this scene) — absurdly
    // loose for ~10cm markers, and the reason clicking well away from a
    // connector's indicator line could still register as a hit on it.
    this._picker.params.Line = { threshold: 0.01 };
  }

  _bodySize(body: any): number {
    const g = body?.visual?.geometry ?? {};
    const s = body?.transform?.scale ?? [1, 1, 1];
    const a = Math.abs(s[0]), b = Math.abs(s[1]), c = Math.abs(s[2]);
    switch (g.type) {
      case 'sphere': return (g.radius ?? 0.5) * 2 * Math.max(a, b, c);
      case 'box': { const sz = g.size ?? [1, 1, 1]; return Math.hypot(sz[0] * a, sz[1] * b, sz[2] * c); }
      case 'cylinder': case 'capsule': { const r = g.radius ?? 0.5, l = g.length ?? 1; return Math.hypot(2 * r * Math.max(a, b), l * c); }
      default: return 0.4 * Math.max(a, b, c);
    }
  }

  sync(doc: Document, fk?: any) {
    this._lastDoc = doc;
    this._lastFk = fk;
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      c.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose(); });
    }
    if (!this._visible) return;

    for (const ref of listConnectors(doc)) {
      const body = doc.bodies[ref.bodyId];
      const world = getConnectorWorld(doc, ref.bodyId, ref.connectorId, fk);
      if (!body || !world) continue;

      const size = this._bodySize(body);
      const aLen = Math.min(Math.max(size * 0.35, 0.03), 0.12);
      // Scoped by body+connector together, not connector id alone — a duplicated
      // module's connectors can share ids with the original's (pre-existing
      // projects saved before ids were regenerated on copy), and matching by id
      // only would light up every same-id twin at once.
      const isSelected = this._selectedBodyId === ref.bodyId && ref.connectorId === this._selectedId;
      const color = isSelected ? SEL_COLOR : COLOR;

      const node = new THREE.Group();
      node.position.copy(world.position);
      node.userData = { bodyId: ref.bodyId, connectorId: ref.connectorId, isConnector: true };

      // A dot at the connector anchor + a short arrow pointing along its outward
      // normal — so you can see both WHERE it is and WHICH WAY it needs to face
      // another module's connector to snap (normals must end up opposed).
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(aLen * 0.22, 10, 8),
        new THREE.MeshBasicMaterial({ color, depthTest: false }),
      );
      dot.renderOrder = 998;
      node.add(dot);

      // A 3-axis (+ / X,Y,Z) crosshair over the dot so the exact anchor reads
      // clearly. Drawn in white for contrast against the pink dot/arrow.
      const arm = aLen * 0.4;
      const crossPts = [
        new THREE.Vector3(-arm, 0, 0), new THREE.Vector3(arm, 0, 0),
        new THREE.Vector3(0, -arm, 0), new THREE.Vector3(0, arm, 0),
        new THREE.Vector3(0, 0, -arm), new THREE.Vector3(0, 0, arm),
      ];
      const cross = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(crossPts),
        new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false }),
      );
      cross.renderOrder = 999;
      node.add(cross);

      // Key "up" indicator — a short line along the connector's roll tangent, in a
      // distinct cyan, so you can SEE the keyway orientation. Two connectors seat
      // only when these line up to a symmetry step (every 90° for this lock), so
      // this is the handle for "is the rotation right before it slides in".
      if (world.roll) {
        const rollLine = new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(), world.roll.clone().multiplyScalar(arm * 1.6),
          ]),
          new THREE.LineBasicMaterial({ color: 0x00e5ff, depthTest: false }),
        );
        rollLine.renderOrder = 1000;
        node.add(rollLine);
      }

      const arrow = new THREE.ArrowHelper(world.normal, new THREE.Vector3(), aLen, color, aLen * 0.4, aLen * 0.22);
      arrow.traverse((o: any) => { if (o.material) o.material.depthTest = false; o.renderOrder = 998; });
      node.add(arrow);

      // Keep the marker a constant size on screen regardless of zoom (matches the
      // move gizmo). aLen is the node's world design radius; drive the rescale
      // from every rendered child so at least one fires onBeforeRender each frame.
      node.traverse((o: any) => {
        if (o.isMesh || o.isLine) constantScreenSize(o, node, 0, aLen, CON_HEIGHT_FRAC);
      });

      this.group.add(node);
    }
  }

  setSelected(bodyId: string | null, connectorId: string | null) {
    this._selectedBodyId = bodyId;
    this._selectedId = connectorId;
    if (this._lastDoc) this.sync(this._lastDoc, this._lastFk);
  }

  setVisible(on: boolean) {
    this._visible = on;
    if (this._lastDoc) this.sync(this._lastDoc, this._lastFk);
  }

  /** Raycast connector markers; returns { bodyId, connectorId } or null. */
  pickConnectorAt(ndc: any, camera: any) {
    if (!this.group.children.length) return null;
    this._picker.setFromCamera(ndc, camera);
    const hits = this._picker.intersectObjects(this.group.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData?.isConnector) o = o.parent;
      if (o) return { bodyId: o.userData.bodyId, connectorId: o.userData.connectorId };
    }
    return null;
  }

  dispose() {
    for (const c of [...this.group.children]) {
      c.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose(); });
    }
    this.group.parent?.remove(this.group);
  }
}
