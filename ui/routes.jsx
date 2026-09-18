import { lazy } from 'react'
import { createHashRouter } from 'react-router-dom'

import ErrorPage from './pages/error-page'
import MainLayout from './layouts/MainLayout'
import CreateDocument from './pages/create-document'

const Home = lazy(() => import('./pages/Home'))

export const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: '*',
        element: <ErrorPage />
      }
    ]
  },
  {
    path: '/create-document',
    element: <CreateDocument />
  },
  {
    path: '/documents/:piece',
    element: <CreateDocument />
  }
])
