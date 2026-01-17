import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import { supabase } from '../../lib/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'

function PayPalPayment() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const LESSON_PRICE = 50 // £50 per hour

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

  const handlePaymentSuccess = async (details) => {
    try {
      // Update booking payment status
      await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed'
        })
        .eq('id', bookingId)

      // Create payment record
      await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          student_id: booking.student_id,
          amount: LESSON_PRICE,
          currency: 'GBP',
          payment_method: 'paypal',
          paypal_transaction_id: details.id,
          paypal_order_id: details.purchase_units[0].payments.captures[0].id,
          status: 'completed',
          payment_date: new Date().toISOString()
        })

      // Navigate to success page (You'll need to create this route or redirect to dashboard)
      alert("Payment Successful!");
      navigate('/dashboard'); 
    } catch (error) {
      console.error('Error processing payment:', error)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="payment-container">
      <h2>Complete Your Payment</h2>
      <div className="booking-summary">
        <p>Lesson Date: {booking?.lesson_date}</p>
        <p>Time: {booking?.lesson_time}</p>
        <p>Duration: 1 hour</p>
        <p className="price">Total: £{LESSON_PRICE}</p>
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
                  value: LESSON_PRICE.toString(),
                  currency_code: "GBP"
                },
                description: `Tutoring Lesson - ${booking.lesson_date}`
              }]
            })
          }}
          onApprove={(data, actions) => {
            return actions.order.capture().then((details) => {
              handlePaymentSuccess(details);
            });
          }}
        />
      </PayPalScriptProvider>
    </div>
  )
}

export default PayPalPayment