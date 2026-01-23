import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getTutorBookings, updateBookingStatus } from '../../lib/bookingAPI'
import Profile from './Profile'
import LessonEditor from './LessonEditor'
import HomeworkReview from './HomeworkReview'
import POSSystem from './POSSystem'
import AvailabilityManager from './AvailabilityManager'
import Students from './Students'

export default function TutorDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('bookings')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadBookings()
  }, [user])

  async function loadBookings() {
    try {
      const { data, error } = await getTutorBookings(user.id)
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (bookingId, newStatus) => {
    if(!confirm(`Mark lesson as ${newStatus}?`)) return;
    
    const { error } = await updateBookingStatus(bookingId, newStatus)
    if (!error) loadBookings() // Reload list
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Tutor Dashboard</h1>
      </div>

      <div className="dashboard-tabs">
        <button
          className={activeTab === 'bookings' ? 'active' : ''}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings
        </button>
        <button
          className={activeTab === 'lessons' ? 'active' : ''}
          onClick={() => setActiveTab('lessons')}
        >
          Lessons
        </button>
        <button
          className={activeTab === 'homework' ? 'active' : ''}
          onClick={() => setActiveTab('homework')}
        >
          Homework
        </button>
        <button
          className={activeTab === 'pos' ? 'active' : ''}
          onClick={() => setActiveTab('pos')}
        >
          POS System
        </button>
        <button
          className={activeTab === 'students' ? 'active' : ''}
          onClick={() => setActiveTab('students')}
        >
          Students
        </button>
        <button
          className={activeTab === 'availability' ? 'active' : ''}
          onClick={() => setActiveTab('availability')}
        >
          Availability
        </button>
        <button
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'bookings' && (
          <div className="bookings-section">
            <h2>My Bookings</h2>
            
            {loading ? <p>Loading...</p> : (
              <div className="table-responsive">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center' }}>No bookings found.</td>
                      </tr>
                    ) : (
                      bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>{new Date(booking.lesson_date).toLocaleDateString()}</td>
                          <td>{booking.lesson_time.slice(0, 5)}</td>
                          <td>
                            <div>{booking.student?.full_name}</div>
                            <small>{booking.student?.email}</small>
                          </td>
                          <td>
                            <span className={`status-badge ${booking.status}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td>
                            {booking.status === 'pending' && (
                              <button onClick={() => handleStatusChange(booking.id, 'confirmed')} className="btn-secondary">
                                Confirm
                              </button>
                            )}
                            {booking.status === 'confirmed' && (
                              <button onClick={() => handleStatusChange(booking.id, 'completed')} className="btn-secondary">
                                Complete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'lessons' && <LessonEditor />}
        {activeTab === 'homework' && <HomeworkReview />}
        {activeTab === 'pos' && <POSSystem />}
        {activeTab === 'students' && <Students />}
        {activeTab === 'availability' && <AvailabilityManager />}
        {activeTab === 'profile' && <Profile />}
      </div>
    </div>
  )
}
