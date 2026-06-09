import React, { useState } from 'react'
import { createAssignment, deleteAssignment } from '../../lib/homeworkHubAPI'
import './homework-hub.css'

export default function TutorHomeworkHub() {
  const [activeTab, setActiveTab] = useState('assignments')
  const [assignments, setAssignments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const handleCreateAssignment = async (assignmentData) => {
    try {
      const { data, error } = await createAssignment(assignmentData)
      if (error) throw error
      setAssignments([...assignments, data])
      setShowModal(false)
    } catch (error) {
      console.error('Error creating assignment:', error)
    }
  }

  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        const { error } = await deleteAssignment(assignmentId)
        if (error) throw error
        setAssignments(assignments.filter(a => a.id !== assignmentId))
      } catch (error) {
        console.error('Error deleting assignment:', error)
      }
    }
  }

  return (
    <div className="homework-hub-container">
      <div className="homework-hub-header">
        <h1>📚 Homework Hub</h1>
        <div className="homework-hub-actions">
          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingAssignment(null)
              setShowModal(true)
            }}
          >
            + Create Assignment
          </button>
        </div>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
        </button>
        <button
          className={`tab-button ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          Submissions
        </button>
        <button
          className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          Resources
        </button>
        <button
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'assignments' && (
        <div className="tab-content active">
          <TutorAssignmentManager 
            assignments={assignments}
            onDelete={handleDeleteAssignment}
            onEdit={(assignment) => {
              setEditingAssignment(assignment)
              setShowModal(true)
            }}
          />
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="tab-content active">
          <TutorSubmissionReview assignments={assignments} />
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="tab-content active">
          <ResourceLibrary isEditable={true} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="tab-content active">
          <HomeworkAnalytics />
        </div>
      )}

      {showModal && (
        <TutorAssignmentCreator
          assignment={editingAssignment}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateAssignment}
        />
      )}
    </div>
  )
}
