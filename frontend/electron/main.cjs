/**
 * Electron main process — the desktop shell for TETROBOT.
 *
 * In development it loads the Vite dev server (hot reload); in a packaged build
 * it loads the static dist/index.html. This is also where TETROBOT gets native
 * powers a browser can't have: real file open/save dialogs (for .nischay project
 * files and STL/STEP mesh import) and, later, serial-port / child-process access
 * for hardware + ROS bridges. The renderer never touches Node directly — every
 * capability is exposed through the locked-down preload bridge (see preload.cjs).
 */
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
const isDev = !app.isPackaged;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#e4eaf3',
    autoHideMenuBar: true, // hide the default OS menu — TETROBOT has its own MenuBar
    title: 'TETROBOT',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload needs fs; renderer stays sandboxed via contextIsolation
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  // ── Web Serial / device access (Phase 11 hardware) ─────────────────────────
  // Electron needs the main process to grant device access and pick the serial
  // port (no built-in chooser). We auto-pick the first available port.
  const ses = mainWindow.webContents.session;
  mainWindow.webContents.on('select-serial-port', (event, portList, _wc, callback) => {
    event.preventDefault();
    callback(portList.length ? portList[0].portId : '');
  });
  ses.setPermissionCheckHandler((_wc, permission) => permission === 'serial' || true);
  ses.setDevicePermissionHandler(() => true);
  ses.setPermissionRequestHandler((_wc, _permission, cb) => cb(true));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ── Native file IPC ─────────────────────────────────────────────────────────
   The renderer calls these through window.tetrobot.* (see preload.cjs). Binary
   payloads cross the bridge as Uint8Array; we store them as Node Buffers. */

// Open a project / mesh file. `filters` describes the dialog file types.
ipcMain.handle('dialog:open', async (_evt, { filters, binary } = {}) => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  const filePath = res.filePaths[0];
  const buf = await fs.readFile(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    data: binary ? new Uint8Array(buf) : buf.toString('utf8'),
  };
});

// Save data to a chosen path (or a known path for silent re-saves).
ipcMain.handle('dialog:save', async (_evt, { filePath, data, filters, defaultName } = {}) => {
  let target = filePath;
  if (!target) {
    const res = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName || 'untitled.nischay',
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    if (res.canceled || !res.filePath) return null;
    target = res.filePath;
  }
  const payload = data instanceof Uint8Array ? Buffer.from(data) : Buffer.from(String(data), 'utf8');
  await fs.writeFile(target, payload);
  return { path: target, name: path.basename(target) };
});

// Read a file we already have a path to (no dialog) — used for autosave / reopen.
ipcMain.handle('file:read', async (_evt, { filePath, binary } = {}) => {
  if (!filePath) return null;
  const buf = await fs.readFile(filePath);
  return { path: filePath, name: path.basename(filePath), data: binary ? new Uint8Array(buf) : buf.toString('utf8') };
});
