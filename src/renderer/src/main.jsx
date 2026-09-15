import './assets/main.css'

import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import frFR from 'antd/locale/fr_FR'
import { ConfigProvider, theme } from 'antd'

import { router } from './routes'

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>
)
