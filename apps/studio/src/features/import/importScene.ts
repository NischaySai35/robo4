/**
 * importScene — decompose a glTF/GLB or USD/USDZ scene into separate Bodies.
 *
 * Called by importMesh for these formats; the caller doesn't need to think
 * about "single vs multi" — it's always automatic based on what's in the file.
 *
 * Algorithm:
 *   1. Parse via AssetCache (same as before).
 *   2. Walk the Three.js scene tree, group leaf meshes by their nearest named
 *      ancestor Group. Each group → one Body.
 *   3. For each Body: vertex positions are stored in world-space RELATIVE to the
 *      component's bounding-box centre (so local geometry is centred). The body's
 *      `transform.position` is set to that centre, so the gizmo + inspector show
 *      a sensible position.
 *   4. Unit scale: detect mm vs m by bounding-box size; scale positions + centres.
 *
 * Joints:
 *   glTF/USDZ don't carry kinematic joints. To bring in Fusion 360 joints use:
 *   File › Import › URDF Project (Fusion 360 URDF Exporter add-in required).
 */
import * as THREE from 'three';
import { type EditMesh, makeBody, makeGeometry, makeMaterial, GeometryType, identityOrigin } from '@/core/model/index';

// ── Unit-scale detection ───────────────────────────────────────────────────────
// glTF spec says meters; Fusion USD is often cm or mm. Detect by longest axis.
const SANE_MIN_M = 0.003;  // 3 mm  — below this, treat file as mm
const SANE_MAX_M = 30.0;   // 30 m  — above this, treat file as mm

function detectScaleFactor(root: THREE.Object3D): number {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return 1;
  const size = box.getSize(new THREE.Vector3());
  const L = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(L) || L <= 0) return 1;
  // Already in plausible metres range
  if (L >= SANE_MIN_M && L <= SANE_MAX_M) return 1;
  // Too big → assume millimetres
  return 0.001;
}

// ── Material extraction ────────────────────────────────────────────────────────
function dominantColor(mat: any): [number, number, number, number] {
  if (!mat) return [0.62, 0.66, 0.72, 1];
  const m = Array.isArray(mat) ? mat[0] : mat;
  if (!m) return [0.62, 0.66, 0.72, 1];
  const r = m.color?.r ?? 0.62;
  const g = m.color?.g ?? 0.66;
  const b = m.color?.b ?? 0.72;
  const a = (m.opacity ?? 1) < 0.95 ? m.opacity : 1;
  return [r, g, b, a];
}

// ── Material fix (USDZ often produces black/invisible meshes) ─────────────────
export function fixSceneMaterials(obj: THREE.Object3D) {
  obj.traverse((o: any) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (!o.material) {
      o.material = new THREE.MeshStandardMaterial({ color: 0xa0a8b8, metalness: 0.4, roughness: 0.5 });
      return;
    }
    const mats: any[] = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if ((m.opacity ?? 1) < 0.05) m.opacity = 1;
      m.transparent = (m.opacity ?? 1) < 0.95;
      if (m.color && m.color.r + m.color.g + m.color.b < 0.05) {
        m.color.setHex(0xa0a8b8);
      }
      m.needsUpdate = true;
    }
  });
}

// ── Component grouping ─────────────────────────────────────────────────────────
interface Component { name: string; meshes: THREE.Mesh[] }

/**
 * Find the NEAREST named Group ancestor of `node`, stopping before `stopAt`.
 * Falls back to `node` itself if no named ancestor is found.
 * "Nearest" = closest to the leaf mesh, which is the Fusion component name.
 */
function namedAncestor(node: THREE.Object3D, stopAt: THREE.Object3D): THREE.Object3D {
  let cur: THREE.Object3D | null = node.parent;
  while (cur && cur !== stopAt) {
    if (cur.name && cur.name.trim()) return cur; // first (closest) named parent
    cur = cur.parent;
  }
  return node; // no named ancestor → use the mesh itself
}

function collectComponents(root: THREE.Object3D): Component[] {
  root.updateWorldMatrix(true, true);

  // Gather every leaf mesh (skip invisible / empty geometry).
  const allMeshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry?.attributes?.position?.count > 0) allMeshes.push(m);
  });

  if (allMeshes.length === 0) return [];

  // Group by nearest named ancestor (= Fusion 360 component name in glTF).
  const map = new Map<THREE.Object3D, THREE.Mesh[]>();
  for (const m of allMeshes) {
    const key = namedAncestor(m, root);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }

  // If everything collapsed into a single key (unnamed flat scene), fall back:
  // treat each mesh as its own component so we still get separate bodies.
  if (map.size === 1 && allMeshes.length > 1) {
    return allMeshes.map((m) => ({ name: m.name || m.parent?.name || '', meshes: [m] }));
  }

  return Array.from(map.entries()).map(([node, meshes]) => ({
    name: node.name || meshes[0].name || '',
    meshes,
  }));
}

// ── Geometry extraction ────────────────────────────────────────────────────────
interface BuiltComponent {
  editMesh: EditMesh;
  centre: THREE.Vector3; // world space, already scaled → metres
  color: [number, number, number, number];
}

function buildComponent(meshes: THREE.Mesh[], sp: number): BuiltComponent | null {
  // World-space bounding box of the whole component (handles transforms & scale).
  const box = new THREE.Box3();
  for (const m of meshes) {
    const mb = new THREE.Box3().setFromObject(m);
    box.union(mb);
  }
  if (box.isEmpty()) return null;

  // Component centre in world space × unit scale → metres.
  const centre = box.getCenter(new THREE.Vector3()).multiplyScalar(sp);

  const positions: number[] = [];
  const indices: number[] = [];
  let offset = 0;
  const tmp = new THREE.Vector3();
  let color: [number, number, number, number] = [0.62, 0.66, 0.72, 1];
  let firstMesh = true;

  for (const mesh of meshes) {
    if (firstMesh) { color = dominantColor(mesh.material); firstMesh = false; }

    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    if (!pos) continue;

    for (let i = 0; i < pos.count; i++) {
      // World space (at file scale), then → metres, then → relative to centre.
      tmp.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      tmp.multiplyScalar(sp).sub(centre);
      positions.push(tmp.x, tmp.y, tmp.z);
    }

    if (geo.index) {
      for (let i = 0; i < geo.index.count; i++) indices.push(geo.index.array[i] + offset);
    } else {
      // Non-indexed: generate sequential indices.
      for (let i = 0; i < pos.count; i++) indices.push(i + offset);
    }
    offset += pos.count;
  }

  if (!positions.length) return null;
  return { editMesh: { positions, indices }, centre, color };
}

// ── Public API ─────────────────────────────────────────────────────────────────
export interface DecomposedScene {
  entities: any[];   // Body + Material objects ready for commands.addEntities
  count: number;
}

/**
 * Decompose a pre-loaded Three.js scene root into TETROBOT entities.
 * `filename` is used as a fallback name for unnamed components.
 */
export function decomposeScene(root: THREE.Object3D, filename: string): DecomposedScene {
  fixSceneMaterials(root);
  root.updateWorldMatrix(true, true);

  const sp = detectScaleFactor(root);
  const components = collectComponents(root);

  const baseName = filename.replace(/\.[^.]+$/, '');
  const entities: any[] = [];

  for (let i = 0; i < components.length; i++) {
    const { name, meshes } = components[i];
    const built = buildComponent(meshes, sp);
    if (!built) continue;

    const { editMesh, centre, color } = built;
    const bodyName = name.trim() || (components.length === 1 ? baseName : `${baseName} ${i + 1}`);

    const mat = makeMaterial({
      name: `${bodyName}_mat`,
      color,
      metalness: 0.35,
      roughness: 0.55,
    });

    // Geometry type MESH with editMesh baked in.
    const geometry = makeGeometry(GeometryType.MESH);
    (geometry as any).editMesh = editMesh;

    const body = makeBody({
      name: bodyName,
      visual: { geometry, materialId: mat.id, origin: identityOrigin() },
      transform: {
        position: [centre.x, centre.y, centre.z],
        quaternion: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
    });

    entities.push(mat, body);
  }

  return { entities, count: entities.filter((e: any) => e.kind === 'body').length };
}
