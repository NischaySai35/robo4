/**
 * exportRobot — save the model graph as URDF/SDF/MJCF/IDL. Uses the
 * Electron native save dialog when available, else a browser download.
 * URDF bundles accompanying mesh assets as separate STL downloads so the
 * exported package is self-contained (place mesh files in meshes/).
 */
import { exportURDF } from '@/core/serialization/exporters/urdf';
import { exportSDF } from '@/core/serialization/exporters/sdf';
import { exportMJCF } from '@/core/serialization/exporters/mjcf';
import { exportIDL } from '@/core/serialization/exporters/idl';
import { downloadBlob } from '@/core/serialization/fileIO';
import { useModelStore } from '@/state/modelStore';
import { useDocStore } from '@/state/docStore';

function robotName() {
  const n = useDocStore.getState().name;
  return n ? n.replace(/\.[^.]+$/, '') : 'tetrobot';
}

async function save(text: any, filename: any, ext: any) {
  if (window.tetrobot?.isDesktop) {
    await window.tetrobot.saveFile({
      data: text, defaultName: filename,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
  } else {
    downloadBlob(new Blob([text], { type: 'text/plain' }), filename);
  }
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function downloadMeshAssets(doc: any) {
  const meshBodies = Object.values(doc.bodies).filter((b: any) => b.visual?.geometry?.type === 'mesh');
  const seen = new Set<string>();
  const downloads: Array<{ data: ArrayBuffer; filename: string }> = [];

  for (const body of meshBodies as any[]) {
    const assetId = body.visual.geometry.assetId ?? body.assetId;
    if (!assetId || seen.has(assetId)) continue;
    seen.add(assetId);
    const asset = doc.assets[assetId];
    if (!asset?.data) continue;
    try {
      const buf = base64ToArrayBuffer(asset.data);
      downloads.push({ data: buf, filename: `meshes/${assetId}.stl` });
    } catch { /* skip malformed */ }
  }

  for (let i = 0; i < downloads.length; i++) {
    const { data, filename } = downloads[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 120)); // slight delay per file
    downloadBlob(new Blob([data], { type: 'model/stl' }), filename);
  }

  return downloads.length;
}

export async function exportRobot(fmt: any) {
  const doc = useModelStore.getState().doc;
  if (Object.keys(doc.bodies).length === 0) {
    alert('Nothing to export yet — add bodies/joints to the model first.');
    return;
  }
  const name = robotName();
  if (fmt === 'urdf') {
    await save(exportURDF(doc, name), `${name}.urdf`, 'urdf');
    const meshCount = await downloadMeshAssets(doc);
    if (meshCount > 0) {
      // Small gap before mesh files so URDF appears first in Downloads
      await new Promise((r) => setTimeout(r, 80));
      // meshes already triggered inside downloadMeshAssets
      console.info(`URDF: exported ${meshCount} mesh asset(s) as meshes/<id>.stl — place them alongside ${name}.urdf`);
    }
  } else if (fmt === 'sdf') {
    await save(exportSDF(doc, name), `${name}.sdf`, 'sdf');
  } else if (fmt === 'mjcf') {
    await save(exportMJCF(doc, name), `${name}.xml`, 'xml');
  } else if (fmt === 'idl') {
    await save(exportIDL(doc, name), `${name}.idl`, 'idl');
  }
}
