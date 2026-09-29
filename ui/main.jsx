import './assets/main.css'

import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import frFR from 'antd/locale/fr_FR'
import { ConfigProvider, theme } from 'antd'
import '@fontsource/inter' // Defaults to weight 400
import '@fontsource/inter/400.css' // Specify weight
import '@fontsource/inter/400-italic.css' // Specify weight and style

import { router } from './routes'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Suspense>
        <ConfigProvider
          theme={{
            algorithm: theme.defaultAlgorithm,
            token: {
              colorPrimary: '#16a34a',
              borderRadius: 8,
              fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }
          }}

          locale={frFR}
        >
          <RouterProvider router={router} />
        </ConfigProvider>
      </Suspense>
    </AuthProvider>
  </StrictMode>
)
