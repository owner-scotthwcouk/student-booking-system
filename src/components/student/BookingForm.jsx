import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createBooking, getBlockedTimeSlots } from '../../lib/bookingAPI'
import { getTutorAvailability } from '../../lib/availabilityAPI'
import { useNavigate, useParams } from 'react-router-dom'

function BookingForm() {
  const { tutorId } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availability, setAvailability] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [availableTimes, setAvailableTimes] = useState([])
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

  const selectedDayOfWeek = useMemo(() => {
    if (!selectedDate) return null
    return new Date(`${selectedDate}T00:00:00`).getDay()
  }, [selectedDate])

  useEffect(() => {
    if (!selectedDate || !tutorId) return

    const startDate = new Date(`${selectedDate}T00:00:00`)
    const endDate = new Date(`${selectedDate}T23:59:59`)

    getBlockedTimeSlots(tutorId, startDate.toISOString(), endDate.toISOString())
      .then(({ data, error }) => {
        if (error) throw error
        setBlockedSlots(data || [])
      })
      .catch((err) => {
        console.error('Failed to load blocked slots', err)
        setBlockedSlots([])
      })
  }, [selectedDate, tutorId])

  useEffect(() => {
    if (!selectedDate || selectedDayOfWeek === null) {
      setAvailableTimes([])
      return
    }

    const dayAvailability = availability
      .filter((slot) => slot.is_available && slot.day_of_week === selectedDayOfWeek)

    if (dayAvailability.length === 0) {
      setAvailableTimes([])
      return
    }

    const toMinutes = (time) => {
      const [h, m] = time.split(':').map(Number)
      return h * 60 + m
    }

    const toTimeString = (minutes) => {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const blockedRanges = blockedSlots
      .map((slot) => ({
        start: new Date(slot.start_datetime).getTime(),
        end: new Date(slot.end_datetime).getTime()
      }))

    const durationMinutes = 60
    const dayStart = new Date(`${selectedDate}T00:00:00`).getTime()

    const times = []
    for (const slot of dayAvailability) {
      const startMinutes = toMinutes(slot.start_time)
      const endMinutes = toMinutes(slot.end_time)

      for (let t = startMinutes; t + durationMinutes <= endMinutes; t += durationMinutes) {
        const timeStr = toTimeString(t)
        const slotStart = dayStart + t * 60 * 1000
        const slotEnd = slotStart + durationMinutes * 60 * 1000

        const overlapsBlocked = blockedRanges.some((b) => slotStart < b.end && slotEnd > b.start)
        if (!overlapsBlocked) {
          times.push(timeStr)
        }
      }
    }

    setAvailableTimes(times)
    if (times.length === 0) {
      setSelectedTime('')
    }
  }, [availability, blockedSlots, selectedDate, selectedDayOfWeek])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!availableTimes.includes(selectedTime)) {
        throw new Error('Selected time is no longer available')
      }

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
            disabled={!selectedDate || availableTimes.length === 0}
          >
            <option value="">Choose a time...</option>
            {availableTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {selectedDate && availableTimes.length === 0 && (
            <small style={{ color: '#cc0000' }}>
              No available times for this date. Please choose another date.
            </small>
          )}
        </div>

        <button type="submit" disabled={loading || availableTimes.length === 0}>
          {loading ? 'Booking...' : 'Book and Pay'}
        </button>
      </form>
    </div>
  )
}

export default BookingForm
