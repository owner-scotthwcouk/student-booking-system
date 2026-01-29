import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { updateProfile, uploadProfilePicture } from '../../lib/profileAPI'

export default function StudentProfile() {
  const { user, profile } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',
    address: ''
  })
  const [profilePicture, setProfilePicture] = useState(null)
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
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
      
      // Update profile with new picture URL
      await updateProfile(user.id, { profile_picture_url: url }, false)
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

  if (!profile) return <div>Loading profile...</div>

  return (
    <div className="profile-container">
      <h2>My Profile</h2>

      {success && (
        <div className="success-message">Profile updated successfully!</div>
      )}
      {error && <div className="error-message">{error}</div>}

      <div className="profile-section">
        <div className="profile-picture-section">
          <div className="profile-picture-container">
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" className="profile-picture" />
            ) : (
              <div className="profile-picture-placeholder">
                {profile.full_name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-picture-upload">
            <label htmlFor="profile-picture">
              {uploading ? 'Uploading...' : 'Change Picture'}
            </label>
            <input
              type="file"
              id="profile-picture"
              accept="image/*"
              onChange={handleProfilePictureChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Full Name (Read Only)</label>
            <input
              type="text"
              value={profile.full_name || ''}
              disabled
              className="read-only-input"
            />
            <small>Name can only be changed by your tutor</small>
          </div>

          <div className="form-group">
            <label>Date of Birth (Read Only)</label>
            <input
              type="date"
              value={profile.date_of_birth || ''}
              disabled
              className="read-only-input"
            />
            <small>Date of birth can only be changed by your tutor</small>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">Phone Number</label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

