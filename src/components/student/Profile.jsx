import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/auth'
import { updateProfile, uploadProfilePicture } from '../../lib/profileAPI'
import { User, Camera, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function StudentProfile() {
  const { user, profile } = useAuth()
  
  // States
  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',
    address: ''
  })
  const [profilePicture, setProfilePicture] = useState(null)
  
  // UI States
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        phone_number: profile.phone_number || '',
        address: profile.address || ''
      })
      setProfilePicture(profile.profile_picture_url)
    }
  }, [profile])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { url, error: uploadError } = await uploadProfilePicture(user.id, file)
      if (uploadError) throw uploadError
      
      setProfilePicture(url)
      // Students update "isTutor = false"
      await updateProfile(user.id, { profile_picture_url: url }, false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to upload profile picture')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // isTutor = false
      const { error: updateError } = await updateProfile(user.id, formData, false)
      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <div style={{ padding: '2rem', color: '#fff' }}>Loading profile...</div>

  // --- Styles ---
  const containerStyle = {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '1px solid #334155',
    overflow: 'hidden',
    maxWidth: '1000px',
    margin: '0 auto'
  }

  const headerStyle = {
    padding: '1.5rem 2rem',
    borderBottom: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: '#0f172a'
  }

  const sidebarStyle = {
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.3)'
  }

  const contentStyle = {
    padding: '2rem'
  }

  const inputGroupStyle = {
    marginBottom: '1.5rem'
  }

  const labelStyle = {
    display: 'block',
    color: '#94a3b8',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: '500'
  }

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '1rem',
    transition: 'border-color 0.2s',
    outline: 'none'
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <User size={24} color="#818cf8" />
        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>My Student Profile</h2>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '1rem', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: '0.5rem' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', padding: '1rem', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', gap: '0.5rem' }}>
          <CheckCircle size={20} /> Changes saved successfully!
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        
        {/* Left Column: Photo */}
        <div style={{ ...sidebarStyle, flex: '1 1 300px', borderRight: '1px solid #334155' }}>
          <div style={{ 
            width: '150px', 
            height: '150px', 
            borderRadius: '50%', 
            backgroundColor: '#8b5cf6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '3rem',
            fontWeight: 'bold',
            color: '#fff',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            border: '4px solid #1e293b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              profile.full_name?.charAt(0).toUpperCase()
            )}
          </div>
          
          <label 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#334155', 
              color: '#fff', 
              borderRadius: '8px', 
              cursor: uploading ? 'wait' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#475569'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#334155'}
          >
            <Camera size={18} />
            {uploading ? 'Uploading...' : 'Change Photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Right Column: Form */}
        <div style={{ ...contentStyle, flex: '2 1 400px' }}>
          <form onSubmit={handleSubmit}>
            
            {/* Read-Only Fields */}
            <div style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #334155' }}>
              <h3 style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fixed Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <div style={{...inputStyle, backgroundColor: '#1e293b', borderColor: 'transparent', color: '#cbd5e1'}}>
                    {profile.full_name}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <div style={{...inputStyle, backgroundColor: '#1e293b', borderColor: 'transparent', color: '#cbd5e1'}}>
                    {profile.date_of_birth || 'Not set'}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div style={inputGroupStyle}>
              <label htmlFor="email" style={labelStyle}>Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
              />
            </div>

            <div style={inputGroupStyle}>
              <label htmlFor="phone_number" style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
              />
            </div>

            <div style={inputGroupStyle}>
              <label htmlFor="address" style={labelStyle}>Address</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                style={{...inputStyle, resize: 'vertical'}}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
              />
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 2rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '1rem',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => !saving && (e.target.style.backgroundColor = '#7c3aed')}
                onMouseLeave={(e) => !saving && (e.target.style.backgroundColor = '#8b5cf6')}
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
