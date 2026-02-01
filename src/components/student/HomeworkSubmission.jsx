import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/auth'
import { supabase } from '../../lib/supabaseClient'
import { 
  UploadCloud, 
  FileText, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  MessageSquare 
} from 'lucide-react'

export default function HomeworkSubmission() {
  const { user } = useAuth()
  const [lessons, setLessons] = useState([])
  const [selectedLesson, setSelectedLesson] = useState('')
  const [file, setFile] = useState(null)
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Fetch recent confirmed lessons
  useEffect(() => {
    async function loadLessons() {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('id, lesson_date, lesson_time, status')
          .eq('student_id', user.id)
          .eq('status', 'confirmed')
          .order('lesson_date', { ascending: false })
          .limit(10)

        if (error) throw error
        setLessons(data || [])
      } catch (err) {
        console.error('Error loading lessons:', err)
      }
    }
    loadLessons()
  }, [user])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return setError('Please select a file to upload.')
    if (!selectedLesson) return setError('Please select a lesson to link this homework to.')

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // 1. Upload File
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('homework-uploads')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 2. Save Database Record
      const { error: dbError } = await supabase
        .from('homework_submissions')
        .insert({
          student_id: user.id,
          booking_id: selectedLesson,
          file_path: fileName,
          comments: comments,
          submitted_at: new Date().toISOString(),
          status: 'pending_review'
        })

      if (dbError) throw dbError

      setSuccess(true)
      setFile(null)
      setComments('')
      setSelectedLesson('')
      setTimeout(() => setSuccess(false), 5000)

    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to submit homework.')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <div className="homework-wrapper">
      <div className="homework-card">
        <div className="card-header-centered">
          <div className="icon-circle">
            <UploadCloud size={28} color="#6366f1" />
          </div>
          <h2>Submit Homework</h2>
          <p>Upload your assignments for tutor review</p>
        </div>

        {error && (
          <div className="status-message error">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {success && (
          <div className="status-message success">
            <CheckCircle2 size={18} />
            <span>Homework submitted successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="homework-form">
          {/* Lesson Select */}
          <div className="form-group">
            <label>Select Lesson</label>
            <div className="input-wrapper">
              <BookOpen className="input-icon" size={18} />
              <select 
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                required
              >
                <option value="">-- Choose a lesson --</option>
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>
                    {new Date(l.lesson_date).toLocaleDateString()} at {l.lesson_time.slice(0, 5)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload */}
          <div className="form-group">
            <label>Assignment File</label>
            <div className={`file-drop-zone ${file ? 'active' : ''}`}>
              <input 
                type="file" 
                id="file-upload" 
                onChange={handleFileChange}
                className="hidden-input"
                accept=".pdf,.doc,.docx,.jpg,.png,.txt,.zip"
              />
              
              {!file ? (
                <label htmlFor="file-upload" className="drop-label">
                  <UploadCloud size={32} className="upload-icon-large" />
                  <span>Click to upload file</span>
                  <small>PDF, Word, Images (Max 50MB)</small>
                </label>
              ) : (
                <div className="file-preview-item">
                  <div className="file-details">
                    <FileText size={24} className="file-type-icon" />
                    <div>
                      <span className="name">{file.name}</span>
                      <span className="size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="btn-remove">
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="form-group">
            <label>Comments (Optional)</label>
            <div className="input-wrapper textarea-wrapper">
              <MessageSquare className="input-icon textarea-icon" size={18} />
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any notes for your tutor..."
                rows={3}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !file} 
            className="btn-submit-homework"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Send size={18} /> Submit Assignment
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}