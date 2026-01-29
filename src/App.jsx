import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Pages
import HomePage from "./pages/HomePage";

// Components
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import StudentDashboard from "./components/student/StudentDashboard";
import TutorDashboard from "./components/tutor/TutorDashboard";

// Protected Route Wrapper
function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: "2rem", color: "#fff", backgroundColor: "#000" }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && profile?.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Main App Component
function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div style={{ padding: "2rem", color: "#fff", backgroundColor: "#000" }}>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tutor-dashboard"
          element={
            <ProtectedRoute allowedRole="tutor">
              <TutorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
