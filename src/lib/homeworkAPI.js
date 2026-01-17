import { supabase } from './supabaseClient'

// Get homework submissions for a student
export async function getStudentHomework(studentId) {
  try {
    // First get homework submissions
    const { data: homework, error: homeworkError } = await supabase
      .from('homework_submissions')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
    
    if (homeworkError) throw homeworkError
    
    // Then get lesson data for each homework
    if (homework && homework.length > 0) {
      const lessonIds = [...new Set(homework.map(h => h.lesson_id))]
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, title, lesson_date, lesson_time')
        .in('id', lessonIds)
      
      if (lessonsError) throw lessonsError
      
      // Merge lesson data into homework
      const homeworkWithLessons = homework.map(hw => ({
        ...hw,
        lesson: lessons?.find(l => l.id === hw.lesson_id) || null
      }))
      
      return { data: homeworkWithLessons, error: null }
    }
    
    return { data: homework || [], error: null }
  } catch (error) {
    console.error('Error fetching student homework:', error)
    return { data: null, error }
  }
}

// Get homework submissions for a tutor (all submissions for their lessons)
export async function getTutorHomework(tutorId) {
  try {
    // First get all lessons for the tutor
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('tutor_id', tutorId)
    
    if (lessonsError) throw lessonsError
    
    const lessonIds = lessons?.map(l => l.id) || []
    
    if (lessonIds.length === 0) {
      return { data: [], error: null }
    }
    
    // Then get homework submissions for those lessons
    const { data: homework, error: homeworkError } = await supabase
      .from('homework_submissions')
      .select('*')
      .in('lesson_id', lessonIds)
      .order('submitted_at', { ascending: false })
    
    if (homeworkError) throw homeworkError
    
    // Get lesson and student data
    if (homework && homework.length > 0) {
      const allLessonIds = [...new Set(homework.map(h => h.lesson_id))]
      const allStudentIds = [...new Set(homework.map(h => h.student_id))]
      
      const [lessonsResult, studentsResult] = await Promise.all([
        supabase.from('lessons').select('id, title, lesson_date, lesson_time, tutor_id').in('id', allLessonIds),
        supabase.from('profiles').select('id, full_name, email').in('id', allStudentIds)
      ])
      
      if (lessonsResult.error) throw lessonsResult.error
      if (studentsResult.error) throw studentsResult.error
      
      // Merge lesson and student data into homework
      const homeworkWithData = homework.map(hw => ({
        ...hw,
        lesson: lessonsResult.data?.find(l => l.id === hw.lesson_id) || null,
        student: studentsResult.data?.find(s => s.id === hw.student_id) || null
      }))
      
      return { data: homeworkWithData, error: null }
    }
    
    return { data: homework || [], error: null }
  } catch (error) {
    console.error('Error fetching tutor homework:', error)
    return { data: null, error }
  }
}

// Get homework for a specific lesson
export async function getLessonHomework(lessonId) {
  try {
    // First get homework submissions
    const { data: homework, error: homeworkError } = await supabase
      .from('homework_submissions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('submitted_at', { ascending: false })
    
    if (homeworkError) throw homeworkError
    
    // Then get student profiles for each homework
    if (homework && homework.length > 0) {
      const studentIds = [...new Set(homework.map(h => h.student_id))]
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)
      
      if (studentsError) throw studentsError
      
      // Merge student data into homework
      const homeworkWithStudents = homework.map(hw => ({
        ...hw,
        student: students?.find(s => s.id === hw.student_id) || null
      }))
      
      return { data: homeworkWithStudents, error: null }
    }
    
    return { data: homework || [], error: null }
  } catch (error) {
    console.error('Error fetching lesson homework:', error)
    return { data: null, error }
  }
}

// Update homework feedback and marking status
export async function updateHomeworkFeedback(homeworkId, feedback, markedAt, tutorId) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .update({
        tutor_feedback: feedback,
        marked_at: markedAt,
        marked_by: tutorId,
        status: 'marked'
      })
      .eq('id', homeworkId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating homework feedback:', error)
    return { data: null, error }
  }
}

