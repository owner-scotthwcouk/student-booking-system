import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getTutorAvailability, setTutorAvailability as setAvailability, deleteTutorAvailability, getBlockedTimeSlots, blockTimeSlot, deleteBlockedTimeSlot } from '../../lib/availabilityAPI'
import { getTutorHourlyRate, updateTutorHourlyRate } from '../../lib/profileAPI'

export default function AvailabilityManager() {
  const { user } = useAuth()
  const [availability, setAvailabilityData] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  
  // New state for hourly rate
  const [hourlyRate, setHourlyRate] = useState('')

  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false)
  const [showBlockForm, setShowBlockForm] = useState(false)

  const [availabilityForm, setAvailabilityForm] = useState({
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true
  })

  const [blockForm, setBlockForm] = useState({
    startDatetime: '',
    endDatetime: '',
    reason: ''
  })

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]

  useEffect(() => {
    if (user) {
      loadAvailability()
      loadBlockedSlots()
      loadHourlyRate()
    }
  }, [user])

  async function loadAvailability() {
    try {
      const { data, error } = await getTutorAvailability(user.id)
      if (error) throw error
      setAvailabilityData(data || [])
    } catch (err) {
      console.error('Failed to load availability', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadBlockedSlots() {
    try {
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const { data, error } = await getBlockedTimeSlots(user.id, startDate, endDate)
      if (error) throw error
      setBlockedSlots(data || [])
    } catch (err) {
      console.error('Failed to load blocked slots', err)
    }
  }

  // New function to load hourly rate
  async function loadHourlyRate() {
    try {
      const { data, error } = await getTutorHourlyRate(user.id)
      if (error) throw error
      if (data) {
        setHourlyRate(data.hourly_rate)
      }
    } catch (err) {
      console.error('Failed to load hourly rate', err)
    }
  }

  // New handler for hourly rate submission
  const handleRateSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      const { error } = await updateTutorHourlyRate(user.id, parseFloat(hourlyRate))
      if (error) throw error
      alert('Hourly rate updated successfully')
    } catch (err) {
      setError(err.message || 'Failed to update hourly rate')
    } finally {
      setSaving(false)
    }
  }

  const handleAvailabilitySubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await setAvailability(
        user.id,
        availabilityForm.dayOfWeek,
        availabilityForm.startTime,
        availabilityForm.endTime,
        availabilityForm.isAvailable
      )

      if (updateError) throw updateError

      setShowAvailabilityForm(false)
      loadAvailability()
    } catch (err) {
      setError(err.message || 'Failed to set availability')
    } finally {
      setSaving(false)
    }
  }

  const handleBlockSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (new Date(blockForm.endDatetime) <= new Date(blockForm.startDatetime)) {
        throw new Error('End date/time must be after start date/time')
      }

      const { error: blockError } = await blockTimeSlot(
        user.id,
        blockForm.startDatetime,
        blockForm.endDatetime,
        blockForm.reason
      )

      if (blockError) throw blockError

      setShowBlockForm(false)
      setBlockForm({ startDatetime: '', endDatetime: '', reason: '' })
      loadBlockedSlots()
    } catch (err) {
      setError(err.message || 'Failed to block time slot')
    } finally {
      setSaving(false)
    }
  }

  const handleUnblock = async (blockedSlotId) => {
    if (!confirm('Remove this blocked time slot?')) return

    try {
      const { error } = await deleteBlockedTimeSlot(blockedSlotId)
      if (error) throw error
      loadBlockedSlots()
    } catch (err) {
      setError(err.message || 'Failed to remove blocked slot')
    }
  }

  const handleDeleteAvailability = async (availabilityId) => {
    if (!confirm('Delete this availability slot?')) return

    try {
      const { error } = await deleteTutorAvailability(availabilityId)
      if (error) throw error
      loadAvailability()
    } catch (err) {
      setError(err.message || 'Failed to delete availability')
    }
  }

  if (loading) return <div>Loading availability...</div>

  return (
    <div className="availability-manager-container">
      <h2>Availability Management</h2>

      {error && <div className="error-message">{error}</div>}

      {/* NEW: Hourly Rate Section */}
      <div className="availability-section">
        <div className="section-header">
          <h3>Hourly Rate</h3>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <form onSubmit={handleRateSubmit} style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="hourlyRate">Rate per Hour (£)</label>
              <input
                type="number"
                id="hourlyRate"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                required
                style={{ width: '150px' }}
              />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Update Rate'}
            </button>
          </form>
        </div>
      </div>

      {/* Weekly Availability */}
      <div className="availability-section">
        <div className="section-header">
          <h3>Weekly Availability</h3>
          <button onClick={() => setShowAvailabilityForm(true)} className="btn-primary">
            Set Availability
          </button>
        </div>

        {showAvailabilityForm && (
          <div className="availability-form-modal">
            <div className="modal-content">
              <h4>Set Weekly Availability</h4>
              <form onSubmit={handleAvailabilitySubmit}>
                <div className="form-group">
                  <label htmlFor="dayOfWeek">Day of Week *</label>
                  <select
                    id="dayOfWeek"
                    value={availabilityForm.dayOfWeek}
                    onChange={(e) => setAvailabilityForm({
                      ...availabilityForm,
                      dayOfWeek: parseInt(e.target.value)
                    })}
                    required
                  >
                    {daysOfWeek.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="startTime">Start Time *</label>
                  <input
                    type="time"
                    id="startTime"
                    value={availabilityForm.startTime}
                    onChange={(e) => setAvailabilityForm({
                      ...availabilityForm,
                      startTime: e.target.value
                    })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endTime">End Time *</label>
                  <input
                    type="time"
                    id="endTime"
                    value={availabilityForm.endTime}
                    onChange={(e) => setAvailabilityForm({
                      ...availabilityForm,
                      endTime: e.target.value
                    })}
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAvailabilityForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="availability-list">
          {availability.length === 0 ? (
            <p>No availability set.</p>
          ) : (
            <table className="availability-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {availability.map((avail) => (
                  <tr key={avail.id}>
                    <td>{daysOfWeek[avail.day_of_week]}</td>
                    <td>{avail.start_time.slice(0, 5)}</td>
                    <td>{avail.end_time.slice(0, 5)}</td>
                    <td>
                      <span className={avail.is_available ? 'text-success' : 'text-error'}>
                        {avail.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteAvailability(avail.id)}
                        className="btn-danger btn-small"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Blocked Time Slots */}
      <div className="blocked-slots-section">
        <div className="section-header">
          <h3>Blocked Time Slots</h3>
          <button onClick={() => setShowBlockForm(true)} className="btn-primary">
            Block Time Slot
          </button>
        </div>

        {showBlockForm && (
          <div className="block-form-modal">
            <div className="modal-content">
              <h4>Block Time Slot</h4>
              <form onSubmit={handleBlockSubmit}>
                <div className="form-group">
                  <label htmlFor="startDatetime">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    id="startDatetime"
                    value={blockForm.startDatetime}
                    onChange={(e) => setBlockForm({
                      ...blockForm,
                      startDatetime: e.target.value
                    })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endDatetime">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    id="endDatetime"
                    value={blockForm.endDatetime}
                    onChange={(e) => setBlockForm({
                      ...blockForm,
                      endDatetime: e.target.value
                    })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reason">Reason (Optional)</label>
                  <textarea
                    id="reason"
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm({
                      ...blockForm,
                      reason: e.target.value
                    })}
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Blocking...' : 'Block Time Slot'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBlockForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="blocked-slots-list">
          {blockedSlots.length === 0 ? (
            <p>No blocked time slots.</p>
          ) : (
            <table className="blocked-slots-table">
              <thead>
                <tr>
                  <th>Start</th>
                  <th>End</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blockedSlots.map((slot) => (
                  <tr key={slot.id}>
                    <td>{new Date(slot.start_datetime).toLocaleString()}</td>
                    <td>{new Date(slot.end_datetime).toLocaleString()}</td>
                    <td>{slot.reason || '-'}</td>
                    <td>
                      <button
                        onClick={() => handleUnblock(slot.id)}
                        className="btn-danger btn-small"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}