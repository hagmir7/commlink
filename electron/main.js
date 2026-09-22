const { app, shell, BrowserWindow, ipcMain } = require('electron')
const { join } = require('node:path')
const { electronApp, optimizer, is } = require('@electron-toolkit/utils')
const { createShowWindow, setMainWindow } = require('./windows/showWindow.js')

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('openShow', async (_event, payload) => {
  try {
    const win = createShowWindow(payload)
    return { success: true, id: win.id }
  } catch (error) {
    console.error('openShow error:', error)
    return { success: false, error: error.message }
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.intercocina.commlink')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
