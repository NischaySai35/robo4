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
 */
import * as THREE from 'three';

const _ray = new THREE.Raycaster();
const SNAP_VTX_PX = 14;
const SNAP_EDGE_PX = 10;

const TYPE_COLOR = { vertex: 0x22dd88, edge: 0x3388ff, face: 0xff8800 };

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

export class SnapIndicator {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  constructor(scene: any) {
    this.scene = scene;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 12),
      new THREE.MeshBasicMaterial({ color: TYPE_COLOR.vertex, depthTest: false, transparent: true, opacity: 0.95 }),
    );
    this.mesh.renderOrder = 1500;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  show(point: any, type = 'vertex') {
    this.mesh.material.color.setHex(TYPE_COLOR[type as keyof typeof TYPE_COLOR] ?? TYPE_COLOR.face);
    this.mesh.position.copy(point);
    this.mesh.visible = true;
  }
  hide() { this.mesh.visible = false; }

  dispose() {
    this.scene.remove(this.mesh);
    (this.mesh as any).geometry.dispose();
    this.mesh.material.dispose();
  }
}