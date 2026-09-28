const { app, shell, BrowserWindow, ipcMain, net } = require('electron')
const { join } = require('node:path')
const { electronApp, optimizer, is } = require('@electron-toolkit/utils')
const { createShowWindow, setMainWindow } = require('./windows/showWindow.js')
const { pipeline } = require('stream/promises')
const { Readable } = require('stream')
const path = require('node:path')
const fs = require('fs')

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

async function downloadPdf(url) {
  const filePath = path.join(app.getPath('temp'), `print-${Date.now()}.pdf`)

  const response = await net.fetch(url) // or global fetch in Electron 28+
  if (!response.ok) throw new Error(`Download failed: ${response.status}`)

  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(filePath))
  return filePath
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

ipcMain.handle('print-pdf-from-url', async (_e, url, printerName, options) => {
  console.log('print options:', { printerName, duplex: options?.duplex })
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') throw new Error('Only https URLs are allowed')

  const file = await downloadPdf(url)
  try {
    await printPdf(file, printerName, { duplex: options?.duplex === true })
    return { success: true }
  } catch (error) {
    console.error('print error:', error)
    return { success: false, error: error.message }
  } finally {
    fs.unlink(file, () => {})
  }
})
ipcMain.handle('get-printers', (e) => e.sender.getPrintersAsync())
