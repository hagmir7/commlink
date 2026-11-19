const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')

function setup(packaged = true) {
  const updater = new EventEmitter()
  let checks = 0
  let downloads = 0
  updater.checkForUpdates = async () => {
    checks++
  }
  updater.downloadUpdate = async () => {
    downloads++
  }
  const handlers = new Map()
  const sent = []
  const progress = []
  const notices = []
  class Notification extends EventEmitter {
    static isSupported() {
      return true
    }
    constructor(options) {
      super()
      this.options = options
      notices.push(this)
    }
    show() {}
  }
  const window = {
    isDestroyed: () => false,
    setProgressBar: (value) => progress.push(value),
    webContents: {
      isDestroyed: () => false,
      send: (channel, state) => sent.push({ channel, state })
    }
  }
  const loaded = { exports: {} }
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../electron/services/updater.js'), 'utf8'),
    {
      require: (name) =>
        name === 'electron-updater'
          ? { autoUpdater: updater }
          : {
              app: { isPackaged: packaged },
              BrowserWindow: { getAllWindows: () => [window] },
              ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
              Notification
            },
      process: { platform: 'win32', env: {} },
      module: loaded
    }
  )
  return {
    ...loaded.exports,
    updater,
    handlers,
    sent,
    progress,
    notices,
    checks: () => checks,
    downloads: () => downloads
  }
}

test('updater registers once and skips real checks in development', () => {
  const dev = setup(false)
  dev.initUpdater()
  assert.equal(dev.checks(), 0)
  assert.equal(dev.handlers.get('updater:get-state')().status, 'idle')
  const app = setup()
  app.initUpdater()
  app.initUpdater()
  assert.equal(app.checks(), 1)
  assert.equal(app.updater.listenerCount('download-progress'), 1)
})

test('progress survives window changes and downloaded updates clear taskbar progress', () => {
  const app = setup()
  app.initUpdater()
  app.updater.emit('update-available', { version: '2.0.0' })
  assert.equal(app.downloads(), 1)
  app.updater.emit('download-progress', {
    percent: 42,
    transferred: 420,
    total: 1000,
    bytesPerSecond: 20
  })
  const state = app.handlers.get('updater:get-state')()
  assert.equal(state.percent, 42)
  assert.equal(state.transferred, 420)
  assert.equal(state.version, '2.0.0')
  assert.equal(app.progress.at(-1), 0.42)
  assert.equal(app.sent.at(-1).channel, 'updater:state')
  app.updater.emit('update-downloaded', { version: '2.0.0' })
  assert.equal(app.handlers.get('updater:get-state')().status, 'downloaded')
  assert.equal(app.progress.at(-1), -1)
  assert.equal(app.notices.length, 2)
  assert.equal(app.updater.autoInstallOnAppQuit, true)
})

test('errors clear taskbar progress and duplicate errors produce one notification', () => {
  const app = setup()
  app.initUpdater()
  app.updater.emit('error', new Error('Network unavailable'))
  app.updater.emit('error', new Error('Network unavailable'))
  assert.equal(app.handlers.get('updater:get-state')().status, 'error')
  assert.equal(app.progress.at(-1), -1)
  assert.equal(app.notices.length, 1)
})
