import { useState } from 'react'
import { useAuth } from '../../contexts/auth'
import { useNavigate } from 'react-router-dom'
import StudentLessons from './Lessons'
import StudentPayments from './Payments'
import HomeworkSubmission from './HomeworkSubmission'
import StudentVideoLessons from './VideoLessons'
import './StudentDashboard.css'

export default function StudentDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
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
          className={`tab-button ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          🎥 Video
        </button>

        <button
          className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          💳 Payments
        </button>

        <button
          className={`tab-button ${activeTab === 'homework' ? 'active' : ''}`}
          onClick={() => setActiveTab('homework')}
        >
          📝 Homework
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
        {activeTab === 'bookings' && (
          <div>
            <h2>My Bookings</h2>
            <p>View and manage your upcoming lessons</p>
            <button
              onClick={() => navigate('/student/tutors')}
              className="btn-primary"
              style={{
                padding: '1rem 2rem',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
            >
              Book a New Lesson
            </button>
          </div>
        )}

        {activeTab === 'video' && <StudentVideoLessons />}

        {activeTab === 'lessons' && <StudentLessons />}

        {activeTab === 'payments' && <StudentPayments />}

        {activeTab === 'homework' && <HomeworkSubmission />}

        {activeTab === 'profile' && (
          <div className="profile-section">
            <h2>My Profile</h2>
            <div className="profile-info">
              <p>
                <strong>Name:</strong> {profile?.full_name}
              </p>
              <p>
                <strong>Email:</strong> {profile?.email}
              </p>
              <p>
                <strong>Role:</strong> Student
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
