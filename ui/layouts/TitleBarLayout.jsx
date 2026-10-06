import { Outlet, useLocation } from 'react-router-dom'
import TitleBar from '../components/TitleBar'
import { formatTitle } from '../utils/helpers'

export default function TitleBarLayout() {
  const { pathname } = useLocation()

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="sticky top-0 z-50">
        <TitleBar title={formatTitle(pathname)} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
