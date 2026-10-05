const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // App
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  // Auth / session
  login: (data) => ipcRenderer.invoke('login', data),
  logout: () => ipcRenderer.invoke('logout'),
  getSession: () => ipcRenderer.invoke('get-session'),

  // Windows
  openShow: (payload) => ipcRenderer.invoke('openShow', payload),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  restoreWindow: () => ipcRenderer.send('window-restore'),
  user: (payload) => ipcRenderer.invoke('user', payload),

  // Fired by loginWindow.js when the window is maximized/unmaximized.
  // Returns an unsubscribe function so the renderer can clean up.
  onWindowMaximized: (callback) => {
    const listener = (_event, isMaximized) => callback(isMaximized)
    ipcRenderer.on('window-maximized', listener)
    return () => ipcRenderer.removeListener('window-maximized', listener)
  },

  // Printing
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printPdf: (url, printerName, options) =>
    ipcRenderer.invoke('print-pdf-from-url', url, printerName, options),

  whatsappSendPdf: (url, opts) => ipcRenderer.invoke('whatsapp:send-pdf-from-url', url, opts),
  whatsappHasDesktop: () => ipcRenderer.invoke('whatsapp:has-desktop')
})
