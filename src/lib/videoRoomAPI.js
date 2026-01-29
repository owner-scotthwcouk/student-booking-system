// src/lib/videoRoomAPI.js
import { supabase } from './supabaseClient'

export async function getActiveVideoRoomByBooking(bookingId) {
  return supabase
    .from('video_rooms')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('status', 'open')
    .maybeSingle()
}

export async function createVideoRoomForBooking({ bookingId, tutorId }) {
  // Fetch booking to get student_id + validate tutor ownership
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, tutor_id, student_id')
    .eq('id', bookingId)
    .single()

  if (bookingError) return { data: null, error: bookingError }
  if (!booking?.student_id) return { data: null, error: new Error('Booking missing student_id') }
  if (booking?.tutor_id !== tutorId) return { data: null, error: new Error('Not allowed to open room for this booking') }

  // Ensure no existing open room
  const { data: existing, error: existingError } = await getActiveVideoRoomByBooking(bookingId)
  if (existingError) return { data: null, error: existingError }
  if (existing) return { data: existing, error: null }

  return supabase
    .from('video_rooms')
    .insert({
      booking_id: bookingId,
      tutor_id: tutorId,
      student_id: booking.student_id,
      status: 'open',
      locked: false
    })
    .select('*')
    .single()
}

export async function setVideoRoomLocked(roomId, locked) {
  return supabase
    .from('video_rooms')
    .update({ locked })
    .eq('id', roomId)
    .select('*')
    .single()
}

export async function closeVideoRoom(roomId) {
  return supabase
    .from('video_rooms')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', roomId)
    .select('*')
    .single()
}

export async function getVideoRoomById(roomId) {
  return supabase
    .from('video_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
}
