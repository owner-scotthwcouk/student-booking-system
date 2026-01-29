import { Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import "./App.css";

// Components
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import StudentDashboard from "./components/student/StudentDashboard";
import TutorDashboard from "./components/tutor/Dashboard";
import BookingForm from "./components/student/BookingForm";
import PayNow from "./components/PayNow";
import PaymentPage from "./pages/PaymentPage";
import HomePage from "./pages/HomePage";

function App() {
  const { user, isTutor, loading, signOut } = useAuth();

  if (loading) return <div className="loading">Loading App...</div>;

  return (
    <div className="app-container">
      <nav className="navbar">
        <Link to="/" className="nav-logo">
          Edumaxim
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button onClick={signOut} className="btn-signout">
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          {/* Home page - new marketing landing page */}
          <Route path="/" element={<HomePage />} />
          
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {isTutor ? <TutorDashboard /> : <StudentDashboard />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/book/:tutorId"
            element={
              <ProtectedRoute>
                <BookingForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/:bookingId"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
