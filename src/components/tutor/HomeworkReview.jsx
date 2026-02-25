import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/auth'
import { getTutorHomework, updateHomeworkFeedback } from '../../lib/homeworkAPI'
import { downloadFile } from '../../lib/fileUploadAPI'

export default function HomeworkReview() {
  const { user } = useAuth()
  const [homework, setHomework] = useState([])
  const [selectedHomework, setSelectedHomework] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [markedAt, setMarkedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, submitted, marked

  const loadHomework = useCallback(async () => {
    try {
      const { data, error } = await getTutorHomework(user.id)
      if (error) throw error
      setHomework(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load homework')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    loadHomework()
  }, [loadHomework])

  const handleSelectHomework = (hw) => {
    setSelectedHomework(hw)
    setFeedback(hw.tutor_feedback || '')
    setMarkedAt(hw.marked_at ? new Date(hw.marked_at).toISOString().slice(0, 16) : '')
  }

  const handleDownload = async (homework) => {
    try {
      // Extract file path from URL
      const url = new URL(homework.submission_file_url)
      const pathParts = url.pathname.split('/')
      const bucketName = 'homework-submissions'
      const filePath = pathParts.slice(pathParts.indexOf(bucketName) + 1).join('/')
      
      const { data, error } = await downloadFile(bucketName, filePath)
      if (error) throw error
      
      // Create download link
      const blob = new Blob([data])
      const url_download = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url_download
      a.download = homework.submission_file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url_download)
      document.body.removeChild(a)
    } catch (err) {
      setError(err.message || 'Failed to download homework')
    }
  }

  const handleSubmitFeedback = useCallback(async (homeworkId) => {
    try {
      const markedDateTime = markedAt ? new Date(markedAt).toISOString() : new Date().toISOString()
      
      const { error } = await updateHomeworkFeedback(
        homeworkId,
        feedback,
        markedDateTime,
        user.id
      )
      
      if (error) throw error

      setFeedback('')
      setMarkedAt('')
      setSelectedHomework(null)
      loadHomework()
    } catch (err) {
      setError(err.message || 'Failed to save feedback')
    } finally {
      setSaving(false)
    }
  }, [feedback, markedAt, user.id, loadHomework])

  const filteredHomework = homework.filter((hw) => {
    if (filter === 'submitted') return hw.status === 'submitted'
    if (filter === 'marked') return hw.status === 'marked'
    return true
  })

  if (loading) return <div>Loading homework submissions...</div>

  return (
    <div className="homework-review-container">
      <h2>Homework Submissions</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="filter-tabs">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Submissions
        </button>
        <button
          className={filter === 'submitted' ? 'active' : ''}
          onClick={() => setFilter('submitted')}
        >
          Pending Review
        </button>
        <button
          className={filter === 'marked' ? 'active' : ''}
          onClick={() => setFilter('marked')}
        >
          Marked
        </button>
      </div>

      <div className="homework-review-layout">
        <div className="homework-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filteredHomework.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: '#666' }}>No homework submissions found.</div>
          ) : (
            filteredHomework.map((hw) => (
              <div
                key={hw.id}
                className={`homework-item ${selectedHomework?.id === hw.id ? 'selected' : ''}`}
                onClick={() => handleSelectHomework(hw)}
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.17), rgba(255,255,255,0.08))',
                  border: selectedHomework?.id === hw.id ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  boxShadow: selectedHomework?.id === hw.id
                    ? '0 14px 30px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.45)'
                    : '0 8px 20px rgba(15, 23, 42, 0.22)',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedHomework?.id !== hw.id) {
                    e.currentTarget.style.transform = 'translateY(-5px)'
                    e.currentTarget.style.boxShadow = '0 14px 30px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.45)'
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedHomework?.id !== hw.id) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.22)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                  }
                }}
              >
                <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#fff' }}>{hw.lesson?.title || 'No Lesson Title'}</h4>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#e5e5e5' }}><strong>Student:</strong> {hw.student?.full_name || 'Unknown'}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#e5e5e5' }}><strong>Submitted:</strong> {new Date(hw.submitted_at).toLocaleString()}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#e5e5e5' }}><strong>File:</strong> {hw.submission_file_name}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#e5e5e5' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      backgroundColor: hw.status === 'marked' ? 'rgba(34, 197, 94, 0.2)' : hw.status === 'submitted' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                      color: hw.status === 'marked' ? '#86efac' : hw.status === 'submitted' ? '#93c5fd' : '#d1d5db',
                      textTransform: 'capitalize'
                    }}
                  >
                    {hw.status}
                  </span>
                </p>
                {hw.marked_at && (
                  <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: '#a0a0a0' }}><small>Marked: {new Date(hw.marked_at).toLocaleString()}</small></p>
                )}
              </div>
            ))
          )}
        </div>

        {selectedHomework && (
          <div className="homework-detail">
            <h3>Review Homework</h3>
            <div className="homework-info">
              <p><strong>Lesson:</strong> {selectedHomework.lesson?.title || 'N/A'}</p>
              <p><strong>Student:</strong> {selectedHomework.student?.full_name || 'N/A'}</p>
              <p><strong>Submitted:</strong> {new Date(selectedHomework.submitted_at).toLocaleString()}</p>
              <p><strong>File:</strong> {selectedHomework.submission_file_name}</p>
              <p><strong>File Size:</strong> {(selectedHomework.submission_file_size / 1024).toFixed(2)} KB</p>
            </div>

            <button
              onClick={() => handleDownload(selectedHomework)}
              className="btn-primary"
            >
              Download Homework
            </button>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitFeedback(selectedHomework.id) }} className="feedback-form">
              <div className="form-group">
                <label htmlFor="feedback">Feedback</label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows="8"
                  placeholder="Enter feedback for the student..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="markedAt">Marked Date & Time</label>
                <input
                  type="datetime-local"
                  id="markedAt"
                  value={markedAt}
                  onChange={(e) => setMarkedAt(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Feedback'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

