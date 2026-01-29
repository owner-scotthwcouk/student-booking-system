import { useState, useEffect, useMemo } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useAuth } from '../../hooks/useAuth'
import { createBooking, getBlockedTimeSlots } from '../../lib/bookingAPI'
import { getTutorAvailability } from '../../lib/availabilityAPI'
import { getTutorHourlyRate, getProfile } from '../../lib/profileAPI'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

// Stripe Card Element Styling
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#000000',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#666666'
      }
    },
    invalid: {
      color: '#e74c3c',
      iconColor: '#e74c3c'
    }
  },
  hidePostalCode: false
}

// Booking Payment Form Component
function BookingPaymentForm({ 
  tutorId, 
  tutorName, 
  hourlyRate, 
  selectedDate, 
  selectedTime,
  onBack,
  onSuccess 
}) {
  const { user } = useAuth()
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cardholderName, setCardholderName] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Create booking
      const { data: booking, error: bookingError } = await createBooking({
        studentId: user.id,
        tutorId: tutorId,
        lessonDate: selectedDate,
        lessonTime: selectedTime,
        duration: 60
      })

      if (bookingError) throw new Error('Failed to create booking')

      // 2. Create payment intent
      const response = await fetch('/api/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: hourlyRate,
          studentId: user.id,
          tutorId: tutorId,
          bookingId: booking.id,
          studentEmail: user.email,
          currency: 'gbp'
        })
      })

      const { clientSecret, paymentIntentId } = await response.json()

      if (!clientSecret) {
        throw new Error('Failed to create payment intent')
      }

      // 3. Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: cardholderName,
              email: user.email
            }
          }
        }
      )

      if (stripeError) {
        throw new Error(stripeError.message)
      }

      if (paymentIntent.status === 'succeeded') {
        // 4. Update booking status
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id)

        // 5. Record payment
        await supabase
          .from('payments')
          .insert({
            booking_id: booking.id,
            student_id: user.id,
            stripe_payment_intent_id: paymentIntentId,
            amount: hourlyRate,
            currency: 'GBP',
            payment_method: 'stripe',
            status: 'completed',
            payment_date: new Date().toISOString()
          })

        onSuccess()
      }
    } catch (err) {
      setError(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="booking-summary">
        <h3>Booking Summary</h3>
        <div className="summary-row">
          <span>Tutor:</span>
          <strong>{tutorName}</strong>
        </div>
        <div className="summary-row">
          <span>Date:</span>
          <strong>{new Date(selectedDate).toLocaleDateString('en-GB')}</strong>
        </div>
        <div className="summary-row">
          <span>Time:</span>
          <strong>{selectedTime}</strong>
        </div>
        <div className="summary-row">
          <span>Duration:</span>
          <strong>60 minutes</strong>
        </div>
        <div className="summary-row total">
          <span>Total:</span>
          <strong>£{Number(hourlyRate).toFixed(2)}</strong>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="cardholderName">Cardholder Name *</label>
        <input
          type="text"
          id="cardholderName"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="e.g. John Doe"
          required
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label>Card Information *</label>
        <div className="stripe-card-element">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      <div className="security-notice">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 0L2 3V7C2 11 5 14 8 16C11 14 14 11 14 7V3L8 0Z" fill="#28a745"/>
        </svg>
        <span>Secured by Stripe - Your payment information is safe</span>
      </div>

      <div className="button-group">
        <button type="button" onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button type="submit" disabled={!stripe || loading} className="btn-primary">
          {loading ? 'Processing...' : `Pay £${Number(hourlyRate).toFixed(2)}`}
        </button>
      </div>

      <style jsx>{`
        .payment-form {
          max-width: 500px;
          margin: 0 auto;
        }

        .booking-summary {
          background: #f8f9fa;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .booking-summary h3 {
          margin: 0 0 1rem 0;
          color: #1a1a1a;
          font-size: 1.25rem;
          border-bottom: 2px solid #dee2e6;
          padding-bottom: 0.5rem;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          color: #333333;
        }

        .summary-row.total {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 2px solid #dee2e6;
          font-size: 1.25rem;
          color: #1e40af;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          color: #333333;
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 14px;
        }

        .form-input {
          width: 100%;
          padding: 12px;
          font-size: 16px;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          background-color: #ffffff;
          color: #000000;
        }

        .form-input:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .stripe-card-element {
          padding: 14px;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          background-color: #ffffff;
        }

        .stripe-card-element:focus-within {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .security-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 1.5rem 0;
          padding: 0.75rem;
          background-color: #f0fdf4;
          border-radius: 6px;
          color: #166534;
          font-size: 14px;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .btn-primary, .btn-secondary {
          flex: 1;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background-color: #7c3aed;
          color: #ffffff;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #6d28d9;
        }

        .btn-primary:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .btn-secondary {
          background-color: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover {
          background-color: #d1d5db;
        }

        .error-message {
          background-color: #fee2e2;
          color: #991b1b;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          border: 1px solid #fca5a5;
        }
      `}</style>
    </form>
  )
}

// Main Booking Form Component
function BookingForm() {
  const { tutorId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availability, setAvailability] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [availableTimes, setAvailableTimes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [hourlyRate, setHourlyRate] = useState(30.00)
  const [tutorName, setTutorName] = useState('')

  useEffect(() => {
    if (tutorId) {
      loadAvailability()
      loadTutorInfo()
    }
  }, [tutorId])

  async function loadTutorInfo() {
    const { data: profile } = await getProfile(tutorId)
    if (profile) {
      setTutorName(profile.full_name)
    }

    const { data: rateData } = await getTutorHourlyRate(tutorId)
    if (rateData?.hourly_rate) {
      setHourlyRate(rateData.hourly_rate)
    }
  }

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

  const handleContinueToPayment = (e) => {
    e.preventDefault()
    
    if (!availableTimes.includes(selectedTime)) {
      setError('Selected time is no longer available')
      return
    }

    setShowPayment(true)
  }

  const handlePaymentSuccess = () => {
    navigate('/student/lessons')
  }

  if (showPayment) {
    return (
      <div className="booking-form-container">
        <h2>Payment</h2>
        <Elements stripe={stripePromise}>
          <BookingPaymentForm
            tutorId={tutorId}
            tutorName={tutorName}
            hourlyRate={hourlyRate}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onBack={() => setShowPayment(false)}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
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
          disabled={loading || availableTimes.length === 0 || !selectedTime}
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
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .tutor-rate {
          color: #1e40af;
          font-weight: 600;
          font-size: 1.125rem;
          margin-bottom: 2rem;
        }

        .booking-form {
          background: #ffffff;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          color: #374151;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          font-size: 1rem;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          background-color: #ffffff;
          color: #000000;
        }

        .form-input:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .form-input:disabled {
          background-color: #f3f4f6;
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
          transition: background-color 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #6d28d9;
        }

        .btn-primary:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .error {
          background-color: #fee2e2;
          color: #991b1b;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          border: 1px solid #fca5a5;
        }
      `}</style>
    </div>
  )
}

export default BookingForm
