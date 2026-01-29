import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { recordPayment } from '../../lib/paymentsAPI'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

function CheckoutForm({ bookingId, amount, studentId }) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
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
      // Create payment intent on backend
      const response = await fetch('/api/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          bookingId,
          studentId
        })
      })

      const { clientSecret } = await response.json()

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: cardholderName }
        }
      })

      if (stripeError) {
        setError(stripeError.message)
        return
      }

      if (paymentIntent.status === 'succeeded') {
        // Record payment in database
        await recordPayment(bookingId, studentId, amount, paymentIntent.id)

        // Update booking
        await supabase
          .from('bookings')
          .update({ payment_status: 'paid', status: 'confirmed' })
          .eq('id', bookingId)

        navigate('/booking-success')
      }
    } catch (err) {
      setError(err.message || 'Payment processing failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <div className="form-group">
        <label htmlFor="name">Cardholder Name</label>
        <input
          id="name"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          required
          placeholder="John Doe"
        />
      </div>

      <div className="form-group">
        <label>Card Details</label>
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': { color: '#aab7c4' }
            },
            invalid: { color: '#9e2146' }
          }
        }} />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" disabled={!stripe || loading} className="btn-primary btn-block">
        {loading ? 'Processing...' : `Pay £${amount.toFixed(2)}`}
      </button>
    </form>
  )
}

export default function StripePayment() {
  const { bookingId } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBooking()
  }, [bookingId])

  async function fetchBooking() {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (error) throw error
      setBooking(data)
    } catch (error) {
      console.error('Error fetching booking:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!booking) return <div>Booking not found</div>

  // Get tutor hourly rate to calculate amount
  const amount = 50 // This should be calculated from tutor's rate

  return (
    <div className="payment-container">
      <h2>Complete Your Payment</h2>
      <div className="booking-summary">
        <p>Lesson Date: {booking.lesson_date}</p>
        <p>Time: {booking.lesson_time}</p>
        <p>Duration: 1 hour</p>
        <p className="price">Total: £{amount}</p>
      </div>

      <Elements stripe={stripePromise}>
        <CheckoutForm 
          bookingId={bookingId} 
          amount={amount}
          studentId={booking.student_id}
        />
      </Elements>
    </div>
  )
}
