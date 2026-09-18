const { BrowserWindow, app } = require('electron')
const path = require('path')

// In CommonJS, __dirname and __filename are provided automatically.
// No need for fileURLToPath / import.meta.url.

const isDev = process.env.NODE_ENV === 'development'

let mainWindowReference = null
let childWindow = null

const setMainWindow = (window) => {
  mainWindowReference = window
}

const createShowWindow = (data) => {
  if (childWindow) return childWindow

  childWindow = new BrowserWindow({
    width: data.width ?? 1200,
    height: data.height ?? 700,
    // resizable: data.resizable ?? false,
    // icon: path.join(__dirname, '..', 'assets', 'icon.png'),

    parent: mainWindowReference,
    modal: true,
    // minimizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js')
    }
  })

  if (isDev) {
    childWindow.loadURL(`http://localhost:5173/#${data.url}`)
  } else {
    childWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'), {
      hash: data.url
    })
    childWindow.setMenu(null)
  }

  childWindow.on('closed', () => {
    childWindow = null
  })

  return childWindow
}

module.exports = { setMainWindow, createShowWindow }
