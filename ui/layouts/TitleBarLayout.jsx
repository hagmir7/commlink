import { Outlet, useLocation } from 'react-router-dom'
import TitleBar from '../components/TitleBar'
import { formatTitle } from '../utils/helpers'

export default function TitleBarLayout() {
  const { pathname } = useLocation()

  return (
    <div>
      <TitleBar title={formatTitle(pathname)} />
      <Outlet />
    </div>
  )
}
