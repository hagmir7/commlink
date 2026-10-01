const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('node:path')
const { autoUpdater } = require('electron-updater')

const isDev = process.env.NODE_ENV === 'development'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// ---------------------------------------------------------------------------
// Auto updater (registered once, not on every createLoginWindow() call)
// ---------------------------------------------------------------------------

let updaterInitialized = false

function initUpdater() {
  if (updaterInitialized) return
  updaterInitialized = true

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Mise à jour disponible',
      message: `Une nouvelle mise à jour est disponible.\nVersion actuelle : ${app.getVersion()}`,
      detail: `La version ${info.version} est en cours de téléchargement...`
    })

    autoUpdater.downloadUpdate().catch((error) => {
      dialog.showErrorBox('Update Error', error?.stack || String(error))
    })
  })

  autoUpdater.on('error', (error) => {
    dialog.showErrorBox('Update Error', error == null ? 'unknown' : error.stack || error.toString())
  })

  if (process.platform === 'win32' || process.env.APPIMAGE) {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error('Update check failed:', error)
    })
  }
}

// ---------------------------------------------------------------------------
// Login window
// ---------------------------------------------------------------------------

function createLoginWindow() {
  let loginWindow = new BrowserWindow({
    width: 600,
    height: 600,
    show: false,
    frame: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  loginWindow.once('ready-to-show', () => {
    if (loginWindow && !loginWindow.isDestroyed()) loginWindow.show()
  })

  if (isDev) {
    loginWindow.loadURL('http://localhost:5173/#login')
  } else {
    const indexPath = path.join(app.getAppPath(), 'out/renderer', 'index.html')
    loginWindow.loadFile(indexPath, { hash: 'login' })

    initUpdater()
  }

  // Resolve the target window from the IPC event itself rather than
  // closing over `loginWindow`, so a stale/destroyed reference is never used.
  const minimizeHandler = (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isDestroyed()) win.minimize()
  }

  const maximizeHandler = (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }

  const closeHandler = (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isDestroyed()) win.close()
  }

  ipcMain.on('window-minimize', minimizeHandler)
  ipcMain.on('window-maximize', maximizeHandler)
  ipcMain.on('window-close', closeHandler)

  loginWindow.on('maximize', () => {
    if (!loginWindow.isDestroyed()) {
      loginWindow.webContents.send('window-maximized', true)
    }
  })

  loginWindow.on('unmaximize', () => {
    if (!loginWindow.isDestroyed()) {
      loginWindow.webContents.send('window-maximized', false)
    }
  })

  // Remove the listeners when the window closes so they don't stack up
  // if a new login window is created later (e.g. after logout).
  loginWindow.on('closed', () => {
    ipcMain.removeListener('window-minimize', minimizeHandler)
    ipcMain.removeListener('window-maximize', maximizeHandler)
    ipcMain.removeListener('window-close', closeHandler)
    loginWindow = null
  })

  return loginWindow
}

// `default` keeps `const { default: createLoginWindow } = require('./windows/loginWindow')`
// in main.js working; the named export allows `const { createLoginWindow } = require(...)`.
module.exports = { default: createLoginWindow, createLoginWindow }
