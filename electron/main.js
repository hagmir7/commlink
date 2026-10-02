const { app, shell, BrowserWindow, ipcMain, net, Tray, Menu, nativeImage } = require('electron')
const path = require('node:path')
const fs = require('fs')
const { pipeline } = require('stream/promises')
const { Readable } = require('stream')
const { electronApp, optimizer, is } = require('@electron-toolkit/utils')

const { default: createLoginWindow } = require('./windows/loginWindow')
const { createShowWindow, setMainWindow } = require('./windows/showWindow.js')
const { saveSession, loadSession, clearSession } = require('./session')

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Must match the appId used to build/package the app (electron-builder config).
const APP_ID = 'com.comlink.app'
const APP_NAME = 'Comlink'

// Small (16x16 / 32x32) png, ideally with an @2x variant next to it.
const TRAY_ICON_PATH = path.join(__dirname, 'assets', 'trayIcon.png')

// Your API origin, e.g. 'https://api.comlink.com' (no path, no trailing slash).
// When set, it is used to (a) resolve relative PDF paths like "/api/print/1.pdf"
// and (b) make sure the bearer token is only ever sent to your own API.
// Leave empty ('') to skip both (absolute URLs only, any host).
const API_ORIGIN = process.env.API_ORIGIN || ''

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let mainWindow = null
let loginWindow = null
let showWindow = null
let tray = null

// True once the user (or the OS) has actually asked to quit, as opposed to
// just closing the window. Closing the window should hide it, not quit.
let isQuitting = false

let currentSession = loadSession()

// ---------------------------------------------------------------------------
// Single instance lock
// ---------------------------------------------------------------------------
//
// requestSingleInstanceLock() returns false in the SECOND process (the one
// that just got launched) — that process should just quit. It returns true
// in the FIRST/original process, which is where we listen for
// "second-instance" so we can bring the existing window to front instead.

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

// ---------------------------------------------------------------------------
// Windows-only: fixes notifications showing "Electron" as the app name.
// Must be set before app.whenReady().
// ---------------------------------------------------------------------------

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
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Set to true if your preload doesn't need Node APIs directly.
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
    const indexPath = path.join(app.getAppPath(), 'out/renderer', 'index.html')
    win.loadFile(indexPath)
  }

  win.once('ready-to-show', () => {
    if (win && !win.isDestroyed()) win.show()
  })

  // Intercept the close button: hide to tray instead of quitting.
  // Only let the window actually close when the app is genuinely quitting.
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

  const icon = nativeImage.createFromPath(TRAY_ICON_PATH)
  tray = new Tray(icon)

  tray.setToolTip(APP_NAME)

  const contextMenu = Menu.buildFromTemplate([
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

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      showOrCreateMainWindow()
    }
  })

  return tray
}

async function closeWindowIfOpen(win) {
  if (win && !win.isDestroyed()) {
    await new Promise((resolve) => {
      win.once('closed', resolve)
      win.close()
    })
  }
}

// ---------------------------------------------------------------------------
// Session lifecycle helpers
// ---------------------------------------------------------------------------

function handleLoginSuccess(data) {
  currentSession = data
  saveSession(data)

  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close()
  }
  loginWindow = null

  showOrCreateMainWindow()
  createTray()
}

// ---------------------------------------------------------------------------
// Printing helpers
// ---------------------------------------------------------------------------

/**
 * Validates and normalizes the URL the renderer asks us to download.
 *  - Must be a string.
 *  - Relative paths ("/api/x.pdf") are resolved against API_ORIGIN (if set).
 *  - https is always allowed. http is allowed only in dev (local API).
 *  - If API_ORIGIN is set, the origin must match so the token never leaks.
 * Returns the normalized URL string.
 */
function validatePrintUrl(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error(`Invalid PDF URL: ${JSON.stringify(input)}`)
  }

  let parsed
  try {
    parsed = new URL(input.trim(), API_ORIGIN || undefined)
  } catch {
    throw new Error(`Invalid PDF URL: ${input}`)
  }

  const isHttps = parsed.protocol === 'https:'
  const isDevHttp = is.dev && parsed.protocol === 'http:'
  if (!isHttps && !isDevHttp) {
    throw new Error(`Only https URLs are allowed (got "${parsed.protocol}")`)
  }

  if (API_ORIGIN && parsed.origin !== new URL(API_ORIGIN).origin) {
    throw new Error(`URL origin not allowed: ${parsed.origin}`)
  }

  return parsed.toString()
}

async function downloadPdf(url) {
  const filePath = path.join(app.getPath('temp'), `print-${Date.now()}.pdf`)
  const company = currentSession?.user?.company
  if (!company) throw new Error('No company in session')

  const token = currentSession?.access_token || currentSession?.token
  if (!token) throw new Error('No token in session')

  try {
    const response = await net.fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Company': company
      }
    })
    if (!response.ok) throw new Error(`Download failed: ${response.status}`)
    if (!response.body) throw new Error('Empty response body')

    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(filePath))
    return filePath
  } catch (error) {
    fs.unlink(filePath, () => {})
    throw error
  }
}

async function printPdf(filePath, printerName, { duplex = false } = {}) {
  if (process.platform === 'win32') {
    const { print } = require('pdf-to-printer')
    // Always send the value explicitly so the printer's default is never used
    const opts = { sides: duplex ? 'duplexlong' : 'simplex' }
    if (printerName) opts.printer = printerName
    await print(filePath, opts)
  } else {
    const { print } = require('unix-print')
    const sides = duplex ? 'two-sided-long-edge' : 'one-sided'
    await print(filePath, printerName || undefined, [`-o sides=${sides}`])
  }
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

ipcMain.handle('app:get-version', () => app.getVersion())

ipcMain.handle('login', async (_event, data) => {
  try {
    if (!data?.token) {
      return { success: false, error: 'Access token missing.' }
    }

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
      isQuitting = false // restore hide-to-tray behavior for the next window
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

ipcMain.handle('openShow', async (_event, payload) => {
  try {
    await closeWindowIfOpen(showWindow)

    showWindow = createShowWindow(payload)
    showWindow.show()

    return { success: true, id: showWindow.id }
  } catch (error) {
    console.error('openShow error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-printers', (e) => e.sender.getPrintersAsync())

ipcMain.handle('print-pdf-from-url', async (e, rawUrl, printerName, options) => {
  let file
  try {
    const url = validatePrintUrl(rawUrl)

    // Only allow printers the OS actually reports.
    if (printerName) {
      const printers = await e.sender.getPrintersAsync()
      if (!printers.some((p) => p.name === printerName)) {
        throw new Error('Unknown printer')
      }
    }

    file = await downloadPdf(url)
    await printPdf(file, printerName, { duplex: options?.duplex === true })
    return { success: true }
  } catch (error) {
    console.error('print error:', error)
    return { success: false, error: error.message }
  } finally {
    if (file) fs.unlink(file, () => {})
  }
})

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    electronApp.setAppUserModelId(APP_ID)

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

// The main window hides instead of closing, so this only fires in edge
// cases (e.g. the login window closing before a session exists). Don't quit
// while a session is active — the tray keeps the app alive.
app.on('window-all-closed', () => {
  if (mainWindow || currentSession?.access_token) return

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Fired by Cmd+Q / Quit menu item / app.quit(). Make sure the "close"
// handler on the window lets it close instead of hiding it again.
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

ipcMain.handle('user', async (event, data) => {
  try {
    if (!data?.access_token) return null
    handleLoginSuccess(data)
    return true
  } catch (error) {
    console.log(error)
    return null
  }
})
