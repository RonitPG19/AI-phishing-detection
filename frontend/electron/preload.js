const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanEmail: () => ipcRenderer.invoke('scan-email')
});