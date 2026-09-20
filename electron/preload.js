const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  openShow: (payload) => ipcRenderer.invoke('openShow', payload),
  minimizeWindow: (piece) => ipcRenderer.send('window-minimize', piece),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  restoreWindow: () => ipcRenderer.send('window-restore')
})
