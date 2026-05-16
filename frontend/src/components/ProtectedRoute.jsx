import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="page"><p>Завантаження...</p></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}
