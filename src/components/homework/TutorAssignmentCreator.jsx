import React, { useState, useEffect } from 'react'
import { createAssignment, updateAssignment, uploadResource, assignStudentsToAssignment } from '../../lib/homeworkHubAPI'
import './homework-hub.css'

export default function TutorAssignmentCreator({ assignment, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'homework',
    due_date: '',
    due_time: '23:59',
    max_score: 100,
    instructions: '',
    attachment_url: null,
    attachment_name: '',
    status: 'active'
  })

  const [selectedStudents, setSelectedStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [students] = useState([])

  useEffect(() => {
    if (assignment) {
      setFormData(assignment)
    }
    // TODO: Fetch students from API
  }, [assignment])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      setFormData(prev => ({
        ...prev,
        attachment_name: uploadedFile.name,
        attachment_size: uploadedFile.size
      }))
    }
  }

  const handleStudentSelect = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let attachmentUrl = formData.attachment_url

      // Upload file if new file selected
      if (file) {
        const uploadData = {
          tutor_id: '...', // TODO: Get from auth
          title: formData.title,
          resource_type: 'assignment-material'
        }
        const { data: uploadedResource } = await uploadResource(file, uploadData)
        attachmentUrl = uploadedResource.file_url
      }

      const assignmentData = {
        ...formData,
        attachment_url: attachmentUrl,
        tutor_id: '...' // TODO: Get from auth
      }

      const { data, error } = assignment
        ? await updateAssignment(assignment.id, assignmentData)
        : await createAssignment(assignmentData)

      if (error) throw error

      // Assign to students
      if (selectedStudents.length > 0) {
        await assignStudentsToAssignment(data.id, selectedStudents)
      }

      onCreate(data)
      onClose()
    } catch (error) {
      console.error('Error saving assignment:', error)
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{assignment ? 'Edit Assignment' : 'Create New Assignment'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label required">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-input"
              required
              placeholder="e.g., Chapter 5 Homework"
            />
          </div>

          <div className="form-group">
            <label className="form-label required">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              required
              placeholder="Provide details about this assignment"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
              >
                <option value="homework">Homework</option>
                <option value="quiz">Quiz</option>
                <option value="project">Project</option>
                <option value="extra-credit">Extra Credit</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required">Max Score</label>
              <input
                type="number"
                name="max_score"
                value={formData.max_score}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Due Date</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Due Time</label>
              <input
                type="time"
                name="due_time"
                value={formData.due_time}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Instructions</label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Detailed instructions for students"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Attachment</label>
            <div className="file-upload">
              <div className="file-upload-text">
                <p><strong>Click to upload</strong> or drag and drop</p>
                <p>PDF, DOC, or image files</p>
                {file && <p className="text-success">Selected: {file.name}</p>}
              </div>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Assign to Students</label>
            <div className="student-list">
              {students.map(student => (
                <div key={student.id} className="student-item">
                  <input
                    type="checkbox"
                    id={`student-${student.id}`}
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => handleStudentSelect(student.id)}
                  />
                  <label htmlFor={`student-${student.id}`}>
                    {student.full_name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : assignment ? 'Update Assignment' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
