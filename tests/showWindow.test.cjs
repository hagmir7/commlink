const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')

function setup() {
  const created = []
  class MockWindow extends EventEmitter {
    constructor(options) {
      super()
      this.options = options
      this.visible = true
      this.destroyed = false
      created.push(this)
    }
    isDestroyed() {
      return this.destroyed
    }
    isVisible() {
      return this.visible
    }
    isMinimized() {
      return false
    }
    show() {
      this.visible = true
    }
    hide() {
      this.visible = false
    }
    focus() {}
    setMenu() {}
    getBounds() {
      return { x: 0, y: 0, width: 1200, height: 700 }
    }
    loadFile(file, options) {
      this.file = file
      this.hash = options.hash
    }
    close() {
      this.destroyed = true
      this.emit('closed')
    }
  }
  const loaded = { exports: {} }
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../electron/windows/showWindow.js'), 'utf8'),
    {
      require: (name) =>
        name === 'electron'
          ? {
              BrowserWindow: MockWindow,
              app: { getAppPath: () => '/app' },
              screen: { getDisplayMatching: () => ({ workArea: { x: 0, y: 0, height: 900 } }) }
            }
          : require(name),
      module: loaded,
      process: { env: {} },
      __dirname: '/app/electron/windows'
    }
  )
  return { ...loaded.exports, created }
}

test('opening and closing one detail window preserves other detail windows', () => {
  const { createShowWindow, handleWindowControl } = setup()
  const first = createShowWindow({ url: '/documents/ONE' })
  const second = createShowWindow({ url: '/clients/TWO' })
  assert.notEqual(first, second)
  assert.equal(first.isDestroyed(), false)
  assert.equal(first.options.modal, false)
  handleWindowControl(second, 'close')
  assert.equal(second.isDestroyed(), true)
  assert.equal(first.isDestroyed(), false)
  assert.equal(first.isVisible(), true)
})

test('each minimized bar restores or closes only its owner', () => {
  const { createShowWindow, handleWindowControl, created } = setup()
  const first = createShowWindow({ url: '/documents/ONE' })
  const second = createShowWindow({ url: '/documents/TWO' })
  handleWindowControl(first, 'minimize', 'ONE & 1')
  const firstBar = created.at(-1)
  handleWindowControl(second, 'minimize', 'TWO')
  const secondBar = created.at(-1)
  assert.match(firstBar.hash, /ONE%20%26%201/)
  assert.match(firstBar.file, /out[\\/]renderer[\\/]index.html$/)
  handleWindowControl(firstBar, 'close')
  assert.equal(first.isDestroyed(), true)
  assert.equal(firstBar.isDestroyed(), true)
  assert.equal(second.isDestroyed(), false)
  assert.equal(second.isVisible(), false)
  assert.equal(secondBar.isDestroyed(), false)
  handleWindowControl(secondBar, 'restore')
  assert.equal(second.isVisible(), true)
  assert.equal(secondBar.isDestroyed(), true)
})

test('native bar close restores its owner without changing another window', () => {
  const { createShowWindow, handleWindowControl, created } = setup()
  const first = createShowWindow({ url: '/documents/ONE' })
  const second = createShowWindow({ url: '/documents/TWO' })
  handleWindowControl(first, 'minimize')
  const firstBar = created.at(-1)
  handleWindowControl(second, 'minimize')
  const secondBar = created.at(-1)
  firstBar.close()
  assert.equal(first.isVisible(), true)
  assert.equal(second.isVisible(), false)
  assert.equal(secondBar.isDestroyed(), false)
  first.close()
  assert.equal(second.isDestroyed(), false)
  assert.equal(handleWindowControl(first, 'close'), false)
})

test('Valorisation close IPC closes its sender without entering document handlers', () => {
  const source = fs.readFileSync(path.join(__dirname, '../electron/main.js'), 'utf8')
  const handlers = new Map()
  const auxiliaryWindows = new Set()
  let documentControls = 0
  const opener = {
    destroyed: false,
    isDestroyed() {
      return this.destroyed
    },
    focus() {}
  }
  const child = {
    destroyed: false,
    isDestroyed() {
      return this.destroyed
    },
    close() {
      this.destroyed = true
    }
  }
  auxiliaryWindows.add(child)
  const context = {
    BrowserWindow: { fromWebContents: (sender) => sender.window },
    auxiliaryWindows,
    handleWindowControl: () => {
      documentControls++
      return true
    },
    ipcMain: { on() {}, handle: (name, fn) => handlers.set(name, fn) },
    app: { on() {} }
  }
  const start = source.indexOf('// Register once;')
  const end = source.indexOf("ipcMain.handle('show-error'", start)
  vm.runInNewContext(source.slice(start, end), context)
  handlers.get('close')({ sender: { window: child } })
  assert.equal(child.destroyed, true)
  assert.equal(opener.destroyed, false)
  assert.equal(documentControls, 0)
  // Even a misdirected auxiliary close request cannot close a document window.
  handlers.get('close')({ sender: { window: opener } })
  assert.equal(opener.destroyed, false)
  assert.equal(documentControls, 0)
})
