const { app, Menu } = require('electron')
const { createShowWindow } = require('../windows/showWindow')
let showWindow = null

function createMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Nouveau',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            console.log('Clic sur Nouveau')
          }
        },
        {
          label: 'Ouvrir',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            console.log('Clic sur Ouvrir')
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Quitter',
          role: 'quit'
        }
      ]
    },

    {
      label: 'Structure',
      submenu: [
        {
          label: 'Familles',
          accelerator: 'CmdOrCtrl+F',
          click: () => handleOpenShow('/familles')
        },
        {
          label: 'Articles',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => handleOpenShow('/articles')
        },
        {
          type: 'separator'
        },
        {
          label: 'Clients',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => handleOpenShow('/clients')
        },
        {
          label: 'Fournisseurs',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => handleOpenShow('/fournisseurs')
        }
      ]
    },

    {
      label: 'Édition',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },

    {
      label: 'Affichage',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' }
      ]
    },

    {
      label: 'Fenêtre',
      submenu: [
        {
          role: 'minimize'
        },
        {
          role: 'close'
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)

  Menu.setApplicationMenu(menu)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

async function closeWindowIfOpen(win) {
  if (win && !win.isDestroyed()) {
    await new Promise((resolve) => {
      win.once('closed', resolve)
      win.close()
    })
  }
}

const handleOpenShow = async (url) => {
  try {
    await closeWindowIfOpen(showWindow)
    showWindow = createShowWindow({
      width: 500,
      height: 500,
      url
    })
    showWindow.show()
    return { success: true, id: showWindow.id }
  } catch (error) {
    console.error('openShow error:', error)
    return { success: false, error: error.message }
  }
}

module.exports = { createMenu }
