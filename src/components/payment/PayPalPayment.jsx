// D:\Dev\student-booking-system\src\components\payment\PayPalPayment.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { supabase } from '../../lib/supabaseClient'

function PayPalPayment() {
  const { bookingId } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID

  const paypalOptions = useMemo(() => {
    return {
      'client-id': paypalClientId || '',
      currency: 'GBP',
      intent: 'capture'
    }
  }, [paypalClientId])

  useEffect(() => {
    let mounted = true

    async function init() {
      setLoading(true)
      setErrorMessage('')

      try {
        // 1) Session required (otherwise Edge Function will 401)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        const currentSession = sessionData?.session ?? null

        if (!currentSession) {
          // Not logged in - redirect to login (adjust route if yours differs)
          navigate('/login', { replace: true })
          return
        }

        if (!mounted) return
        setSession(currentSession)

        // 2) Load booking (RLS will also enforce ownership)
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single()

        if (bookingError) throw bookingError
        if (!mounted) return

        setBooking(bookingData)
      } catch (err) {
        console.error('PayPalPayment init error:', err)
        setErrorMessage(err?.message || 'Failed to load booking/session.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [bookingId, navigate])

  async function callEdgeFunction(functionName, payload) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload ?? {}
    })

    if (error) {
      const message = error?.message || `Edge Function ${functionName} failed`
      throw new Error(message)
    }

    return data
  }

  async function createOrderServerSide() {
    setErrorMessage('')
    setBusy(true)
    try {
      // Your Edge Function should accept booking_id and compute amount server-side
      const data = await callEdgeFunction('paypal-create-order', { booking_id: bookingId })

      if (!data?.orderId) {
        throw new Error('paypal-create-order did not return orderId.')
      }

      return data.orderId
    } finally {
      setBusy(false)
    }
  }

  async function captureOrderServerSide(orderId) {
    setErrorMessage('')
    setBusy(true)
    try {
      // Your Edge Function should capture order AND update DB records
      const data = await callEdgeFunction('paypal-capture-order', { order_id: orderId })

      // Expecting something like: { status: "COMPLETED", captureId: "..." }
      return data
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="payment-container">Loading payment page…</div>
  }

  if (errorMessage) {
    return (
      <div className="payment-container">
        <h2>Payment</h2>
        <div style={{ padding: 12, border: '1px solid #cc0000', borderRadius: 6 }}>
          <strong>Problem:</strong> {errorMessage}
        </div>
      </div>
    )
  }

  if (!paypalClientId) {
    return (
      <div className="payment-container">
        <h2>Payment</h2>
        <div style={{ padding: 12, border: '1px solid #cc0000', borderRadius: 6 }}>
          Missing <code>VITE_PAYPAL_CLIENT_ID</code> in <code>.env</code>. Restart <code>npm run dev</code>.
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="payment-container">
        <h2>Payment</h2>
        <div style={{ padding: 12, border: '1px solid #cc0000', borderRadius: 6 }}>
          Booking not found (or you do not have access to it).
        </div>
      </div>
    )
  }

  return (
    <div className="payment-container">
      <h2>Complete Your Payment</h2>

      <div className="booking-summary">
        <p>Lesson Date: {booking.lesson_date ?? 'N/A'}</p>
        <p>Time: {booking.lesson_time ?? 'N/A'}</p>
        <p>Status: {booking.status ?? 'N/A'}</p>
        <p>Payment Status: {booking.payment_status ?? 'N/A'}</p>
      </div>

      <div style={{ marginTop: 16 }}>
        <PayPalScriptProvider options={paypalOptions}>
          <PayPalButtons
            disabled={busy}
            createOrder={async () => {
              // This must return an order ID string
              return await createOrderServerSide()
            }}
            onApprove={async (data) => {
              try {
                if (!data?.orderID) {
                  throw new Error('PayPal did not return an orderID.')
                }

                const result = await captureOrderServerSide(data.orderID)

                // If capture succeeded, navigate somewhere sensible
                // Adjust route to your real success/dashboard page
                navigate('/dashboard', { replace: true })

                return result
              } catch (err) {
                console.error('PayPal onApprove error:', err)
                setErrorMessage(err?.message || 'Payment approval failed.')
                throw err
              }
            }}
            onError={(err) => {
              console.error('PayPal Buttons error:', err)
              setErrorMessage(err?.message || 'PayPal button error.')
            }}
          />
        </PayPalScriptProvider>
      </div>
    </div>
  )
}

export default PayPalPayment
