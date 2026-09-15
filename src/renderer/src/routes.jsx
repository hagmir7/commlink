import { lazy } from 'react'
import { createHashRouter } from 'react-router-dom'

// import Login from './pages/login'
import MainLayout from './layouts/MainLayout'
import ErrorPage from './pages/error-page'

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
    // path: '/login',
    // element: <Login />
  }
])
