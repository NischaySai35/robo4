/**
 * importMesh — open a mesh file and add it to the model as an Asset + Body.
 *
 * Uses the Electron native file dialog (window.tetrobot, built in the desktop
 * shell) when available, else the browser <input type=file> fallback. The mesh
 * bytes are embedded (base64) in the model so .nischay stays self-contained.
 * STL/OBJ now (the Fusion 360 export paths); glTF/STEP next.
 */
import * as THREE from 'three';
import { bytesToBase64 } from '@/core/serialization/binary';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useBusyStore } from '@/state/busyStore';
import { commands } from '@/core/commands/index';
import { getAssetObject, preloadAsset } from '@/viewport/renderers/AssetCache';
import { bridge } from '@/viewport/cameraBridge';
import {
  makeAsset, makeBody, makeGeometry, GeometryType, identityOrigin,
} from '@/core/model/index';

// Scene base unit is metres; CAD/STL exports (Fusion 360 etc.) are almost always
// in millimetres, so a raw import is ~1000× too big. Default assumption: the file
// is in mm → scale by 0.001 so REAL dimensions are preserved (a 50 mm part becomes
// 0.05 m, shown as 50 mm). If that still leaves an absurd size (the file wasn't mm
// after all), fall back to auto-fitting the longest side to ~1 m so it's editable.
const MM_TO_M = 0.001;
const FIT_TARGET_M = 1.0;
const SANE_MIN_M = 0.01;   // 10 mm
const SANE_MAX_M = 20.0;   // 20 m

function importScale(asset: any) {
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

const SUPPORTED = ['stl', 'obj', 'gltf', 'glb', 'usd', 'usdz', 'usda', 'step', 'stp'];

/** Import a mesh. Optionally restrict the picker to `exts` (e.g. ['stl']). */
export async function importMesh(exts?: string[]) {
  const filter = Array.isArray(exts) && exts.length ? exts : SUPPORTED;
  let picked: any;
  try { picked = await pickFile(filter); }
  catch (e) { alert(`Could not open file: ${e.message}`); return; }
  if (!picked) return;

  const ext = (picked.name.split('.').pop() || '').toLowerCase();
  if (!SUPPORTED.includes(ext)) {
    alert(`Unsupported format ".${ext}". Supported: STL, OBJ, glTF/GLB, USD/USDZ, STEP/STP.`);
    return;
  }

  // Parsing/tessellating a CAD/STEP mesh can take a moment (STEP/glTF parse async via
  // WASM/loader); show the bottom loading bar and preload BEFORE adding the body so it
  // renders the same frame it's added.
  await useBusyStore.getState().run(`Importing ${picked.name}…`, async () => {
    const asset = makeAsset({ name: picked.name, format: ext, data: bytesToBase64(picked.bytes) });
    const ok = await preloadAsset(asset);
    if (!ok) { alert(`Could not parse "${picked.name}". The file may be malformed or an unsupported variant.`); return; }

    const doc = useModelStore.getState().doc;
    const n = Object.keys(doc.bodies).length;
    const scale = importScale(asset) as [number, number, number]; // bring huge mm-unit CAD exports into scene scale
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
    // Frame the imported part once the renderer has synced the new body.
    setTimeout(() => bridge.fitCamera?.(), 80);
  });
}

/** Import a URDF robot description (.urdf / .xml) as bodies + joints. */
export async function importURDF() {
  let picked: any;
  try { picked = await pickFile(['urdf', 'xml']); }
  catch (e) { alert(`Could not open file: ${e.message}`); return; }
  if (!picked) return;

  await useBusyStore.getState().run(`Importing ${picked.name}…`, async () => {
    const { parseURDF } = await import('@/core/serialization/importers/urdf');
    let result;
    try { result = parseURDF(new TextDecoder().decode(picked.bytes)); }
    catch (e: any) { alert(`URDF import failed: ${e.message}`); return; }
    if (!result.entities.length) { alert('No links found in the URDF.'); return; }

    useModelStore.getState().dispatch(commands.addEntities(result.entities, `Import URDF: ${result.robotName}`));
    // select the first body (root) and frame the model
    const firstBody = result.entities.find((e: any) => e.kind === 'body');
    if (firstBody) useSelectionStore.getState().select(firstBody.id, 'body');
    setTimeout(() => bridge.fitCamera?.(), 80);
    if (result.warnings.length) console.warn('URDF import warnings:\n' + result.warnings.join('\n'));
  });
}

async function pickFile(filter = SUPPORTED) {
  if (window.tetrobot?.isDesktop) {
    const res = await window.tetrobot.openFile({
      filters: [{ name: 'Meshes', extensions: filter }, { name: 'All Files', extensions: ['*'] }],
      binary: true,
    });
    if (!res) return null;
    return { name: res.name, bytes: new Uint8Array(res.data) };
  }
  // Browser fallback
  return new Promise((resolve, reject) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = filter.map((e) => `.${e}`).join(',');
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) { resolve(null); return; }
      try { resolve({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }); }
      catch (e) { reject(e); }
    };
    inp.click();
  });
}