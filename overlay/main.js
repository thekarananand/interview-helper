const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

let win;

function createWindow() {
  const { screen } = require('electron');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 480,
    height: 600,
    x: width - 500,
    y: Math.floor(height * 0.1),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Highest z-order — stays above full-screen apps on macOS
  win.setAlwaysOnTop(true, 'screen-saver');

  // macOS: NSWindowSharingNone  |  Windows: SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)
  win.setContentProtection(true);

  // Mouse events pass through to windows beneath
  win.setIgnoreMouseEvents(true, { forward: true });

  // Survive desktop/Space switches on macOS
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  // Toggle settings panel
  globalShortcut.register('CommandOrControl+Shift+.', () => {
    if (win) win.webContents.send('toggle-settings');
  });

  // Allow clicking inside the overlay when settings panel is open
  ipcMain.on('set-ignore-mouse', (_, ignore) => {
    if (win) win.setIgnoreMouseEvents(ignore, { forward: true });
  });

  // Reposition the overlay to a corner sent from the sender UI
  ipcMain.on('move-window', (_, position) => {
    if (!win) return;
    const { screen } = require('electron');
    const { x: wx, y: wy, width, height } = screen.getPrimaryDisplay().workArea;
    const margin = 20;
    const { width: winWidth, height: winHeight } = win.getBounds();
    const coords = {
      'top-left':     { x: wx + margin,                    y: wy + margin },
      'top-right':    { x: wx + width - winWidth - margin, y: wy + margin },
      'bottom-left':  { x: wx + margin,                    y: wy + height - winHeight - margin },
      'bottom-right': { x: wx + width - winWidth - margin, y: wy + height - winHeight - margin },
    };
    const pos = coords[position];
    if (pos) win.setPosition(pos.x, pos.y);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Keep the app alive — never quit when all windows closed
app.on('window-all-closed', () => {});
