import { Navigate, Outlet } from 'react-router-dom'
import { getToken, isAdmin } from '../api'

export default function ProtectedRoute() {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

export function AdminRoute() {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }
  if (!isAdmin()) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
