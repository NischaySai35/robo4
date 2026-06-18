/**
 * exportRobot — save the model graph as URDF or the IDL interface. Uses the
 * Electron native save dialog when available, else a browser download.
 */
import { exportURDF } from '@/core/serialization/exporters/urdf.js';
import { exportIDL } from '@/core/serialization/exporters/idl.js';
import { downloadBlob } from '@/core/serialization/fileIO.js';
import { useModelStore } from '@/state/modelStore.js';
import { useDocStore } from '@/state/docStore.js';

function robotName() {
  const n = useDocStore.getState().name;
  return n ? n.replace(/\.[^.]+$/, '') : 'tetrobot';
}

async function save(text, filename, ext) {
  if (window.tetrobot?.isDesktop) {
    await window.tetrobot.saveFile({
      data: text, defaultName: filename,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
  } else {
    downloadBlob(new Blob([text], { type: 'text/plain' }), filename);
  }
}

export async function exportRobot(fmt) {
  const doc = useModelStore.getState().doc;
  if (Object.keys(doc.bodies).length === 0) {
    alert('Nothing to export yet — add bodies/joints to the model first.');
    return;
  }
  const name = robotName();
  if (fmt === 'urdf') await save(exportURDF(doc, name), `${name}.urdf`, 'urdf');
  else if (fmt === 'idl') await save(exportIDL(doc, name), `${name}.idl`, 'idl');
}
