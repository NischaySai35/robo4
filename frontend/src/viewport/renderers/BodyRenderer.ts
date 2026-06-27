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
import { GeometryType } from '@/core/model/index';
import type { Document } from '@/core/model/index';
import { getAssetObject } from '@/viewport/renderers/AssetCache';
import { stressColor } from '@/kinematics/analysis';

const _picker = new THREE.Raycaster();
const DEFAULT_COLOR = [0.62, 0.66, 0.72, 1];
const HILITE_SEL   = new THREE.Color(0x2f7dff); // selection: blue
const HILITE_HOVER = new THREE.Color(0xffa040); // hover: warm orange (Blender-style)
const BLACK = new THREE.Color(0x000000);

function primitiveGeometry(g: any) {
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
const visualSignature = (body: any) => JSON.stringify({ g: body.visual?.geometry ?? {}, a: body.visual?.geometry?.assetId ?? body.assetId ?? null });

const COLL_MAT = new THREE.MeshBasicMaterial({
  color: 0x00aaff, opacity: 0.22, transparent: true, depthWrite: false, side: THREE.DoubleSide,
});
const COLL_EDGE_MAT = new THREE.LineBasicMaterial({ color: 0x00ccff, opacity: 0.55, transparent: true });

export class BodyRenderer {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  constructor(scene: any) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'model-bodies';
    scene.add(this.group);
    this._entries = new Map(); // bodyId -> { container, sig }
    this._selectedId = null;   // active (primary) selection — brighter highlight
    this._selectedIds = new Set(); // all selected bodies
    this._hoveredId = null;    // body under cursor (object-mode hover)
    this._showCollision = false;
    this._engineMode = 'eevee'; // set by bridge.setRenderEngine
    this._wireframe = false;
  }

  sync(doc: Document, fk: any = null) {
    const seen = new Set();

    for (const body of Object.values(doc.bodies)) {
      seen.add(body.id);
      const sig = visualSignature(body);
      let entry = this._entries.get(body.id);

      if (!entry) {
        const container = new THREE.Group();
        container.userData = { bodyId: body.id, isModelBody: true };
        this.group.add(container);
        entry = { container, sig: null, conSig: null };
        this._entries.set(body.id, entry);
      }
      if (entry.sig !== sig) {
        this._buildVisual(entry.container, body, doc);
        entry.sig = sig;
      }
      this._applyMaterial(entry.container, body, doc);
      // Update connector visuals when the connector list changes
      const conSig = JSON.stringify(body.meta?.connectors ?? []);
      if (entry.conSig !== conSig) { this._syncConnectors(entry.container, body); entry.conSig = conSig; }
      // Collision overlay
      const collSig = this._showCollision ? JSON.stringify(body.collision?.geometry ?? body.visual?.geometry ?? {}) : '';
      if (entry.collSig !== collSig) { this._syncCollisionOverlay(entry.container, body); entry.collSig = collSig; }
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

  _buildVisual(container: any, body: any, doc: any) {
    // clear old children
    for (const c of [...container.children]) { container.remove(c); this._disposeObject(c); }

    const g = body.visual?.geometry;
    let child: any = null;
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

    child.traverse?.((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    container.add(child);
  }

  _forEachMesh(container: any, fn: any) {
    container.traverse((o: any) => { if (o.isMesh) fn(o); });
  }

  setWireframe(on: boolean) {
    this._wireframe = on;
    // Force re-application across all bodies.
    for (const [, entry] of this._entries) entry.matSig = null;
  }

  _applyMaterial(container: any, body: any, doc: any) {
    if (this._stress) { this._paintContainer(container, body.id); return; }

    if (this._wireframe) {
      // Wireframe / X-ray view — show edge skeleton, dim fill colour.
      this._forEachMesh(container, (mesh: any) => {
        if (!mesh.material || Array.isArray(mesh.material)) return;
        const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
        const [r, gg, b] = m?.color ?? DEFAULT_COLOR;
        mesh.material.color.setRGB(r, gg, b);
        mesh.material.metalness = 0; mesh.material.roughness = 1;
        mesh.material.opacity = 1; mesh.material.transparent = false;
        mesh.material.wireframe = true;
      });
      return;
    }

    const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
    const [r, gg, b, a] = m?.color ?? DEFAULT_COLOR;
    this._forEachMesh(container, (mesh: any) => {
      if (!mesh.material || Array.isArray(mesh.material)) return;
      mesh.material.color.setRGB(r, gg, b);
      mesh.material.metalness = m?.metalness ?? 0.45;
      mesh.material.roughness = m?.roughness ?? 0.45;
      mesh.material.opacity = a ?? 1;
      mesh.material.transparent = (a ?? 1) < 1;
      mesh.material.wireframe = false;
    });
  }

  _applyTransform(obj: any, t: any) {
    if (!t) return;
    const [px, py, pz] = t.position ?? [0, 0, 0];
    const [qx, qy, qz, qw] = t.quaternion ?? [0, 0, 0, 1];
    const [sx, sy, sz] = t.scale ?? [1, 1, 1];
    obj.position.set(px, py, pz);
    obj.quaternion.set(qx, qy, qz, qw);
    obj.scale.set(sx, sy, sz);
  }

  // ── FEA-style surface stress heatmap ───────────────────────────────────────
  /** Paint every body with a blue→red load gradient. `field` = bodyStressField(). */
  applyStress(field: any) {
    this._stress = field;
    for (const [id, { container }] of this._entries) this._paintContainer(container, id);
  }

  _paintContainer(container: any, bodyId: any) {
    const f = this._stress?.get(bodyId);
    container.updateMatrixWorld(true);
    this._forEachMesh(container, (mesh: any) => this._paintMesh(mesh, f));
  }

  _paintMesh(mesh: any, f: any) {
    const geo = mesh.geometry;
    if (!geo?.attributes?.position) return;
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    // Missing field → neutral (low) so nothing flashes the wrong colour.
    const P = new THREE.Vector3(...(f?.P ?? [0, 0, 0]));
    const D = new THREE.Vector3(...(f?.D ?? [0, 1, 0]));
    const tP = f?.tP ?? 0, tD = f?.tD ?? 0;
    const dir = D.clone().sub(P);
    const len2 = Math.max(dir.lengthSq(), 1e-9);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const u = Math.min(1, Math.max(0, v.sub(P).dot(dir) / len2));
      const [r, g, b] = stressColor(tP + (tD - tP) * u);
      colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = mesh.material;
    if (mat && !Array.isArray(mat)) {
      mat.vertexColors = true;
      mat.color.setRGB(1, 1, 1);
      mat.metalness = 0.05;
      mat.roughness = 0.7;
      mat.opacity = 1; mat.transparent = false;
      mat.needsUpdate = true;
    }
  }

  /** Leave stress mode: drop vertex colours and restore solid materials. */
  clearStress(doc?: Document) {
    this._stress = null;
    for (const [id, { container }] of this._entries) {
      this._forEachMesh(container, (mesh: any) => {
        mesh.geometry?.deleteAttribute?.('color');
        if (mesh.material && !Array.isArray(mesh.material)) {
          mesh.material.vertexColors = false;
          mesh.material.needsUpdate = true;
        }
      });
      const body = doc?.bodies?.[id];
      if (body && doc) this._applyMaterial(container, body, doc);
    }
  }

  setSelected(bodyId: any) {
    this._selectedId = bodyId;
    this._selectedIds = new Set(bodyId ? [bodyId] : []);
    this._refreshHighlight();
  }

  /** Highlight a set of bodies; `activeId` (last clicked) gets a stronger glow. */
  setSelectedIds(ids: any, activeId: any = null) {
    this._selectedIds = new Set(ids ?? []);
    this._selectedId = activeId ?? (ids && ids.length ? ids[ids.length - 1] : null);
    this._refreshHighlight();
  }

  setHovered(id: string | null) {
    this._hoveredId = id;
    this._refreshHighlight();
  }

  _refreshHighlight() {
    for (const [id, { container }] of this._entries) {
      const sel = this._selectedIds.has(id);
      const active = id === this._selectedId;
      const hovered = id === this._hoveredId;
      this._forEachMesh(container, (mesh: any) => {
        if (!mesh.material || Array.isArray(mesh.material)) return;
        if (sel) {
          mesh.material.emissive = HILITE_SEL;
          mesh.material.emissiveIntensity = active ? 0.55 : 0.32;
        } else if (hovered) {
          mesh.material.emissive = HILITE_HOVER;
          mesh.material.emissiveIntensity = 0.22;
        } else {
          mesh.material.emissive = BLACK;
          mesh.material.emissiveIntensity = 0;
        }
      });
    }
  }

  /** Selection gizmo attaches to the body's container. */
  getMesh(bodyId: any) { return this._entries.get(bodyId)?.container ?? null; }

  /** Raycast all model bodies; returns the hit bodyId or null (for canvas picking). */
  pickBodyAt(ndc: any, camera: any) {
    const objs: any[] = [];
    for (const { container } of this._entries.values()) objs.push(container);
    if (!objs.length) return null;
    _picker.setFromCamera(ndc, camera);
    const hits = _picker.intersectObjects(objs, true);
    for (const h of hits) {
      let o: any = h.object;
      while (o) { if (o.userData?.bodyId) return o.userData.bodyId; o = o.parent; }
    }
    return null;
  }

  /** Raycast bodies and return the hit face as { bodyId, point, normal } in world
   *  space (for the mate tool), or null. */
  pickFaceAt(ndc: any, camera: any) {
    const objs: any[] = [];
    for (const { container } of this._entries.values()) objs.push(container);
    if (!objs.length) return null;
    _picker.setFromCamera(ndc, camera);
    const hits = _picker.intersectObjects(objs, true);
    for (const h of hits) {
      if (!h.face) continue;
      let o: any = h.object, bodyId: any = null;
      while (o) { if (o.userData?.bodyId) { bodyId = o.userData.bodyId; break; } o = o.parent; }
      if (!bodyId) continue;
      const normal = h.face.normal.clone()
        .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld))
        .normalize();
      return { bodyId, point: h.point.clone(), normal };
    }
    return null;
  }

  _disposeObject(o: any) {
    o.traverse?.((c: any) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m: any) => m.dispose?.());
    });
    if (o.isMesh) { o.geometry?.dispose(); o.material?.dispose?.(); }
  }
  _disposeContainer(container: any) { for (const c of container.children) this._disposeObject(c); }

  // ── Connector visuals ─────────────────────────────────────────────────────────
  // Screen-space fixed-size connector markers (Blender/Fusion style).
  // onBeforeRender rescales each marker every frame so it stays at ~CON_PX pixels
  // regardless of camera distance / zoom level.
  _syncConnectors(container: any, body: any) {
    const old = container.children.filter((c: any) => c.userData?.isConnector);
    for (const o of old) { container.remove(o); this._disposeObject(o); }

    const connectors: any[] = (body.meta?.connectors as any[] | undefined) ?? [];
    if (connectors.length === 0) return;

    const CON_PX = 7; // fixed screen size (radius in pixels)

    // Shared materials (instanced per connector to avoid cross-body bleed).
    const mkMat = () => new THREE.MeshBasicMaterial({
      color: 0x00d8ff, transparent: true, opacity: 0.92,
      depthTest: false, side: THREE.DoubleSide,
    });
    const mkArrowMat = () => new THREE.MeshBasicMaterial({
      color: 0x00d8ff, transparent: true, opacity: 0.85, depthTest: false,
    });

    // Geometry at unit scale: ring 0.5→0.8 radius, arrow cone 0.15 radius × 0.5 height.
    // onBeforeRender will scale the whole group to hit CON_PX in screen space.
    const RING_OUTER = 0.8;
    const ringGeo  = new THREE.RingGeometry(0.5, RING_OUTER, 32);
    const dotGeo   = new THREE.CircleGeometry(0.18, 16);
    const coneGeo  = new THREE.ConeGeometry(0.15, 0.5, 8);

    for (const con of connectors) {
      const group = new THREE.Group();
      group.userData = { isConnector: true, connectorId: con.id };
      group.renderOrder = 900;

      // Thin ring outline.
      const ring = new THREE.Mesh(ringGeo, mkMat());
      ring.castShadow = false; ring.renderOrder = 900;
      group.add(ring);

      // Center dot.
      const dot = new THREE.Mesh(dotGeo, mkMat());
      dot.castShadow = false; dot.renderOrder = 901;
      group.add(dot);

      // Normal-direction arrow cone (+Z at unit scale).
      const cone = new THREE.Mesh(coneGeo, mkArrowMat());
      cone.position.set(0, 0, RING_OUTER + 0.3);
      cone.rotation.x = -Math.PI / 2;
      cone.renderOrder = 900;
      group.add(cone);

      // Position the group at the connector's local position.
      const [px, py, pz] = con.position ?? [0, 0, 0];
      group.position.set(px, py, pz);

      // Orient so +Z aligns with the connector normal (ring faces along normal).
      const normal = new THREE.Vector3(...(con.normal ?? [0, 0, 1])).normalize();
      if (normal.length() > 0.001) {
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      }

      // Screen-space scale: rescale each frame so the ring stays at CON_PX pixels.
      // We capture the group in closure; onBeforeRender fires on the first child.
      ring.onBeforeRender = (renderer, _scene, camera: any) => {
        const worldPos = new THREE.Vector3();
        group.getWorldPosition(worldPos);

        const h = renderer.domElement.height || 1;
        let worldR: number;
        if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
          const dist = worldPos.distanceTo(camera.position);
          const fovRad = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
          worldR = (CON_PX / h) * 2 * dist * Math.tan(fovRad / 2);
        } else {
          const cam = camera as THREE.OrthographicCamera;
          worldR = (CON_PX / h) * (cam.top - cam.bottom);
        }
        group.scale.setScalar(worldR / RING_OUTER);
      };

      container.add(group);
    }
  }

  // ── Collision shape overlay ───────────────────────────────────────────────────
  // When enabled, each body shows its collision geometry as a translucent blue
  // wireframe. If body.collision is unset, the visual geometry is used (which is
  // what physics engines assume by default).
  setShowCollision(on: boolean) {
    this._showCollision = on;
    for (const [, entry] of this._entries) {
      if (!on) {
        const old = entry.container.children.filter((c: any) => c.userData?.isCollision);
        for (const o of old) { entry.container.remove(o); this._disposeObject(o); }
        entry.collSig = '';
      } else {
        entry.collSig = null; // force rebuild next sync
      }
    }
  }

  _syncCollisionOverlay(container: any, body: any) {
    // Remove old
    const old = container.children.filter((c: any) => c.userData?.isCollision);
    for (const o of old) { container.remove(o); this._disposeObject(o); }
    if (!this._showCollision) return;

    // Use collision geometry if defined, else fall back to visual geometry
    const g = body.collision?.geometry ?? body.visual?.geometry;
    let geo: THREE.BufferGeometry | null = null;
    try { geo = primitiveGeometry(g); } catch { return; }
    if (!geo) return;

    const solid = new THREE.Mesh(geo, COLL_MAT);
    solid.userData = { isCollision: true };
    solid.raycast = () => {}; // not pickable
    container.add(solid);

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), COLL_EDGE_MAT);
    edges.userData = { isCollision: true };
    container.add(edges);
  }

  dispose() {
    for (const { container } of this._entries.values()) this._disposeContainer(container);
    this._entries.clear();
    this.scene.remove(this.group);
  }
}