import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createBooking, getBlockedTimeSlots } from '../../lib/bookingAPI'
import { getTutorAvailability } from '../../lib/availabilityAPI'
import { getTutorHourlyRate, getProfile } from '../../lib/profileAPI'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { buildVideoRoomUrl } from '../../lib/videoRoomAPI'
import PayPalPayment from '../payment/PayPalPayment'

function BookingForm() {
  const { tutorId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availability, setAvailability] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [availableTimes, setAvailableTimes] = useState([])
  const [error, setError] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [hourlyRate, setHourlyRate] = useState(30.00)
  const [tutorName, setTutorName] = useState('')
  const [bookingId, setBookingId] = useState(null)

  const loadTutorInfo = useCallback(async () => {
    const { data: profile } = await getProfile(tutorId)
    if (profile) {
      setTutorName(profile.full_name)
    }

    const { data: rateData } = await getTutorHourlyRate(tutorId)
    if (rateData?.hourly_rate) {
      setHourlyRate(rateData.hourly_rate)
    }
  }, [tutorId])

  const loadAvailability = useCallback(async () => {
    const { data, error } = await getTutorAvailability(tutorId)
    if (!error && data) {
      setAvailability(data)
    }
  }, [tutorId])

  useEffect(() => {
    if (tutorId) {
      const initTimer = setTimeout(() => {
        loadAvailability()
        loadTutorInfo()
      }, 0)
      return () => clearTimeout(initTimer)
    }
  }, [tutorId, loadAvailability, loadTutorInfo])

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
      const resetTimer = setTimeout(() => setAvailableTimes([]), 0)
      return () => clearTimeout(resetTimer)
    }

    const dayAvailability = availability
      .filter((slot) => slot.is_available && slot.day_of_week === selectedDayOfWeek)

    if (dayAvailability.length === 0) {
      const resetTimer = setTimeout(() => setAvailableTimes([]), 0)
      return () => clearTimeout(resetTimer)
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

    const applyTimer = setTimeout(() => {
      setAvailableTimes(times)
      if (times.length === 0) {
        setSelectedTime('')
      }
    }, 0)
    return () => clearTimeout(applyTimer)
  }, [availability, blockedSlots, selectedDate, selectedDayOfWeek])

  const handleContinueToPayment = async (e) => {
    e.preventDefault()
    
    if (!availableTimes.includes(selectedTime)) {
      setError('Selected time is no longer available')
      return
    }

    // Create booking to get ID for PayPal
    const { data: booking, error: bookingError } = await createBooking({
      studentId: user.id,
      tutorId: tutorId,
      lessonDate: selectedDate,
      lessonTime: selectedTime,
      duration: 60
    })

    if (bookingError) {
      setError('Failed to initiate booking')
      return
    }

    setBookingId(booking.id)
    setShowPayment(true)
  }

  const handlePaymentSuccess = (orderData) => {
    // Optional: Log payment completion to database via supabase if not already handled
    window.alert('Booking confirmed.')
    navigate('/student')
  }

  if (showPayment) {
    return (
      <div className="booking-form-container">
        <h2>Payment</h2>
        <PayPalPayment
          amount={hourlyRate}
          bookingId={bookingId}
          onSuccess={handlePaymentSuccess}
          onError={(err) => setError(err.message)}
        />
        <button onClick={() => setShowPayment(false)} className="btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="booking-form-container">
      <h2>Book a Lesson with {tutorName}</h2>
      <p className="tutor-rate">Hourly Rate: £{Number(hourlyRate).toFixed(2)}</p>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleContinueToPayment} className="booking-form">
        <div className="form-group">
          <label htmlFor="date">Select Date:</label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
            className="form-input"
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
            className="form-input"
          >
            <option value="">Choose a time...</option>
            {availableTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {selectedDate && availableTimes.length === 0 && (
            <small style={{ color: '#dc2626', marginTop: '0.5rem', display: 'block' }}>
              No available times for this date. Please choose another date.
            </small>
          )}
        </div>

        <button 
          type="submit" 
          disabled={availableTimes.length === 0 || !selectedTime}
          className="btn-primary btn-large"
        >
          Continue to Payment
        </button>
      </form>

      <style jsx>{`
        .booking-form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
        }

        .booking-form-container h2 {
          color: #ffffff;
          margin-bottom: 0.5rem;
        }

        .tutor-rate {
          color: #60a5fa;
          font-weight: 600;
          font-size: 1.125rem;
          margin-bottom: 2rem;
        }

        .booking-form {
          background: #1a1a1a;
          border: 2px solid #3a3a3a;
          border-radius: 12px;
          padding: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          color: #ffffff;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          font-size: 1rem;
          border: 2px solid #3a3a3a;
          border-radius: 6px;
          background-color: #1a1a1a;
          color: #ffffff;
        }

        .form-input:focus {
          outline: none;
          border-color: #7c3aed;
        }

        .form-input:disabled {
          background-color: #333333;
          cursor: not-allowed;
        }

        .btn-primary {
          width: 100%;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
          background-color: #7c3aed;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #6d28d9;
        }

        .btn-primary:disabled {
          background-color: #4b5563;
          cursor: not-allowed;
        }
        
        .btn-secondary {
          width: 100%;
          padding: 1rem;
          background-color: #374151;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .error {
          background-color: #7f1d1d;
          color: #fecaca;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          border: 1px solid #991b1b;
        }
      `}</style>
    </div>
  )
}

export default BookingForm