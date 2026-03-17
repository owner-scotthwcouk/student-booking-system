import { useState, useEffect, useCallback } from 'react'
import { getTutorLessons, createLesson, updateLesson, archiveLesson, deleteLesson } from '../../lib/lessonsAPI'
import { getAllStudents } from '../../lib/profileAPI'
export default function LessonEditor({ tutorId }) {
  const [lessons, setLessons] = useState([])
  const [students, setStudents] = useState([])
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    studentId: '',
    lessonDate: '',
    lessonTime: '',
    duration: 60,
    title: '',
    coveredInPrevious: '',
    coveredInCurrent: '',
    nextLessonDescription: '',
    status: 'scheduled'
  })

  const loadLessons = useCallback(async () => {
    try {
      const { data, error } = await getTutorLessons(tutorId)
      if (error) throw error
      setLessons(data || [])
    } catch (err) {
      console.error('Failed to load lessons', err)
    } finally {
      setLoading(false)
    }
  }, [tutorId])

  const loadStudents = useCallback(async () => {
    try {
      const { data } = await getAllStudents()
      setStudents(data || [])
    } catch (err) {
      console.error('Failed to load students', err)
    }
  }, [])

  useEffect(() => {
    loadLessons()
    loadStudents()
  }, [loadLessons, loadStudents])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleEdit = (lesson) => {
    setSelectedLesson(lesson)
    setFormData({
      studentId: lesson.student_id,
      lessonDate: lesson.lesson_date,
      lessonTime: lesson.lesson_time,
      duration: lesson.duration_minutes || 60,
      title: lesson.title,
      coveredInPrevious: lesson.covered_in_previous_lesson || '',
      coveredInCurrent: lesson.covered_in_current_lesson || '',
      nextLessonDescription: lesson.next_lesson_description || '',
      status: lesson.status || 'scheduled'
    })
    setShowForm(true)
  }

  const handleCreate = () => {
    setSelectedLesson(null)
    setFormData({
      studentId: '',
      lessonDate: '',
      lessonTime: '',
      duration: 60,
      title: '',
      coveredInPrevious: '',
      coveredInCurrent: '',
      nextLessonDescription: '',
      status: 'scheduled'
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (selectedLesson) {
        // Update existing lesson
        const { error: updateError } = await updateLesson(selectedLesson.id, {
          lessonDate: formData.lessonDate,
          lessonTime: formData.lessonTime,
          duration: parseInt(formData.duration),
          title: formData.title,
          coveredInPrevious: formData.coveredInPrevious,
          coveredInCurrent: formData.coveredInCurrent,
          nextLessonDescription: formData.nextLessonDescription,
          status: formData.status
        })
        if (updateError) throw updateError
      } else {
        // Create new lesson
        const { error: createError } = await createLesson({
          studentId: formData.studentId,
          tutorId: tutorId,
          lessonDate: formData.lessonDate,
          lessonTime: formData.lessonTime,
          duration: parseInt(formData.duration),
          title: formData.title,
          coveredInPrevious: formData.coveredInPrevious,
          coveredInCurrent: formData.coveredInCurrent,
          nextLessonDescription: formData.nextLessonDescription
        })
        if (createError) throw createError
      }

      setShowForm(false)
      loadLessons()
    } catch (err) {
      setError(err.message || 'Failed to save lesson')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (lessonId) => {
    if (!confirm('Archive this lesson?')) return
    
    try {
      const { error } = await archiveLesson(lessonId)
      if (error) throw error
      loadLessons()
    } catch (err) {
      setError(err.message || 'Failed to archive lesson')
    }
  }

  const handleDelete = async (lessonId) => {
    if (!confirm('Delete this lesson? This action cannot be undone.')) return
    
    try {
      const { error } = await deleteLesson(lessonId)
      if (error) throw error
      loadLessons()
    } catch (err) {
      setError(err.message || 'Failed to delete lesson')
    }
  }

  if (loading) return <div>Loading lessons...</div>

  return (
    <div className="lesson-editor-container">
      <div className="section-header">
        <h2>Lesson Management</h2>
        <button onClick={handleCreate} className="btn-primary">Create New Lesson</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="lesson-form-modal">
          <div className="modal-content">
            <h3>{selectedLesson ? 'Edit Lesson' : 'Create Lesson'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="studentId">Student *</label>
                <select
                  id="studentId"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  required
                  disabled={selectedLesson && formData.studentId !== ''}
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} ({student.email})
                    </option>
                  ))}
                </select>
                {selectedLesson && formData.studentId && (
                  <small style={{ color: '#888', marginTop: '0.25rem', display: 'block' }}>
                    Note: You are editing a lesson for this student. Create a new lesson to assign to a different student.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="lessonDate">Date *</label>
                <input
                  type="date"
                  id="lessonDate"
                  name="lessonDate"
                  value={formData.lessonDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lessonTime">Time *</label>
                <input
                  type="time"
                  id="lessonTime"
                  name="lessonTime"
                  value={formData.lessonTime}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="duration">Duration (minutes) *</label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                  min="15"
                  step="15"
                />
              </div>

              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="coveredInPrevious">Covered in Previous Lesson</label>
                <textarea
                  id="coveredInPrevious"
                  name="coveredInPrevious"
                  value={formData.coveredInPrevious}
                  onChange={handleChange}
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label htmlFor="coveredInCurrent">Covered in Current Lesson</label>
                <textarea
                  id="coveredInCurrent"
                  name="coveredInCurrent"
                  value={formData.coveredInCurrent}
                  onChange={handleChange}
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label htmlFor="nextLessonDescription">Next Lesson Description</label>
                <textarea
                  id="nextLessonDescription"
                  name="nextLessonDescription"
                  value={formData.nextLessonDescription}
                  onChange={handleChange}
                  rows="4"
                />
              </div>

              {selectedLesson && (
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div
        className="lessons-list"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem'
        }}
      >
        {lessons.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: '#666' }}>
            No lessons found.
          </div>
        ) : (
          lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="lesson-card"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.17), rgba(255,255,255,0.08))',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '16px',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.22)',
                padding: '1.5rem',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 14px 30px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.45)'
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.22)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#fff' }}>{lesson.title}</h3>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#e5e5e5' }}>
                  <strong>Student:</strong> {lesson.student?.full_name || 'N/A'}
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#e5e5e5' }}>
                  <strong>Date:</strong> {new Date(lesson.lesson_date).toLocaleDateString()}
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#e5e5e5' }}>
                  <strong>Time:</strong> {lesson.lesson_time.slice(0, 5)}
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#e5e5e5' }}>
                  <strong>Duration:</strong> {lesson.duration_minutes || 60} minutes
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#e5e5e5' }}>
                  <strong>Status:</strong>{' '}
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      backgroundColor: lesson.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : lesson.status === 'cancelled' ? 'rgba(239, 68, 68, 0.2)' : lesson.status === 'archived' ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: lesson.status === 'completed' ? '#86efac' : lesson.status === 'cancelled' ? '#fca5a5' : lesson.status === 'archived' ? '#d1d5db' : '#93c5fd',
                      textTransform: 'capitalize'
                    }}
                  >
                    {lesson.status}
                  </span>
                </p>
              </div>
              <div className="lesson-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => handleEdit(lesson)} className="btn-secondary" style={{ flex: '1 1 auto', minWidth: '80px' }}>
                  Edit
                </button>
                {lesson.status !== 'archived' && (
                  <button onClick={() => handleArchive(lesson.id)} className="btn-secondary" style={{ flex: '1 1 auto', minWidth: '80px' }}>
                    Archive
                  </button>
                )}
                <button onClick={() => handleDelete(lesson.id)} className="btn-danger" style={{ flex: '1 1 auto', minWidth: '80px' }}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

