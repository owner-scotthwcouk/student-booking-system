import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getAllStudents } from '../../lib/profileAPI'
import { createBooking } from '../../lib/bookingAPI'
import { createPayment } from '../../lib/paymentsAPI'
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

export default function POSSystem() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [amount, setAmount] = useState('50')
  const [bookingId, setBookingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const LESSON_PRICE = 50 // Default price

  useEffect(() => {
    if (user) loadStudents()
  }, [user])

  async function loadStudents() {
    try {
      const { data } = await getAllStudents()
      setStudents(data || [])
    } catch (err) {
      console.error('Failed to load students', err)
    }
  }

  const handleCreateBooking = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create booking first
      const { data: booking, error: bookingError } = await createBooking({
        studentId: selectedStudent,
        tutorId: user.id,
        lessonDate: bookingDate,
        lessonTime: bookingTime,
        duration: 60
      })

      if (bookingError) throw bookingError

      setBookingId(booking.id)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async (details) => {
    try {
      // Update booking payment status
      const { error: bookingUpdateError } = await createBooking({
        studentId: selectedStudent,
        tutorId: user.id,
        lessonDate: bookingDate,
        lessonTime: bookingTime,
        duration: 60
      })

      if (bookingUpdateError) throw bookingUpdateError

      // Create payment record
      const { error: paymentError } = await createPayment({
        bookingId: bookingId,
        studentId: selectedStudent,
        amount: parseFloat(amount),
        currency: 'GBP',
        paymentMethod: 'paypal',
        paypalTransactionId: details.id,
        paypalOrderId: details.purchase_units[0].payments.captures[0].id,
        status: 'completed',
        paymentDate: new Date().toISOString()
      })

      if (paymentError) throw paymentError

      alert('Payment processed successfully!')
      
      // Reset form
      setSelectedStudent('')
      setBookingDate('')
      setBookingTime('')
      setAmount('50')
      setBookingId(null)
      setSuccess(false)
    } catch (error) {
      console.error('Error processing payment:', error)
      setError('Failed to process payment')
    }
  }

  return (
    <div className="pos-system-container">
      <h2>POS System - Process Payment</h2>

      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">
          Booking created! Please complete payment below.
        </div>
      )}

      <form onSubmit={handleCreateBooking} className="pos-booking-form">
        <div className="form-group">
          <label htmlFor="student">Select Student *</label>
          <select
            id="student"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            required
            disabled={bookingId !== null}
          >
            <option value="">Choose a student...</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name} ({student.email})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="bookingDate">Lesson Date *</label>
          <input
            type="date"
            id="bookingDate"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            required
            disabled={bookingId !== null}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label htmlFor="bookingTime">Lesson Time *</label>
          <input
            type="time"
            id="bookingTime"
            value={bookingTime}
            onChange={(e) => setBookingTime(e.target.value)}
            required
            disabled={bookingId !== null}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount (GBP) *</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            disabled={bookingId !== null}
            min="0"
            step="0.01"
          />
        </div>

        {!bookingId && (
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating Booking...' : 'Create Booking & Proceed to Payment'}
          </button>
        )}
      </form>

      {bookingId && (
        <div className="payment-section">
          <h3>Complete Payment via PayPal</h3>
          <div className="payment-summary">
            <p><strong>Amount:</strong> £{parseFloat(amount).toFixed(2)}</p>
            <p><strong>Date:</strong> {bookingDate}</p>
            <p><strong>Time:</strong> {bookingTime}</p>
          </div>

          <PayPalScriptProvider
            options={{
              "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID,
              currency: "GBP"
            }}
          >
            <PayPalButtons
              createOrder={(data, actions) => {
                return actions.order.create({
                  purchase_units: [{
                    amount: {
                      value: parseFloat(amount).toFixed(2),
                      currency_code: "GBP"
                    },
                    description: `Tutoring Lesson - ${bookingDate}`
                  }]
                })
              }}
              onApprove={(data, actions) => {
                return actions.order.capture().then((details) => {
                  handlePaymentSuccess(details)
                })
              }}
            />
          </PayPalScriptProvider>
        </div>
      )}
    </div>
  )
}

