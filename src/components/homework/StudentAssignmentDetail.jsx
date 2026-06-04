import React, { useState, useEffect } from 'react'
import { submitAssignmentWork, saveAssignmentDraft, getAssignmentResources, getSubmissionComments, addComment } from '../../lib/homeworkHubAPI'
import './homework-hub.css'

export default function StudentAssignmentDetail({ assignment, onClose, onSubmit }) {
  const [submissionText, setSubmissionText] = useState('')
  const [file, setFile] = useState(null)
  const [resources, setResources] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDraft, setIsDraft] = useState(false)

  useEffect(() => {
    if (assignment) {
      loadResources()
      if (assignment.submission) {
        loadComments()
      }
    }
  }, [assignment])

  const loadResources = async () => {
    try {
      const { data, error } = await getAssignmentResources(assignment.id)
      if (error) throw error
      setResources(data || [])
    } catch (error) {
      console.error('Error loading resources:', error)
    }
  }

  const loadComments = async () => {
    try {
      const { data, error } = await getSubmissionComments(assignment.submission.id)
      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const handleFileUpload = (e) => {
    setFile(e.target.files[0])
  }

  const handleSubmit = async () => {
    if (!submissionText.trim()) return

    setLoading(true)
    try {
      const { data, error } = await submitAssignmentWork({
        assignment_id: assignment.id,
        student_id: '...', // TODO: Get from auth
        submission_text: submissionText,
        attachment_name: file?.name,
        attachment_size: file?.size,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      })
      if (error) throw error
      onSubmit()
    } catch (error) {
      console.error('Error submitting:', error)
    }
    setLoading(false)
  }

  const handleSaveDraft = async () => {
    setLoading(true)
    try {
      await saveAssignmentDraft({
        assignment_id: assignment.id,
        student_id: '...', // TODO: Get from auth
        submission_text: submissionText,
        is_draft: true
      })
      setIsDraft(true)
    } catch (error) {
      console.error('Error saving draft:', error)
    }
    setLoading(false)
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !assignment.submission) return

    setLoading(true)
    try {
      const { data, error } = await addComment(assignment.submission.id, newComment, false)
      if (error) throw error
      setComments([...comments, data])
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
    }
    setLoading(false)
  }

  const isSubmitted = assignment.submission?.submitted_at
  const isGraded = assignment.submission?.grade

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>{assignment.title}</h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
              Due: {new Date(assignment.due_date).toLocaleDateString()}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="submission-panel" style={{ gridTemplateColumns: '1fr' }}>
          <div className="submission-main">
            {/* Assignment Details */}
            <div className="submission-content">
              <h3>📋 Assignment Details</h3>
              <p>{assignment.description}</p>
              {assignment.instructions && (
                <>
                  <h4>Instructions:</h4>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{assignment.instructions}</p>
                </>
              )}
            </div>

            {/* Resources */}
            {resources.length > 0 && (
              <div className="submission-content">
                <h3>📚 Resources</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {resources.map(resource => (
                    <div key={resource.id} style={{
                      padding: '0.75rem',
                      background: '#f3f4f6',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong>{resource.title}</strong>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                          {resource.description}
                        </p>
                      </div>
                      <a
                        href={resource.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-primary"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submission Section */}
            {!isSubmitted && !isGraded ? (
              <div className="submission-content">
                <h3>✏️ Your Answer</h3>
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  className="form-textarea"
                  placeholder="Type or paste your assignment answer here..."
                  style={{ minHeight: '300px' }}
                />

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Attach File (Optional)</label>
                  <div className="file-upload">
                    <div className="file-upload-text">
                      <p><strong>Click to upload</strong> or drag and drop</p>
                      <p>PDF, DOC, or image files</p>
                      {file && <p className="text-success">Selected: {file.name}</p>}
                    </div>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="submission-content">
                <h3>📝 Your Submission</h3>
                <div style={{
                  border: '1px solid #e5e7eb',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  background: '#f9fafb',
                  minHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}>
                  {submissionText}
                </div>
              </div>
            )}

            {/* Grade Display */}
            {isGraded && (
              <div className="submission-content">
                <h3>📊 Grade</h3>
                <div style={{
                  padding: '1.5rem',
                  background: '#dbeafe',
                  borderRadius: '0.5rem',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: 0, color: '#1e40af', fontSize: '1rem' }}>Your Grade</p>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1e40af', marginTop: '0.5rem' }}>
                    {assignment.submission.grade}
                  </div>
                  {assignment.max_score && (
                    <p style={{ margin: '0.5rem 0 0 0', color: '#1e7da1', fontSize: '0.95rem' }}>
                      out of {assignment.max_score}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Comments Section */}
            {(isSubmitted || isGraded) && (
              <div className="comments-section">
                <h3>💬 Feedback</h3>
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem' }}>
                      No feedback yet.
                    </p>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="comment">
                        <div className="comment-avatar">
                          {comment.profiles?.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="comment-content">
                          <div className="comment-header">
                            <span className="comment-author">{comment.profiles?.full_name}</span>
                            {comment.is_tutor_feedback && (
                              <span className="comment-badge">👨‍🏫 Teacher</span>
                            )}
                            <span className="comment-time">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="comment-text">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {!isGraded && (
                  <div className="comment-form">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="comment-textarea"
                      placeholder="Add a question or comment..."
                    />
                    <div className="comment-actions">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={handleAddComment}
                        disabled={loading || !newComment.trim()}
                      >
                        {loading ? 'Adding...' : 'Add Comment'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {!isSubmitted && !isGraded && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleSaveDraft}
                disabled={loading}
              >
                {isDraft ? '✓ Saved as Draft' : 'Save as Draft'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading || !submissionText.trim()}
              >
                {loading ? 'Submitting...' : 'Submit Assignment'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
