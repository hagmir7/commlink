const { app, net } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pipeline } = require('node:stream/promises')
const { Readable } = require('node:stream')
const { API_ORIGIN } = require('../config')

/**
 * Validates and normalizes the URL the renderer asks us to download.
 *  - Relative paths are resolved against API_ORIGIN (if set).
 *  - http and https are both allowed.
 *  - If API_ORIGIN is set, the origin must match so the token never leaks.
 */
function validatePdfUrl(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error(`Invalid PDF URL: ${JSON.stringify(input)}`)
  }

  let parsed
  try {
    parsed = new URL(input.trim(), API_ORIGIN || undefined)
  } catch {
    throw new Error(`Invalid PDF URL: ${input}`)
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Only http(s) URLs are allowed (got "${parsed.protocol}")`)
  }

  if (API_ORIGIN && parsed.origin !== new URL(API_ORIGIN).origin) {
    throw new Error(`URL origin not allowed: ${parsed.origin}`)
  }

  return parsed.toString()
}

function safeFileName(name) {
  const base = String(name || 'document')
    .replace(/[^\w\-. ]+/g, '_')
    .replace(/\.pdf$/i, '')
  return `${base || 'document'}.pdf`
}

/**
 * Downloads the PDF into its own temp folder (so the file keeps a nice name,
 * which matters when it is sent through WhatsApp). Returns the file path.
 * Always call removePdf(filePath) when you are done with it.
 */
async function downloadPdf(url, session, fileName) {
  const company = session?.user?.company
  if (!company) throw new Error('No company in session')

  const token = session?.access_token || session?.token
  if (!token) throw new Error('No token in session')

  const dir = await fs.promises.mkdtemp(path.join(app.getPath('temp'), 'comlink-'))
  const filePath = path.join(dir, safeFileName(fileName || `print-${Date.now()}`))

  try {
    const response = await net.fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'X-Company': company }
    })
    if (!response.ok) throw new Error(`Download failed: ${response.status}`)
    if (!response.body) throw new Error('Empty response body')

    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(filePath))
    return filePath
  } catch (error) {
    removePdf(filePath)
    throw error
  }
}

// delayMs > 0 keeps the file around a bit longer (WhatsApp uploads the
// attachment in the background after the send key is pressed).
function removePdf(filePath, delayMs = 0) {
  if (!filePath) return
  const remove = () => fs.rm(path.dirname(filePath), { recursive: true, force: true }, () => {})
  if (delayMs > 0) setTimeout(remove, delayMs)
  else remove()
}

module.exports = { validatePdfUrl, downloadPdf, removePdf }
