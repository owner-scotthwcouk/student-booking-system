import { supabase } from './supabaseClient'

export function buildVideoRoomUrl(videoRoomToken) {
  if (!videoRoomToken) return ''

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/video/${videoRoomToken}`
  }

  return `/video/${videoRoomToken}`
}

export async function getBookingByRoomToken(roomToken) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('video_room_token', roomToken)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching booking by room token:', error)
    return { data: null, error }
  }
}

export async function verifyVideoRoomAccess(roomToken, passcode) {
  try {
    const { data, error } = await supabase.rpc('verify_video_room_access', {
      p_room_token: roomToken,
      p_passcode: passcode
    })

    if (error) throw error
    return { data: data?.[0] || null, error: null }
  } catch (error) {
    console.error('Error verifying room access:', error)
    return { data: null, error }
  }
}

export async function requestRoomAdmission(bookingId, studentId) {
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('video_room_admissions')
      .upsert(
        {
          booking_id: bookingId,
          student_id: studentId,
          requested_at: now,
          approved_at: null,
          approved_by: null,
          updated_at: now
        },
        { onConflict: 'booking_id,student_id' }
      )
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error requesting admission:', error)
    return { data: null, error }
  }
}

export async function getPendingAdmissions(bookingId) {
  try {
    const { data, error } = await supabase
      .from('video_room_admissions')
      .select('*')
      .eq('booking_id', bookingId)
      .is('approved_at', null)
      .order('requested_at', { ascending: true })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error loading pending admissions:', error)
    return { data: [], error }
  }
}

export async function getAdmissionStatus(bookingId, studentId) {
  try {
    const { data, error } = await supabase
      .from('video_room_admissions')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (error) throw error
    return { data: data || null, error: null }
  } catch (error) {
    console.error('Error loading admission status:', error)
    return { data: null, error }
  }
}

export async function approveAdmission(admissionId, tutorId) {
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('video_room_admissions')
      .update({
        approved_at: now,
        approved_by: tutorId,
        updated_at: now
      })
      .eq('id', admissionId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error approving admission:', error)
    return { data: null, error }
  }
}

export async function loadRoomEvents(bookingId) {
  try {
    const { data, error } = await supabase
      .from('video_room_events')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error loading room events:', error)
    return { data: [], error }
  }
}

export async function logRoomEvent({ bookingId, userId, displayName, eventType, message = null }) {
  try {
    const { data, error } = await supabase
      .from('video_room_events')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        display_name: displayName || '',
        event_type: eventType,
        message
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error logging room event:', error)
    return { data: null, error }
  }
}
