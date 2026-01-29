import { supabase } from './supabaseClient'

// Create a payment intent for a booking
export async function createPaymentIntent(bookingId) {
  try {
    const response = await fetch('/api/stripe/create-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create payment intent')
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return { data: null, error }
  }
}

// Confirm payment with Stripe
export async function confirmPayment(paymentIntentId) {
  try {
    const response = await fetch('/api/stripe/confirm-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentIntentId })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Payment confirmation failed')
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error confirming payment:', error)
    return { data: null, error }
  }
}

// Record payment in database
export async function recordPayment(bookingId, stripePaymentIntentId, amount, status) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        stripe_payment_intent_id: stripePaymentIntentId,
        amount: amount,
        currency: 'GBP',
        payment_method: 'stripe',
        status: status,
        payment_date: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error recording payment:', error)
    return { data: null, error }
  }
}
