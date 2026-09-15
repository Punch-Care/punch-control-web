import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { homeRouteFor } from '@/lib/home-route'

export function PublicOnlyRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.user?.role)
  return isAuthenticated ? <Navigate to={homeRouteFor(role)} replace /> : <Outlet />
}
