import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, profile, loading } = useAuth()

  // 1. Wait for Auth Check
  if (loading) return <div>Loading...</div>
  
  // 2. Not logged in? -> Go to Login
  if (!user) return <Navigate to="/login" replace />

  // 3. Logged in but Profile missing? -> STOP HERE (Don't redirect!)
  if (!profile) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Profile Not Found</h2>
        <p>Your account exists, but your profile data is missing.</p>
        <p>Please contact support or ensure you have run the database SQL.</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  // 4. Role Check
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}