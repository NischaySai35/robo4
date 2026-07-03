/**
 * fileIO.js — explicit Save/Open of encrypted .nischay project files.
 *
 * Uses the File System Access API (real OS save/open dialogs) where available
 * (Chromium), with a download / <input type=file> fallback elsewhere. Files are
 * the binary .nischay container (see codec.js), not plain JSON.
 */

import { encodeProject, decodeProject } from './codec';

// Use a custom vendor MIME type, NOT application/octet-stream: the generic
// octet-stream type makes Chromium/Windows expand the save filter to every
// extension registered for "binary" (.com, .exe, .bin, …) alongside .nischay.
// A made-up type nothing else claims keeps the dialog to just .nischay.
const ACCEPT_SAVE = { 'application/x-nischay': ['.nischay'] };
const ACCEPT_OPEN = { 'application/x-nischay': ['.nischay'] };

export function downloadBlob(blob: any, filename: any) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Encrypt + save a project object. Returns { name, handle } (handle null on download fallback), or null if cancelled. */
export async function saveProjectToFile(project: any, suggestedName = 'untitled.nischay') {
  const bytes = await encodeProject(project);

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'TETROBOT Project', accept: ACCEPT_SAVE }],
      });
      const w = await handle.createWritable();
      await w.write(bytes);
      await w.close();
      return { name: handle.name, handle };
    } catch (e) {
      if (e?.name === 'AbortError') return null;
      // fall through to download fallback
    }
  }

  downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' }), suggestedName);
  return { name: suggestedName, handle: null };
}

/** Open + decrypt a .nischay file → { data, name, handle }, or null if cancelled. Throws on bad file. */
export async function openProjectFromFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'TETROBOT Project', accept: ACCEPT_OPEN }],
      });
      const file = await handle.getFile();
      const data = await decodeProject(await file.arrayBuffer());
      return { data, name: handle.name, handle };
    } catch (e) {
      if (e?.name === 'AbortError') return null;
      throw e; // decode / read error
    }
  }

  return new Promise((resolve, reject) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.nischay';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) { resolve(null); return; }
      try { resolve({ data: await decodeProject(await f.arrayBuffer()), name: f.name, handle: null }); }
      catch (e) { reject(e); }
    };
    inp.click();
  });
}

/** Silently re-encrypt + write a project to an already-granted file handle (for auto-save). */
export async function writeProjectToHandle(handle: any, project: any) {
  const bytes = await encodeProject(project);
  const w = await handle.createWritable();
  await w.write(bytes);
  await w.close();
}