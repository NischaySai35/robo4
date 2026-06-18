/**
 * importMesh — open a mesh file and add it to the model as an Asset + Body.
 *
 * Uses the Electron native file dialog (window.tetrobot, built in the desktop
 * shell) when available, else the browser <input type=file> fallback. The mesh
 * bytes are embedded (base64) in the model so .nischay stays self-contained.
 * STL/OBJ now (the Fusion 360 export paths); glTF/STEP next.
 */
import { bytesToBase64 } from '@/core/serialization/binary.js';
import { useModelStore } from '@/state/modelStore.js';
import { useSelectionStore } from '@/state/selectionStore.js';
import { commands } from '@/core/commands/index.js';
import {
  makeAsset, makeBody, makeGeometry, GeometryType, identityOrigin,
} from '@/core/model/index.js';

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
  const body = makeBody({
    name: picked.name.replace(/\.[^.]+$/, ''),
    assetId: asset.id,
    visual: { geometry: makeGeometry(GeometryType.MESH, { assetId: asset.id }), materialId: null, origin: identityOrigin() },
    transform: { position: [n * 1.3, 0.6, 3.5], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
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
