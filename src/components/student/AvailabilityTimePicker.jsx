// src/components/student/AvailabilityTimePicker.jsx
import { useEffect, useMemo, useState } from 'react'
import {
  computeAvailableStartTimes,
  getTutorAvailability,
  getTutorBookingsForDate,
  toISODate
} from '../../lib/availabilityAPI'

export default function AvailabilityTimePicker({
  tutorId,
  selectedDate,
  durationMinutes = 60,
  value,
  onChange,
  stepMinutes = 15
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [availability, setAvailability] = useState([])
  const [bookings, setBookings] = useState([])

  const isoDate = useMemo(() => toISODate(selectedDate), [selectedDate])

  useEffect(() => {
    let mounted = true

    async function load() {
      setError(null)

      if (!tutorId || !isoDate) {
        setAvailability([])
        setBookings([])
        return
      }

      setLoading(true)
      try {
        const [aRes, bRes] = await Promise.all([
          getTutorAvailability(tutorId),
          getTutorBookingsForDate(tutorId, isoDate)
        ])

        if (!mounted) return

        if (aRes.error) throw aRes.error
        if (bRes.error) throw bRes.error

        setAvailability(aRes.data || [])
        setBookings(bRes.data || [])
      } catch (err) {
        if (!mounted) return
        setError(err?.message || 'Failed to load availability')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [tutorId, isoDate])

  const options = useMemo(() => {
    if (!tutorId || !isoDate) return []
    return computeAvailableStartTimes({
      availability,
      existingBookings: bookings,
      selectedDate: isoDate,
      durationMinutes,
      stepMinutes
    })
  }, [availability, bookings, tutorId, isoDate, durationMinutes, stepMinutes])

  return (
    <div className="availability-time-picker">
      <label htmlFor="lesson-time">
        Time {durationMinutes ? `(${durationMinutes} mins)` : ''}
      </label>

      {error && <div className="error-message">{error}</div>}

      <select
        id="lesson-time"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={loading || !tutorId || !isoDate || options.length === 0}
      >
        <option value="">
          {loading
            ? 'Loading times...'
            : !tutorId
            ? 'Select a tutor first'
            : !isoDate
            ? 'Select a date first'
            : options.length === 0
            ? 'No times available'
            : 'Select a time'}
        </option>

        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {tutorId && isoDate && !loading && options.length === 0 && (
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          No availability for this day (or all slots are already booked).
        </p>
      )}
    </div>
  )
}
