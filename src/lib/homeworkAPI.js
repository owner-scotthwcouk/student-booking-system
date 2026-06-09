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

// =====================================================
// HOMEWORK ASSIGNMENTS API
// =====================================================

export async function createAssignment(assignmentData) {
  try {
    const { data, error } = await supabase
      .from('homework_assignments')
      .insert([assignmentData])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating assignment:', error)
    return { data: null, error }
  }
}

export async function getAssignmentsByTutor(tutorId) {
  try {
    const { data, error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('tutor_id', tutorId)
      .order('due_date', { ascending: true })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching tutor assignments:', error)
    return { data: null, error }
  }
}

export async function getAssignmentsForStudent(studentId) {
  try {
    const { data, error } = await supabase
      .from('assignment_students')
      .select(`
        assignment_id,
        assigned_date,
        homework_assignments (*)
      `)
      .eq('student_id', studentId)
      .order('assigned_date', { ascending: false })
    
    if (error) throw error
    
    return {
      data: data?.map(item => ({
        ...item.homework_assignments,
        assignedDate: item.assigned_date
      })) || [],
      error: null
    }
  } catch (error) {
    console.error('Error fetching student assignments:', error)
    return { data: null, error }
  }
}

export async function updateAssignment(assignmentId, updates) {
  try {
    const { data, error } = await supabase
      .from('homework_assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating assignment:', error)
    return { data: null, error }
  }
}

export async function deleteAssignment(assignmentId) {
  try {
    const { error } = await supabase
      .from('homework_assignments')
      .delete()
      .eq('id', assignmentId)
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return { error }
  }
}

// =====================================================
// ASSIGNMENT STUDENT MANAGEMENT
// =====================================================

export async function assignStudentsToAssignment(assignmentId, studentIds) {
  try {
    const rows = studentIds.map(studentId => ({
      assignment_id: assignmentId,
      student_id: studentId
    }))
    
    const { data, error } = await supabase
      .from('assignment_students')
      .insert(rows)
      .select()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error assigning students:', error)
    return { data: null, error }
  }
}

export async function removeStudentFromAssignment(assignmentId, studentId) {
  try {
    const { error } = await supabase
      .from('assignment_students')
      .delete()
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error removing student:', error)
    return { error }
  }
}

export async function getStudentsByAssignment(assignmentId) {
  try {
    const { data, error } = await supabase
      .from('assignment_students')
      .select(`
        student_id,
        assigned_date,
        profiles (*)
      `)
      .eq('assignment_id', assignmentId)
    
    if (error) throw error
    
    return {
      data: data?.map(item => ({
        ...item.profiles,
        assignedDate: item.assigned_date
      })) || [],
      error: null
    }
  } catch (error) {
    console.error('Error fetching assigned students:', error)
    return { data: null, error }
  }
}

// =====================================================
// HOMEWORK SUBMISSIONS (Enhanced)
// =====================================================

export async function submitAssignmentWork(submissionData) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .insert([submissionData])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error submitting work:', error)
    return { data: null, error }
  }
}

export async function saveAssignmentDraft(submissionData) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .insert([{
        ...submissionData,
        is_draft: true,
        draft_saved_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error saving draft:', error)
    return { data: null, error }
  }
}

export async function getSubmissionsForAssignment(assignmentId) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .select(`
        *,
        profiles (full_name, email)
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return { data: null, error }
  }
}

export async function gradeSubmission(submissionId, grade, rubricScores) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .update({
        grade,
        grading_rubric: rubricScores,
        status: 'marked',
        marked_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error grading submission:', error)
    return { data: null, error }
  }
}

// =====================================================
// RESOURCES MANAGEMENT
// =====================================================

export async function uploadResource(file, resourceData) {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${resourceData.tutor_id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('homework-resources')
      .upload(fileName, file)
    
    if (uploadError) throw uploadError
    
    const { data: { publicUrl } } = supabase.storage
      .from('homework-resources')
      .getPublicUrl(fileName)
    
    const { data, error } = await supabase
      .from('homework_resources')
      .insert([{
        ...resourceData,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size
      }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error uploading resource:', error)
    return { data: null, error }
  }
}

export async function getResourcesByTutor(tutorId) {
  try {
    const { data, error } = await supabase
      .from('homework_resources')
      .select('*')
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching resources:', error)
    return { data: null, error }
  }
}

export async function linkResourceToAssignment(assignmentId, resourceId) {
  try {
    const { data, error } = await supabase
      .from('assignment_resources')
      .insert([{ assignment_id: assignmentId, resource_id: resourceId }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error linking resource:', error)
    return { data: null, error }
  }
}

export async function getAssignmentResources(assignmentId) {
  try {
    const { data, error } = await supabase
      .from('assignment_resources')
      .select(`
        resource_id,
        homework_resources (*)
      `)
      .eq('assignment_id', assignmentId)
    
    if (error) throw error
    
    return {
      data: data?.map(item => item.homework_resources) || [],
      error: null
    }
  } catch (error) {
    console.error('Error fetching assignment resources:', error)
    return { data: null, error }
  }
}

// =====================================================
// ANALYTICS
// =====================================================

export async function getStudentAnalytics(tutorId, studentId) {
  try {
    const { data, error } = await supabase
      .from('homework_analytics')
      .select('*')
      .eq('tutor_id', tutorId)
      .eq('student_id', studentId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return { data: data || null, error: null }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return { data: null, error }
  }
}

export async function getTutorAnalytics(tutorId) {
  try {
    const { data, error } = await supabase
      .from('homework_analytics')
      .select('*')
      .eq('tutor_id', tutorId)
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching tutor analytics:', error)
    return { data: null, error }
  }
}

// =====================================================
// COMMENTS
// =====================================================

export async function addComment(submissionId, content, isTutorFeedback = false) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      throw new Error('You must be signed in to add a comment')
    }

    const { data, error } = await supabase
      .from('homework_comments')
      .insert([{
        submission_id: submissionId,
        user_id: user?.id,
        content,
        is_tutor_feedback: isTutorFeedback
      }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error adding comment:', error)
    return { data: null, error }
  }
}

export async function getSubmissionComments(submissionId) {
  try {
    const { data, error } = await supabase
      .from('homework_comments')
      .select(`
        *,
        profiles (full_name, role)
      `)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching comments:', error)
    return { data: null, error }
  }
}
