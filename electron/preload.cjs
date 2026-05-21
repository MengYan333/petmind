const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  setMouseIgnore: (ignore) => ipcRenderer.send('set-mouse-ignore', ignore),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
});
