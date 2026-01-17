import { useState } from 'react'
import { uploadHomework } from '../../lib/fileUploadAPI'
import { useAuth } from '../../hooks/useAuth'

function HomeworkSubmission({ lessonId }) {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState(null)
  const [submissionDate, setSubmissionDate] = useState('')
  const [submissionTime, setSubmissionTime] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    
    // Validate file type (ZIP only)
    if (file && file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
      setError('Please select a ZIP file')
      setSelectedFile(null)
      return
    }
    
    // Validate file size (max 50MB)
    if (file && file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB')
      setSelectedFile(null)
      return
    }
    
    setSelectedFile(file)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedFile) {
      setError('Please select a file')
      return
    }
    
    setUploading(true)
    setError(null)
    
    try {
      const { data, error } = await uploadHomework(
        selectedFile,
        lessonId,
        user.id
      )
      
      if (error) throw error
      
      setSuccess(true)
      setSelectedFile(null)
      
      // Reset form
      e.target.reset()
    } catch (err) {
      setError(err.message || 'Failed to upload homework')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="homework-submission">
      <h3>Submit Homework</h3>
      
      {success && (
        <div className="success-message">
          Homework submitted successfully!
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="homework-file">
            Select ZIP File:
          </label>
          <input
            type="file"
            id="homework-file"
            accept=".zip,application/zip"
            onChange={handleFileChange}
            required
          />
          {selectedFile && (
            <p className="file-info">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="submission-date">Submission Date:</label>
          <input
            type="date"
            id="submission-date"
            value={submissionDate}
            onChange={(e) => setSubmissionDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="submission-time">Submission Time:</label>
          <input
            type="time"
            id="submission-time"
            value={submissionTime}
            onChange={(e) => setSubmissionTime(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={uploading || !selectedFile}>
          {uploading ? 'Uploading...' : 'Submit Homework'}
        </button>
      </form>
    </div>
  )
}

export default HomeworkSubmission
