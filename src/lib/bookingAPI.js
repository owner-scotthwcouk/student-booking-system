// src/lib/bookingAPI.js
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

// Get booking by ID with tutor details
export async function getBookingById(bookingId) {
  try {
    if (!bookingId) {
      throw new Error('Booking ID is required')
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError) throw bookingError
    if (!booking) throw new Error('Booking not found')

    // Get tutor details including hourly rate
    const { data: tutor, error: tutorError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, hourly_rate')
      .eq('id', booking.tutor_id)
      .single()

    if (tutorError) throw tutorError

    // Return booking with tutor data
    return {
      data: {
        ...booking,
        tutor: tutor
      },
      error: null
    }
  } catch (error) {
    console.error('Error fetching booking by ID:', error)
    return { data: null, error }
  }
}

// Get bookings for a student
export async function getStudentBookings(studentId) {
  try {
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
    
    if (bookingsError) throw bookingsError
    
    // Then get tutor profiles for each booking
    if (bookings && bookings.length > 0) {
      const tutorIds = [...new Set(bookings.map(b => b.tutor_id))]
      const { data: tutors, error: tutorsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', tutorIds)
      
      if (tutorsError) throw tutorsError
      
      // Merge tutor data into bookings
      const bookingsWithTutors = bookings.map(booking => ({
        ...booking,
        tutor: tutors?.find(t => t.id === booking.tutor_id) || null
      }))
      
      return { data: bookingsWithTutors, error: null }
    }
    
    return { data: bookings || [], error: null }
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return { data: null, error }
  }
}

// Get bookings for a tutor
export async function getTutorBookings(tutorId) {
  try {
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('tutor_id', tutorId)
      .order('lesson_date', { ascending: false })
    
    if (bookingsError) throw bookingsError
    
    // Then get student profiles for each booking
    if (bookings && bookings.length > 0) {
      const studentIds = [...new Set(bookings.map(b => b.student_id))]
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)
      
      if (studentsError) throw studentsError
      
      // Merge student data into bookings
      const bookingsWithStudents = bookings.map(booking => ({
        ...booking,
        student: students?.find(s => s.id === booking.student_id) || null
      }))
      
      return { data: bookingsWithStudents, error: null }
    }
    
    return { data: bookings || [], error: null }
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
