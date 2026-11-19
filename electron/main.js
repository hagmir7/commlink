const { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron')
const path = require('node:path')
const { electronApp, optimizer, is } = require('@electron-toolkit/utils')

const { default: createLoginWindow } = require('./windows/loginWindow')
const { createShowWindow, setMainWindow, handleWindowControl } = require('./windows/showWindow.js')
const { saveSession, loadSession, clearSession } = require('./session')

const { APP_ID, APP_NAME, TRAY_ICON_PATH, PRODUCT_IMAGES_API_KEY } = require('./config')
const { validatePdfUrl, downloadPdf, removePdf } = require('./services/pdf')
const { assertKnownPrinter, printPdf } = require('./services/print')
const whatsapp = require('./services/whatsapp')
const { createMenu } = require('./services/menu.js')
const { initUpdater } = require('./services/updater')

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let mainWindow = null
let loginWindow = null
const auxiliaryWindows = new Set()
let tray = null

// True once the user (or the OS) has actually asked to quit, as opposed to
// just closing the window. Closing the window should hide it, not quit.
let isQuitting = false

let currentSession = loadSession()

// ---------------------------------------------------------------------------
// Single instance lock
// ---------------------------------------------------------------------------

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    } else if (currentSession?.access_token) {
      mainWindow = createWindow()
    } else if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.show()
      loginWindow.focus()
    }
  })
}

// Windows-only: fixes notifications showing "Electron" as the app name.
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID)
}

// ---------------------------------------------------------------------------
// Window helpers
// ---------------------------------------------------------------------------

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    // autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  setMainWindow(win)

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(app.getAppPath(), 'out/renderer', 'index.html'))
  }

  win.once('ready-to-show', () => {
    if (win && !win.isDestroyed()) win.show()
  })

  // Close button hides to tray instead of quitting.
  win.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    win.hide()
  })

  win.on('closed', () => {
    mainWindow = null
  })

  return win
}

function showOrCreateMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    mainWindow = createWindow()
  }
}

function createTray() {
  if (tray) return tray

  tray = new Tray(nativeImage.createFromPath(TRAY_ICON_PATH))
  tray.setToolTip(APP_NAME)

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Open ${APP_NAME}`, click: showOrCreateMainWindow },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
  )

  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      showOrCreateMainWindow()
    }
  })

  return tray
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

function handleLoginSuccess(data) {
  currentSession = data
  saveSession(data)

  if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close()
  loginWindow = null

  showOrCreateMainWindow()
  createTray()
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

ipcMain.handle('app:get-version', () => app.getVersion())

ipcMain.handle('products:get-images', async (_event, reference) => {
  if (typeof reference !== 'string' || !reference.trim() || reference.length > 200) {
    throw new Error('Référence article invalide.')
  }
  if (!PRODUCT_IMAGES_API_KEY) throw new Error('Clé API images non configurée.')
  // Fixed origin and a separate service key; never forward Sage credentials.
  const response = await fetch(
    `https://app.intercocina.com/api/products/images/${encodeURIComponent(reference.trim())}`,
    {
      headers: { Accept: 'application/json', 'X-API-Key': PRODUCT_IMAGES_API_KEY },
      signal: AbortSignal.timeout(10000)
    }
  )
  if (response.status === 404) return { images: [] }
  if (!response.ok) throw new Error('Impossible de charger les images.')
  return response.json()
})

ipcMain.handle('login', async (_event, data) => {
  try {
    if (!data?.token) return { success: false, error: 'Access token missing.' }
    handleLoginSuccess(data)
    return { success: true }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('logout', async () => {
  try {
    currentSession = null
    clearSession()

    if (tray) {
      tray.destroy()
      tray = null
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      isQuitting = true // allow this specific close to go through
      mainWindow.close()
      mainWindow = null
      isQuitting = false
    }

    if (!loginWindow || loginWindow.isDestroyed()) {
      loginWindow = createLoginWindow()
    } else {
      loginWindow.show()
    }

    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-session', () => currentSession)

ipcMain.handle('user', async (_event, data) => {
  try {
    if (!data?.access_token) return null
    handleLoginSuccess(data)
    return true
  } catch (error) {
    console.log(error)
    return null
  }
})

ipcMain.handle('openShow', async (_event, payload) => {
  try {
    const showWindow = createShowWindow(payload)
    showWindow.show()
    return { success: true, id: showWindow.id }
  } catch (error) {
    console.error('openShow error:', error)
    return { success: false, error: error.message }
  }
})

// --- Printing ---------------------------------------------------------------

ipcMain.handle('get-printers', (e) => e.sender.getPrintersAsync())

ipcMain.handle('print-pdf-from-url', async (e, rawUrl, printerName, options) => {
  let file
  try {
    const url = validatePdfUrl(rawUrl)
    await assertKnownPrinter(e.sender, printerName)
    file = await downloadPdf(url, currentSession)
    await printPdf(file, printerName, { duplex: options?.duplex === true })
    return { success: true }
  } catch (error) {
    console.error('print error:', error)
    return { success: false, error: error.message }
  } finally {
    removePdf(file)
  }
})

// --- WhatsApp ---------------------------------------------------------------

ipcMain.handle('whatsapp:send-pdf-from-url', async (_e, rawUrl, options = {}) => {
  let file
  try {
    const url = validatePdfUrl(rawUrl)
    file = await downloadPdf(url, currentSession, options.fileName)
    const result = await whatsapp.sendPdf({
      phone: options.phone,
      message: options.message,
      filePath: file
    })
    return { success: true, mode: result.mode }
  } catch (error) {
    console.error('whatsapp error:', error)
    return { success: false, error: error.message }
  } finally {
    // Keep the file for 2 minutes: WhatsApp may still be uploading it.
    removePdf(file, 2 * 60 * 1000)
  }
})

ipcMain.handle('whatsapp:has-desktop', () => whatsapp.hasDesktopApp())

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    electronApp.setAppUserModelId(APP_ID)
    createMenu()
    initUpdater()

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    if (currentSession?.access_token) {
      mainWindow = createWindow()
      createTray()
    } else {
      loginWindow = createLoginWindow()
    }
  })
}

// The tray keeps the app alive while a session is active.
app.on('window-all-closed', () => {
  if (mainWindow || currentSession?.access_token) return
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
  } else if (currentSession?.access_token) {
    mainWindow = createWindow()
  } else if (!loginWindow || loginWindow.isDestroyed()) {
    loginWindow = createLoginWindow()
  }
})

ipcMain.handle('open', (event, data) => {
  const opener = BrowserWindow.fromWebContents(event.sender)
  const openWindow = new BrowserWindow({
    width: data?.width || 1000,
    height: data?.height || 550,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  auxiliaryWindows.add(openWindow)
  openWindow.on('closed', () => {
    auxiliaryWindows.delete(openWindow)
    if (opener && !opener.isDestroyed()) opener.focus()
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    openWindow.loadURL('http://localhost:5173/#' + data?.url)
  } else {
    const indexPath = path.join(app.getAppPath(), 'out/renderer', 'index.html')

    openWindow.loadFile(indexPath, {
      hash: data?.url
    })
  }
})

// Register once; each command targets the window that sent it.
const controlWindow = (event, action, piece) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win.isDestroyed()) return
  if (handleWindowControl(win, action, piece)) return
  if (action === 'close') win.close()
  else if (action === 'minimize') win.minimize()
  else if (action === 'maximize') {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  } else if (action === 'restore') {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
}

for (const action of ['close', 'minimize', 'maximize', 'restore']) {
  ipcMain.on(`window-${action}`, (event, piece) => controlWindow(event, action, piece))
}
// Auxiliary screens (including Valorisation) have their own close channel.
// Never forward this request into document/minimized-bar lifecycle handlers.
ipcMain.handle('close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win.isDestroyed() || !auxiliaryWindows.has(win)) return
  win.close()
})
ipcMain.handle('window:is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return !!win && !win.isDestroyed() && win.isMaximized()
})

app.on('browser-window-created', (_event, win) => {
  const notifyMaximized = () => {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('window-maximized', win.isMaximized())
    }
  }
  win.on('maximize', notifyMaximized)
  win.on('unmaximize', notifyMaximized)
})

ipcMain.handle('show-error', async (event, message) => {
  await dialog.showMessageBox({
    type: 'error',
    title: 'Erreur',
    message: message
  })
})
