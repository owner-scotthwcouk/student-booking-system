import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/auth'
import { getProfile, updateProfile } from '../../lib/profileAPI'
import { User, Mail, Phone, MapPin, Save, Loader2 } from 'lucide-react'

export default function StudentProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    address: '',
    email: ''
  })

  useEffect(() => {
    if (user) loadProfile()
  }, [user])

  async function loadProfile() {
    try {
      const { data, error } = await getProfile(user.id)
      if (error) throw error
      setProfile(data)
      setFormData({
        full_name: data.full_name || '',
        phone_number: data.phone_number || '',
        address: data.address || '',
        email: data.email || user.email
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await updateProfile(user.id, formData)
      if (error) throw error
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading profile...</div>

  return (
    <div className="profile-container" style={{ maxWidth: '600px' }}>
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={24} color="var(--primary)" /> My Profile
        </h2>

        {message && (
          <div className={`notification ${message.type}`} style={{ 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1rem',
            background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.type === 'success' ? '#4ade80' : '#fca5a5',
            border: message.type === 'success' ? '1px solid #22c55e' : '1px solid #ef4444'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group">
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Full Name</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem' }}>
              <User size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
              <input 
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', opacity: 0.7 }}>
              <Mail size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
              <input 
                value={formData.email}
                readOnly
                style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Phone Number</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem' }}>
              <Phone size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
              <input 
                value={formData.phone_number}
                onChange={e => setFormData({...formData, phone_number: e.target.value})}
                style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Address</label>
            <div style={{ display: 'flex', alignItems: 'flex-start', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem' }}>
              <MapPin size={18} color="var(--text-muted)" style={{ marginRight: '10px', marginTop: '3px' }} />
              <textarea 
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                rows={3}
                style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', resize: 'vertical' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving} 
            className="btn-primary"
            style={{ 
              marginTop: '1rem', 
              padding: '0.8rem', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '0.5rem' 
            }}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}