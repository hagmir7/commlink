import { lazy } from 'react'
import { createHashRouter } from 'react-router-dom'

import ErrorPage from './pages/error-page'
import MainLayout from './layouts/MainLayout'
// import RootLayout from './layouts/RootLayout'
import CreateDocument from './pages/create-document'
import MinimizedDocumentBar from './components/MinimizedDocumentBar'
import Login from './pages/login'
import Familles from './components/Familles'
import TitleBarLayout from './layouts/TitleBarLayout'
import Articles from './components/Articles'
import Clients from './components/Clients'
import Fournisseurs from './components/Fournisseurs'
import ShowArticle from './components/ShowArticle'
import ShowClient from './components/ShowClient'

const Home = lazy(() => import('./pages/Home'))

export const router = createHashRouter([
  {
    // element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
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
          },
          {
            path: 'layout/create-document',
            element: <CreateDocument />
          },
          {
            path: 'layout/documents/:piece',
            element: <CreateDocument />
          }
        ]
      },
      {
        element: <TitleBarLayout />,
        errorElement: <ErrorPage />,
        children: [
          {
            path: '/familles',
            element: <Familles />
          },
          {
            path: '/articles',
            element: <Articles />
          },
          {
            path: '/clients',
            element: <Clients />
          },
          {
            path: '/fournisseurs',
            element: <Fournisseurs />
          },

          {
            path: '/articles/:ref',
            element: <ShowArticle />
          },

          {
            path: '/clients/:num',
            element: <ShowClient />
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
      },
      {
        path: '/minimized-document',
        element: <MinimizedDocumentBar />
      },
      {
        path: 'login',
        element: <Login />
      }
    ]
  }
])
