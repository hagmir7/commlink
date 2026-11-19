const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const { autoUpdater } = require('electron-updater')

let initialized = false
let state = { status: 'idle', revision: 0 }
const notifications = new Set()

function publish(update) {
  state = { ...state, ...update, revision: state.revision + 1 }
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    win.setProgressBar(state.status === 'downloading' ? state.percent / 100 : -1)
    if (!win.webContents.isDestroyed()) win.webContents.send('updater:state', state)
  }
}

function notify(title, body) {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body })
  notifications.add(notification)
  notification.on('close', () => notifications.delete(notification))
  notification.on('click', () => {
    const win = BrowserWindow.getAllWindows().find((window) => !window.isDestroyed())
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
  notification.show()
}

function reportError(error) {
  const message = error?.message || 'La mise à jour a échoué.'
  if (state.status === 'error' && state.message === message) return
  publish({ status: 'error', message })
  notify('Échec de la mise à jour', 'Le téléchargement de la mise à jour de Comlink a échoué.')
}

function initUpdater() {
  if (initialized) return
  initialized = true
  ipcMain.handle('updater:get-state', () => state)
  if (!app.isPackaged || (process.platform !== 'win32' && !process.env.APPIMAGE)) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => publish({ status: 'checking', message: '' }))
  autoUpdater.on('update-not-available', () => publish({ status: 'idle' }))
  autoUpdater.on('update-available', (info) => {
    publish({
      status: 'downloading',
      version: info.version,
      percent: 0,
      transferred: 0,
      total: 0,
      bytesPerSecond: 0
    })
    notify('Mise à jour disponible', `Comlink ${info.version} est en cours de téléchargement.`)
    autoUpdater.downloadUpdate().catch(reportError)
  })
  autoUpdater.on('download-progress', (progress) =>
    publish({
      status: 'downloading',
      percent: Math.min(100, Math.max(0, Number(progress.percent) || 0)),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    })
  )
  autoUpdater.on('update-downloaded', (info) => {
    publish({ status: 'downloaded', version: info.version, percent: 100 })
    notify(
      'Mise à jour prête',
      `Comlink ${info.version} sera installé à la fermeture de l’application.`
    )
  })
  autoUpdater.on('error', reportError)
  autoUpdater.checkForUpdates().catch(reportError)
}

module.exports = { initUpdater }
