import { supabase } from './supabaseClient'

export async function getTutorProfile(tutorId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', tutorId)
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching tutor profile:', error)
    return { data: null, error }
  }
}

export async function setHourlyRate(tutorId, rate) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ hourly_rate: rate })
      .eq('id', tutorId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error saving hourly rate:', error)
    return { data: null, error }
  }
}
