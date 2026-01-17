import { supabase } from './supabaseClient'

// Set tutor availability for a day
export async function setTutorAvailability(tutorId, dayOfWeek, startTime, endTime, isAvailable = true) {
  try {
    const { data, error } = await supabase
      .from('tutor_availability')
      .upsert({
        tutor_id: tutorId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_available: isAvailable
      }, {
        onConflict: 'tutor_id,day_of_week,start_time'
      })
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error setting availability:', error)
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
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching availability:', error)
    return { data: null, error }
  }
}

// Block a time slot
export async function blockTimeSlot(tutorId, startDatetime, endDatetime, reason = '') {
  try {
    const { data, error } = await supabase
      .from('blocked_time_slots')
      .insert({
        tutor_id: tutorId,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        reason: reason
      })
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error blocking time slot:', error)
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
      .order('start_datetime', { ascending: true })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching blocked slots:', error)
    return { data: null, error }
  }
}

// Delete a blocked time slot
export async function deleteBlockedTimeSlot(blockedSlotId) {
  try {
    const { error } = await supabase
      .from('blocked_time_slots')
      .delete()
      .eq('id', blockedSlotId)
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting blocked slot:', error)
    return { error }
  }
}

