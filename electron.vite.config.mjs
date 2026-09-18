import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Electron main process
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'electron/main.js')
      }
    }
  },

  // Electron preload
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'electron/preload.js')
      }
    }
  },

  // React renderer
  renderer: {
    root: resolve(__dirname, 'ui'),

    build: {
      rollupOptions: {
        input: resolve(__dirname, 'ui/index.html')
      }
    },

    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'ui')
      }
    },

    plugins: [react(), tailwindcss()]
  }
})
