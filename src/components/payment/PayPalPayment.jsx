import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import { supabase } from '../../lib/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'

function PayPalPayment() {
  const { bookingId } = useParams()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [serverAmount, setServerAmount] = useState(null)

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID

  const paypalOptions = useMemo(() => ({
    "client-id": paypalClientId,
    currency: "GBP",
    intent: "capture",
  }), [paypalClientId])

  useEffect(() => {
    fetchBooking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  async function fetchBooking() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (error) throw error
      setBooking(data)
    } catch (e) {
      console.error(e)
      setError('Failed to load booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function createOrderServerSide() {
    setCreating(true)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke('paypal-create-order', {
        body: { bookingId }
      })

      if (error) {
        console.error(error)
        throw new Error(error.message || 'Failed to create PayPal order.')
      }

      if (!data?.orderId) {
        console.error('Unexpected create-order response:', data)
        throw new Error('PayPal order ID missing from server response.')
      }

      // Amount computed by server (authoritative)
      if (typeof data.amount === 'number') setServerAmount(data.amount)

      return data.orderId
    } finally {
      setCreating(false)
    }
  }

  async function captureOrderServerSide(orderId) {
    setCapturing(true)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke('paypal-capture-order', {
        body: { bookingId, orderId }
      })

      if (error) {
        console.error(error)
        throw new Error(error.message || 'Failed to capture PayPal order.')
      }

      if (!data?.ok) {
        console.error('Unexpected capture response:', data)
        throw new Error('Payment capture failed.')
      }

      alert("Payment Successful!")
      navigate('/dashboard')
    } finally {
      setCapturing(false)
    }
  }

  if (loading) return <div className="payment-container"><h2>Loading...</h2></div>
  if (error) return (
    <div className="payment-container">
      <h2>Payment</h2>
      <p style={{ color: 'crimson' }}>{error}</p>
      <button className="btn" onClick={() => fetchBooking()}>Retry</button>
    </div>
  )

  if (!booking) return (
    <div className="payment-container">
      <h2>Payment</h2>
      <p>Booking not found.</p>
    </div>
  )

  if (!paypalClientId) {
    return (
      <div className="payment-container">
        <h2>Payment</h2>
        <p style={{ color: 'crimson' }}>
          Missing VITE_PAYPAL_CLIENT_ID. Add it to your .env file and restart the dev server.
        </p>
      </div>
    )
  }

  return (
    <div className="payment-container">
      <h2>Complete Your Payment</h2>

      <div className="booking-summary">
        <p><strong>Lesson Date:</strong> {booking.lesson_date}</p>
        <p><strong>Time:</strong> {booking.lesson_time}</p>
        <p><strong>Duration:</strong> {booking.duration_minutes ?? 60} minutes</p>
        <p className="price">
          <strong>Total:</strong>{" "}
          {serverAmount !== null ? `£${serverAmount.toFixed(2)}` : "Calculated at checkout"}
        </p>
        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
          The total is calculated server-side to prevent tampering.
        </p>
      </div>

      <PayPalScriptProvider options={paypalOptions}>
        <PayPalButtons
          disabled={creating || capturing}
          createOrder={async () => {
            return await createOrderServerSide()
          }}
          onApprove={async (data) => {
            const orderId = data?.orderID
            if (!orderId) {
              setError('PayPal approval returned no order ID.')
              return
            }
            await captureOrderServerSide(orderId)
          }}
          onError={(err) => {
            console.error('PayPal Buttons error:', err)
            setError('PayPal error. Please try again.')
          }}
          onCancel={() => {
            setError('Payment was cancelled.')
          }}
        />
      </PayPalScriptProvider>

      {(creating || capturing) && (
        <p style={{ marginTop: '1rem' }}>
          {creating ? 'Creating PayPal order...' : 'Capturing payment...'}
        </p>
      )}
    </div>
  )
}

export default PayPalPayment
