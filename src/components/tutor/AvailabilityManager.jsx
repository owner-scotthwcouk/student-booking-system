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
  const t = String(timeStr).slice(0, 5) // HH:MM
  const [hh, mm] = t.split(':').map((v) => parseInt(v, 10))
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0)
}

function normalizeTime(timeStr) {
  // Supabase TIME accepts HH:MM or HH:MM:SS; we normalize to HH:MM:SS
  if (!timeStr) return ''
  const s = String(timeStr).trim()
  if (s.length === 5) return `${s}:00`
  return s
}

function formatTimeLabel(timeStr) {
  if (!timeStr) return ''
  return String(timeStr).slice(0, 5)
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  // Strict overlap check: [aStart,aEnd) intersects [bStart,bEnd)
  return aStart < bEnd && aEnd > bStart
}

export default function AvailabilityManager({ tutorId }) {
  const { user } = useAuth()

  const effectiveTutorId = tutorId || user?.id

  const [hourlyRate, setHourlyRate] = useState(30.0)

  const [availability, setAvailability] = useState([])

  const [loading, setLoading] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [slotBusyId, setSlotBusyId] = useState(null)

  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00'
  })

  const [editingId, setEditingId] = useState(null)
  const [editSlot, setEditSlot] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00'
  })

  const availabilityByDay = useMemo(() => {
    const grouped = new Map()
    for (const d of DAYS) grouped.set(d.value, [])
    for (const slot of availability) {
      const key = Number(slot.day_of_week)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(slot)
    }

    for (const [key, list] of grouped.entries()) {
      list.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
      grouped.set(key, list)
    }

    return grouped
  }, [availability])

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
      // Keep UI usable even if rate fails to load
    }
  }, [effectiveTutorId])

  const loadAvailability = useCallback(async () => {
    if (!effectiveTutorId) return
    setLoadingAvailability(true)
    setError(null)

    try {
      const { data, error: qErr } = await supabase
        .from('tutor_availability')
        .select('id, tutor_id, day_of_week, start_time, end_time, is_active, created_at, updated_at')
        .eq('tutor_id', effectiveTutorId)
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

  const flashSuccess = (msg) => {
    setSuccess(msg)
    window.clearTimeout(flashSuccess._t)
    flashSuccess._t = window.setTimeout(() => setSuccess(null), 3000)
  }

  const validateSlot = (slot, { ignoreId = null } = {}) => {
    const day = Number(slot.day_of_week)
    const start = toMinutes(slot.start_time)
    const end = toMinutes(slot.end_time)

    if (!Number.isFinite(day) || day < 0 || day > 6) return 'Please select a valid day.'
    if (!slot.start_time || !slot.end_time) return 'Start and end time are required.'
    if (end <= start) return 'End time must be after start time.'

    // Prevent overlaps with ACTIVE slots on same day
    const existing = availability.filter(
      (s) =>
        Number(s.day_of_week) === day &&
        s.is_active === true &&
        s.id !== ignoreId
    )

    for (const s of existing) {
      const sStart = toMinutes(s.start_time)
      const sEnd = toMinutes(s.end_time)
      if (overlaps(start, end, sStart, sEnd)) {
        return `This overlaps an existing active slot (${formatTimeLabel(s.start_time)}–${formatTimeLabel(
          s.end_time
        )}).`
      }
    }

    return null
  }

  const saveHourlyRate = async () => {
    if (!effectiveTutorId) return
    setLoading(true)
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
      setLoading(false)
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

    setSlotBusyId('new')
    try {
      const payload = {
        tutor_id: effectiveTutorId,
        day_of_week: Number(newSlot.day_of_week),
        start_time: normalizeTime(newSlot.start_time),
        end_time: normalizeTime(newSlot.end_time),
        is_active: true
      }

      const { error: iErr } = await supabase.from('tutor_availability').insert([payload])
      if (iErr) throw iErr

      flashSuccess('Availability slot added.')
      await loadAvailability()
    } catch (err) {
      setError(err?.message || 'Failed to add availability slot')
    } finally {
      setSlotBusyId(null)
    }
  }

  const startEdit = (slot) => {
    setEditingId(slot.id)
    setEditSlot({
      day_of_week: Number(slot.day_of_week),
      start_time: formatTimeLabel(slot.start_time),
      end_time: formatTimeLabel(slot.end_time)
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditSlot({
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00'
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

    setSlotBusyId(editingId)
    try {
      const updates = {
        day_of_week: Number(editSlot.day_of_week),
        start_time: normalizeTime(editSlot.start_time),
        end_time: normalizeTime(editSlot.end_time)
      }

      const { error: uErr } = await supabase
        .from('tutor_availability')
        .update(updates)
        .eq('id', editingId)
        .eq('tutor_id', effectiveTutorId)

      if (uErr) throw uErr

      flashSuccess('Availability slot updated.')
      setEditingId(null)
      await loadAvailability()
    } catch (err) {
      setError(err?.message || 'Failed to update availability slot')
    } finally {
      setSlotBusyId(null)
    }
  }

  const deleteSlot = async (slotId) => {
    if (!effectiveTutorId) return
    setError(null)
    setSuccess(null)

    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Delete this availability slot?')) return

    setSlotBusyId(slotId)
    try {
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
      setSlotBusyId(null)
    }
  }

  const toggleActive = async (slot) => {
    if (!effectiveTutorId) return
    setError(null)
    setSuccess(null)

    setSlotBusyId(slot.id)
    try {
      const { error: uErr } = await supabase
        .from('tutor_availability')
        .update({ is_active: !slot.is_active })
        .eq('id', slot.id)
        .eq('tutor_id', effectiveTutorId)

      if (uErr) throw uErr

      flashSuccess(slot.is_active ? 'Slot disabled.' : 'Slot enabled.')
      await loadAvailability()
    } catch (err) {
      setError(err?.message || 'Failed to update slot status')
    } finally {
      setSlotBusyId(null)
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

          <button onClick={saveHourlyRate} disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Rate'}
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
              <label>&nbsp;</label>
              <button onClick={addSlot} className="btn-primary" disabled={slotBusyId === 'new'}>
                {slotBusyId === 'new' ? 'Adding...' : 'Add Slot'}
              </button>
            </div>
          </div>

          <p style={{ marginTop: 8, opacity: 0.8 }}>
            Tip: Add multiple slots per day (e.g. 09:00–12:00 and 14:00–17:00).
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
                      const busy = slotBusyId === slot.id

                      return (
                        <div key={slot.id} className={`availability-item ${slot.is_active ? '' : 'is-disabled'}`}>
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
                                    {formatTimeLabel(slot.start_time)} – {formatTimeLabel(slot.end_time)}
                                  </strong>
                                  {!slot.is_active && <span style={{ marginLeft: 8, opacity: 0.7 }}>(disabled)</span>}
                                </div>
                              </div>

                              <div className="availability-actions" style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => toggleActive(slot)} className="btn-secondary" disabled={busy}>
                                  {busy ? '...' : slot.is_active ? 'Disable' : 'Enable'}
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
