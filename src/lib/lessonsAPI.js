import { supabase } from './supabaseClient'

// Get lessons for a student
export async function getStudentLessons(studentId) {
  try {
    // First get lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
    
    if (lessonsError) throw lessonsError
    
    // Then get tutor profiles for each lesson
    if (lessons && lessons.length > 0) {
      const tutorIds = [...new Set(lessons.map(l => l.tutor_id))]
      const { data: tutors, error: tutorsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', tutorIds)
      
      if (tutorsError) throw tutorsError
      
      // Merge tutor data into lessons
      const lessonsWithTutors = lessons.map(lesson => ({
        ...lesson,
        tutor: tutors?.find(t => t.id === lesson.tutor_id) || null
      }))
      
      return { data: lessonsWithTutors, error: null }
    }
    
    return { data: lessons || [], error: null }
  } catch (error) {
    console.error('Error fetching student lessons:', error)
    return { data: null, error }
  }
}

// Get lessons for a tutor
export async function getTutorLessons(tutorId) {
  try {
    // First get lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('tutor_id', tutorId)
      .order('lesson_date', { ascending: false })
    
    if (lessonsError) throw lessonsError
    
    // Then get student profiles for each lesson
    if (lessons && lessons.length > 0) {
      const studentIds = [...new Set(lessons.map(l => l.student_id))]
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)
      
      if (studentsError) throw studentsError
      
      // Merge student data into lessons
      const lessonsWithStudents = lessons.map(lesson => ({
        ...lesson,
        student: students?.find(s => s.id === lesson.student_id) || null
      }))
      
      return { data: lessonsWithStudents, error: null }
    }
    
    return { data: lessons || [], error: null }
  } catch (error) {
    console.error('Error fetching tutor lessons:', error)
    return { data: null, error }
  }
}

// Get a single lesson with activities
export async function getLessonById(lessonId) {
  try {
    // First get lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single()
    
    if (lessonError) throw lessonError
    
    if (!lesson) return { data: null, error: null }
    
    // Get tutor and student profiles
    const [tutorResult, studentResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('id', lesson.tutor_id).single(),
      supabase.from('profiles').select('id, full_name, email').eq('id', lesson.student_id).single()
    ])
    
    return {
      data: {
        ...lesson,
        tutor: tutorResult.data || null,
        student: studentResult.data || null
      },
      error: null
    }
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return { data: null, error }
  }
}

// Create a new lesson
export async function createLesson(lessonData) {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .insert({
        student_id: lessonData.studentId,
        tutor_id: lessonData.tutorId,
        booking_id: lessonData.bookingId || null,
        lesson_date: lessonData.lessonDate,
        lesson_time: lessonData.lessonTime,
        duration_minutes: lessonData.duration || 60,
        title: lessonData.title,
        covered_in_previous_lesson: lessonData.coveredInPrevious || '',
        covered_in_current_lesson: lessonData.coveredInCurrent || '',
        next_lesson_description: lessonData.nextLessonDescription || '',
        status: 'scheduled'
      })
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating lesson:', error)
    return { data: null, error }
  }
}

// Update a lesson
export async function updateLesson(lessonId, lessonData) {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .update({
        lesson_date: lessonData.lessonDate,
        lesson_time: lessonData.lessonTime,
        duration_minutes: lessonData.duration || 60,
        title: lessonData.title,
        covered_in_previous_lesson: lessonData.coveredInPrevious,
        covered_in_current_lesson: lessonData.coveredInCurrent,
        next_lesson_description: lessonData.nextLessonDescription,
        status: lessonData.status || 'scheduled'
      })
      .eq('id', lessonId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating lesson:', error)
    return { data: null, error }
  }
}

// Archive or delete a lesson
export async function archiveLesson(lessonId) {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .update({ status: 'archived' })
      .eq('id', lessonId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error archiving lesson:', error)
    return { data: null, error }
  }
}

// Delete a lesson
export async function deleteLesson(lessonId) {
  try {
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting lesson:', error)
    return { error }
  }
}

// Get lesson activities
export async function getLessonActivities(lessonId) {
  try {
    const { data, error } = await supabase
      .from('lesson_activities')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching lesson activities:', error)
    return { data: null, error }
  }
}

