const path = require('node:path')
const fs = require('node:fs')
const { app } = require('electron')

function getProductImagesApiKey() {
  if (process.env.PRODUCT_IMAGES_API_KEY) return process.env.PRODUCT_IMAGES_API_KEY
  const configFile = path.join(app.getAppPath(), 'product-images.local.json')
  if (!fs.existsSync(configFile)) return ''
  try {
    return JSON.parse(fs.readFileSync(configFile, 'utf8')).apiKey || ''
  } catch {
    return ''
  }
}

module.exports = {
  PRODUCT_IMAGES_API_KEY: getProductImagesApiKey(),
  // Must match the appId used by electron-builder.
  APP_ID: 'com.comlink.app',
  APP_NAME: 'Comlink',

  // Small (16x16 / 32x32) png, ideally with an @2x variant next to it.
  TRAY_ICON_PATH: path.join(__dirname, 'assets', 'trayIcon.png'),

  // Your API origin, e.g. 'https://api.comlink.com' (no path, no trailing slash).
  // Used to resolve relative PDF paths and to make sure the bearer token is
  // only ever sent to your own API. Leave empty to allow any https host.
  API_ORIGIN: process.env.API_ORIGIN || ''
}
