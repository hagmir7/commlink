const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  openShow: (payload) => ipcRenderer.invoke('openShow', payload)
})
