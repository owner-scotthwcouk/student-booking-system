import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/auth'
import {
  approveAdmission,
  getAdmissionStatus,
  getBookingByRoomToken,
  getPendingAdmissions,
  loadRoomEvents,
  logRoomEvent,
  requestRoomAdmission,
  verifyVideoRoomAccess
} from '../lib/videoRoomAPI'

const useE2EAuthBypass = import.meta.env.VITE_E2E_AUTH_BYPASS === 'true'
const jitsiBaseUrl = (import.meta.env.VITE_JITSI_BASE_URL || 'https://8x8.vc/vpaas-magic-cookie-69146b29470d4af1b777f9276cfe85eb').replace(/\/+$/, '')

function formatDate(isoDate) {
  if (!isoDate) return '-'
  return new Date(isoDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateTime(isoDateTime) {
  if (!isoDateTime) return '-'
  return new Date(isoDateTime).toLocaleString('en-GB')
}

export default function VideoRoomPage() {
  const { roomToken } = useParams()
  const { user } = useAuth()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [passcode, setPasscode] = useState('')
  const [verified, setVerified] = useState(false)
  const [events, setEvents] = useState([])
  const [message, setMessage] = useState('')
  const [pendingAdmissions, setPendingAdmissions] = useState([])
  const [admissionRequested, setAdmissionRequested] = useState(false)
  const [admissionApproved, setAdmissionApproved] = useState(false)
  const [whiteboardOpen, setWhiteboardOpen] = useState(false)
  const [penColor, setPenColor] = useState('#ef4444')
  const [penSize, setPenSize] = useState(3)
  const [isRecording, setIsRecording] = useState(false)
  const joinedLoggedRef = useRef(false)
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const mediaRecorderRef = useRef(null)
  const recordingStreamRef = useRef(null)
  const recordedChunksRef = useRef([])

  const displayName = useMemo(() => {
    return user?.user_metadata?.full_name || user?.email || 'Participant'
  }, [user])

  useEffect(() => {
    let active = true

    async function loadBooking() {
      if (!roomToken) {
        setError('Missing room token.')
        setLoading(false)
        return
      }

      const { data, error: bookingError } = await getBookingByRoomToken(roomToken)
      if (!active) return

      if (bookingError || !data) {
        setError('Room not found.')
        setLoading(false)
        return
      }

      const isParticipant = useE2EAuthBypass || data.student_id === user?.id || data.tutor_id === user?.id
      if (!isParticipant) {
        setError('You are not allowed to access this room.')
        setLoading(false)
        return
      }

      setBooking(data)
      setLoading(false)
    }

    if (user?.id) {
      loadBooking()
    }

    return () => {
      active = false
    }
  }, [roomToken, user?.id])

  const isTutor = booking?.tutor_id === user?.id
  const isStudent = booking?.student_id === user?.id
  const lobbyEnabled = booking?.video_room_lobby_enabled === true
  const bookingId = booking?.id
  const userId = user?.id

  const canEnterRoom = verified && (isTutor || !lobbyEnabled || admissionApproved)

  const jitsiRoomName = useMemo(() => {
    if (!booking?.id || !booking?.video_room_token) return ''
    return `TutorHub-${booking.id}-${booking.video_room_token}`.replace(/[^a-zA-Z0-9-]/g, '')
  }, [booking])

  const jitsiUrl = useMemo(() => {
    if (!jitsiRoomName) return ''
    return `${jitsiBaseUrl}/${jitsiRoomName}#userInfo.displayName=${encodeURIComponent(displayName)}`
  }, [displayName, jitsiRoomName])

  const refreshEvents = useCallback(async () => {
    if (!bookingId) return
    const { data } = await loadRoomEvents(bookingId)
    setEvents(data || [])
  }, [bookingId])

  const refreshPendingAdmissions = useCallback(async () => {
    if (!bookingId || !isTutor) return
    const { data } = await getPendingAdmissions(bookingId)
    setPendingAdmissions(data || [])
  }, [bookingId, isTutor])

  const refreshStudentAdmission = useCallback(async () => {
    if (!bookingId || !isStudent || !userId) return
    const { data } = await getAdmissionStatus(bookingId, userId)
    const approved = !!data?.approved_at
    setAdmissionRequested(!!data)
    setAdmissionApproved(approved || !lobbyEnabled)
  }, [bookingId, isStudent, userId, lobbyEnabled])

  useEffect(() => {
    if (!bookingId || !verified) return undefined

    const bootstrapTimeout = setTimeout(() => {
      refreshEvents()
      if (isTutor && lobbyEnabled) {
        refreshPendingAdmissions()
      }
      if (isStudent && lobbyEnabled) {
        refreshStudentAdmission()
      }
    }, 0)

    const eventsInterval = setInterval(refreshEvents, 5000)
    let admissionsInterval = null

    if (isTutor && lobbyEnabled) {
      admissionsInterval = setInterval(refreshPendingAdmissions, 5000)
    }

    if (isStudent && lobbyEnabled) {
      admissionsInterval = setInterval(refreshStudentAdmission, 5000)
    }

    return () => {
      clearTimeout(bootstrapTimeout)
      clearInterval(eventsInterval)
      if (admissionsInterval) clearInterval(admissionsInterval)
    }
  }, [bookingId, verified, isTutor, isStudent, lobbyEnabled, refreshEvents, refreshPendingAdmissions, refreshStudentAdmission])

  useEffect(() => {
    if (!canEnterRoom || joinedLoggedRef.current || !bookingId || !userId) return

    joinedLoggedRef.current = true
    logRoomEvent({
      bookingId,
      userId,
      displayName,
      eventType: 'joined'
    }).then(refreshEvents)
  }, [canEnterRoom, bookingId, userId, displayName, refreshEvents])

  useEffect(() => {
    return () => {
      if (!joinedLoggedRef.current || !bookingId || !userId) return
      logRoomEvent({
        bookingId,
        userId,
        displayName,
        eventType: 'left'
      })
    }
  }, [bookingId, userId, displayName])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (recordingStreamRef.current) {
        for (const track of recordingStreamRef.current.getTracks()) {
          track.stop()
        }
      }
    }
  }, [])

  async function handleVerifyPasscode() {
    if (!roomToken || !passcode) {
      setError('Enter the room passcode.')
      return
    }

    const { data, error: verifyError } = await verifyVideoRoomAccess(roomToken, passcode.trim())
    if (verifyError) {
      setError('Access denied while verifying room.')
      return
    }
    if (!data) {
      setError('Incorrect passcode.')
      return
    }

    setBooking((prev) => ({ ...prev, ...data }))
    setVerified(true)
    setError('')
    if (!lobbyEnabled || isTutor) {
      setAdmissionApproved(true)
    }
  }

  async function handleRequestAdmission() {
    if (!bookingId || !userId) return
    const { error: requestError } = await requestRoomAdmission(bookingId, userId)
    if (requestError) {
      setError('Failed to request admission.')
      return
    }
    setAdmissionRequested(true)
    setError('')
    refreshStudentAdmission()
  }

  async function handleApprove(admissionId) {
    const { error: approveError } = await approveAdmission(admissionId, userId)
    if (approveError) {
      setError('Failed to approve request.')
      return
    }
    setError('')
    refreshPendingAdmissions()
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || !bookingId || !userId) return

    const { error: sendError } = await logRoomEvent({
      bookingId,
      userId,
      displayName,
      eventType: 'chat',
      message: trimmed
    })

    if (sendError) {
      setError('Failed to send message.')
      return
    }

    setMessage('')
    refreshEvents()
  }

  function getCanvasPoint(event) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    }
  }

  function handleWhiteboardPointerDown(event) {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const point = getCanvasPoint(event)
    context.strokeStyle = penColor
    context.lineWidth = penSize
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(point.x, point.y)
    isDrawingRef.current = true
  }

  function handleWhiteboardPointerMove(event) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const point = getCanvasPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  function handleWhiteboardPointerUp() {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.closePath()
    isDrawingRef.current = false
  }

  function clearWhiteboard() {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function handleToggleRecording() {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
      return
    }

    if (!navigator.mediaDevices?.getDisplayMedia || typeof window.MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })
      recordingStreamRef.current = stream
      recordedChunksRef.current = []

      const recorder = new window.MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const chunks = recordedChunksRef.current
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: 'video/webm' })
          const downloadUrl = window.URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = downloadUrl
          anchor.download = `lesson-recording-${bookingId || 'session'}.webm`
          document.body.appendChild(anchor)
          anchor.click()
          anchor.remove()
          window.URL.revokeObjectURL(downloadUrl)
        }

        if (recordingStreamRef.current) {
          for (const track of recordingStreamRef.current.getTracks()) {
            track.stop()
          }
          recordingStreamRef.current = null
        }
      }

      recorder.start(250)
      setIsRecording(true)
      setError('')
    } catch (recordingError) {
      console.error('Failed to start recording', recordingError)
      setError('Failed to start recording.')
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: '#111827' }}>Loading video room...</div>
  }

  if (error && !verified && !booking) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Video Room</h2>
        <p style={{ color: '#b91c1c' }}>{error}</p>
        <Link to="/" style={{ color: '#2563eb' }}>Back to home</Link>
      </div>
    )
  }

  const chatEvents = events.filter((event) => event.event_type === 'chat')
  const attendanceEvents = events.filter((event) => event.event_type === 'joined' || event.event_type === 'left')
  const panelStyle = {
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    padding: '0.8rem',
    color: '#111827'
  }
  const headingStyle = { marginTop: 0, color: '#111827' }
  const inputStyle = {
    flex: 1,
    padding: '0.5rem',
    color: '#111827',
    background: '#fff',
    border: '1px solid #9ca3af',
    borderRadius: '6px'
  }
  const buttonStyle = {
    padding: '0.6rem 1rem',
    color: '#ffffff',
    background: '#2563eb',
    border: '1px solid #1d4ed8',
    borderRadius: '6px'
  }

  return (
    <div style={{ padding: '1rem', minHeight: '100vh', background: '#f3f4f6' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, color: '#111827' }}>Lesson Video Room</h2>
          <p style={{ margin: '0.5rem 0 0', color: '#374151' }}>
            {formatDate(booking.lesson_date)} at {String(booking.lesson_time).slice(0, 5)}
          </p>
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
        </div>

        {!verified && (
          <div style={{ ...panelStyle, padding: '1rem', marginBottom: '1rem' }}>
            <h3 style={headingStyle}>Enter Room Passcode</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="6-digit passcode"
                style={inputStyle}
              />
              <button type="button" onClick={handleVerifyPasscode} style={buttonStyle}>
                Verify
              </button>
            </div>
          </div>
        )}

        {verified && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              {isStudent && lobbyEnabled && !admissionApproved && (
                <div style={{ ...panelStyle, padding: '1rem', marginBottom: '1rem' }}>
                  <h3 style={headingStyle}>Waiting Room</h3>
                  {!admissionRequested ? (
                    <button type="button" onClick={handleRequestAdmission} style={buttonStyle}>
                      Request to Join
                    </button>
                  ) : (
                    <p>Your request has been sent. Waiting for tutor approval...</p>
                  )}
                </div>
              )}

              {canEnterRoom && (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button type="button" onClick={() => setWhiteboardOpen((prev) => !prev)}>
                      {whiteboardOpen ? 'Hide Whiteboard' : 'Open Whiteboard'}
                    </button>
                    <button type="button" onClick={handleToggleRecording}>
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                  </div>

                  {whiteboardOpen && (
                    <div style={{ ...panelStyle, padding: '0.75rem', marginBottom: '0.75rem' }}>
                      <h3 style={headingStyle}>Whiteboard</h3>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label>
                          Color{' '}
                          <input
                            type="color"
                            value={penColor}
                            onChange={(e) => setPenColor(e.target.value)}
                          />
                        </label>
                        <label>
                          Pen Size{' '}
                          <input
                            type="range"
                            min="1"
                            max="12"
                            value={penSize}
                            onChange={(e) => setPenSize(Number(e.target.value))}
                          />
                        </label>
                        <button type="button" onClick={clearWhiteboard}>Clear</button>
                      </div>
                      <canvas
                        ref={canvasRef}
                        width={1280}
                        height={420}
                        aria-label="Whiteboard Canvas"
                        style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', background: '#ffffff', touchAction: 'none' }}
                        onPointerDown={handleWhiteboardPointerDown}
                        onPointerMove={handleWhiteboardPointerMove}
                        onPointerUp={handleWhiteboardPointerUp}
                        onPointerLeave={handleWhiteboardPointerUp}
                      />
                    </div>
                  )}

                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #d1d5db', background: '#000' }}>
                    <iframe
                      title="Video Room"
                      src={jitsiUrl}
                      allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write"
                      style={{ width: '100%', height: '75vh', border: 0 }}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isTutor && lobbyEnabled && (
                <div style={panelStyle}>
                  <h3 style={headingStyle}>Lobby Requests</h3>
                  {pendingAdmissions.length === 0 ? (
                    <p>No pending requests.</p>
                  ) : (
                    pendingAdmissions.map((admission) => (
                      <div key={admission.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span>{admission.student_id.slice(0, 8)}</span>
                        <button type="button" onClick={() => handleApprove(admission.id)} style={buttonStyle}>
                          Admit
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div style={panelStyle}>
                <h3 style={headingStyle}>Chat</h3>
                <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '0.5rem', color: '#111827' }}>
                  {chatEvents.length === 0 ? (
                    <p>No chat messages yet.</p>
                  ) : (
                    chatEvents.map((event) => (
                      <div key={event.id} style={{ marginBottom: '0.5rem', color: '#111827' }}>
                        <strong>{event.display_name || 'User'}:</strong> {event.message}
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message"
                    style={inputStyle}
                  />
                  <button type="submit" style={buttonStyle}>Send</button>
                </form>
              </div>

              <div style={panelStyle}>
                <h3 style={headingStyle}>Attendance Log</h3>
                <div style={{ maxHeight: '220px', overflowY: 'auto', color: '#111827' }}>
                  {attendanceEvents.length === 0 ? (
                    <p>No attendance events yet.</p>
                  ) : (
                    attendanceEvents.map((event) => (
                      <div key={event.id} style={{ marginBottom: '0.5rem', color: '#111827' }}>
                        <strong>{event.display_name || 'User'}</strong> {event.event_type} at {formatDateTime(event.created_at)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
