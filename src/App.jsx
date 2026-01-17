import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import './App.css'

// Components
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ProtectedRoute from './components/shared/ProtectedRoute'
import StudentDashboard from './components/student/Dashboard'
import TutorDashboard from './components/tutor/Dashboard'
import BookingForm from './components/student/BookingForm'
import PayPalPayment from './components/payment/PayPalPayment'

function App() {
  const { user, isTutor, loading, signOut } = useAuth()

  if (loading) return <div className="loading">Loading App...</div>

  return (
    <div className="app-container">
      <nav className="navbar">
        <Link to="/" className="nav-logo">EduBook</Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button onClick={signOut} className="btn-signout">Sign Out</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={
             user ? <Navigate to="/dashboard" /> : <div className="card"><h1>Welcome</h1><Link to="/login">Login</Link></div>
          } />
          
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              {isTutor ? <TutorDashboard /> : <StudentDashboard />}
            </ProtectedRoute>
          } />

          <Route path="/book/:tutorId" element={
            <ProtectedRoute allowedRoles={['student']}>
              <BookingForm tutorId={window.location.pathname.split('/').pop()} />
            </ProtectedRoute>
          } />
          
          <Route path="/payment/:bookingId" element={
            <ProtectedRoute allowedRoles={['student']}>
              <PayPalPayment />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  )
}

export default App