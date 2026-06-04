import React, { useState, useEffect } from 'react'
import { getSubmissionComments, addComment } from '../../lib/homeworkHubAPI'
import './homework-hub.css'

export default function SubmissionPanel({ submission, assignment, onSubmit }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (submission) {
      loadComments()
    }
  }, [submission])

  const loadComments = async () => {
    try {
      const { data, error } = await getSubmissionComments(submission.id)
      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setLoading(true)
    try {
      const { data, error } = await addComment(submission.id, newComment)
      if (error) throw error
      setComments([...comments, data])
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
    }
    setLoading(false)
  }

  if (!submission) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        color: '#6b7280'
      }}>
        <p>Select a submission to view details</p>
      </div>
    )
  }

  return (
    <div className="submission-panel">
      <div className="submission-main">
        {/* Assignment Details */}
        <div className="submission-content">
          <h3>Assignment</h3>
          <h2 style={{ margin: '0.5rem 0' }}>{assignment?.title}</h2>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{assignment?.description}</p>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.95rem' }}>
            <div>
              <strong>Due Date:</strong> {new Date(assignment?.due_date).toLocaleDateString()}
            </div>
            <div>
              <strong>Max Score:</strong> {assignment?.max_score}
            </div>
          </div>
        </div>

        {/* Submission Content */}
        <div className="submission-content">
          <h3>Submission</h3>
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '1rem',
            minHeight: '200px',
            background: '#f9fafb',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            {submission.submission_text || 'No text content'}
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
            <p>
              <strong>Submitted:</strong> {new Date(submission.submitted_at).toLocaleString()}
            </p>
            {submission.grade && (
              <p>
                <strong>Grade:</strong> <span style={{ fontSize: '1.1rem', color: '#4f46e5', fontWeight: '600' }}>
                  {submission.grade}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Attachments */}
        {submission.attachment_url && (
          <div className="submission-content">
            <h3>Attachments</h3>
            <div className="submission-attachments">
              <div className="attachment-item">
                <div className="attachment-info">
                  <div className="attachment-icon">📎</div>
                  <div>
                    <div className="attachment-name">{submission.attachment_name}</div>
                    <div className="attachment-size">
                      {submission.attachment_size ? (submission.attachment_size / 1024).toFixed(2) + ' KB' : 'Unknown size'}
                    </div>
                  </div>
                </div>
                <div className="attachment-actions">
                  <a href={submission.attachment_url} target="_blank" rel="noopener noreferrer" className="attachment-link">
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="comments-section">
          <h3>Feedback & Comments</h3>

          <div className="comments-list">
            {comments.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem' }}>
                No comments yet. {submission.grade ? 'Feedback will appear here.' : 'Your teacher will provide feedback once graded.'}
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

          {!submission.grade ? (
            <div className="comment-form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="comment-textarea"
                placeholder="Add a comment or question..."
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
          ) : (
            <div style={{
              padding: '1rem',
              background: '#f0fdf4',
              borderRadius: '0.5rem',
              color: '#166534',
              textAlign: 'center'
            }}>
              ✓ This assignment has been graded. Comments are closed.
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="submission-sidebar">
        {/* Status Card */}
        <div className="sidebar-card">
          <h4>Status</h4>
          <div className={`submission-status ${submission.grade ? 'graded' : submission.submitted_at ? 'submitted' : 'draft'}`}>
            {submission.grade ? '✓ Graded' : submission.submitted_at ? '✓ Submitted' : '📝 Draft'}
          </div>
        </div>

        {/* Grade Card */}
        {submission.grade && (
          <div className="sidebar-card">
            <h4>Your Grade</h4>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#4f46e5',
              textAlign: 'center',
              padding: '1rem'
            }}>
              {submission.grade}
            </div>
            {assignment?.max_score && (
              <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                out of {assignment.max_score}
              </div>
            )}
          </div>
        )}

        {/* Timeline Card */}
        <div className="sidebar-card">
          <h4>Timeline</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <strong>Assigned:</strong><br/>
              {new Date(assignment?.created_at).toLocaleDateString()}
            </div>
            <div>
              <strong>Due:</strong><br/>
              {new Date(assignment?.due_date).toLocaleDateString()}
            </div>
            {submission.submitted_at && (
              <div>
                <strong>Submitted:</strong><br/>
                {new Date(submission.submitted_at).toLocaleDateString()}
              </div>
            )}
            {submission.grade && (
              <div>
                <strong>Graded:</strong><br/>
                {new Date(submission.marked_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sidebar-card">
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={onSubmit}
          >
            View Full Submission
          </button>
        </div>
      </div>
    </div>
  )
}
