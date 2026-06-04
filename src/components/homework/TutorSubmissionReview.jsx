import React, { useState, useEffect } from 'react'
import { getSubmissionsForAssignment, gradeSubmission, addComment } from '../../lib/homeworkHubAPI'
import './homework-hub.css'

export default function TutorSubmissionReview({ assignments }) {
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [loading, setLoading] = useState(false)
  const [rubricScores, setRubricScores] = useState({})
  const [grade, setGrade] = useState('')
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (selectedAssignment) {
      loadSubmissions(selectedAssignment)
    }
  }, [selectedAssignment])

  const loadSubmissions = async (assignmentId) => {
    setLoading(true)
    try {
      const { data, error } = await getSubmissionsForAssignment(assignmentId)
      if (error) throw error
      setSubmissions(data || [])
    } catch (error) {
      console.error('Error loading submissions:', error)
    }
    setLoading(false)
  }

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !grade) return

    setLoading(true)
    try {
      const { data, error } = await gradeSubmission(
        selectedSubmission.id,
        parseFloat(grade),
        rubricScores
      )
      if (error) throw error

      // Update submission in list
      setSubmissions(submissions.map(s =>
        s.id === selectedSubmission.id ? data : s
      ))
      setSelectedSubmission(data)
      setGrade('')
      setFeedback('')
    } catch (error) {
      console.error('Error grading submission:', error)
    }
    setLoading(false)
  }

  const handleAddFeedback = async () => {
    if (!selectedSubmission || !feedback) return

    setLoading(true)
    try {
      await addComment(selectedSubmission.id, feedback, true)
      setFeedback('')
      // Reload submission to show new comment
      if (selectedAssignment) {
        loadSubmissions(selectedAssignment)
      }
    } catch (error) {
      console.error('Error adding feedback:', error)
    }
    setLoading(false)
  }

  const rubricCriteria = [
    { name: 'Accuracy', maxScore: 25 },
    { name: 'Completeness', maxScore: 25 },
    { name: 'Presentation', maxScore: 25 },
    { name: 'Effort', maxScore: 25 }
  ]

  const getSubmissionStatus = (submission) => {
    if (submission.grade) return 'graded'
    if (submission.submitted_at) return 'submitted'
    if (submission.is_draft) return 'draft'
    return 'pending'
  }

  return (
    <div>
      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label className="form-label required">Select Assignment</label>
        <select
          value={selectedAssignment || ''}
          onChange={(e) => setSelectedAssignment(e.target.value)}
          className="form-select"
        >
          <option value="">Choose an assignment...</option>
          {assignments.map(assignment => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.title}
            </option>
          ))}
        </select>
      </div>

      {selectedAssignment && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Submissions List */}
          <div className="submission-content">
            <h3>Student Submissions</h3>
            {loading && <p>Loading...</p>}
            {submissions.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No submissions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {submissions.map(submission => (
                  <div
                    key={submission.id}
                    onClick={() => setSelectedSubmission(submission)}
                    style={{
                      padding: '1rem',
                      border: selectedSubmission?.id === submission.id ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      background: selectedSubmission?.id === submission.id ? '#f0f4ff' : 'white',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{submission.profiles?.full_name}</strong>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                          {new Date(submission.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`assignment-status ${getSubmissionStatus(submission)}`}>
                        {getSubmissionStatus(submission)}
                      </span>
                    </div>
                    {submission.grade && (
                      <p style={{ margin: '0.5rem 0', fontSize: '1rem', fontWeight: '600', color: '#4f46e5' }}>
                        Grade: {submission.grade}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grading Panel */}
          {selectedSubmission && (
            <div className="submission-content">
              <h3>Grade Submission</h3>

              <div className="form-group">
                <label className="form-label">Student: {selectedSubmission.profiles?.full_name}</label>
              </div>

              <div className="form-group">
                <label className="form-label">Submission Content</label>
                <div style={{
                  border: '1px solid #e5e7eb',
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  maxHeight: '200px',
                  overflow: 'auto',
                  background: '#f9fafb'
                }}>
                  {selectedSubmission.submission_text || 'No text content'}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Grade (out of 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="form-input"
                  placeholder="Enter grade"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rubric Scoring</label>
                <div className="rubric-container">
                  {rubricCriteria.map(criterion => (
                    <div key={criterion.name} className="rubric-row">
                      <div className="rubric-criterion">{criterion.name}</div>
                      <div className="rubric-description">out of {criterion.maxScore}</div>
                      <input
                        type="number"
                        min="0"
                        max={criterion.maxScore}
                        value={rubricScores[criterion.name] || ''}
                        onChange={(e) => setRubricScores(prev => ({
                          ...prev,
                          [criterion.name]: e.target.value
                        }))}
                        className="rubric-score-input"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="form-textarea"
                  placeholder="Provide constructive feedback for the student"
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleGradeSubmission}
                disabled={loading || !grade}
                style={{ width: '100%' }}
              >
                {loading ? 'Saving...' : 'Submit Grade'}
              </button>

              {feedback && (
                <button
                  className="btn btn-secondary"
                  onClick={handleAddFeedback}
                  disabled={loading}
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  {loading ? 'Adding...' : 'Add Feedback Comment'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
