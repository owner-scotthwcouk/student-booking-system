import { supabase } from './supabaseClient'

// Upload homework submission (ZIP file)
export async function uploadHomework(file, lessonId, studentId) {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${studentId}/${lessonId}/${Date.now()}.${fileExt}`
    
    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('homework-submissions')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) throw uploadError
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('homework-submissions')
      .getPublicUrl(fileName)
    
    // Create submission record in database
    const { data, error } = await supabase
      .from('homework_submissions')
      .insert({
        lesson_id: lessonId,
        student_id: studentId,
        submission_file_url: publicUrl,
        submission_file_name: file.name,
        submission_file_size: file.size,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      })
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error uploading homework:', error)
    return { data: null, error }
  }
}

// Upload lesson activity (Document)
export async function uploadLessonActivity(file, lessonId, tutorId, title, description) {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `lessons/${lessonId}/${Date.now()}_${file.name}`
    
    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('lesson-activities')
      .upload(fileName, file)
    
    if (uploadError) throw uploadError
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('lesson-activities')
      .getPublicUrl(fileName)
    
    // Create activity record
    const { data, error } = await supabase
      .from('lesson_activities')
      .insert({
        lesson_id: lessonId,
        title: title,
        description: description,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: tutorId
      })
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error uploading activity:', error)
    return { data: null, error }
  }
}

// Download file
export async function downloadFile(bucketName, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath)
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error downloading file:', error)
    return { data: null, error }
  }
}
