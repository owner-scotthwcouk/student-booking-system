import React, { useState, useEffect } from 'react'
import './homework-hub.css'

export default function TutorAssignmentManager({ assignments, onDelete, onEdit }) {
  const [filteredAssignments, setFilteredAssignments] = useState(assignments)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortBy, setSortBy] = useState('due-date')

  useEffect(() => {
    let filtered = assignments

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus)
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(a => a.category === filterCategory)
    }

    // Sort
    if (sortBy === 'due-date') {
      filtered.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title))
    }

    setFilteredAssignments(filtered)
  }, [assignments, filterStatus, filterCategory, sortBy])

  const getAssignmentStatus = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0) return 'overdue'
    if (daysUntilDue <= 3) return 'due-soon'
    return 'upcoming'
  }

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' }
    return new Date(dateString).toLocaleDateString('en-US', options)
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
            style={{ width: '200px' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Filter by Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="form-select"
            style={{ width: '200px' }}
          >
            <option value="all">All Categories</option>
            <option value="homework">Homework</option>
            <option value="quiz">Quiz</option>
            <option value="project">Project</option>
            <option value="extra-credit">Extra Credit</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="form-select"
            style={{ width: '200px' }}
          >
            <option value="due-date">Due Date</option>
            <option value="recent">Recently Created</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          background: '#f9fafb', 
          borderRadius: '0.75rem',
          color: '#6b7280'
        }}>
          <p>No assignments found. Create your first assignment to get started!</p>
        </div>
      ) : (
        <div className="assignment-list">
          {filteredAssignments.map(assignment => {
            const statusType = getAssignmentStatus(assignment.due_date)
            return (
              <div 
                key={assignment.id} 
                className={`assignment-card ${statusType}`}
              >
                <div className="assignment-header">
                  <h3 className="assignment-title">{assignment.title}</h3>
                  <span className="assignment-category">{assignment.category}</span>
                </div>

                <p style={{ margin: '0.75rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
                  {assignment.description.substring(0, 100)}...
                </p>

                <div className="assignment-meta">
                  <div className="assignment-meta-item">
                    📅 <strong>Due:</strong> {formatDate(assignment.due_date)} at {assignment.due_time}
                  </div>
                  <div className="assignment-meta-item">
                    ⭐ <strong>Max Score:</strong> {assignment.max_score}
                  </div>
                  <div className="assignment-meta-item">
                    📊 <strong>Status:</strong> <span className="assignment-status">{assignment.status}</span>
                  </div>
                </div>

                <div className="assignment-actions">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => onEdit(assignment)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary"
                  >
                    View Submissions
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => onDelete(assignment.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
