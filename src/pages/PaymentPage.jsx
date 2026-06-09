import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBookingById } from '../lib/bookingAPI'

export default function PaymentPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const startGoCardlessCheckout = async () => {
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

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/gocardless-init`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: bookingAmount,
              bookingId: booking.id,
              email: booking.student?.email || booking.student_email || '',
            }),
          },
        )

        const data = await response.json()
        if (!response.ok || !data.checkout_url) {
          throw new Error(data.error || 'Failed to initialize GoCardless checkout')
        }

        window.location.href = data.checkout_url
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to start payment')
          setLoading(false)
        }
      }
    }

    startGoCardlessCheckout()

    return () => {
      cancelled = true
    }
  }, [bookingId])

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-md text-center">
        <h2 className="text-3xl font-extrabold text-gray-900">GoCardless Checkout</h2>
        {loading && !error && (
          <p className="text-sm text-gray-600">
            Preparing your GoCardless payment for £{amount.toFixed(2)}...
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
