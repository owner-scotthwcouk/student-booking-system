import { supabase } from './supabaseClient'

// Get payments for a student
export async function getStudentPayments(studentId) {
  try {
    // First get payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: false })
    
    if (paymentsError) throw paymentsError
    
    // Then get booking data for payments that have booking_id
    if (payments && payments.length > 0) {
      const bookingIds = payments.filter(p => p.booking_id).map(p => p.booking_id)
      
      if (bookingIds.length > 0) {
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, lesson_date, lesson_time, tutor_id')
          .in('id', bookingIds)
        
        if (bookingsError) throw bookingsError
        
        // Merge booking data into payments
        const paymentsWithBookings = payments.map(payment => ({
          ...payment,
          booking: bookings?.find(b => b.id === payment.booking_id) || null
        }))
        
        return { data: paymentsWithBookings, error: null }
      }
    }
    
    return { data: payments || [], error: null }
  } catch (error) {
    console.error('Error fetching student payments:', error)
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

