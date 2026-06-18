/**
 * AssetCache — parses embedded mesh Assets into Three.js objects, cached by id.
 *
 * STL and OBJ parse synchronously (the common Fusion 360 export paths), so a
 * mesh body can render the same frame its asset is added. glTF/STEP arrive in a
 * later increment (glTF parse is async; STEP needs the OCCT WASM tessellator).
 */
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { base64ToBytes } from '@/core/serialization/binary.js';

const _stl = new STLLoader();
const _obj = new OBJLoader();
const _cache = new Map(); // assetId -> THREE.Object3D (template; callers clone)

/** Parse an asset's embedded data into a Three.js object (centered at origin). */
function parse(asset) {
  const bytes = base64ToBytes(asset.data);
  const fmt = (asset.format || '').toLowerCase();

  if (fmt === 'stl') {
    const geo = _stl.parse(bytes.buffer);
    geo.computeVertexNormals();
    geo.center(); // bring far-from-origin CAD exports into view
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
    return mesh;
  }

  if (fmt === 'obj') {
    const text = new TextDecoder().decode(bytes);
    const group = _obj.parse(text);
    const box = new THREE.Box3().setFromObject(group);
    const c = box.getCenter(new THREE.Vector3());
    group.position.sub(c); // center
    return group;
  }

  return null; // unsupported (glTF/STEP later)
}

/** Get a fresh clone of the parsed asset object, or null if unsupported/failed. */
export function getAssetObject(asset) {
  if (!asset?.data) return null;
  try {
    if (!_cache.has(asset.id)) {
      const obj = parse(asset);
      if (!obj) return null;
      _cache.set(asset.id, obj);
    }
    return _cache.get(asset.id).clone();
  } catch (e) {
    console.warn('AssetCache: failed to parse', asset?.name, e);
    return null;
  }
}

export function clearAsset(assetId) { _cache.delete(assetId); }
