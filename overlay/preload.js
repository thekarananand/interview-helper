const { contextBridge, ipcRenderer } = require('electron');

// electron-store must be used in the main process; we proxy through IPC.
// For simplicity in MVP we use localStorage in the renderer (no sensitive data).
contextBridge.exposeInMainWorld('electronAPI', {
  onToggleSettings: (cb) => ipcRenderer.on('toggle-settings', cb),
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  moveWindow: (position) => ipcRenderer.send('move-window', position),
  quit: () => ipcRenderer.send('quit-app'),
  getServerUrls: () => ipcRenderer.invoke('get-server-urls'),
});
