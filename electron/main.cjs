const electron = require('electron');
const path = require('path');

const { app, BrowserWindow, screen } = electron;

// Register petmind:// custom URL scheme so the web version can launch the desktop app.
// On Windows, the OS sends a second-instance event; on macOS it sends open-url.
// In dev mode (process.defaultApp), Electron is launched as `electron appDir` — the app path
// must be passed explicitly so the protocol handler knows where to find the app.
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient('petmind', process.execPath, [path.resolve(__dirname, '..')]);
} else {
  app.setAsDefaultProtocolClient('petmind');
}

// Single-instance lock — if petmind:// is clicked while Electron is already running,
// focus the existing window instead of opening a second one.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

const PET_STRIP = { height: 160 };

let win;

function createWindow() {
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
  const winY = y + height - PET_STRIP.height;
  console.log('[main] screen size:', width, height);

  win = new BrowserWindow({
    width,
    height: PET_STRIP.height,
    x,
    y: winY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('closed', () => {
    console.log('[main] window closed');
    win = null;
  });

  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.log('[main] did-fail-load:', code, desc);
  });

  win.webContents.on('did-finish-load', () => {
    console.log('[main] page loaded successfully');
  });

  win.webContents.on('render-process-gone', (e, details) => {
    console.log('[main] RENDERER CRASH:', JSON.stringify(details));
  });

  win.webContents.on('console-message', (e, level, msg) => {
    if (level >= 2) console.log('[renderer]', msg);
  });

  win.setIgnoreMouseEvents(true, { forward: true });
  win.setAlwaysOnTop(true, 'screen-saver');

  const isDev = !app.isPackaged;
  console.log('[main] isDev:', isDev);
  if (isDev) {
    const port = process.env.VITE_DEV_PORT || '5173';
    win.loadURL(`http://localhost:${port}`).catch(e => console.log('[main] loadURL error:', e.message));
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  console.log('[main] app ready');
  const { ipcMain } = electron;

  createWindow();

  // Windows: petmind:// clicked while app already running → focus window
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // macOS: petmind:// deep link
  app.on('open-url', (event) => {
    event.preventDefault();
    if (win) win.focus();
  });

  ipcMain.on('set-mouse-ignore', (_, ignore) => {
    if (!win) return;
    win.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.handle('get-screen-size', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return { width, height };
  });
});

app.on('window-all-closed', () => {
  console.log('[main] window-all-closed');
  if (process.platform !== 'darwin') app.quit();
});
