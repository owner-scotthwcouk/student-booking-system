import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Pages
import HomePage from "./pages/HomePage";

// Components
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";

// Student Dashboard Component
function StudentDashboard() {
  const { user, profile } = useAuth();
  return (
    <div style={{ padding: "2rem", color: "#fff", backgroundColor: "#000", minHeight: "100vh" }}>
      <h1>Student Dashboard</h1>
      <p>Welcome, {profile?.full_name || user?.email}!</p>
      <p>This is your student dashboard.</p>
      <button onClick={() => window.location.href = '/'} style={{ padding: "0.5rem 1rem", marginTop: "1rem" }}>
        Back to Home
      </button>
    </div>
  );
}

// Tutor Dashboard Component
function TutorDashboard() {
  const { user, profile } = useAuth();
  return (
    <div style={{ padding: "2rem", color: "#fff", backgroundColor: "#000", minHeight: "100vh" }}>
      <h1>Tutor Dashboard</h1>
      <p>Welcome, {profile?.full_name || user?.email}!</p>
      <p>This is your tutor dashboard.</p>
      <div style={{ marginTop: "2rem" }}>
        <h3>Your Hourly Rate: £{profile?.hourly_rate || "Not set"}</h3>
        <p>Manage your lessons, availability, and students from here.</p>
      </div>
      <button onClick={() => window.location.href = '/'} style={{ padding: "0.5rem 1rem", marginTop: "1rem" }}>
        Back to Home
      </button>
    </div>
  );
}

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
