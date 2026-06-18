/**
 * Preload — the ONLY bridge between the sandboxed renderer (React app) and Node.
 *
 * contextIsolation keeps the page from touching Node directly; we hand it a tiny,
 * explicit `window.tetrobot` API instead. The renderer can detect it's running
 * in the desktop shell via `window.tetrobot?.isDesktop` and fall back to the
 * browser File System Access API when it's not.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tetrobot', {
  isDesktop: true,
  platform: process.platform,

  // Open a file via native dialog. opts: { filters, binary }
  openFile: (opts) => ipcRenderer.invoke('dialog:open', opts),

  // Save data. opts: { filePath?, data, filters?, defaultName? }
  // Omit filePath to prompt; pass it for silent re-saves.
  saveFile: (opts) => ipcRenderer.invoke('dialog:save', opts),

  // Read a known path without a dialog. opts: { filePath, binary }
  readFile: (opts) => ipcRenderer.invoke('file:read', opts),

  // Optional cloud AI bridge. The main process reads ANTHROPIC_API_KEY.
  askAnthropic: (opts) => ipcRenderer.invoke('ai:anthropic', opts),

  // Local offline AI via Ollama (no key, no internet). Falls back gracefully.
  askOllama: (opts) => ipcRenderer.invoke('ai:ollama', opts),
  ollamaStatus: () => ipcRenderer.invoke('ai:ollama-status'),
});
