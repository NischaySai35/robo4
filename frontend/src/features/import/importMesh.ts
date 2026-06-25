/**
 * importMesh — unified entry point for all mesh/scene imports.
 *
 * Format → behavior:
 *   glTF / GLB   → scene decomposed into N bodies (one per component/mesh node).
 *   USD / USDZ   → same decomposition; Three.js USDZLoader is used.
 *   STL / OBJ    → one body (these formats carry no component hierarchy).
 *   STEP / STP   → N bodies via OpenCascade WASM (one per solid/component).
 *   URDF         → importURDF() — separate entry point, always.
 *
 * Fusion 360 workflow:
 *   Export as GLB (File › Export › Format: glTF 2.0, *.glb).
 *   Each Fusion component becomes a separate body with the correct relative
 *   position and material colour.
 *   Joints: use File › Import › URDF Project after installing the
 *   "Fusion 360 URDF Exporter" add-in.
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
import { decomposeScene } from './importScene';

// ── Scale helpers (for single-body import) ────────────────────────────────────
const MM_TO_M = 0.001;
const SANE_MIN_M = 0.003;
const SANE_MAX_M = 30.0;

function singleBodyScale(asset: any): [number, number, number] {
  const obj = getAssetObject(asset);
  if (!obj) return [MM_TO_M, MM_TO_M, MM_TO_M];
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const L = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(L) || L <= 0) return [1, 1, 1];
  if (L >= SANE_MIN_M && L <= SANE_MAX_M) return [1, 1, 1];
  return [MM_TO_M, MM_TO_M, MM_TO_M];
}

// Formats that carry a component scene tree → decompose into N bodies.
// STEP: OCCT returns one mesh per solid, so same decomposition path works.
const SCENE_FORMATS = new Set(['gltf', 'glb', 'usd', 'usdz', 'usda', 'step', 'stp']);

// All supported formats shown in the file picker.
const SUPPORTED = ['stl', 'obj', 'gltf', 'glb', 'usd', 'usdz', 'usda', 'step', 'stp'];

// ── Main entry point ──────────────────────────────────────────────────────────

/** Open a file picker, import the chosen mesh. No choices about "how" — format decides. */
export async function importMesh(exts?: string[]) {
  const filter = Array.isArray(exts) && exts.length ? exts : SUPPORTED;
  let picked: any;
  try { picked = await pickFile(filter); }
  catch (e: any) { alert(`Could not open file: ${e.message}`); return; }
  if (!picked) return;

  const ext = (picked.name.split('.').pop() || '').toLowerCase();
  if (!SUPPORTED.includes(ext)) {
    alert(`Unsupported format ".${ext}". Supported: GLB, glTF, USD, USDZ, STL, OBJ, STEP.`);
    return;
  }

  if (SCENE_FORMATS.has(ext)) {
    await _importScene(picked, ext);
  } else {
    await _importSingleBody(picked, ext);
  }
}

// ── Scene import (glTF / GLB / USD / USDZ) → N bodies ───────────────────────

async function _importScene(picked: { name: string; bytes: Uint8Array }, ext: string) {
  await useBusyStore.getState().run(`Importing ${picked.name}…`, async (sig) => {
    const asset = makeAsset({ name: picked.name, format: ext as any, data: bytesToBase64(picked.bytes) });
    const ok = await preloadAsset(asset);
    if (sig.aborted) return;
    if (!ok) {
      alert(
        `Could not parse "${picked.name}".\n\n` +
        `From Fusion 360, export using File › Export › Format: glTF 2.0 (*.glb). ` +
        `Make sure all components are visible before exporting.`,
      );
      return;
    }

    const root = getAssetObject(asset);
    if (!root || sig.aborted) { if (!root) alert('Could not read scene from this file.'); return; }

    const { entities, count } = decomposeScene(root, picked.name);
    if (sig.aborted) return;

    if (count === 0) {
      alert(
        `No mesh geometry found in "${picked.name}".\n\n` +
        `In Fusion 360: make sure you exported with "Visual Mesh" or "All Bodies" checked, ` +
        `and that at least one component is visible.`,
      );
      return;
    }

    const label = `Import ${count} ${count === 1 ? 'body' : 'components'} from ${picked.name}`;
    useModelStore.getState().dispatch(commands.addEntities(entities, label));

    const firstBody = entities.find((e: any) => e.kind === 'body');
    if (firstBody) useSelectionStore.getState().select(firstBody.id, 'body');
    setTimeout(() => bridge.fitCamera?.(), 80);
  });
}

// ── Single-body import (STL / OBJ / STEP) ────────────────────────────────────

async function _importSingleBody(picked: { name: string; bytes: Uint8Array }, ext: string) {
  await useBusyStore.getState().run(`Importing ${picked.name}…`, async (sig) => {
    const asset = makeAsset({ name: picked.name, format: ext as any, data: bytesToBase64(picked.bytes) });
    const ok = await preloadAsset(asset);
    if (sig.aborted) return;
    if (!ok) {
      alert(`Could not parse "${picked.name}". The file may be malformed or an unsupported variant.`);
      return;
    }

    const doc = useModelStore.getState().doc;
    const n = Object.keys(doc.bodies).length;
    const scale = singleBodyScale(asset) as [number, number, number];

    const body = makeBody({
      name: picked.name.replace(/\.[^.]+$/, ''),
      assetId: asset.id,
      visual: {
        geometry: makeGeometry(GeometryType.MESH, { assetId: asset.id }),
        materialId: null,
        origin: identityOrigin(),
      },
      transform: { position: [n * 1.3, 0.6, 3.5], quaternion: [0, 0, 0, 1], scale },
    });

    const { dispatch } = useModelStore.getState();
    dispatch(commands.addAsset(asset));
    dispatch(commands.addBody(body));
    useSelectionStore.getState().select(body.id, 'body');
    setTimeout(() => bridge.fitCamera?.(), 80);
  });
}

// ── URDF import ───────────────────────────────────────────────────────────────

export async function importURDF() {
  let picked: any;
  try { picked = await pickFile(['urdf', 'xml']); }
  catch (e: any) { alert(`Could not open file: ${e.message}`); return; }
  if (!picked) return;

  await useBusyStore.getState().run(`Importing ${picked.name}…`, async () => {
    const { parseURDF } = await import('@/core/serialization/importers/urdf');
    let result;
    try { result = parseURDF(new TextDecoder().decode(picked.bytes)); }
    catch (e: any) { alert(`URDF import failed: ${e.message}`); return; }
    if (!result.entities.length) { alert('No links found in the URDF.'); return; }

    useModelStore.getState().dispatch(commands.addEntities(result.entities, `Import URDF: ${result.robotName}`));
    const firstBody = result.entities.find((e: any) => e.kind === 'body');
    if (firstBody) useSelectionStore.getState().select(firstBody.id, 'body');
    setTimeout(() => bridge.fitCamera?.(), 80);
    if (result.warnings.length) console.warn('URDF import warnings:\n' + result.warnings.join('\n'));
  });
}

// ── File picker ───────────────────────────────────────────────────────────────

async function pickFile(filter: string[]): Promise<{ name: string; bytes: Uint8Array } | null> {
  if ((window as any).tetrobot?.isDesktop) {
    const res = await (window as any).tetrobot.openFile({
      filters: [{ name: 'Mesh / Scene', extensions: filter }, { name: 'All Files', extensions: ['*'] }],
      binary: true,
    });
    if (!res) return null;
    return { name: res.name, bytes: new Uint8Array(res.data) };
  }
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
