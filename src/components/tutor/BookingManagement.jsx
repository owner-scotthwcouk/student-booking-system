import { useState, useEffect } from 'react'
import { getTutorBookings, updateBookingStatus } from '../../lib/bookingAPI'

export default function BookingManagement({ tutorId }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => {
    loadBookings()
  }, [tutorId])

  async function loadBookings() {
    try {
      setLoading(true)
      const { data, error } = await getTutorBookings(tutorId)
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(bookingId, newStatus) {
    try {
      const { error } = await updateBookingStatus(bookingId, newStatus)
      if (error) throw error
      await loadBookings()
      setSelectedBooking(null)
    } catch (err) {
      setError(err.message || 'Failed to update booking')
    }
  }

  if (loading) return <div>Loading bookings...</div>

  return (
    <div className="booking-management">
      <h2>Booking Requests</h2>

      {error && <div className="error-message">{error}</div>}

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>No bookings yet.</p>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div 
              key={booking.id} 
              className={`booking-card ${booking.status}`}
              onClick={() => setSelectedBooking(booking)}
            >
              <div className="booking-header">
                <h3>{booking.student?.full_name || 'Unknown Student'}</h3>
                <span className={`status-badge ${booking.status}`}>{booking.status}</span>
              </div>
              <p><strong>Date:</strong> {new Date(booking.lesson_date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {booking.lesson_time}</p>
              <p><strong>Duration:</strong> {booking.duration_minutes} minutes</p>
              <p><strong>Payment:</strong> {booking.payment_status}</p>
            </div>
          ))}
        </div>
      )}

      {selectedBooking && (
        <div className="booking-detail-modal">
          <div className="modal-content">
            <h3>Booking Details</h3>
            <p><strong>Student:</strong> {selectedBooking.student?.full_name}</p>
            <p><strong>Email:</strong> {selectedBooking.student?.email}</p>
            <p><strong>Date:</strong> {new Date(selectedBooking.lesson_date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> {selectedBooking.lesson_time}</p>
            <p><strong>Status:</strong> {selectedBooking.status}</p>

            <div className="modal-actions">
              {selectedBooking.status === 'pending' && (
                <>
                  <button 
                    onClick={() => handleStatusChange(selectedBooking.id, 'confirmed')}
                    className="btn-success"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                    className="btn-danger"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button 
                onClick={() => setSelectedBooking(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
