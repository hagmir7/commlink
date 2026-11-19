const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const isDev = process.env.NODE_ENV === 'development'

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
  }

  loginWindow.on('closed', () => {
    loginWindow = null
  })

  return loginWindow
}

// `default` keeps `const { default: createLoginWindow } = require('./windows/loginWindow')`
// in main.js working; the named export allows `const { createLoginWindow } = require(...)`.
module.exports = { default: createLoginWindow, createLoginWindow }
