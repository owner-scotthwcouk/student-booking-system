import React, { useState, useEffect } from 'react'
import { getAssignmentsForStudent, submitAssignmentWork, saveAssignmentDraft } from '../../lib/homeworkHubAPI'
import './homework-hub.css'

export default function HomeworkHub() {
  const [activeTab, setActiveTab] = useState('pending')
  const [assignments, setAssignments] = useState([])
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAssignments()
  }, [])

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const { data, error } = await getAssignmentsForStudent('...') // TODO: Get student ID from auth
      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
    setLoading(false)
  }

  const getAssignmentStatus = (assignment) => {
    const today = new Date()
    const due = new Date(assignment.due_date)
    if (today > due) return 'overdue'
    if ((due - today) / (1000 * 60 * 60 * 24) <= 3) return 'due-soon'
    return 'upcoming'
  }

  const filterAssignments = (tab) => {
    return assignments.filter(a => {
      if (tab === 'pending') return !a.submitted_at
      if (tab === 'submitted') return a.submitted_at && !a.grade
      if (tab === 'graded') return a.grade
      return true
    })
  }

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' }
    return new Date(dateString).toLocaleDateString('en-US', options)
  }

  return (
    <div className="homework-hub-container">
      <div className="homework-hub-header">
        <h1>📚 My Assignments</h1>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({filterAssignments('pending').length})
        </button>
        <button
          className={`tab-button ${activeTab === 'submitted' ? 'active' : ''}`}
          onClick={() => setActiveTab('submitted')}
        >
          Submitted ({filterAssignments('submitted').length})
        </button>
        <button
          className={`tab-button ${activeTab === 'graded' ? 'active' : ''}`}
          onClick={() => setActiveTab('graded')}
        >
          Graded ({filterAssignments('graded').length})
        </button>
      </div>

      <div className="assignment-list">
        {filterAssignments(activeTab).map(assignment => (
          <div
            key={assignment.id}
            className={`assignment-card ${getAssignmentStatus(assignment)}`}
            onClick={() => setSelectedAssignment(assignment)}
            style={{ cursor: 'pointer' }}
          >
            <div className="assignment-header">
              <h3 className="assignment-title">{assignment.title}</h3>
              <span className="assignment-category">{assignment.category}</span>
            </div>

            <p style={{ margin: '0.75rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
              {assignment.description}
            </p>

            <div className="assignment-meta">
              <div className="assignment-meta-item">
                📅 <strong>Due:</strong> {formatDate(assignment.due_date)}
              </div>
              <div className="assignment-meta-item">
                ⭐ <strong>Max Score:</strong> {assignment.max_score}
              </div>
            </div>

            {assignment.grade && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#dbeafe', borderRadius: '0.375rem' }}>
                <strong style={{ color: '#1e40af' }}>Your Grade: {assignment.grade}</strong>
              </div>
            )}

            <div className="assignment-actions">
              <button className="btn btn-sm btn-primary">
                {assignment.grade ? 'View Grade' : assignment.submitted_at ? 'View Submission' : 'Start Assignment'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedAssignment && (
        <StudentAssignmentDetail
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          onSubmit={() => {
            loadAssignments()
            setSelectedAssignment(null)
          }}
        />
      )}
    </div>
  )
}

function StudentAssignmentDetail({ assignment, onClose, onSubmit }) {
  const [submissionText, setSubmissionText] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDraft, setIsDraft] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data, error } = await submitAssignmentWork({
        assignment_id: assignment.id,
        student_id: '...', // TODO: Get from auth
        submission_text: submissionText,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      })
      if (error) throw error
      onSubmit()
    } catch (error) {
      console.error('Error submitting assignment:', error)
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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{assignment.title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="submission-section">
            <h3>Assignment Details</h3>
            <p>{assignment.description}</p>
            <p><strong>Due:</strong> {new Date(assignment.due_date).toLocaleDateString()} at {assignment.due_time}</p>
            <p><strong>Max Score:</strong> {assignment.max_score}</p>
          </div>

          {assignment.instructions && (
            <div className="submission-section">
              <h3>Instructions</h3>
              <p>{assignment.instructions}</p>
            </div>
          )}

          {!assignment.grade && (
            <div className="submission-section">
              <h3>Your Answer</h3>
              <textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                className="form-textarea"
                placeholder="Type your assignment answer here..."
                style={{ minHeight: '300px' }}
              />
            </div>
          )}

          {assignment.grade && (
            <div className="submission-section">
              <h3>Your Grade</h3>
              <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '0.5rem' }}>
                <p><strong style={{ color: '#1e40af', fontSize: '1.25rem' }}>Grade: {assignment.grade}</strong></p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {!assignment.grade && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleSaveDraft}
                disabled={loading || !submissionText}
              >
                Save Draft
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading || !submissionText}
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
