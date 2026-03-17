import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { cancelBooking, getTutorBookings, updateBookingSchedule, updateBookingStatus } from '../../lib/bookingAPI'
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
  const [editingBookingId, setEditingBookingId] = useState(null)
  const [editLessonDate, setEditLessonDate] = useState('')
  const [editLessonTime, setEditLessonTime] = useState('')

  const loadBookings = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await getTutorBookings(user.id)
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user) loadBookings()
  }, [user, loadBookings])

  const handleStatusChange = async (bookingId, newStatus) => {
    if(!confirm(`Mark lesson as ${newStatus}?`)) return;
    
    const { error } = await updateBookingStatus(bookingId, newStatus)
    if (!error) loadBookings() // Reload list
  }

  const beginEditSchedule = (booking) => {
    setEditingBookingId(booking.id)
    setEditLessonDate(booking.lesson_date || '')
    setEditLessonTime((booking.lesson_time || '').slice(0, 5))
  }

  const cancelEditSchedule = () => {
    setEditingBookingId(null)
    setEditLessonDate('')
    setEditLessonTime('')
  }

  const normalizeTimeForDb = (timeValue) => {
    if (!timeValue) return ''
    return timeValue.length === 5 ? `${timeValue}:00` : timeValue
  }

  const handleScheduleSave = async (booking) => {
    if (!editLessonDate || !editLessonTime) {
      alert('Please provide both a date and time.')
      return
    }
    const { error } = await updateBookingSchedule(booking.id, {
      lessonDate: editLessonDate,
      lessonTime: normalizeTimeForDb(editLessonTime),
      status: booking.status === 'tba' ? 'pending' : undefined
    })
    if (!error) {
      await loadBookings()
      cancelEditSchedule()
    }
  }

  const handleMarkTba = async (booking) => {
    if (!confirm('Mark this booking as To Be Arranged?')) return
    const { error } = await updateBookingSchedule(booking.id, {
      status: 'tba'
    })
    if (!error) {
      await loadBookings()
      cancelEditSchedule()
    }
  }

  const formatBookingDate = (booking) => {
    if (booking.status === 'tba') return 'To be arranged'
    return new Date(booking.lesson_date).toLocaleDateString()
  }

  const formatBookingTime = (booking) => {
    if (booking.status === 'tba') return 'To be arranged'
    return (booking.lesson_time || '').slice(0, 5)
  }

  const formatStatusLabel = (status) => {
    if (status === 'tba') return 'To be arranged'
    return status
  }

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Cancel this booking?')) return
    const { error } = await cancelBooking(bookingId)
    if (!error) loadBookings()
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
                          <td>{formatBookingDate(booking)}</td>
                          <td>{formatBookingTime(booking)}</td>
                          <td>
                            <div>{booking.student?.full_name}</div>
                            <small>{booking.student?.email}</small>
                          </td>
                          <td>
                            <span className={`status-badge ${booking.status}`}>
                              {formatStatusLabel(booking.status)}
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
                            <button onClick={() => beginEditSchedule(booking)} className="btn-secondary">
                              Reschedule
                            </button>
                            <button onClick={() => handleMarkTba(booking)} className="btn-secondary">
                              Mark TBA
                            </button>
                            {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                              <button onClick={() => handleCancelBooking(booking.id)} className="btn-danger">
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {editingBookingId && (
                  <div className="booking-edit-panel">
                    <h3>Update Booking Schedule</h3>
                    <div className="form-row">
                      <div className="input-group">
                        <label>Date</label>
                        <div className="input-wrapper">
                          <input
                            type="date"
                            value={editLessonDate}
                            onChange={(e) => setEditLessonDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Time</label>
                        <div className="input-wrapper">
                          <input
                            type="time"
                            value={editLessonTime}
                            onChange={(e) => setEditLessonTime(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="booking-edit-actions">
                      <button
                        onClick={() => {
                          const booking = bookings.find((b) => b.id === editingBookingId)
                          if (booking) handleScheduleSave(booking)
                        }}
                        className="btn-secondary"
                      >
                        Save
                      </button>
                      <button onClick={cancelEditSchedule} className="btn-secondary">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'lessons' && <LessonEditor tutorId={user?.id} />}
        {activeTab === 'homework' && <HomeworkReview />}
        {activeTab === 'pos' && <POSSystem />}
        {activeTab === 'students' && <Students />}
        {activeTab === 'availability' && <AvailabilityManager />}
        {activeTab === 'profile' && <Profile />}
      </div>
    </div>
  )
}
