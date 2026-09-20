const { BrowserWindow, app, ipcMain, screen } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

let mainWindowReference = null
let childWindow = null
let minimizedWindow = null
let childWindowNormalBounds = null

const setMainWindow = (window) => {
  mainWindowReference = window
}

const closeMinimizedWindow = () => {
  if (minimizedWindow && !minimizedWindow.isDestroyed()) {
    minimizedWindow.close()
  }
  minimizedWindow = null
}

const createShowWindow = (data) => {
  if (childWindow && !childWindow.isDestroyed()) {
    childWindow.show()
    childWindow.focus()
    closeMinimizedWindow()
    return childWindow
  }

  childWindow = new BrowserWindow({
    width: data.width ?? 1200,
    height: data.height ?? 700,
    titleBarStyle: 'hidden',
    parent: mainWindowReference,
    modal: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
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
    childWindowNormalBounds = null
    closeMinimizedWindow()
  })

  return childWindow
}

ipcMain.on('window-minimize', (event, piece) => {
  if (!childWindow || childWindow.isDestroyed()) return

  childWindowNormalBounds = childWindow.getBounds()
  childWindow.hide()

  if (minimizedWindow && !minimizedWindow.isDestroyed()) {
    minimizedWindow.show()
    minimizedWindow.focus()
    return
  }

  const display = screen.getDisplayMatching(childWindowNormalBounds)
  const { x, y, height } = display.workArea

  const minimizedWidth = 360
  const minimizedHeight = 38
  const margin = 10

  minimizedWindow = new BrowserWindow({
    width: minimizedWidth,
    height: minimizedHeight,
    x: x + margin,
    y: y + height - minimizedHeight - margin,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const query = piece ? `piece=${piece}` : ''

  if (isDev) {
    minimizedWindow.loadURL(`http://localhost:5173/#/minimized-document?${query}`)
  } else {
    minimizedWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'), {
      hash: `/minimized-document?${query}`
    })
  }

  minimizedWindow.on('closed', () => {
    minimizedWindow = null
  })
})

ipcMain.on('window-restore', () => {
  if (!childWindow || childWindow.isDestroyed()) return

  if (childWindowNormalBounds) {
    childWindow.setBounds(childWindowNormalBounds)
  }

  childWindow.show()
  childWindow.focus()
  closeMinimizedWindow()
})

ipcMain.on('window-maximize', () => {
  if (!childWindow || childWindow.isDestroyed()) return

  childWindow.show()

  if (childWindow.isMaximized()) {
    childWindow.unmaximize()
  } else {
    childWindow.maximize()
  }

  childWindow.focus()
  closeMinimizedWindow()
})

ipcMain.on('window-close', () => {
  if (childWindow && !childWindow.isDestroyed()) {
    childWindow.close()
  }
  closeMinimizedWindow()
})

module.exports = {
  setMainWindow,
  createShowWindow
}
