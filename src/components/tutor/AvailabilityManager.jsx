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
      <div className="controls-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Hourly Rate Card */}
        <div className="control-card rate-card" style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.17), rgba(255,255,255,0.08))',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '16px',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.22)',
          padding: '1.5rem',
          transition: 'all 0.2s ease'
        }} onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)'
          e.currentTarget.style.boxShadow = '0 14px 30px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.45)'
        }} onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.22)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#fff' }}>Hourly Rate</h3>
          <div className="input-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div className="currency-wrap" style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
              <span style={{ padding: '0.6rem 0.75rem', color: '#93c5fd' }}>£</span>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                style={{ flex: 1, padding: '0.6rem', background: 'transparent', border: 'none', color: '#e5e5e5', outline: 'none', fontSize: '1rem' }}
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
        <div className="control-card add-slot-card" style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.17), rgba(255,255,255,0.08))',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '16px',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.22)',
          padding: '1.5rem',
          transition: 'all 0.2s ease'
        }} onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)'
          e.currentTarget.style.boxShadow = '0 14px 30px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.45)'
        }} onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.22)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#fff' }}>Add Availability</h3>
          <div className="add-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ color: '#e5e5e5', fontSize: '0.9rem', fontWeight: '500' }}>Day</label>
              <select
                value={newSlot.day_of_week}
                onChange={(e) => setNewSlot(s => ({ ...s, day_of_week: e.target.value }))}
                style={{ padding: '0.6rem', background: 'rgba(30, 41, 59, 0.8)', color: '#e5e5e5', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '0.95rem' }}
              >
                {DAYS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ color: '#e5e5e5', fontSize: '0.9rem', fontWeight: '500' }}>Start</label>
              <input
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot(s => ({ ...s, start_time: e.target.value }))}
                style={{ padding: '0.6rem', background: 'rgba(30, 41, 59, 0.8)', color: '#e5e5e5', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '0.95rem' }}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ color: '#e5e5e5', fontSize: '0.9rem', fontWeight: '500' }}>End</label>
              <input
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot(s => ({ ...s, end_time: e.target.value }))}
                style={{ padding: '0.6rem', background: 'rgba(30, 41, 59, 0.8)', color: '#e5e5e5', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '0.95rem' }}
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
      <div className="week-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {DAYS.map((day) => {
          const slots = availabilityByDay.get(day.value) || []
          const hasSlots = slots.length > 0

          return (
            <div key={day.value} className={`day-card ${hasSlots ? 'active' : ''}`} style={{
              background: hasSlots
                ? 'linear-gradient(145deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.08))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.17), rgba(255,255,255,0.08))',
              border: hasSlots
                ? '1px solid rgba(59, 130, 246, 0.3)'
                : '1px solid rgba(255,255,255,0.2)',
              borderRadius: '16px',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.22)',
              padding: '1.5rem',
              transition: 'all 0.2s ease'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)'
              e.currentTarget.style.boxShadow = '0 14px 30px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.45)'
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.22)'
            }}>
              <div className="day-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{day.label}</h4>
                {hasSlots && <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>{slots.length}</span>}
              </div>

              <div className="day-body">
                {!hasSlots ? (
                  <div className="empty-state-day" style={{ color: '#9ca3af', fontSize: '0.95rem' }}>Unavailable</div>
                ) : (
                  <div className="slots-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {slots.map(slot => (
                      <div key={slot.id} className="time-pill" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        fontSize: '0.9rem',
                        color: '#93c5fd'
                      }}>
                        <Clock size={12} className="clock-icon"/>
                        <span>{timeLabel(slot.start_time)} - {timeLabel(slot.end_time)}</span>
                        <button
                          onClick={() => deleteSlot(slot.id)}
                          disabled={busySlotId === slot.id}
                          className="delete-pill"
                          title="Remove slot"
                          style={{
                            marginLeft: 'auto',
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            hover: { color: '#fca5a5' }
                          }}
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
