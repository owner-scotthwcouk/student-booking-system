import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getTutorLessons, createLesson, updateLesson, archiveLesson, deleteLesson, getLessonActivities } from '../../lib/lessonsAPI'
import { uploadLessonActivity } from '../../lib/fileUploadAPI'
import { getAllStudents } from '../../lib/profileAPI'

export default function LessonEditor() {
  const { user } = useAuth()
  const [lessons, setLessons] = useState([])
  const [students, setStudents] = useState([])
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [resourceLesson, setResourceLesson] = useState(null)
  const [activities, setActivities] = useState([])
  const [resourceType, setResourceType] = useState('resources')
  const [activityTitle, setActivityTitle] = useState('')
  const [activityDescription, setActivityDescription] = useState('')
  const [activityFile, setActivityFile] = useState(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState(null)
  const [activityUploading, setActivityUploading] = useState(false)
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

  useEffect(() => {
    if (user) {
      loadLessons()
      loadStudents()
    }
  }, [user])

  async function loadLessons() {
    try {
      const { data, error } = await getTutorLessons(user.id)
      if (error) throw error
      setLessons(data || [])
    } catch (err) {
      console.error('Failed to load lessons', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents() {
    try {
      const { data } = await getAllStudents()
      setStudents(data || [])
    } catch (err) {
      console.error('Failed to load students', err)
    }
  }

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

  const handleOpenResources = async (lesson, type) => {
    setResourceLesson(lesson)
    setResourceType(type)
    setActivityError(null)
    setActivityLoading(true)
    try {
      const { data, error: activitiesError } = await getLessonActivities(lesson.id)
      if (activitiesError) throw activitiesError
      setActivities(data || [])
    } catch (err) {
      setActivityError(err.message || 'Failed to load lesson resources')
    } finally {
      setActivityLoading(false)
    }
  }

  const handleCloseResources = () => {
    setResourceLesson(null)
    setActivities([])
    setResourceType('resources')
    setActivityTitle('')
    setActivityDescription('')
    setActivityFile(null)
    setActivityError(null)
  }

  const handleUploadActivity = async (e) => {
    e.preventDefault()
    if (!resourceLesson) return
    if (!activityFile) {
      setActivityError('Please choose a file to upload')
      return
    }

    setActivityUploading(true)
    setActivityError(null)
    try {
      const typePrefix = resourceType === 'homework' ? 'Homework:' : 'Resource:'
      const resolvedTitle = activityTitle
        ? (activityTitle.startsWith(typePrefix) ? activityTitle : `${typePrefix} ${activityTitle}`)
        : `${typePrefix} ${activityFile.name}`

      const { error: uploadError } = await uploadLessonActivity(
        activityFile,
        resourceLesson.id,
        user.id,
        resolvedTitle,
        activityDescription || ''
      )
      if (uploadError) throw uploadError

      const { data, error: activitiesError } = await getLessonActivities(resourceLesson.id)
      if (activitiesError) throw activitiesError
      setActivities(data || [])

      setActivityTitle('')
      setActivityDescription('')
      setActivityFile(null)
    } catch (err) {
      setActivityError(err.message || 'Failed to upload resource')
    } finally {
      setActivityUploading(false)
    }
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
          tutorId: user.id,
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

  const typePrefix = resourceType === 'homework' ? 'Homework:' : 'Resource:'
  const filteredActivities = activities.filter((activity) => {
    if (!activity?.title) return resourceType === 'resources'
    return activity.title.startsWith(typePrefix)
  })

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
              {!selectedLesson && (
                <div className="form-group">
                  <label htmlFor="studentId">Student *</label>
                  <select
                    id="studentId"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

      <div className="lessons-list">
        {lessons.length === 0 ? (
          <div className="empty-state">No lessons found.</div>
        ) : (
          lessons.map((lesson) => (
            <div key={lesson.id} className="lesson-card">
              <h3>{lesson.title}</h3>
              <p><strong>Student:</strong> {lesson.student?.full_name || 'N/A'}</p>
              <p><strong>Date:</strong> {new Date(lesson.lesson_date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {lesson.lesson_time.slice(0, 5)}</p>
              <p><strong>Status:</strong> {lesson.status}</p>
              <div className="lesson-actions">
                <button onClick={() => handleEdit(lesson)} className="btn-secondary">
                  Edit
                </button>
                <button onClick={() => handleOpenResources(lesson, 'resources')} className="btn-secondary">
                  Resources
                </button>
                <button onClick={() => handleOpenResources(lesson, 'homework')} className="btn-secondary">
                  Homework
                </button>
                {lesson.status !== 'archived' && (
                  <button onClick={() => handleArchive(lesson.id)} className="btn-secondary">
                    Archive
                  </button>
                )}
                <button onClick={() => handleDelete(lesson.id)} className="btn-danger">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {resourceLesson && (
        <div className="lesson-form-modal">
          <div className="modal-content">
            <h3>{resourceType === 'homework' ? 'Lesson Homework' : 'Lesson Resources'}</h3>
            <p><strong>Lesson:</strong> {resourceLesson.title}</p>

            {activityError && <div className="error-message">{activityError}</div>}

            <form onSubmit={handleUploadActivity}>
              <div className="form-group">
                <label htmlFor="activityTitle">Title</label>
                <input
                  id="activityTitle"
                  type="text"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="e.g., Worksheet 1"
                />
              </div>
              <div className="form-group">
                <label htmlFor="activityDescription">Description</label>
                <textarea
                  id="activityDescription"
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  rows="3"
                  placeholder="Optional notes for the student"
                />
              </div>
              <div className="form-group">
                <label htmlFor="activityFile">File *</label>
                <input
                  id="activityFile"
                  type="file"
                  onChange={(e) => setActivityFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" disabled={activityUploading} className="btn-primary">
                  {activityUploading
                    ? 'Uploading...'
                    : resourceType === 'homework'
                      ? 'Upload Homework'
                      : 'Upload Resource'}
                </button>
                <button type="button" onClick={handleCloseResources} className="btn-secondary">
                  Close
                </button>
              </div>
            </form>

            <div style={{ marginTop: '1.5rem' }}>
              <h4>{resourceType === 'homework' ? 'Homework Files' : 'Resource Files'}</h4>
              {activityLoading ? (
                <p>Loading resources...</p>
              ) : filteredActivities.length === 0 ? (
                <p>No resources uploaded yet.</p>
              ) : (
                <div className="activities-list">
                  {filteredActivities.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-info">
                        <h5>{activity.title}</h5>
                        {activity.description && <p>{activity.description}</p>}
                        <small>{activity.file_name} ({(activity.file_size / 1024).toFixed(2)} KB)</small>
                      </div>
                      <button
                        onClick={() => window.open(activity.file_url, '_blank')}
                        className="btn-secondary"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

