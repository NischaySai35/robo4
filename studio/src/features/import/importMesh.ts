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
 * Multiple files can be selected at once. Single-body formats (STL/OBJ) are
 * batched and arranged side-by-side without overlapping.
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
const SCENE_FORMATS = new Set(['gltf', 'glb', 'usd', 'usdz', 'usda', 'step', 'stp']);

// All supported formats shown in the file picker.
const SUPPORTED = ['stl', 'obj', 'gltf', 'glb', 'usd', 'usdz', 'usda', 'step', 'stp'];

// ── Main entry point ──────────────────────────────────────────────────────────

/** Open a file picker (supports multi-select), import all chosen meshes. */
export async function importMesh(exts?: string[]) {
  const filter = Array.isArray(exts) && exts.length ? exts : SUPPORTED;
  let files: { name: string; bytes: Uint8Array }[];
  try { files = await pickFiles(filter); }
  catch (e: any) { alert(`Could not open file: ${e.message}`); return; }
  if (!files.length) return;

  const bad = files.filter((f) => !SUPPORTED.includes((f.name.split('.').pop() || '').toLowerCase()));
  if (bad.length) {
    alert(`Unsupported format(s): ${bad.map((f) => f.name).join(', ')}\nSupported: GLB, glTF, USD, USDZ, STL, OBJ, STEP.`);
    return;
  }

  const sceneFiles  = files.filter((f) =>  SCENE_FORMATS.has(ext(f.name)));
  const singleFiles = files.filter((f) => !SCENE_FORMATS.has(ext(f.name)));

  // Scene files: import each independently (they carry internal positions).
  for (const file of sceneFiles) {
    await _importScene(file, ext(file.name));
  }

  // Single-body files: batch with side-by-side layout.
  if (singleFiles.length) {
    await _importSingleBodyBatch(singleFiles);
  }
}

function ext(name: string) { return (name.split('.').pop() || '').toLowerCase(); }

// ── Scene import (glTF / GLB / USD / USDZ / STEP) → N bodies ─────────────────

async function _importScene(picked: { name: string; bytes: Uint8Array }, format: string) {
  await useBusyStore.getState().run(`Importing ${picked.name}…`, async (sig) => {
    const asset = makeAsset({ name: picked.name, format: format as any, data: bytesToBase64(picked.bytes) });
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
    useModelStore.getState().dispatch(commands.addEntities([asset, ...entities], label));

    const firstBody = entities.find((e: any) => e.kind === 'body');
    if (firstBody) useSelectionStore.getState().select(firstBody.id, 'body');
    setTimeout(() => bridge.fitCamera?.(), 80);
  });
}

// ── Single-body batch import (STL / OBJ) with side-by-side layout ─────────────

async function _importSingleBodyBatch(files: { name: string; bytes: Uint8Array }[]) {
  const label = files.length === 1
    ? `Importing ${files[0].name}…`
    : `Importing ${files.length} files…`;

  await useBusyStore.getState().run(label, async (sig) => {
    // Pass 1: load all assets.
    const loaded: { name: string; asset: any; scale: [number, number, number] }[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (sig.aborted) return;
      const format = ext(file.name) as any;
      const asset = makeAsset({ name: file.name, format, data: bytesToBase64(file.bytes) });
      const ok = await preloadAsset(asset);
      if (!ok) { errors.push(file.name); continue; }
      loaded.push({ name: file.name, asset, scale: singleBodyScale(asset) });
    }

    if (sig.aborted) return;
    if (!loaded.length) {
      alert(`Could not parse any of the selected files.`);
      return;
    }

    // Pass 2: compute side-by-side X positions using each mesh's scaled bounding box.
    // Start just to the right of the ACTUAL right edge of existing bodies — using a
    // count-based guess (bodyCount * 1.3) put new objects metres away from where the
    // model really sits (a project with N bodies spawned imports at N*1.3 m even when
    // every body was near the origin), which read as "added very far with a huge gap".
    const existingDoc = useModelStore.getState().doc;
    let curX = 0;
    {
      let maxRight = -Infinity;
      for (const b of Object.values(existingDoc.bodies) as any[]) {
        const px = b?.transform?.position?.[0];
        if (typeof px === 'number') maxRight = Math.max(maxRight, px);
      }
      if (maxRight > -Infinity) curX = maxRight + 0.15; // 15 cm to the right of the rightmost body
    }
    const positions: [number, number, number][] = [];
    for (const item of loaded) {
      const obj = getAssetObject(item.asset);
      const box = obj ? new THREE.Box3().setFromObject(obj) : null;
      const rawSize = box ? box.getSize(new THREE.Vector3()) : new THREE.Vector3(1, 1, 1);
      const sw = Math.max(rawSize.x * item.scale[0], 0.05);
      const sh = rawSize.y * item.scale[1];
      const gap = Math.max(sw * 0.15, 0.02); // 15% of this mesh's width, min 2 cm
      positions.push([curX + sw / 2, Math.max(sh / 2, 0.05), 0]);
      curX += sw + gap;
    }

    // Pass 3: dispatch.
    const { dispatch } = useModelStore.getState();
    const bodyIds: string[] = [];

    for (let i = 0; i < loaded.length; i++) {
      const item = loaded[i];
      const body = makeBody({
        name: item.name.replace(/\.[^.]+$/, ''),
        assetId: item.asset.id,
        visual: {
          geometry: makeGeometry(GeometryType.MESH, { assetId: item.asset.id }),
          materialId: null,
          origin: identityOrigin(),
        },
        transform: { position: positions[i], quaternion: [0, 0, 0, 1], scale: item.scale },
      });
      dispatch(commands.addAsset(item.asset));
      dispatch(commands.addBody(body));
      bodyIds.push(body.id);
    }

    if (errors.length) alert(`Could not import:\n${errors.join('\n')}`);

    if (bodyIds.length) {
      useSelectionStore.getState().selectMany(bodyIds, 'body');
      setTimeout(() => bridge.fitCamera?.(), 80);
    }
  });
}

// ── URDF import ───────────────────────────────────────────────────────────────

export async function importURDF() {
  let picked: { name: string; bytes: Uint8Array } | null;
  try {
    const files = await pickFiles(['urdf', 'xml']);
    picked = files[0] ?? null;
  }
  catch (e: any) { alert(`Could not open file: ${e.message}`); return; }
  if (!picked) return;

  await useBusyStore.getState().run(`Importing ${picked.name}…`, async () => {
    const { parseURDF } = await import('@/core/serialization/importers/urdf');
    let result;
    try { result = parseURDF(new TextDecoder().decode(picked!.bytes)); }
    catch (e: any) { alert(`URDF import failed: ${e.message}`); return; }
    if (!result.entities.length) { alert('No links found in the URDF.'); return; }

    useModelStore.getState().dispatch(commands.addEntities(result.entities, `Import URDF: ${result.robotName}`));
    const firstBody = result.entities.find((e: any) => e.kind === 'body');
    if (firstBody) useSelectionStore.getState().select(firstBody.id, 'body');
    setTimeout(() => bridge.fitCamera?.(), 80);
    if (result.warnings.length) console.warn('URDF import warnings:\n' + result.warnings.join('\n'));
  });
}

// ── File picker (multi-select) ────────────────────────────────────────────────

async function pickFiles(filter: string[]): Promise<{ name: string; bytes: Uint8Array }[]> {
  if ((window as any).tetrobot?.isDesktop) {
    const res = await (window as any).tetrobot.openFile({
      filters: [{ name: 'Mesh / Scene', extensions: filter }, { name: 'All Files', extensions: ['*'] }],
      binary: true,
      multiple: true,
    });
    if (!res) return [];
    const arr = Array.isArray(res) ? res : [res];
    return arr.map((r: any) => ({ name: r.name, bytes: new Uint8Array(r.data) }));
  }
  return new Promise((resolve, reject) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.multiple = true;
    inp.accept = filter.map((e) => `.${e}`).join(',');
    inp.onchange = async () => {
      const files = Array.from(inp.files ?? []);
      if (!files.length) { resolve([]); return; }
      try {
        resolve(await Promise.all(
          files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })),
        ));
      } catch (e) { reject(e); }
    };
    inp.click();
  });
}
