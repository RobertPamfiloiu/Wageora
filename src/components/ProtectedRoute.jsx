import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && user.account_type !== 'admin') return <Navigate to="/" replace />
  return children
}
