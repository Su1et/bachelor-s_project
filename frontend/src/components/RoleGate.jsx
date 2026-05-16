import { useAuth } from '../contexts/AuthContext'

export function hasRole(user, roles = []) {
  if (!roles?.length) return true
  return Boolean(user && roles.includes(user.role))
}

export default function RoleGate({ roles, children, fallback = null }) {
  const { user } = useAuth()
  return hasRole(user, roles) ? children : fallback
}
