import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createBooking, getTutorAvailability } from '../../lib/bookingAPI'
import { useNavigate, useParams } from 'react-router-dom'

function BookingForm() {
  const { tutorId } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (tutorId) {
      loadAvailability()
    }
  }, [tutorId])

  async function loadAvailability() {
    const { data, error } = await getTutorAvailability(tutorId)
    if (!error && data) {
      setAvailability(data)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await createBooking({
        studentId: user.id,
        tutorId: tutorId,
        lessonDate: selectedDate,
        lessonTime: selectedTime,
        duration: 60
      })

      if (error) throw error

      // Redirect to payment page
      navigate(`/payment/${data.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="booking-form">
      <h2>Book a Lesson</h2>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="date">Select Date:</label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="time">Select Time:</label>
          <select
            id="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            required
          >
            <option value="">Choose a time...</option>
            <option value="09:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="13:00">1:00 PM</option>
            <option value="14:00">2:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="16:00">4:00 PM</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Booking...' : 'Book and Pay'}
        </button>
      </form>
    </div>
  )
}

export default BookingForm