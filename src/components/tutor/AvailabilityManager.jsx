import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/auth'

export default function AvailabilityManager({ tutorId }) {
  const [hourlyRate, setHourlyRate] = useState(30.00)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [availability, setAvailability] = useState([])

  const loadHourlyRate = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('id', tutorId)
        .single()

      if (error) throw error
      if (data?.hourly_rate) {
        setHourlyRate(data.hourly_rate)
      }
    } catch (err) {
      console.error('Error loading hourly rate:', err)
    }
  }, [tutorId])

  const loadAvailability = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_availability')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('day_of_week', { ascending: true })

      if (error) throw error
      setAvailability(data || [])
    } catch (err) {
      console.error('Error loading availability:', err)
    }
  }, [tutorId])

  useEffect(() => {
    loadHourlyRate()
    loadAvailability()
  }, [loadHourlyRate, loadAvailability])

  const saveHourlyRate = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ hourly_rate: parseFloat(hourlyRate) })
        .eq('id', tutorId)

      if (error) throw error
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save hourly rate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="availability-manager">
      <h2>Availability & Hourly Rate</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Hourly rate updated successfully!</div>}

      <div className="rate-section">
        <h3>Set Your Hourly Rate</h3>
        <div className="rate-input-group">
          <label htmlFor="hourly-rate">Hourly Rate (£)</label>
          <div className="rate-input">
            <span>£</span>
            <input
              id="hourly-rate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              step="0.01"
              min="0"
            />
          </div>
          <button 
            onClick={saveHourlyRate}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : 'Save Rate'}
          </button>
        </div>
      </div>

      <div className="availability-section">
        <h3>Your Availability</h3>
        {availability.length === 0 ? (
          <p>No availability set yet.</p>
        ) : (
          <div className="availability-list">
            {availability.map((slot) => (
              <div key={slot.id} className="availability-item">
                <p><strong>{slot.day_of_week}</strong></p>
                <p>{slot.start_time} - {slot.end_time}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}