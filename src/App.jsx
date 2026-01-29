import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

// Pages
import HomePage from "./pages/HomePage";

// Components
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";

// Placeholder dashboard components
function StudentDashboard() {
  const { user, profile } = useAuth();
  return (
    <div style={{ padding: "2rem", color: "#fff" }}>
      <h1>Student Dashboard</h1>
      <p>Welcome, {profile?.full_name || user?.email}!</p>
      <p>This is your student dashboard.</p>
    </div>
  );
}

function TutorDashboard() {
  const { user, profile } = useAuth();
  return (
    <div style={{ padding: "2rem", color: "#fff" }}>
      <h1>Tutor Dashboard</h1>
      <p>Welcome, {profile?.full_name || user?.email}!</p>
      <p>This is your tutor dashboard.</p>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: "2rem", color: "#fff" }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && profile?.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div style={{ padding: "2rem", color: "#fff" }}>Loading...</div>;
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
