/**
 * exportRobot — save the model graph as URDF or the IDL interface. Uses the
 * Electron native save dialog when available, else a browser download.
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

export async function exportRobot(fmt: any) {
  const doc = useModelStore.getState().doc;
  if (Object.keys(doc.bodies).length === 0) {
    alert('Nothing to export yet — add bodies/joints to the model first.');
    return;
  }
  const name = robotName();
  if (fmt === 'urdf') await save(exportURDF(doc, name), `${name}.urdf`, 'urdf');
  else if (fmt === 'sdf') await save(exportSDF(doc, name), `${name}.sdf`, 'sdf');
  else if (fmt === 'mjcf') await save(exportMJCF(doc, name), `${name}.xml`, 'xml');
  else if (fmt === 'idl') await save(exportIDL(doc, name), `${name}.idl`, 'idl');
}