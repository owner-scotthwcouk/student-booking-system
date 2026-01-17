import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getStudentBookings } from '../../lib/bookingAPI'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadBookings()
  }, [user])

  async function loadBookings() {
    try {
      const { data, error } = await getStudentBookings(user.id)
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error("Failed to load bookings", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>My Learning Dashboard</h1>
        {/* Replace 'tutor-id-here' with a real ID or a Tutor Search page later */}
        <Link to="/book/tutor-1" className="btn-primary">Book New Lesson</Link>
      </div>

      {loading ? (
        <p>Loading schedule...</p>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <p>No lessons booked yet.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Tutor</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{new Date(booking.lesson_date).toLocaleDateString()}</td>
                  <td>{booking.lesson_time.slice(0, 5)}</td>
                  <td>{booking.tutor?.full_name || 'Unknown Tutor'}</td>
                  <td>
                    <span className={`status-badge ${booking.status}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td>
                    {booking.payment_status === 'paid' ? (
                      <span className="text-success">Paid</span>
                    ) : (
                      <Link to={`/payment/${booking.id}`} className="pay-link">
                        Pay Now
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}