import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'

function HomeworkSubmission({ lessonId, onSubmissionSuccess }) {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [submissionDate, setSubmissionDate] = useState('')
  const [submissionTime, setSubmissionTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    
    // Validate file type (ZIP only)
    if (selectedFile && selectedFile.type !== 'application/zip' && !selectedFile.name.endsWith('.zip')) {
      setError('Please select a ZIP file')
      setFile(null)
      return
    }
    
    // Validate file size (max 50MB)
    if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB')
      setFile(null)
      return
    }
    
    setFile(selectedFile)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!file) {
      setError('Please select a file')
      return
    }
    
    if (!submissionDate || !submissionTime) {
      setError('Please select submission date and time')
      return
    }
    
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${lessonId}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('homework-submissions')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('homework-submissions')
        .getPublicUrl(fileName)
      
      const { error: insertError } = await supabase
        .from('homework_submissions')
        .insert({
          lesson_id: lessonId,
          student_id: user.id,
          submission_file_url: publicUrl,
          submission_file_name: file.name,
          submission_file_size: file.size,
          submitted_at: new Date().toISOString(),
          status: 'submitted'
        })
      
      if (insertError) throw insertError
      
      setSuccess(true)
      setFile(null)
      setSubmissionDate('')
      setSubmissionTime('')
      
      // Reset form
      e.target.reset()
      
      // Notify parent component to refresh data
      if (onSubmissionSuccess) {
        setTimeout(() => {
          onSubmissionSuccess()
        }, 1000)
      }
    } catch (err) {
      setError(err.message || 'Failed to upload homework')
    } finally {
      setLoading(false)
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
          <label htmlFor="file">
            Upload Homework File:
          </label>
          <input
            type="file"
            id="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.zip,.txt"
            required
          />
          {file && (
            <p className="file-info">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
        
        <button type="submit" disabled={loading || !file}>
          {loading ? 'Uploading...' : 'Submit Homework'}
        </button>
      </form>
    </div>
  )
}

export default HomeworkSubmission
