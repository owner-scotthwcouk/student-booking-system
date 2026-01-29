// src/components/tutor/AvailabilityManager.jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/auth'

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

function toMinutes(timeStr) {
  if (!timeStr) return 0
  const t = String(timeStr).slice(0, 5)
  const [hh, mm] = t.split(':').map((v) => parseInt(v, 10))
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0)
}

function normalizeTime(timeStr) {
  // Store as HH:MM:SS
  if (!timeStr) return ''
  const s = String(timeStr).trim()
  if (s.length === 5) return `${s}:00`
  return s
}

function timeLabel(timeStr) {
  if (!timeStr) return ''
  return String(timeStr).slice(0, 5)
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  // [aStart,aEnd) intersects [bStart,bEnd)
  return aStart < bEnd && aEnd > bStart
}

export default function AvailabilityManager({ tutorId }) {
  const { user } = useAuth()
  const effectiveTutorId = tutorId || user?.id

  const [hourlyRate, setHourlyRate] = useState(30.0)

  const [availability, setAvailability] = useState([])

  const [loadingRate, setLoadingRate] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [busySlotId, setBusySlotId] = useState(null)

  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true
  })

  const [editingId, setEditingId] = useState(null)
  const [editSlot, setEditSlot] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true
  })

  const availabilityByDay = useMemo(() => {
    const map = new Map()
    for (const d of DAYS) map.set(d.value, [])
    for (const s of availability) {
      const k = Number(s.day_of_week)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(s)
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
      map.set(k, list)
    }
    return map
  }, [availability])

  const flashSuccess = (msg) => {
    setSuccess(msg)
    window.clearTimeout(flashSuccess._t)
    flashSuccess._t = window.setTimeout(() => setSuccess(null), 3000)
  }

  const loadHourlyRate = useCallback(async () => {
    if (!effectiveTutorId) return
    try {
      const { data, error: qErr } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('id', effectiveTutorId)
        .single()

      if (qErr) throw qErr
      if (data?.hourly_rate !== null && data?.hourly_rate !== undefined) {
        setHourlyRate(Number(data.hourly_rate))
      }
    } catch (err) {
      console.error('Error loading hourly rate:', err)
    }
  }, [effectiveTutorId])

  const loadAvailability = useCallback(async () => {
    if (!effectiveTutorId) return
    setLoadingAvailability(true)
    setError(null)

    try {
      const { data, error: qErr } = await supabase
        .from('tutor_availability')
        .select('id, tutor_id, day_of_week, start_time, end_time, is_available, is_active, created_at, updated_at')
        .eq('tutor_id', effectiveTutorId)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (qErr) throw qErr
      setAvailability(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading availability:', err)
      setError(err?.message || 'Failed to load availability')
    } finally {
      setLoadingAvailability(false)
    }
  }, [effectiveTutorId])

  useEffect(() => {
    loadHourlyRate()
    loadAvailability()
  }, [loadHourlyRate, loadAvailability])

  const validateSlot = (slot, { ignoreId = null } = {}) => {
    const day = Number(slot.day_of_week)
    const start = toMinutes(slot.start_time)
    const end = toMinutes(slot.end_time)

    if (!Number.isFinite(day) || day < 0 || day > 6) return 'Please select a valid day.'
    if (!slot.start_time || !slot.end_time) return 'Start and end time are required.'
    if (end <= start) return 'End time must be after start time.'

    // Prevent overlaps among active slots (regardless of is_available to avoid confusing schedules)
    const sameDay = availability.filter(
      (s) => s.is_active === true && Number(s.day_of_week) === day && s.id !== ignoreId
    )

    for (const s of sameDay) {
      const sStart = toMinutes(s.start_time)
      const sEnd = toMinutes(s.end_time)
      if (overlaps(start, end, sStart, sEnd)) {
        return `This overlaps an existing slot (${timeLabel(s.start_time)}–${timeLabel(s.end_time)}).`
      }
    }

    return null
  }

  const saveHourlyRate = async () => {
    if (!effectiveTutorId) return
    setLoadingRate(true)
    setError(null)
    setSuccess(null)

    try {
      const rate = Number.parseFloat(hourlyRate)
      if (!Number.isFinite(rate) || rate < 0) {
        setError('Hourly rate must be a valid number (0 or higher).')
        return
      }

      const { error: uErr } = await supabase
        .from('profiles')
        .update({ hourly_rate: rate })
        .eq('id', effectiveTutorId)

      if (uErr) throw uErr
      flashSuccess('Hourly rate updated successfully!')
    } catch (err) {
      setError(err?.message || 'Failed to save hourly rate')
    } finally {
      setLoadingRate(false)
    }
  }

  const addSlot = async () => {
    if (!effectiveTutorId) return
    setError(null)
    setSuccess(null)

    const validationError = validateSlot(newSlot)
    if (validationError) {
      setError(validationError)
      return
    }

    setBusySlotId('new')
    try {
      const payload = {
        tutor_id: effectiveTutorId,
        day_of_week: Number(newSlot.day_of_week),
        start_time: normalizeTime(newSlot.start_time),
        end_time: normalizeTime(newSlot.end_time),
        is_available: Boolean(newSlot.is_available),
        is_active: true
      }

      const { error: iErr } = await supabase.from('tutor_availability').insert([payload])
      if (iErr) {
        // Friendly message for your unique(tutor_id, day_of_week, start_time)
        if (String(iErr.message || '').toLowerCase().includes('duplicate') || String(iErr.code) === '23505') {
          throw new Error('You already have a slot starting at that time for this day.')
        }
        throw iErr
      }

      flashSuccess('Availability slot added.')
      await loadAvailability()
    } catch (err) {
      setError(err?.message || 'Failed to add availability slot')
    } finally {
      setBusySlotId(null)
    }
  }

  const startEdit = (slot) => {
    setEditingId(slot.id)
    setEditSlot({
      day_of_week: Number(slot.day_of_week),
      start_time: timeLabel(slot.start_time),
      end_time: timeLabel(slot.end_time),
      is_available: Boolean(slot.is_available)
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditSlot({
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      is_available: true
    })
  }

  const saveEdit = async () => {
    if (!effectiveTutorId || !editingId) return
    setError(null)
    setSuccess(null)

    const validationError = validateSlot(editSlot, { ignoreId: editingId })
    if (validationError) {
      setError(validationError)
      return
    }

    setBusySlotId(editingId)
    try {
      const updates = {
        day_of_week: Number(editSlot.day_of_week),
        start_time: normalizeTime(editSlot.start_time),
        end_time: normalizeTime(editSlot.end_time),
        is_available: Boolean(editSlot.is_available)
      }

      const { error: uErr } = await supabase
        .from('tutor_availability')
        .update(updates)
        .eq('id', editingId)
        .eq('tutor_id', effectiveTutorId)

      if (uErr) {
        if (String(uErr.message || '').toLowerCase().includes('duplicate') || String(uErr.code) === '23505') {
          throw new Error('You already have a slot starting at that time for this day.')
        }
        throw uErr
      }

      flashSuccess('Availability slot updated.')
      setEditingId(null)
      await loadAvailability()
    } catch (err) {
      setError(err?.message || 'Failed to update availability slot')
    } finally {
      setBusySlotId(null)
    }
  }

  const toggleAvailable = async (slot) => {
    if (!effectiveTutorId) return
    setError(null)
    setSuccess(null)

    setBusySlotId(slot.id)
    try {
      const { error: uErr } = await supabase
        .from('tutor_availability')
        .update({ is_available: !slot.is_available })
        .eq('id', slot.id)
        .eq('tutor_id', effectiveTutorId)

      if (uErr) throw uErr

      flashSuccess(slot.is_available ? 'Slot marked unavailable.' : 'Slot marked available.')
      await loadAvailability()
    } catch (err) {
      setError(err?.message || 'Failed to update slot availability')
    } finally {
      setBusySlotId(null)
    }
  }

  const deleteSlot = async (slotId) => {
    if (!effectiveTutorId) return
    setError(null)
    setSuccess(null)

    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Delete this availability slot?')) return

    setBusySlotId(slotId)
    try {
      // IMPORTANT: hard delete so the UNIQUE(tutor_id, day_of_week, start_time) doesn't block recreating the slot
      const { error: dErr } = await supabase
        .from('tutor_availability')
        .delete()
        .eq('id', slotId)
        .eq('tutor_id', effectiveTutorId)

      if (dErr) throw dErr

      flashSuccess('Availability slot deleted.')
      await loadAvailability()
    } catch (err) {
      setError(err?.message || 'Failed to delete availability slot')
    } finally {
      setBusySlotId(null)
    }
  }

  if (!effectiveTutorId) {
    return (
      <div className="availability-manager">
        <h2>Availability & Hourly Rate</h2>
        <p>Unable to load your tutor profile. Please sign in again.</p>
      </div>
    )
  }

  return (
    <div className="availability-manager">
      <h2>Availability & Hourly Rate</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

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
              inputMode="decimal"
            />
          </div>

          <button onClick={saveHourlyRate} disabled={loadingRate} className="btn-primary">
            {loadingRate ? 'Saving...' : 'Save Rate'}
          </button>
        </div>
      </div>

      <div className="availability-section">
        <h3>Your Availability</h3>

        <div className="availability-add">
          <div className="availability-form-row">
            <div className="field">
              <label htmlFor="day">Day</label>
              <select
                id="day"
                value={newSlot.day_of_week}
                onChange={(e) => setNewSlot((s) => ({ ...s, day_of_week: Number(e.target.value) }))}
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="start">Start</label>
              <input
                id="start"
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot((s) => ({ ...s, start_time: e.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="end">End</label>
              <input
                id="end"
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot((s) => ({ ...s, end_time: e.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="available">Available?</label>
              <select
                id="available"
                value={newSlot.is_available ? 'yes' : 'no'}
                onChange={(e) => setNewSlot((s) => ({ ...s, is_available: e.target.value === 'yes' }))}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="field">
              <label>&nbsp;</label>
              <button onClick={addSlot} className="btn-primary" disabled={busySlotId === 'new'}>
                {busySlotId === 'new' ? 'Adding...' : 'Add Slot'}
              </button>
            </div>
          </div>

          <p style={{ marginTop: 8, opacity: 0.8 }}>
            Add multiple slots per day (e.g. 09:00–12:00 and 14:00–17:00). Use “Available?” to quickly block a slot.
          </p>
        </div>

        {loadingAvailability ? (
          <p>Loading availability...</p>
        ) : availability.length === 0 ? (
          <p>No availability set yet.</p>
        ) : (
          <div className="availability-list">
            {DAYS.map((d) => {
              const slots = availabilityByDay.get(d.value) || []
              return (
                <div key={d.value} className="availability-day">
                  <h4 style={{ marginTop: 18 }}>{d.label}</h4>

                  {slots.length === 0 ? (
                    <p style={{ opacity: 0.7 }}>No slots.</p>
                  ) : (
                    slots.map((slot) => {
                      const isEditing = editingId === slot.id
                      const busy = busySlotId === slot.id

                      return (
                        <div
                          key={slot.id}
                          className={`availability-item ${slot.is_available ? '' : 'is-disabled'}`}
                        >
                          {isEditing ? (
                            <div className="availability-edit">
                              <div className="availability-form-row">
                                <div className="field">
                                  <label>Day</label>
                                  <select
                                    value={editSlot.day_of_week}
                                    onChange={(e) =>
                                      setEditSlot((s) => ({ ...s, day_of_week: Number(e.target.value) }))
                                    }
                                  >
                                    {DAYS.map((dd) => (
                                      <option key={dd.value} value={dd.value}>
                                        {dd.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="field">
                                  <label>Start</label>
                                  <input
                                    type="time"
                                    value={editSlot.start_time}
                                    onChange={(e) => setEditSlot((s) => ({ ...s, start_time: e.target.value }))}
                                  />
                                </div>

                                <div className="field">
                                  <label>End</label>
                                  <input
                                    type="time"
                                    value={editSlot.end_time}
                                    onChange={(e) => setEditSlot((s) => ({ ...s, end_time: e.target.value }))}
                                  />
                                </div>

                                <div className="field">
                                  <label>Available?</label>
                                  <select
                                    value={editSlot.is_available ? 'yes' : 'no'}
                                    onChange={(e) =>
                                      setEditSlot((s) => ({ ...s, is_available: e.target.value === 'yes' }))
                                    }
                                  >
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                  </select>
                                </div>

                                <div className="field">
                                  <label>&nbsp;</label>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={saveEdit} className="btn-success" disabled={busy}>
                                      {busy ? 'Saving...' : 'Save'}
                                    </button>
                                    <button onClick={cancelEdit} className="btn-secondary" disabled={busy}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="availability-item-main">
                                <div>
                                  <strong>
                                    {timeLabel(slot.start_time)} – {timeLabel(slot.end_time)}
                                  </strong>
                                  {!slot.is_available && (
                                    <span style={{ marginLeft: 8, opacity: 0.7 }}>(unavailable)</span>
                                  )}
                                </div>
                              </div>

                              <div className="availability-actions" style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => toggleAvailable(slot)}
                                  className="btn-secondary"
                                  disabled={busy}
                                >
                                  {busy ? '...' : slot.is_available ? 'Mark Unavailable' : 'Mark Available'}
                                </button>

                                <button onClick={() => startEdit(slot)} className="btn-secondary" disabled={busy}>
                                  Edit
                                </button>

                                <button onClick={() => deleteSlot(slot.id)} className="btn-danger" disabled={busy}>
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
