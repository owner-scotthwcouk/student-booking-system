import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/auth'
import Home from './components/Home'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import StudentDashboard from './components/student/StudentDashboard'
import TutorDashboard from './components/tutor/TutorDashboard'
import TutorSelection from './components/student/TutorSelection'
import BookingForm from './components/student/BookingForm'
import Policies from './pages/Policies' //

function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#000000',
        color: '#ffffff'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #2a2a2a',
          borderTop: '4px solid #7c3aed',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem' }}>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (allowedRole && profile?.role !== allowedRole) {
    return <Navigate to={profile?.role === 'tutor' ? '/tutor' : '/student'} />
  }

  return children
}

function AppRoutes() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#000000',
        color: '#ffffff'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #2a2a2a',
          borderTop: '4px solid #7c3aed',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem' }}>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/policies" element={<Policies />} />
      
      <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/tutors" element={<ProtectedRoute allowedRole="student"><TutorSelection /></ProtectedRoute>} />
      <Route path="/student/book/:tutorId" element={<ProtectedRoute allowedRole="student"><BookingForm /></ProtectedRoute>} />
      
      <Route path="/tutor" element={<ProtectedRoute allowedRole="tutor"><TutorDashboard /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
