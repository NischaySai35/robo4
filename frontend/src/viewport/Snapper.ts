/**
 * Snapper — feature snapping for the viewport (Fusion/Blender style).
 *
 * Given a cursor ray, returns the nearest snap point on the model: a VERTEX, the
 * closest point on an EDGE, or the raw point on a FACE. Priority vertex > edge >
 * face, decided in *screen pixels* so it feels consistent at any zoom. Shared by
 * the Measure tool, Mate tool, and (later) edit-mode moves.
 *
 * SnapIndicator draws a small colour-coded marker at the live snap point so the
 * user sees what they'll grab as they hover.
 *
 * Blender/Fusion-style: indicator is screen-space fixed-size (independent of zoom).
 * onBeforeRender rescales the mesh every frame so it always appears at ~SCREEN_PX
 * pixels regardless of camera distance.
 */
import * as THREE from 'three';

const _ray = new THREE.Raycaster();
const SNAP_VTX_PX  = 14;
const SNAP_EDGE_PX = 10;

// Screen-space target sizes (px radius) for each type.
const SCREEN_PX: Record<string, number> = { vertex: 7, edge: 7, face: 5 };

const TYPE_COLOR = { vertex: 0xffffff, edge: 0xff8c00, face: 0x5588ff };

function closestPointOnSegment(p: any, a: any, b: any) {
  const ab = b.clone().sub(a);
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / (ab.lengthSq() || 1), 0, 1);
  return a.clone().add(ab.multiplyScalar(t));
}

/**
 * Resolve a snap at the given NDC coordinate.
 * @returns {{point:THREE.Vector3, type:'vertex'|'edge'|'face', normal?:THREE.Vector3}|null}
 */
export function computeSnap(ndc: any, camera: any, dom: any, meshes: any) {
  if (!meshes?.length) return null;
  _ray.setFromCamera(ndc, camera);
  const hits = _ray.intersectObjects(meshes, true);
  if (!hits.length) return null;
  const h = hits[0];

  const rect = dom.getBoundingClientRect();
  const cursorPx = new THREE.Vector2(
    (ndc.x * 0.5 + 0.5) * rect.width,
    (-ndc.y * 0.5 + 0.5) * rect.height,
  );
  const toPx = (v: any) => {
    const p = v.clone().project(camera);
    return new THREE.Vector2((p.x * 0.5 + 0.5) * rect.width, (-p.y * 0.5 + 0.5) * rect.height);
  };

  const normal = h.face
    ? h.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld)).normalize()
    : undefined;

  if (!h.face || !(h.object as any).geometry?.attributes?.position) {
    return { point: h.point.clone(), type: 'face', normal };
  }

  const mw = h.object.matrixWorld;
  const pos = (h.object as any).geometry.attributes.position;
  const va = new THREE.Vector3().fromBufferAttribute(pos, h.face.a).applyMatrix4(mw);
  const vb = new THREE.Vector3().fromBufferAttribute(pos, h.face.b).applyMatrix4(mw);
  const vc = new THREE.Vector3().fromBufferAttribute(pos, h.face.c).applyMatrix4(mw);

  // Vertex snap.
  let bestV: any = null, bestVD = Infinity;
  for (const v of [va, vb, vc]) { const d = toPx(v).distanceTo(cursorPx); if (d < bestVD) { bestVD = d; bestV = v; } }
  if (bestVD <= SNAP_VTX_PX) return { point: bestV.clone(), type: 'vertex', normal };

  // Edge snap (closest point on the nearest triangle edge).
  let bestE: any = null, bestED = Infinity;
  for (const [a, b] of [[va, vb], [vb, vc], [vc, va]]) {
    const cp = closestPointOnSegment(h.point, a, b);
    const d = toPx(cp).distanceTo(cursorPx);
    if (d < bestED) { bestED = d; bestE = cp; }
  }
  if (bestED <= SNAP_EDGE_PX) return { point: bestE.clone(), type: 'edge', normal };

  // Fall back to the face hit point.
  return { point: h.point.clone(), type: 'face', normal };
}

/**
 * Make `mesh.onBeforeRender` rescale the mesh so it always appears at `targetPx`
 * screen-space pixels, independent of camera distance / zoom.
 *
 * Works for both PerspectiveCamera and OrthographicCamera.
 * baseWorldRadius = the geometry's radius at scale 1.
 */
function attachScreenSpaceScale(mesh: THREE.Mesh, targetPx: number, baseWorldRadius: number) {
  mesh.onBeforeRender = (renderer, _scene, camera: any) => {
    // Billboard: always face the camera so a flat ring looks circular.
    mesh.quaternion.copy(camera.quaternion);

    const h = renderer.domElement.height || 1;
    let worldRadius: number;
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const dist = mesh.position.distanceTo(camera.position);
      const fovRad = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
      worldRadius = (targetPx / h) * 2 * dist * Math.tan(fovRad / 2);
    } else {
      // Orthographic: world units per pixel
      const cam = camera as THREE.OrthographicCamera;
      worldRadius = (targetPx / h) * (cam.top - cam.bottom);
    }
    const s = worldRadius / baseWorldRadius;
    mesh.scale.setScalar(s);
  };
}

// ── Snap indicator visual helpers ─────────────────────────────────────────────
//
// Blender uses:  vertex = white hollow square (2 triangles forming ×)
//                edge   = orange hollow circle
//                face   = blue-grey filled dot
// We use Three.js geometry equivalents:
//   vertex → thin ring (white) + crosshair lines
//   edge   → thin ring (orange, slightly larger)
//   face   → filled disc (blue, smaller)

// Ring with inner/outer radius (used for vertex + edge outlines).
function ringGeo(inner: number, outer: number, segs = 32) {
  return new THREE.RingGeometry(inner, outer, segs);
}

// Tiny filled circle for face snap.
function dotGeo(r: number) { return new THREE.CircleGeometry(r, 24); }

// Cross (+) geometry for vertex snap.
function crossGeo(r: number, thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-r, -thickness);
  shape.lineTo(-thickness, -thickness);
  shape.lineTo(-thickness, -r);
  shape.lineTo(thickness, -r);
  shape.lineTo(thickness, -thickness);
  shape.lineTo(r, -thickness);
  shape.lineTo(r, thickness);
  shape.lineTo(thickness, thickness);
  shape.lineTo(thickness, r);
  shape.lineTo(-thickness, r);
  shape.lineTo(-thickness, thickness);
  shape.lineTo(-r, thickness);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export class SnapIndicator {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;

  constructor(scene: any) {
    this.scene = scene;

    // We build one mesh per snap type and show/hide as needed.
    // All are billboards scaled to screen-space constant size via onBeforeRender.
    const baseMat = (color: number, opacity = 1) =>
      new THREE.MeshBasicMaterial({
        color, transparent: opacity < 1, opacity,
        depthTest: false, side: THREE.DoubleSide,
      });

    // Vertex: white ring + crosshair
    const vtxGroup = new THREE.Group();
    vtxGroup.renderOrder = 1500;
    const vtxRing = new THREE.Mesh(ringGeo(0.55, 0.8), baseMat(0xffffff));
    const vtxCross = new THREE.Mesh(crossGeo(0.5, 0.12), baseMat(0xffffff));
    vtxGroup.add(vtxRing, vtxCross);
    vtxGroup.visible = false;
    scene.add(vtxGroup);

    // Edge: orange ring, slightly bigger
    const edgeMesh = new THREE.Mesh(ringGeo(0.5, 0.78), baseMat(0xff8c00));
    edgeMesh.renderOrder = 1500;
    edgeMesh.visible = false;
    scene.add(edgeMesh);

    // Face: small filled blue circle
    const faceMesh = new THREE.Mesh(dotGeo(0.65), baseMat(0x5588ff, 0.85));
    faceMesh.renderOrder = 1500;
    faceMesh.visible = false;
    scene.add(faceMesh);

    // Attach screen-space billboard+scaling to each object's first child (or self).
    // onBeforeRender fires on Mesh objects; we drive the parent group via closure.
    const attachScale = (root: THREE.Group | THREE.Mesh, targetPx: number) => {
      const proxyMesh: THREE.Mesh = root instanceof THREE.Group
        ? root.children[0] as THREE.Mesh
        : root;

      proxyMesh.onBeforeRender = (_renderer, _scene, camera: any, _geometry, _material, _group) => {
        // Billboard: parent faces camera.
        (root as any).quaternion.copy(camera.quaternion);

        const h = _renderer.domElement.height || 1;
        let worldR: number;
        if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
          const dist = (root as any).position.distanceTo(camera.position);
          const fovRad = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
          worldR = (targetPx / h) * 2 * dist * Math.tan(fovRad / 2);
        } else {
          const cam = camera as THREE.OrthographicCamera;
          worldR = (targetPx / h) * (cam.top - cam.bottom);
        }
        // Geometry outer radius = 0.8 world units at scale 1.
        (root as any).scale.setScalar(worldR / 0.8);
      };
    };

    attachScale(vtxGroup, SCREEN_PX.vertex);
    attachScale(edgeMesh, SCREEN_PX.edge);
    attachScale(faceMesh, SCREEN_PX.face);

    this._vtx  = vtxGroup;
    this._edge = edgeMesh;
    this._face = faceMesh;
    this._all  = [vtxGroup, edgeMesh, faceMesh];
  }

  show(point: any, type = 'vertex') {
    for (const m of this._all) { m.visible = false; }
    const target = type === 'vertex' ? this._vtx : type === 'edge' ? this._edge : this._face;
    target.position.copy(point);
    target.visible = true;
  }

  hide() { for (const m of this._all) m.visible = false; }

  dispose() {
    for (const m of this._all) {
      this.scene.remove(m);
      if (m instanceof THREE.Group) {
        m.children.forEach((c: any) => { c.geometry?.dispose(); c.material?.dispose(); });
      } else {
        (m as any).geometry?.dispose();
        (m as any).material?.dispose();
      }
    }
  }
}
