const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')

test('image requests encode references, omit credentials, share requests and retry failures', async (t) => {
  const source = fs.readFileSync(path.join(__dirname, '../ui/api/productImages.js'), 'utf8')
  const { getProductImages } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  )
  const calls = []
  const responses = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return responses.shift()
  })

  assert.deepEqual(await getProductImages(''), [])
  assert.equal(calls.length, 0)
  responses.push({
    ok: true,
    status: 200,
    json: async () => ({
      images: [
        { id: 2, order: 2, url: 'https://app.intercocina.com/two.png' },
        { id: 3, order: 3, url: 'javascript:alert(1)' },
        { id: 1, order: 1, url: 'https://app.intercocina.com/one.png' }
      ]
    })
  })
  const first = getProductImages(' CAB/08 #1 ')
  assert.equal(getProductImages('CAB/08 #1'), first)
  assert.deepEqual(
    (await first).map((image) => image.id),
    [1, 2]
  )
  await getProductImages('CAB/08 #1')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://app.intercocina.com/api/products/images/CAB%2F08%20%231')
  assert.equal(calls[0].options.credentials, 'omit')
  assert.deepEqual(calls[0].options.headers, { Accept: 'application/json' })

  responses.push({ ok: false, status: 503 })
  await assert.rejects(getProductImages('RETRY'))
  responses.push({ ok: true, status: 200, json: async () => ({ images: [] }) })
  assert.deepEqual(await getProductImages('RETRY'), [])

  responses.push({ ok: false, status: 404 })
  assert.deepEqual(await getProductImages('MISSING'), [])
  responses.push({ ok: true, status: 200, json: async () => ({ unexpected: [] }) })
  await assert.rejects(getProductImages('INVALID'))
})

test('Electron image requests use the preload bridge instead of browser fetch', async (t) => {
  const source = fs.readFileSync(path.join(__dirname, '../ui/api/productImages.js'), 'utf8')
  const { getProductImages } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  )
  const previous = globalThis.window
  const calls = []
  globalThis.window = {
    api: {
      getProductImages: async (reference) => {
        calls.push(reference)
        return { images: [{ id: 1, order: 1, url: 'https://app.intercocina.com/native.png' }] }
      }
    }
  }
  t.after(() => {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  })
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Browser fetch should not run')
  })
  const images = await getProductImages('NATIVE')
  assert.equal(images.length, 1)
  assert.deepEqual(calls, ['NATIVE'])
})

test('native image handler sends its service key only to the fixed image endpoint', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../electron/main.js'), 'utf8')
  const start = source.indexOf("ipcMain.handle('products:get-images'")
  const end = source.indexOf("ipcMain.handle('login'", start)
  let handler
  const calls = []
  vm.runInNewContext(source.slice(start, end), {
    ipcMain: {
      handle: (_name, callback) => {
        handler = callback
      }
    },
    PRODUCT_IMAGES_API_KEY: 'test-service-key',
    AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, status: 200, json: async () => ({ images: [] }) }
    }
  })
  await handler({}, 'CAB/08')
  assert.equal(calls[0].url, 'https://app.intercocina.com/api/products/images/CAB%2F08')
  assert.equal(calls[0].options.headers['X-API-Key'], 'test-service-key')
  assert.equal(calls[0].options.headers.Authorization, undefined)
  assert.equal(calls[0].options.headers['X-Company'], undefined)
  await assert.rejects(handler({}, { url: 'https://other.example' }))
  assert.equal(calls.length, 1)
})
