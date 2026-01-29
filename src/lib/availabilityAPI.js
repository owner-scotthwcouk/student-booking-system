// src/lib/availabilityAPI.js
import { supabase } from './supabaseClient'

export function toISODate(dateLike) {
  if (!dateLike) return null
  if (typeof dateLike === 'string') {
    // expect YYYY-MM-DD
    return dateLike.slice(0, 10)
  }
  if (dateLike instanceof Date && !Number.isNaN(dateLike.getTime())) {
    const yyyy = dateLike.getFullYear()
    const mm = String(dateLike.getMonth() + 1).padStart(2, '0')
    const dd = String(dateLike.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  return null
}

export function getDayOfWeek(dateLike) {
  // JS: 0=Sunday..6=Saturday
  if (!dateLike) return null
  if (typeof dateLike === 'string') {
    const d = new Date(`${dateLike}T00:00:00`)
    if (Number.isNaN(d.getTime())) return null
    return d.getDay()
  }
  if (dateLike instanceof Date && !Number.isNaN(dateLike.getTime())) {
    return dateLike.getDay()
  }
  return null
}

function toMinutes(timeStr) {
  if (!timeStr) return 0
  const t = String(timeStr).slice(0, 5)
  const [hh, mm] = t.split(':').map((v) => parseInt(v, 10))
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0)
}

function minutesToHHMM(mins) {
  const hh = String(Math.floor(mins / 60)).padStart(2, '0')
  const mm = String(mins % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart
}

export async function getTutorAvailability(tutorId) {
  if (!tutorId) return { data: [], error: null }

  const { data, error } = await supabase
    .from('tutor_availability')
    .select('id, tutor_id, day_of_week, start_time, end_time, is_active')
    .eq('tutor_id', tutorId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  return { data: data || [], error }
}

export async function getTutorBookingsForDate(tutorId, dateLike) {
  const iso = toISODate(dateLike)
  if (!tutorId || !iso) return { data: [], error: null }

  // Blocks times already taken. Adjust statuses if your system uses different values.
  const blockedStatuses = ['pending', 'confirmed']

  const { data, error } = await supabase
    .from('bookings')
    .select('id, lesson_time, duration_minutes, status')
    .eq('tutor_id', tutorId)
    .eq('lesson_date', iso)
    .in('status', blockedStatuses)

  return { data: data || [], error }
}

export function computeAvailableStartTimes({
  availability = [],
  existingBookings = [],
  selectedDate,
  durationMinutes = 60,
  stepMinutes = 15
}) {
  const day = getDayOfWeek(selectedDate)
  if (day === null || day === undefined) return []

  const daySlots = availability.filter(
    (s) => s.is_active === true && Number(s.day_of_week) === Number(day)
  )

  const bookings = (existingBookings || []).map((b) => {
    const start = toMinutes(b.lesson_time)
    const dur = Number(b.duration_minutes) || durationMinutes
    return { start, end: start + dur }
  })

  const results = new Set()

  for (const slot of daySlots) {
    const start = toMinutes(slot.start_time)
    const end = toMinutes(slot.end_time)

    for (let t = start; t + durationMinutes <= end; t += stepMinutes) {
      const candidateStart = t
      const candidateEnd = t + durationMinutes

      let blocked = false
      for (const b of bookings) {
        if (overlaps(candidateStart, candidateEnd, b.start, b.end)) {
          blocked = true
          break
        }
      }

      if (!blocked) results.add(minutesToHHMM(candidateStart))
    }
  }

  return Array.from(results).sort()
}
