const { app, shell } = require('electron')
const { execFile } = require('node:child_process')

// Tune these if WhatsApp is slow to open on your machines.
const DESKTOP_OPEN_DELAY = 7000
const WEB_OPEN_DELAY = 12000 // WhatsApp Web must already be logged in
const AFTER_TEXT_DELAY = 1500
const PREVIEW_DELAY = 4000
const AFTER_SEND_DELAY = 3000

let busy = false // keystroke automation: only one send at a time

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const run = (cmd, args) =>
  new Promise((resolve, reject) =>
    execFile(cmd, args, { windowsHide: true }, (err, out) => (err ? reject(err) : resolve(out)))
  )
const powershell = (script) =>
  run('powershell', ['-NoProfile', '-NonInteractive', '-Command', script])
const osascript = (script) => run('osascript', ['-e', script])

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) {
    throw new Error('Invalid phone number (use country code, digits only)')
  }
  return digits
}

// True when an app is registered for whatsapp:// (WhatsApp Desktop installed).
function hasDesktopApp() {
  try {
    return Boolean(app.getApplicationNameForProtocol('whatsapp://'))
  } catch {
    return false
  }
}

async function pressKey(kind) {
  if (process.platform === 'win32') {
    const keys = kind === 'paste' ? '^v' : '{ENTER}'
    await powershell(
      `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keys}')`
    )
  } else if (process.platform === 'darwin') {
    await osascript(
      kind === 'paste'
        ? 'tell application "System Events" to keystroke "v" using command down'
        : 'tell application "System Events" to key code 36'
    )
  } else {
    throw new Error('Sending files automatically is supported on Windows and macOS only')
  }
}

async function copyFileToClipboard(filePath) {
  if (process.platform === 'win32') {
    await powershell(`Set-Clipboard -Path '${filePath.replace(/'/g, "''")}'`)
  } else if (process.platform === 'darwin') {
    const escaped = filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    await osascript(`set the clipboard to (POSIX file "${escaped}")`)
  } else {
    throw new Error('Sending files automatically is supported on Windows and macOS only')
  }
}

/**
 * Opens WhatsApp Desktop (or WhatsApp Web as fallback) on the chat with
 * `phone`, sends `message`, then sends the PDF at `filePath`.
 */
async function sendPdf({ phone, message, filePath }) {
  if (busy) throw new Error('Another WhatsApp send is already in progress')
  busy = true

  try {
    const number = normalizePhone(phone)
    const text = encodeURIComponent(message || '')
    const desktop = hasDesktopApp()

    const url = desktop
      ? `whatsapp://send?phone=${number}&text=${text}`
      : `https://web.whatsapp.com/send?phone=${number}&text=${text}`

    await shell.openExternal(url)
    await sleep(desktop ? DESKTOP_OPEN_DELAY : WEB_OPEN_DELAY)

    if (message) {
      await pressKey('enter') // send the text
      await sleep(AFTER_TEXT_DELAY)
    }

    await copyFileToClipboard(filePath)
    await pressKey('paste')
    await sleep(PREVIEW_DELAY)
    await pressKey('enter') // send the PDF
    await sleep(AFTER_SEND_DELAY) // let the upload start before we return

    return { mode: desktop ? 'desktop' : 'web' }
  } finally {
    busy = false
  }
}

module.exports = { sendPdf, hasDesktopApp }
