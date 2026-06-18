/**
 * importMesh — open a mesh file and add it to the model as an Asset + Body.
 *
 * Uses the Electron native file dialog (window.tetrobot, built in the desktop
 * shell) when available, else the browser <input type=file> fallback. The mesh
 * bytes are embedded (base64) in the model so .nischay stays self-contained.
 * STL/OBJ now (the Fusion 360 export paths); glTF/STEP next.
 */
import * as THREE from 'three';
import { bytesToBase64 } from '@/core/serialization/binary.js';
import { useModelStore } from '@/state/modelStore.js';
import { useSelectionStore } from '@/state/selectionStore.js';
import { commands } from '@/core/commands/index.js';
import { getAssetObject } from '@/viewport/renderers/AssetCache.js';
import {
  makeAsset, makeBody, makeGeometry, GeometryType, identityOrigin,
} from '@/core/model/index.js';

// Scene base unit is metres; CAD/STL exports (Fusion 360 etc.) are almost always
// in millimetres, so a raw import is ~1000× too big. Default assumption: the file
// is in mm → scale by 0.001 so REAL dimensions are preserved (a 50 mm part becomes
// 0.05 m, shown as 50 mm). If that still leaves an absurd size (the file wasn't mm
// after all), fall back to auto-fitting the longest side to ~1 m so it's editable.
const MM_TO_M = 0.001;
const FIT_TARGET_M = 1.0;
const SANE_MIN_M = 0.01;   // 10 mm
const SANE_MAX_M = 20.0;   // 20 m

function importScale(asset) {
  const obj = getAssetObject(asset);
  if (!obj) return [MM_TO_M, MM_TO_M, MM_TO_M];
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxDim) || maxDim <= 0) return [1, 1, 1];

  const mmLongest = maxDim * MM_TO_M; // longest side if we treat the file as mm
  if (mmLongest >= SANE_MIN_M && mmLongest <= SANE_MAX_M) {
    return [MM_TO_M, MM_TO_M, MM_TO_M]; // mm assumption gives a sensible size
  }
  const f = Math.round((FIT_TARGET_M / maxDim) * 1e6) / 1e6; // else normalise to ~1 m
  return [f, f, f];
}

const SUPPORTED = ['stl', 'obj'];

export async function importMesh() {
  let picked;
  try { picked = await pickFile(); }
  catch (e) { alert(`Could not open file: ${e.message}`); return; }
  if (!picked) return;

  const ext = (picked.name.split('.').pop() || '').toLowerCase();
  if (!SUPPORTED.includes(ext)) {
    alert(`Unsupported format ".${ext}". Supported now: STL, OBJ (STEP & glTF coming soon).`);
    return;
  }

  const asset = makeAsset({ name: picked.name, format: ext, data: bytesToBase64(picked.bytes) });
  const doc = useModelStore.getState().doc;
  const n = Object.keys(doc.bodies).length;
  const scale = importScale(asset); // bring huge mm-unit CAD exports into scene scale
  const body = makeBody({
    name: picked.name.replace(/\.[^.]+$/, ''),
    assetId: asset.id,
    visual: { geometry: makeGeometry(GeometryType.MESH, { assetId: asset.id }), materialId: null, origin: identityOrigin() },
    transform: { position: [n * 1.3, 0.6, 3.5], quaternion: [0, 0, 0, 1], scale },
  });

  const { dispatch } = useModelStore.getState();
  dispatch(commands.addAsset(asset));
  dispatch(commands.addBody(body));
  useSelectionStore.getState().select(body.id, 'body');
}

async function pickFile() {
  if (window.tetrobot?.isDesktop) {
    const res = await window.tetrobot.openFile({
      filters: [{ name: 'Meshes', extensions: SUPPORTED }, { name: 'All Files', extensions: ['*'] }],
      binary: true,
    });
    if (!res) return null;
    return { name: res.name, bytes: new Uint8Array(res.data) };
  }
  // Browser fallback
  return new Promise((resolve, reject) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = SUPPORTED.map((e) => `.${e}`).join(',');
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) { resolve(null); return; }
      try { resolve({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }); }
      catch (e) { reject(e); }
    };
    inp.click();
  });
}
