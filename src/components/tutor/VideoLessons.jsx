// src/components/tutor/VideoLessons.jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getTutorBookings } from '../../lib/bookingAPI'
import { createVideoRoomForBooking, closeVideoRoom, getActiveVideoRoomByBooking } from '../../lib/videoRoomAPI'
import VideoRoom from '../video/VideoRoom'

export default function VideoLessons({ tutorId }) {
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [bookings, setBookings] = useState([])
  const [roomsByBooking, setRoomsByBooking] = useState({})
  const [activeRoomId, setActiveRoomId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error: bErr } = await getTutorBookings(tutorId)
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
      setError(e?.message || 'Failed to load video lessons')
    } finally {
      setLoading(false)
    }
  }, [tutorId])

  useEffect(() => {
    if (tutorId) load()
  }, [load, tutorId])

  const confirmedBookings = useMemo(() => {
    // Only confirmed bookings should be used for live lesson rooms
    return bookings.filter((b) => (b.status || '').toLowerCase() === 'confirmed')
  }, [bookings])

  const openRoom = useCallback(
    async (bookingId) => {
      setBusyId(bookingId)
      setError('')
      try {
        const { data, error: cErr } = await createVideoRoomForBooking({ bookingId, tutorId })
        if (cErr) throw cErr
        if (data) {
          setRoomsByBooking((prev) => ({ ...prev, [bookingId]: data }))
          setActiveRoomId(data.id)
        }
      } catch (e) {
        setError(e?.message || 'Failed to open room')
      } finally {
        setBusyId(null)
      }
    },
    [tutorId]
  )

  const enterRoom = useCallback(async (bookingId) => {
    setBusyId(bookingId)
    setError('')
    try {
      const { data, error: gErr } = await getActiveVideoRoomByBooking(bookingId)
      if (gErr) throw gErr
      if (!data) throw new Error('No open room found (open the room first)')
      setRoomsByBooking((prev) => ({ ...prev, [bookingId]: data }))
      setActiveRoomId(data.id)
    } catch (e) {
      setError(e?.message || 'Failed to enter room')
    } finally {
      setBusyId(null)
    }
  }, [])

  const closeRoom = useCallback(
    async (bookingId) => {
      const room = roomsByBooking[bookingId]
      if (!room) return

      setBusyId(bookingId)
      setError('')

      try {
        const { error: cErr } = await closeVideoRoom(room.id)
        if (cErr) throw cErr
        setRoomsByBooking((prev) => {
          const next = { ...prev }
          delete next[bookingId]
          return next
        })
        if (activeRoomId === room.id) setActiveRoomId(null)
      } catch (e) {
        setError(e?.message || 'Failed to close room')
      } finally {
        setBusyId(null)
      }
    },
    [activeRoomId, roomsByBooking]
  )

  if (loading) return <div>Loading video lessons...</div>

  return (
    <div className="video-lessons" style={{ display: 'grid', gap: 12 }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>🎥 Video Lessons</h2>
        <div style={{ fontSize: 14, opacity: 0.85 }}>
          Open a room for a <strong>confirmed</strong> booking. Only tutors can open/close rooms.
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {confirmedBookings.length === 0 ? (
        <div className="empty-state">
          <p>No confirmed bookings available for video rooms.</p>
        </div>
      ) : (
        <div className="bookings-list" style={{ display: 'grid', gap: 10 }}>
          {confirmedBookings.map((b) => {
            const room = roomsByBooking[b.id]
            const isBusy = busyId === b.id

            return (
              <div
                key={b.id}
                className="booking-card"
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
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 600 }}>
                    {b.student?.full_name || 'Student'}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.85 }}>
                    {new Date(b.lesson_date).toLocaleDateString()} • {String(b.lesson_time || '').slice(0, 5)}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    Room: <strong>{room ? (room.locked ? 'Open (Locked)' : 'Open') : 'Not open'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {!room ? (
                    <button className="btn-secondary" disabled={isBusy} onClick={() => openRoom(b.id)}>
                      {isBusy ? 'Opening...' : 'Open Room'}
                    </button>
                  ) : (
                    <>
                      <button className="btn-secondary" disabled={isBusy} onClick={() => enterRoom(b.id)}>
                        {isBusy ? 'Entering...' : 'Enter'}
                      </button>
                      <button className="btn-danger" disabled={isBusy} onClick={() => closeRoom(b.id)}>
                        {isBusy ? 'Closing...' : 'Close Room'}
                      </button>
                    </>
                  )}
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
            <VideoRoom roomId={activeRoomId} role="tutor" onExit={() => setActiveRoomId(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
