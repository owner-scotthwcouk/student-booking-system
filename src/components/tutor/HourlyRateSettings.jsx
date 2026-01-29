import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/auth'
import { getTutorHourlyRate, updateTutorHourlyRate } from '../../lib/profileAPI'

export default function HourlyRateSettings() {
  const { user } = useAuth()
  const [rate, setRate] = useState(30.00)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadRate()
  }, [])

  async function loadRate() {
    const { data } = await getTutorHourlyRate(user.id)
    if (data?.hourly_rate) {
      setRate(data.hourly_rate)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await updateTutorHourlyRate(user.id, parseFloat(rate))
      if (error) throw error
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', padding: '2rem', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '2px solid #3a3a3a' }}>
      <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>Hourly Rate Settings</h3>
      
      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: '2px solid #10b981' }}>
          Rate updated successfully!
        </div>
      )}
      
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: '2px solid #ef4444' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#ffffff', marginBottom: '0.5rem', fontWeight: '600' }}>
            Hourly Rate (£)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', fontSize: '1.25rem', backgroundColor: '#000000', color: '#ffffff', border: '2px solid #3a3a3a', borderRadius: '6px' }}
          />
          <small style={{ color: '#a0a0a0', display: 'block', marginTop: '0.5rem' }}>
            This is the amount students will pay per hour
          </small>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: '600', color: '#ffffff', backgroundColor: '#7c3aed', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          {loading ? 'Saving...' : 'Update Rate'}
        </button>
      </form>
    </div>
  )
}
