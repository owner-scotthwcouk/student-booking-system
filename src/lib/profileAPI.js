import { supabase } from './supabaseClient'

// Get a profile
export async function getProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching profile:', error)
    return { data: null, error }
  }
}

// Update profile (students can only update certain fields)
export async function updateProfile(userId, profileData, isTutor = false) {
  try {
    const updateData = {}
    
    if (isTutor) {
      // Tutors can update all fields
      if (profileData.full_name) updateData.full_name = profileData.full_name
      if (profileData.date_of_birth) updateData.date_of_birth = profileData.date_of_birth
      if (profileData.email) updateData.email = profileData.email
      if (profileData.phone_number !== undefined) updateData.phone_number = profileData.phone_number
      if (profileData.address !== undefined) updateData.address = profileData.address
      if (profileData.profile_picture_url !== undefined) updateData.profile_picture_url = profileData.profile_picture_url
    } else {
      // Students can only update email, phone, address, profile picture
      if (profileData.email) updateData.email = profileData.email
      if (profileData.phone_number !== undefined) updateData.phone_number = profileData.phone_number
      if (profileData.address !== undefined) updateData.address = profileData.address
      if (profileData.profile_picture_url !== undefined) updateData.profile_picture_url = profileData.profile_picture_url
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { data: null, error }
  }
}

// Update student details (tutors only) - UPDATED TO INCLUDE CONTACT INFO
export async function updateStudentProfile(studentId, profileData) {
  try {
    // Whitelist fields that can be updated
    const updateData = {}
    if (profileData.full_name !== undefined) updateData.full_name = profileData.full_name
    if (profileData.date_of_birth !== undefined) updateData.date_of_birth = profileData.date_of_birth
    // Added these fields so Tutors can update them:
    if (profileData.email !== undefined) updateData.email = profileData.email
    if (profileData.phone_number !== undefined) updateData.phone_number = profileData.phone_number
    if (profileData.address !== undefined) updateData.address = profileData.address
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', studentId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating student profile:', error)
    return { data: null, error }
  }
}

// Get all students (for tutors to select when booking)
export async function getAllStudents() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, address, date_of_birth')
      .eq('role', 'student')
      .order('full_name', { ascending: true })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching students:', error)
    return { data: null, error }
  }
}

// Get all tutors (for students to select when booking)
export async function getAllTutors() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'tutor')
      .order('full_name', { ascending: true })
    
    if (error) {
      console.error('Error fetching tutors:', error)
      return { data: null, error }
    }
    
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error fetching tutors:', error)
    return { data: null, error }
  }
}

// Upload profile picture
export async function uploadProfilePicture(userId, file) {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (uploadError) throw uploadError
    
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName)
    
    return { url: publicUrl, error: null }
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    return { url: null, error }
  }
}

// Get tutor hourly rate from profiles table
export async function getTutorHourlyRate(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('hourly_rate')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching hourly rate:', error)
    return { data: null, error }
  }
}

// Update tutor hourly rate in profiles table
export async function updateTutorHourlyRate(userId, rate) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        hourly_rate: rate,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating hourly rate:', error)
    return { data: null, error }
  }
}