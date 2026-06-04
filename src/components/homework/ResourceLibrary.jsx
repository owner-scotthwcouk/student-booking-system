import React, { useState, useEffect } from 'react'
import { getResourcesByTutor, uploadResource, linkResourceToAssignment } from '../../lib/homeworkHubAPI'
import './homework-hub.css'

export default function ResourceLibrary({ isEditable = false }) {
  const [resources, setResources] = useState([])
  const [filteredResources, setFilteredResources] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)

  useEffect(() => {
    loadResources()
  }, [])

  useEffect(() => {
    filterResources(activeFilter)
  }, [resources, activeFilter])

  const loadResources = async () => {
    setLoading(true)
    try {
      const { data, error } = await getResourcesByTutor('...') // TODO: Get tutor ID from auth
      if (error) throw error
      setResources(data || [])
    } catch (error) {
      console.error('Error loading resources:', error)
    }
    setLoading(false)
  }

  const filterResources = (filter) => {
    if (filter === 'all') {
      setFilteredResources(resources)
    } else {
      setFilteredResources(resources.filter(r => r.resource_type === filter))
    }
  }

  const resourceTypes = [
    { value: 'all', label: 'All Resources' },
    { value: 'study-guide', label: 'Study Guides' },
    { value: 'rubric', label: 'Rubrics' },
    { value: 'example', label: 'Examples' },
    { value: 'reference', label: 'References' }
  ]

  const handleUploadResource = async (file, resourceData) => {
    setLoading(true)
    try {
      const { data, error } = await uploadResource(file, resourceData)
      if (error) throw error
      setResources([...resources, data])
      setShowUploadForm(false)
    } catch (error) {
      console.error('Error uploading resource:', error)
    }
    setLoading(false)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="resource-library">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>📚 Resource Library</h2>
        {isEditable && (
          <button
            className="btn btn-primary"
            onClick={() => setShowUploadForm(true)}
          >
            + Upload Resource
          </button>
        )}
      </div>

      <div className="resource-filters">
        {resourceTypes.map(type => (
          <button
            key={type.value}
            className={`resource-filter-btn ${activeFilter === type.value ? 'active' : ''}`}
            onClick={() => setActiveFilter(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>

      {showUploadForm && (
        <ResourceUploadForm
          onUpload={handleUploadResource}
          onCancel={() => setShowUploadForm(false)}
          loading={loading}
        />
      )}

      {loading && <p>Loading resources...</p>}

      {filteredResources.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#f9fafb',
          borderRadius: '0.75rem',
          color: '#6b7280'
        }}>
          <p>No resources found in this category.</p>
        </div>
      ) : (
        <div className="resource-grid">
          {filteredResources.map(resource => (
            <div key={resource.id} className="resource-card">
              <div>
                <span className="resource-type-badge">{resource.resource_type}</span>
              </div>
              <h3 className="resource-title">{resource.title}</h3>
              <p className="resource-description">{resource.description}</p>
              <div className="resource-meta">
                <span>📄 {formatFileSize(resource.file_size)}</span>
                <span>{new Date(resource.created_at).toLocaleDateString()}</span>
              </div>
              <div className="resource-actions">
                <a
                  href={resource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-link"
                >
                  Download
                </a>
                {isEditable && (
                  <button className="btn btn-sm btn-secondary">
                    Link to Assignment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResourceUploadForm({ onUpload, onCancel, loading }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'study-guide',
    category: ''
  })
  const [file, setFile] = useState(null)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return

    await onUpload(file, {
      ...formData,
      tutor_id: '...' // TODO: Get from auth
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Upload Resource</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label required">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              required
              placeholder="Resource title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea"
              placeholder="Brief description of the resource"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Resource Type</label>
              <select
                value={formData.resource_type}
                onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                className="form-select"
              >
                <option value="study-guide">Study Guide</option>
                <option value="rubric">Rubric</option>
                <option value="example">Example</option>
                <option value="reference">Reference</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Category/Topic</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="form-input"
                placeholder="e.g., Algebra, Chapter 3"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Upload File</label>
            <div className="file-upload">
              <div className="file-upload-text">
                <p><strong>Click to upload</strong> or drag and drop</p>
                <p>PDF, DOC, image files up to 50MB</p>
                {file && <p className="text-success">Selected: {file.name}</p>}
              </div>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Upload Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
