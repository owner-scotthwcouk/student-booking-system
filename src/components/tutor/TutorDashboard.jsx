// src/components/tutor/TutorDashboard.jsx
import { useState } from 'react'
import { useAuth } from '../../contexts/auth'
import POSSystem from './POSSystem'
import AvailabilityManager from './AvailabilityManager'
import LessonEditor from './LessonEditor'
import BookingManagement from './BookingManagement'
import TutorPayments from './Payments'
import './TutorDashboard.css'
import HourlyRateSettings from './HourlyRateSettings'
import VideoLessons from './VideoLessons'

export default function TutorDashboard() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('bookings')

  return (
    <div className="tutor-dashboard">
      <div className="dashboard-header">
        <h1>Tutor Dashboard</h1>
        <p>Welcome, {profile?.full_name || user?.email}</p>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📅 Bookings
        </button>

        <button
          className={`tab-button ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => setActiveTab('lessons')}
        >
          📚 Lessons
        </button>

        <button
          className={`tab-button ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          🕐 Availability
        </button>

        <button
          className={`tab-button ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          🎥 Video
        </button>

        <button
          className={`tab-button ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
        >
          💳 POS System
        </button>

        <button
          className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          💷 Payments
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'bookings' && <BookingManagement tutorId={user?.id} />}
        {activeTab === 'lessons' && <LessonEditor tutorId={user?.id} />}
        {activeTab === 'availability' && <AvailabilityManager tutorId={user?.id} />}
        {activeTab === 'video' && <VideoLessons tutorId={user?.id} />}
        {activeTab === 'pos' && <POSSystem tutorId={user?.id} />}
        {activeTab === 'payments' && <TutorPayments tutorId={user?.id} />}
        {activeTab === 'settings' && <HourlyRateSettings />}
      </div>
    </div>
  )
}
