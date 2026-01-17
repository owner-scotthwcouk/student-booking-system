import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getTutorBookings, updateBookingStatus } from '../../lib/bookingAPI'

export default function TutorDashboard() {
  const { user } = useAuth()
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
      <h1>Tutor Schedule</h1>
      
      {loading ? <p>Loading...</p> : (
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
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{new Date(booking.lesson_date).toLocaleDateString()}</td>
                <td>{booking.lesson_time.slice(0, 5)}</td>
                <td>
                  <div>{booking.student?.full_name}</div>
                  <small>{booking.student?.email}</small>
                </td>
                <td>{booking.status}</td>
                <td>
                  {booking.status === 'pending' && (
                    <button onClick={() => handleStatusChange(booking.id, 'confirmed')}>
                      Confirm
                    </button>
                  )}
                  {booking.status === 'confirmed' && (
                    <button onClick={() => handleStatusChange(booking.id, 'completed')}>
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}