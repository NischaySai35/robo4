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
    return center(_usdz.parse(bytes.buffer.slice(0)) as unknown as THREE.Object3D);
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
    group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, metalness: 0.4, roughness: 0.5 })));
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
