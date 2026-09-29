const { app } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const sessionFile = path.join(app.getPath('userData'), 'session.json')

function saveSession(session) {
  try {
    fs.writeFileSync(sessionFile, JSON.stringify(session), 'utf8')
  } catch (error) {
    console.error('Failed to save session:', error)
  }
}

function loadSession() {
  try {
    if (!fs.existsSync(sessionFile)) return null

    const data = fs.readFileSync(sessionFile, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load session:', error)
    return null
  }
}

function clearSession() {
  try {
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile)
    }
  } catch (error) {
    console.error('Failed to clear session:', error)
  }
}

module.exports = {
  saveSession,
  loadSession,
  clearSession
}
