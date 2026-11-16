const { BrowserWindow, app, screen } = require('electron')
const path = require('node:path')

const isDev = process.env.NODE_ENV === 'development'
let mainWindowReference = null

// Each detail window owns its own minimized bar and lifecycle.
const windows = new Map()

const setMainWindow = (window) => {
  mainWindowReference = window
}

const closeMinimizedWindow = (state) => {
  const bar = state.bar
  state.bar = null
  if (bar && !bar.isDestroyed()) bar.close()
}

const restoreWindow = (state) => {
  const win = state.window
  if (!win.isDestroyed()) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
  closeMinimizedWindow(state)
}

const createShowWindow = (data) => {
  const win = new BrowserWindow({
    width: data.width ?? 1200,
    height: data.height ?? 700,
    titleBarStyle: 'hidden',
    parent:
      mainWindowReference && !mainWindowReference.isDestroyed() ? mainWindowReference : undefined,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  const state = { window: win, bar: null }
  windows.set(win, state)

  if (isDev) {
    win.loadURL(`http://localhost:5173/#${data.url}`)
  } else {
    win.loadFile(path.join(app.getAppPath(), 'out/renderer', 'index.html'), {
      hash: data.url
    })
    win.setMenu(null)
  }

  win.on('closed', () => {
    windows.delete(win)
    closeMinimizedWindow(state)
  })
  return win
}

const minimizeWindow = (state, piece) => {
  const win = state.window
  if (state.bar && !state.bar.isDestroyed()) {
    win.hide()
    state.bar.show()
    state.bar.focus()
    return
  }

  const { x, y, height } = screen.getDisplayMatching(win.getBounds()).workArea
  const bar = new BrowserWindow({
    width: 360,
    height: 38,
    x: x + 10,
    y: y + height - 48,
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
  state.bar = bar
  win.hide()
  const query = piece ? `piece=${encodeURIComponent(piece)}` : ''
  if (isDev) {
    bar.loadURL(`http://localhost:5173/#/minimized-document?${query}`)
  } else {
    bar.loadFile(path.join(app.getAppPath(), 'out/renderer', 'index.html'), {
      hash: `/minimized-document?${query}`
    })
  }
  bar.on('closed', () => {
    // Native close should restore only this bar's owner.
    if (state.bar === bar) {
      state.bar = null
      if (!win.isDestroyed() && !win.isVisible()) restoreWindow(state)
    }
  })
}

const handleWindowControl = (win, action, piece) => {
  const state = windows.get(win) || [...windows.values()].find((entry) => entry.bar === win)
  if (!state) return false
  const isBar = state.bar === win

  if (action === 'close') {
    // Let the owner's closed event clean up only its own minimized bar.
    state.window.close()
  } else if (action === 'restore' || (isBar && action === 'maximize')) {
    restoreWindow(state)
  } else if (action === 'minimize' && !isBar) {
    minimizeWindow(state, piece)
  } else {
    return false
  }
  return true
}

module.exports = { setMainWindow, createShowWindow, handleWindowControl }
