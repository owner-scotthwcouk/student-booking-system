import { supabase } from './supabaseClient'

export async function issueStudentTemporaryPassword(studentId) {
  const { data, error } = await supabase.functions.invoke('tutor-reset-password', {
    body: { student_id: studentId }
  })

  if (error) {
    throw new Error(error.message || 'Failed to reset student password')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

export async function resetStudentPassword(studentId) {
  return issueStudentTemporaryPassword(studentId)
}

export async function getStudentPasswordResetRequests(studentId) {
  try {
    const { data, error } = await supabase
      .from('student_password_reset_requests')
      .select('id, tutor_name, tutor_email, status, error_message, created_at, updated_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error loading password reset requests:', error)
    return { data: [], error }
  }
}
