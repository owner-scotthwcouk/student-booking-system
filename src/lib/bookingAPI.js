import { supabase } from './supabaseClient'

// Create a new booking
export async function createBooking(bookingData) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        student_id: bookingData.studentId,
        tutor_id: bookingData.tutorId,
        lesson_date: bookingData.lessonDate,
        lesson_time: bookingData.lessonTime,
        duration_minutes: bookingData.duration || 60,
        status: 'pending',
        payment_status: 'unpaid'
      })
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating booking:', error)
    return { data: null, error }
  }
}

// Get bookings for a student
export async function getStudentBookings(studentId) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        tutor:tutor_id(
          full_name,
          email
        )
      `)
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return { data: null, error }
  }
}

// Get bookings for a tutor
export async function getTutorBookings(tutorId) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        student:student_id(
          full_name,
          email
        )
      `)
      .eq('tutor_id', tutorId)
      .order('lesson_date', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return { data: null, error }
  }
}

// Update booking status
export async function updateBookingStatus(bookingId, status) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating booking:', error)
    return { data: null, error }
  }
}

// Get tutor availability
export async function getTutorAvailability(tutorId) {
  try {
    const { data, error } = await supabase
      .from('tutor_availability')
      .select('*')
      .eq('tutor_id', tutorId)
      .eq('is_available', true)
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching availability:', error)
    return { data: null, error }
  }
}

// Get blocked time slots
export async function getBlockedTimeSlots(tutorId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('blocked_time_slots')
      .select('*')
      .eq('tutor_id', tutorId)
      .gte('start_datetime', startDate)
      .lte('end_datetime', endDate)
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching blocked slots:', error)
    return { data: null, error }
  }
}