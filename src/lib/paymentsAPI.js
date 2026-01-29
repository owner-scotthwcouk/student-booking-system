import { supabase } from './supabaseClient'

// Get payments for a student
export async function getStudentPayments(studentId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        booking:booking_id(
          lesson_date,
          lesson_time
        )
      `)
      .eq('student_id', studentId)
      .order('payment_date', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching payments:', error)
    return { data: null, error }
  }
}

// Create a payment record (for tutor POS system)
export async function createPayment(paymentData) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        booking_id: paymentData.bookingId || null,
        student_id: paymentData.studentId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'GBP',
        payment_method: paymentData.paymentMethod || 'paypal',
        paypal_transaction_id: paymentData.paypalTransactionId,
        paypal_order_id: paymentData.paypalOrderId,
        status: paymentData.status || 'completed',
        payment_date: paymentData.paymentDate || new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating payment:', error)
    return { data: null, error }
  }
}

// Record a payment (for Stripe payments)
export async function recordPayment(bookingId, studentId, amount, stripePaymentIntentId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        student_id: studentId,
        amount: amount,
        currency: 'GBP',
        payment_method: 'stripe',
        stripe_payment_intent_id: stripePaymentIntentId,
        status: 'completed',
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

