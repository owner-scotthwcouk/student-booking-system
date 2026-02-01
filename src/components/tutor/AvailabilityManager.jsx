import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/auth'
import { Trash2, Plus, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

// Reordered to start week on Monday
const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
]

function toMinutes(timeStr) {
  if (!timeStr) return 0
  const t = String(timeStr).slice(0, 5)
  const [hh, mm] = t.split(':').map((v) => parseInt(v, 10))
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0)
}

function normalizeTime(timeStr) {
  if (!timeStr) return ''
  const s = String(timeStr).trim()
  if (s.length === 5) return `${s}:00`
  return s
}

function timeLabel(timeStr) {
  if (!timeStr) return ''
  return String(timeStr).slice(0, 5)
}

export default function AvailabilityManager({ tutorId }) {
  const { user } = useAuth()
  const effectiveTutorId = tutorId || user?.id

  const [hourlyRate, setHourlyRate] = useState(30.0)
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(false)
  const [busySlotId, setBusySlotId] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Add Form State
  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00'
  })

  // Group slots by day for the grid
  const availabilityByDay = useMemo(() => {
    const map = new Map()
    // Initialize all days with empty arrays
    DAYS.forEach(d => map.set(d.value, []))
    
    // Fill with data
    availability.forEach(slot => {
      const dayVal = Number(slot.day_of_week)
      if (map.has(dayVal)) {
        map.get(dayVal).push(slot)
      }
    })

    // Sort slots by time
    map.forEach(slots => {
      slots.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
    })
    
    return map
  }, [availability])

  const flashSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const loadData = useCallback(async () => {
    if (!effectiveTutorId) return
    setLoading(true)
    try {
      // 1. Get Hourly Rate
      const { data: profile } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('id', effectiveTutorId)
        .single()
      
      if (profile) setHourlyRate(profile.hourly_rate || 0)

      // 2. Get Availability
      const { data: slots, error: slotsErr } = await supabase
        .from('tutor_availability')
        .select('*')
        .eq('tutor_id', effectiveTutorId)
        .eq('is_active', true)

      if (slotsErr) throw slotsErr
      setAvailability(slots || [])

    } catch (err) {
      console.error(err)
      setError('Failed to load availability data')
    } finally {
      setLoading(false)
    }
  }, [effectiveTutorId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const saveHourlyRate = async () => {
    setBusySlotId('rate')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ hourly_rate: hourlyRate })
        .eq('id', effectiveTutorId)

      if (error) throw error
      flashSuccess('Rate updated')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusySlotId(null)
    }
  }

  const addSlot = async () => {
    setError(null)
    // Basic Validation
    if (toMinutes(newSlot.end_time) <= toMinutes(newSlot.start_time)) {
      return setError('End time must be after start time')
    }

    setBusySlotId('add')
    try {
      const { error } = await supabase.from('tutor_availability').insert([{
        tutor_id: effectiveTutorId,
        day_of_week: Number(newSlot.day_of_week),
        start_time: normalizeTime(newSlot.start_time),
        end_time: normalizeTime(newSlot.end_time),
        is_available: true,
        is_active: true
      }])

      if (error) throw error
      
      flashSuccess('Slot added')
      loadData() // Refresh list
    } catch (err) {
      setError(err.message)
    } finally {
      setBusySlotId(null)
    }
  }

  const deleteSlot = async (id) => {
    if (!confirm('Remove this time slot?')) return
    setBusySlotId(id)
    try {
      const { error } = await supabase
        .from('tutor_availability')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusySlotId(null)
    }
  }

  return (
    <div className="availability-manager">
      <div className="section-header">
        <h2>Schedule & Rates</h2>
      </div>

      {/* Notifications */}
      {error && (
        <div className="notification error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div className="notification success">
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      {/* Top Control Bar: Rate & Add Slot */}
      <div className="controls-grid">
        {/* Hourly Rate Card */}
        <div className="control-card rate-card">
          <h3>Hourly Rate</h3>
          <div className="input-row">
            <div className="currency-wrap">
              <span>£</span>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
            <button 
              onClick={saveHourlyRate} 
              disabled={busySlotId === 'rate'}
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </div>

        {/* Add Slot Card */}
        <div className="control-card add-slot-card">
          <h3>Add Availability</h3>
          <div className="add-form">
            <div className="form-group">
              <label>Day</label>
              <select
                value={newSlot.day_of_week}
                onChange={(e) => setNewSlot(s => ({ ...s, day_of_week: e.target.value }))}
              >
                {DAYS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Start</label>
              <input
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot(s => ({ ...s, start_time: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>End</label>
              <input
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot(s => ({ ...s, end_time: e.target.value }))}
              />
            </div>
            <button 
              onClick={addSlot} 
              disabled={busySlotId === 'add'}
              className="btn-primary icon-btn"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* The Weekly Grid */}
      <div className="week-grid">
        {DAYS.map((day) => {
          const slots = availabilityByDay.get(day.value) || []
          const hasSlots = slots.length > 0
          
          return (
            <div key={day.value} className={`day-card ${hasSlots ? 'active' : ''}`}>
              <div className="day-header">
                <h4>{day.label}</h4>
                {hasSlots && <span className="badge">{slots.length}</span>}
              </div>
              
              <div className="day-body">
                {!hasSlots ? (
                  <div className="empty-state-day">Unavailable</div>
                ) : (
                  <div className="slots-list">
                    {slots.map(slot => (
                      <div key={slot.id} className="time-pill">
                        <Clock size={12} className="clock-icon"/>
                        <span>{timeLabel(slot.start_time)} - {timeLabel(slot.end_time)}</span>
                        <button 
                          onClick={() => deleteSlot(slot.id)}
                          disabled={busySlotId === slot.id}
                          className="delete-pill"
                          title="Remove slot"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}