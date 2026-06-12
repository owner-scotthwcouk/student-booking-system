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
        payment_method: paymentData.paymentMethod || 'stripe',
        transaction_reference: paymentData.transactionReference,
        order_reference: paymentData.orderReference,
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

// Record a payment against an existing booking and mark the booking paid.
export async function recordBookingPayment(paymentData) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        booking_id: paymentData.bookingId,
        student_id: paymentData.studentId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'GBP',
        payment_method: paymentData.paymentMethod || 'manual',
        transaction_reference: paymentData.transactionReference,
        order_reference: paymentData.orderReference,
        status: paymentData.status || 'completed',
        payment_date: paymentData.paymentDate || new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    if (paymentData.bookingId && (paymentData.status || 'completed') === 'completed') {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentData.bookingId)

      if (bookingError) throw bookingError
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error recording booking payment:', error)
    return { data: null, error }
  }
}

// Record a payment from an external payment provider
export async function recordPayment(bookingId, studentId, amount, paymentReference) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        student_id: studentId,
        amount: amount,
        currency: 'GBP',
        payment_method: 'stripe',
        transaction_reference: paymentReference,
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

export async function issueRefund(bookingId, studentId, amount) {
  try {
    const refundAmount = Number(amount)
    if (!bookingId) throw new Error('Booking ID is required for refund.')
    if (!studentId) throw new Error('Student ID is required for refund.')
    if (!refundAmount || refundAmount <= 0) throw new Error('Refund amount must be a positive value.')

    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        student_id: studentId,
        amount: refundAmount,
        currency: 'GBP',
        payment_method: 'refund',
        status: 'refunded',
        payment_date: new Date().toISOString(),
        transaction_reference: `REFUND-${Date.now()}`
      })

    if (insertError) throw insertError

    const { data: bookingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('booking_id', bookingId)

    if (paymentsError) throw paymentsError

    const totalPaid = (bookingPayments || [])
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)

    const totalRefunded = (bookingPayments || [])
      .filter((p) => p.status === 'refunded')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)

    const bookingUpdate = {}
    if (totalRefunded >= totalPaid && totalPaid > 0) {
      bookingUpdate.payment_status = 'refunded'
    }

    if (Object.keys(bookingUpdate).length > 0) {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update(bookingUpdate)
        .eq('id', bookingId)
      if (bookingError) throw bookingError
    }

    return { data: true, error: null }
  } catch (error) {
    console.error('Error issuing refund:', error)
    return { data: null, error }
  }
}

