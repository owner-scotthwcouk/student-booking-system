import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getBookingById } from '../lib/bookingAPI'
import { supabase } from '../lib/supabaseClient'

export default function PaymentPage() {
  const { bookingId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [amount, setAmount] = useState(0)
  const cancelled = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get('cancelled') === '1'
  }, [location.search])

  useEffect(() => {
    if (cancelled) {
      setLoading(false)
      return
    }

    let cancelled = false

    const startStripeCheckout = async () => {
      try {
        if (!bookingId) {
          throw new Error('Booking ID is missing')
        }

        const { data: booking, error: bookingError } = await getBookingById(bookingId)
        if (bookingError) throw bookingError
        if (!booking) throw new Error('Booking not found')

        const hourlyRate = Number(booking.tutor?.hourly_rate || 0)
        const durationMinutes = Number(booking.duration_minutes || 60)
        const bookingAmount = Number(((hourlyRate * durationMinutes) / 60).toFixed(2))

        if (!bookingAmount || bookingAmount <= 0) {
          throw new Error('Unable to calculate the booking amount')
        }

        if (!cancelled) {
          setAmount(bookingAmount)
        }

        const { data, error: paymentError } = await supabase.functions.invoke(
          'stripe-init',
          {
            body: {
              amount: bookingAmount,
              bookingId: booking.id,
              studentId: booking.student_id,
              email: booking.student?.email || booking.student_email || '',
            },
          },
        )

        if (paymentError) {
          throw new Error(
            paymentError.message || 'Failed to initialize Stripe checkout',
          )
        }

        if (!data?.checkout_url) {
          throw new Error('Failed to initialize Stripe checkout')
        }

        window.location.href = data.checkout_url
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to start payment')
          setLoading(false)
        }
      }
    }

    startStripeCheckout()

    return () => {
      cancelled = true
    }
  }, [bookingId, cancelled])

  const handleBack = () => {
    navigate(-1)
  }

  const handleDashboard = () => {
    navigate('/student')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-md text-center">
        <h2 className="text-3xl font-extrabold text-gray-900">Stripe Checkout</h2>
        {cancelled && (
          <div className="text-sm text-gray-700 space-y-4">
            <p>Your payment was cancelled. No charge was taken.</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleDashboard}
                className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white"
              >
                Back to dashboard
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-800"
              >
                Go back
              </button>
            </div>
          </div>
        )}
        {loading && !error && (
          <p className="text-sm text-gray-600">
            Preparing your Stripe payment for £{amount.toFixed(2)}...
          </p>
        )}
        {error && (
          <div className="text-sm text-red-600 space-y-4">
            <p>{error}</p>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white"
            >
              Go back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
