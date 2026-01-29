import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/auth'
import VideoRoom from '../video/VideoRoom'
import { getActiveVideoRoomByBooking } from '../../lib/videoRoomAPI'

export default function StudentVideoLessons() {
  const { user } = useAuth()
  const studentId = user?.id

  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [bookings, setBookings] = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [roomsByBooking, setRoomsByBooking] = useState({})

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setError('')

    try {
      const { data, error: bErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('student_id', studentId)
        .order('lesson_date', { ascending: true })

      if (bErr) throw bErr

      const list = data || []
      setBookings(list)

      const bookingIds = list.map((b) => b.id).filter(Boolean)
      if (bookingIds.length === 0) {
        setRoomsByBooking({})
        return
      }

      const { data: rooms, error: rErr } = await supabase
        .from('video_rooms')
        .select('*')
        .in('booking_id', bookingIds)
        .eq('status', 'open')

      if (rErr) throw rErr

      const map = {}
      ;(rooms || []).forEach((r) => {
        map[r.booking_id] = r
      })
      setRoomsByBooking(map)
    } catch (e) {
      setError(e?.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  const joinRoom = useCallback(async (bookingId) => {
    setBusyId(bookingId)
    setError('')
    try {
      const { data, error: gErr } = await getActiveVideoRoomByBooking(bookingId)
      if (gErr) throw gErr
      if (!data) throw new Error('Tutor has not opened the room yet.')
      if (data.locked) throw new Error('Room is locked by the tutor.')

      setActiveRoomId(data.id)
    } catch (e) {
      setError(e?.message || 'Failed to join room')
    } finally {
      setBusyId(null)
    }
  }, [])

  if (loading) return <div>Loading video lessons...</div>

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>🎥 Video Lessons</h2>
        <div style={{ fontSize: 14, opacity: 0.85 }}>
          You can join only after the tutor opens the room.
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>No bookings found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {bookings.map((b) => {
            const room = roomsByBooking[b.id]
            const isBusy = busyId === b.id
            const isConfirmed = (b.status || '').toLowerCase() === 'confirmed'
            const canJoin = isConfirmed && room && room.status === 'open' && !room.locked

            return (
              <div
                key={b.id}
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    Booking • {new Date(b.lesson_date).toLocaleDateString()} •{' '}
                    {String(b.lesson_time || '').slice(0, 5)}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    Status: <strong>{b.status}</strong> • Room:{' '}
                    <strong>
                      {room ? (room.locked ? 'Open (Locked)' : 'Open') : 'Not open'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-secondary"
                    disabled={!canJoin || isBusy}
                    onClick={() => joinRoom(b.id)}
                    title={
                      !room
                        ? 'Tutor has not opened the room yet'
                        : room.locked
                        ? 'Room locked'
                        : !isConfirmed
                        ? 'Booking must be confirmed'
                        : ''
                    }
                  >
                    {isBusy ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeRoomId && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 9999
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setActiveRoomId(null)
          }}
        >
          <div
            style={{
              width: 'min(1100px, 96vw)',
              maxHeight: '92vh',
              overflow: 'auto',
              background: '#0b0b0b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: 14
            }}
          >
            <VideoRoom roomId={activeRoomId} role="student" onExit={() => setActiveRoomId(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
