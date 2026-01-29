import { useState } from 'react'
import { useAuth } from '../../contexts/auth'
import StudentLessons from './Lessons'
import './StudentDashboard.css'

export default function StudentDashboard() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('bookings')

  return (
    <div className="student-dashboard">
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <p>Welcome, {profile?.full_name || user?.email}</p>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📅 My Bookings
        </button>
        <button 
          className={`tab-button ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => setActiveTab('lessons')}
        >
          📚 My Lessons
        </button>
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'bookings' && <div><h2>My Bookings</h2><p>Booking management coming soon</p></div>}
        {activeTab === 'lessons' && <StudentLessons />}
        {activeTab === 'profile' && (
          <div className="profile-section">
            <h2>My Profile</h2>
            <div className="profile-info">
              <p><strong>Name:</strong> {profile?.full_name}</p>
              <p><strong>Email:</strong> {profile?.email}</p>
              <p><strong>Role:</strong> Student</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
