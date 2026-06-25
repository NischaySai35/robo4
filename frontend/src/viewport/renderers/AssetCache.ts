/**
 * AssetCache — parses embedded mesh Assets into Three.js objects, cached by id.
 *
 * Sync formats (parsed on demand): STL, OBJ, USD/USDZ/USDA (USDZLoader.parse).
 * Async formats (must be preloaded once before render): glTF/GLB (GLTFLoader) and
 * STEP/STP (OpenCascade WASM via occt-import-js). Importers call `preloadAsset()` and
 * await it; after that `getAssetObject()` returns clones synchronously like the others.
 */
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { USDZLoader } from 'three/examples/jsm/loaders/USDZLoader.js';
// @ts-expect-error — occt-import-js ships no types
import occtimportjs from 'occt-import-js';
import occtWasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';
import { base64ToBytes } from '@/core/serialization/binary';

const _stl = new STLLoader();
const _obj = new OBJLoader();
const _gltf = new GLTFLoader();
const _usdz = new USDZLoader();
const _cache = new Map(); // assetId -> THREE.Object3D (template; callers clone)

/** Repair missing or black materials that come out of the USDZ/USD loader. */
function fixUSDMaterials(obj: THREE.Object3D) {
  obj.traverse((o: any) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (!o.material) {
      o.material = new THREE.MeshStandardMaterial({ color: 0xa0a8b8, metalness: 0.4, roughness: 0.5 });
      return;
    }
    const mats: THREE.MeshStandardMaterial[] = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if ((m as any).opacity !== undefined && (m as any).opacity < 0.05) (m as any).opacity = 1;
      (m as any).transparent = ((m as any).opacity ?? 1) < 0.95;
      // Replace truly-black colours (likely unparsed USD material) with a steel grey.
      if ((m as any).color) {
        const { r, g, b } = (m as any).color;
        if (r + g + b < 0.05) (m as any).color.setHex(0xa0a8b8);
      }
      (m as any).needsUpdate = true;
    }
  });
}

function center(obj: THREE.Object3D) {
  const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
  obj.position.sub(c);
  return obj;
}

/** Synchronous formats — parse on demand. */
function parseSync(asset: any): THREE.Object3D | null {
  const bytes = base64ToBytes(asset.data);
  const fmt = (asset.format || '').toLowerCase();

  if (fmt === 'stl') {
    const geo = _stl.parse(bytes.buffer);
    geo.computeVertexNormals();
    geo.center();
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
  }
  if (fmt === 'obj') {
    return center(_obj.parse(new TextDecoder().decode(bytes)));
  }
  if (fmt === 'usd' || fmt === 'usdz' || fmt === 'usda') {
    // USDZLoader handles zipped .usdz and raw .usd/.usda; parse is synchronous.
    const obj = _usdz.parse(bytes.buffer.slice(0)) as unknown as THREE.Object3D;
    fixUSDMaterials(obj);
    return center(obj);
  }
  return null;
}

let _occt: any = null;
async function getOcct() {
  if (!_occt) _occt = await occtimportjs({ locateFile: () => occtWasmUrl as string });
  return _occt;
}

async function parseStep(bytes: Uint8Array): Promise<THREE.Object3D | null> {
  const occt = await getOcct();
  const result = occt.ReadStepFile(bytes, null);
  if (!result || !result.success || !result.meshes?.length) return null;
  const group = new THREE.Group();
  for (const m of result.meshes) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(m.attributes.position.array, 3));
    if (m.attributes.normal) geo.setAttribute('normal', new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
    if (m.index) geo.setIndex(Array.from(m.index.array as ArrayLike<number>));
    if (!m.attributes.normal) geo.computeVertexNormals();
    const col = m.color ? new THREE.Color(m.color[0], m.color[1], m.color[2]) : new THREE.Color(0.78, 0.80, 0.86);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, metalness: 0.4, roughness: 0.5 }));
    // Preserve OCCT component/product name so decomposeScene can name the body.
    if (m.name) mesh.name = m.name;
    group.add(mesh);
  }
  return center(group);
}

/**
 * Ensure an asset is parsed + cached. Async for glTF/STEP; warms the cache for sync
 * formats too. Returns true if a renderable object is now cached.
 */
export async function preloadAsset(asset: any): Promise<boolean> {
  if (!asset?.data) return false;
  if (_cache.has(asset.id)) return true;
  const fmt = (asset.format || '').toLowerCase();
  try {
    if (fmt === 'gltf' || fmt === 'glb') {
      const bytes = base64ToBytes(asset.data);
      const input: ArrayBuffer | string = fmt === 'glb' ? bytes.buffer : new TextDecoder().decode(bytes);
      const obj: THREE.Object3D = await new Promise((res, rej) =>
        _gltf.parse(input as any, '', (g: any) => res(g.scene), rej));
      _cache.set(asset.id, center(obj));
      return true;
    }
    if (fmt === 'step' || fmt === 'stp') {
      const obj = await parseStep(base64ToBytes(asset.data));
      if (!obj) return false;
      _cache.set(asset.id, obj);
      return true;
    }
    const obj = parseSync(asset);
    if (!obj) return false;
    _cache.set(asset.id, obj);
    return true;
  } catch (e) {
    console.warn('AssetCache.preloadAsset failed:', asset?.name, e);
    return false;
  }
}

/** Get a fresh clone of the parsed asset object, or null if unsupported/failed. */
export function getAssetObject(asset: any) {
  if (!asset?.data) return null;
  try {
    if (!_cache.has(asset.id)) {
      const obj = parseSync(asset);          // glTF/STEP must be preloaded first
      if (!obj) return null;
      _cache.set(asset.id, obj);
    }
    return _cache.get(asset.id).clone();
  } catch (e) {
    console.warn('AssetCache: failed to parse', asset?.name, e);
    return null;
  }
}

export function clearAsset(assetId: any) { _cache.delete(assetId); }
