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
  const [whiteboardTool, setWhiteboardTool] = useState('pen')
  const [penColor, setPenColor] = useState('#ef4444')
  const [stickyColor, setStickyColor] = useState('#fde68a')
  const [penSize, setPenSize] = useState(3)
  const [textSize, setTextSize] = useState(20)
  const [textItems, setTextItems] = useState([])
  const [stickyNotes, setStickyNotes] = useState([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const joinedLoggedRef = useRef(false)
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const startPointRef = useRef(null)
  const shapeBaseImageRef = useRef(null)
  const dragItemRef = useRef(null)
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)
  const textItemsRef = useRef([])
  const stickyNotesRef = useRef([])
  const mediaRecorderRef = useRef(null)
  const recordingStreamRef = useRef(null)
  const recordedChunksRef = useRef([])

  const displayName = useMemo(() => {
    return user?.user_metadata?.full_name || user?.email || 'Participant'
  }, [user])

  useEffect(() => {
    textItemsRef.current = textItems
  }, [textItems])

  useEffect(() => {
    stickyNotesRef.current = stickyNotes
  }, [stickyNotes])

  useEffect(() => {
    // Ensure room-local state does not leak when navigating between room tokens.
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (recordingStreamRef.current) {
      for (const track of recordingStreamRef.current.getTracks()) {
        track.stop()
      }
      recordingStreamRef.current = null
    }

    setBooking(null)
    setLoading(true)
    setError('')
    setPasscode('')
    setVerified(false)
    setEvents([])
    setMessage('')
    setPendingAdmissions([])
    setAdmissionRequested(false)
    setAdmissionApproved(false)
    setWhiteboardOpen(false)
    setWhiteboardTool('pen')
    setPenColor('#ef4444')
    setStickyColor('#fde68a')
    setPenSize(3)
    setTextSize(20)
    setTextItems([])
    setStickyNotes([])
    setCanUndo(false)
    setCanRedo(false)
    setIsRecording(false)
    isDrawingRef.current = false
    startPointRef.current = null
    shapeBaseImageRef.current = null
    dragItemRef.current = null
    historyRef.current = []
    historyIndexRef.current = -1
    joinedLoggedRef.current = false
  }, [roomToken])

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
    setEvents((data || []).filter((event) => event.booking_id === bookingId))
  }, [bookingId])

  const refreshPendingAdmissions = useCallback(async () => {
    if (!bookingId || !isTutor) return
    const { data } = await getPendingAdmissions(bookingId)
    setPendingAdmissions((data || []).filter((admission) => admission.booking_id === bookingId))
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
    const scopedAdmission = pendingAdmissions.find(
      (admission) => admission.id === admissionId && admission.booking_id === bookingId
    )
    if (!scopedAdmission) {
      setError('Invalid admission request for this room.')
      return
    }

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

  function syncHistoryState(index, length) {
    setCanUndo(index > 0)
    setCanRedo(index < length - 1)
  }

  function drawShape(context, tool, from, to) {
    context.strokeStyle = penColor
    context.lineWidth = penSize
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()

    if (tool === 'line') {
      context.moveTo(from.x, from.y)
      context.lineTo(to.x, to.y)
    } else if (tool === 'rectangle') {
      const width = to.x - from.x
      const height = to.y - from.y
      context.rect(from.x, from.y, width, height)
    } else if (tool === 'circle') {
      const radius = Math.hypot(to.x - from.x, to.y - from.y)
      context.arc(from.x, from.y, radius, 0, Math.PI * 2)
    }

    context.stroke()
    context.closePath()
  }

  function restoreCanvasFromDataUrl(dataUrl) {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    if (!dataUrl) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      return
    }

    const img = new window.Image()
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(img, 0, 0)
    }
    img.src = dataUrl
  }

  function pushWhiteboardHistory(nextTextItems = textItemsRef.current, nextStickyNotes = stickyNotesRef.current) {
    const canvas = canvasRef.current
    if (!canvas) return

    const snapshot = {
      canvasDataUrl: canvas.toDataURL('image/png'),
      textItems: JSON.parse(JSON.stringify(nextTextItems)),
      stickyNotes: JSON.parse(JSON.stringify(nextStickyNotes))
    }

    const clippedHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    clippedHistory.push(snapshot)
    historyRef.current = clippedHistory
    historyIndexRef.current = clippedHistory.length - 1
    syncHistoryState(historyIndexRef.current, historyRef.current.length)
  }

  function initializeWhiteboard() {
    const canvas = canvasRef.current
    if (!canvas || historyRef.current.length > 0) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    pushWhiteboardHistory([], [])
  }

  function undoWhiteboard() {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const snapshot = historyRef.current[historyIndexRef.current]
    restoreCanvasFromDataUrl(snapshot?.canvasDataUrl || null)
    setTextItems(snapshot?.textItems || [])
    setStickyNotes(snapshot?.stickyNotes || [])
    syncHistoryState(historyIndexRef.current, historyRef.current.length)
  }

  function redoWhiteboard() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    const snapshot = historyRef.current[historyIndexRef.current]
    restoreCanvasFromDataUrl(snapshot?.canvasDataUrl || null)
    setTextItems(snapshot?.textItems || [])
    setStickyNotes(snapshot?.stickyNotes || [])
    syncHistoryState(historyIndexRef.current, historyRef.current.length)
  }

  function addTextItem(point) {
    const value = window.prompt('Enter text')
    if (!value || !value.trim()) return
    const nextItems = [
      ...textItems,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        x: point.x,
        y: point.y,
        text: value.trim(),
        color: penColor,
        size: textSize
      }
    ]
    setTextItems(nextItems)
    pushWhiteboardHistory(nextItems, stickyNotes)
  }

  function addStickyNote(point) {
    const nextNotes = [
      ...stickyNotes,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        x: point.x,
        y: point.y,
        text: 'New note',
        color: stickyColor
      }
    ]
    setStickyNotes(nextNotes)
    pushWhiteboardHistory(textItems, nextNotes)
  }

  function updateTextItem(id, updater, shouldSave = false) {
    setTextItems((prev) => {
      const next = prev.map((item) => (item.id === id ? updater(item) : item))
      if (shouldSave) {
        pushWhiteboardHistory(next, stickyNotesRef.current)
      }
      return next
    })
  }

  function updateStickyNote(id, updater, shouldSave = false) {
    setStickyNotes((prev) => {
      const next = prev.map((item) => (item.id === id ? updater(item) : item))
      if (shouldSave) {
        pushWhiteboardHistory(textItemsRef.current, next)
      }
      return next
    })
  }

  function deleteStickyNote(id) {
    const nextNotes = stickyNotes.filter((note) => note.id !== id)
    setStickyNotes(nextNotes)
    pushWhiteboardHistory(textItems, nextNotes)
  }

  function exportWhiteboardImage() {
    const canvas = canvasRef.current
    if (!canvas) return
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const context = exportCanvas.getContext('2d')
    if (!context) return

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    context.drawImage(canvas, 0, 0)

    for (const textItem of textItems) {
      context.fillStyle = textItem.color
      context.font = `${textItem.size}px sans-serif`
      context.textBaseline = 'top'
      context.fillText(textItem.text, textItem.x, textItem.y)
    }

    for (const note of stickyNotes) {
      context.fillStyle = note.color
      context.fillRect(note.x, note.y, 180, 140)
      context.strokeStyle = '#9ca3af'
      context.strokeRect(note.x, note.y, 180, 140)
      context.fillStyle = '#111827'
      context.font = '16px sans-serif'
      context.textBaseline = 'top'
      context.fillText(note.text, note.x + 10, note.y + 10, 160)
    }

    const anchor = document.createElement('a')
    anchor.href = exportCanvas.toDataURL('image/png')
    anchor.download = `whiteboard-${bookingId || 'lesson'}.png`
    anchor.click()
  }

  function handleWhiteboardPointerDown(event) {
    initializeWhiteboard()

    const point = getCanvasPoint(event)
    startPointRef.current = point

    if (whiteboardTool === 'text') {
      addTextItem(point)
      return
    }

    if (whiteboardTool === 'sticky') {
      addStickyNote(point)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    if (whiteboardTool === 'pen' || whiteboardTool === 'eraser') {
      context.globalCompositeOperation = whiteboardTool === 'eraser' ? 'destination-out' : 'source-over'
      context.strokeStyle = penColor
      context.lineWidth = whiteboardTool === 'eraser' ? penSize * 2 : penSize
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.beginPath()
      context.moveTo(point.x, point.y)
      isDrawingRef.current = true
      return
    }

    if (whiteboardTool === 'line' || whiteboardTool === 'rectangle' || whiteboardTool === 'circle') {
      shapeBaseImageRef.current = context.getImageData(0, 0, canvas.width, canvas.height)
      isDrawingRef.current = true
    }
  }

  function handleWhiteboardPointerMove(event) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const point = getCanvasPoint(event)

    if (whiteboardTool === 'pen' || whiteboardTool === 'eraser') {
      context.lineTo(point.x, point.y)
      context.stroke()
      return
    }

    if (!startPointRef.current || !shapeBaseImageRef.current) return
    context.putImageData(shapeBaseImageRef.current, 0, 0)
    drawShape(context, whiteboardTool, startPointRef.current, point)
  }

  function handleWhiteboardPointerUp() {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    context.closePath()
    context.globalCompositeOperation = 'source-over'
    isDrawingRef.current = false
    shapeBaseImageRef.current = null
    startPointRef.current = null
    pushWhiteboardHistory(textItems, stickyNotes)
  }

  function clearWhiteboard() {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    setTextItems([])
    setStickyNotes([])
    pushWhiteboardHistory([], [])
  }

  function handleOverlayPointerDown(kind, id, event) {
    event.stopPropagation()
    const point = getCanvasPoint(event)
    const currentItem = kind === 'text'
      ? textItems.find((item) => item.id === id)
      : stickyNotes.find((item) => item.id === id)
    if (!currentItem) return

    dragItemRef.current = {
      kind,
      id,
      offsetX: point.x - currentItem.x,
      offsetY: point.y - currentItem.y
    }
  }

  function handleOverlayPointerMove(event) {
    if (!dragItemRef.current) return
    const point = getCanvasPoint(event)
    const nextX = point.x - dragItemRef.current.offsetX
    const nextY = point.y - dragItemRef.current.offsetY

    if (dragItemRef.current.kind === 'text') {
      updateTextItem(dragItemRef.current.id, (item) => ({ ...item, x: nextX, y: nextY }))
      return
    }
    updateStickyNote(dragItemRef.current.id, (item) => ({ ...item, x: nextX, y: nextY }))
  }

  function handleOverlayPointerUp() {
    if (!dragItemRef.current) return
    const dragKind = dragItemRef.current.kind
    dragItemRef.current = null

    if (dragKind === 'text') {
      setTextItems((prev) => {
        const next = [...prev]
        pushWhiteboardHistory(next, stickyNotesRef.current)
        return next
      })
    } else {
      setStickyNotes((prev) => {
        const next = [...prev]
        pushWhiteboardHistory(textItemsRef.current, next)
        return next
      })
    }
  }

  useEffect(() => {
    if (!whiteboardOpen) return
    initializeWhiteboard()
    const snapshot = historyRef.current[historyIndexRef.current]
    if (!snapshot) return
    restoreCanvasFromDataUrl(snapshot.canvasDataUrl)
    setTextItems(snapshot.textItems || [])
    setStickyNotes(snapshot.stickyNotes || [])
  }, [whiteboardOpen])

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

  const roomEvents = events.filter((event) => event.booking_id === bookingId)
  const roomPendingAdmissions = pendingAdmissions.filter((admission) => admission.booking_id === bookingId)
  const chatEvents = roomEvents.filter((event) => event.event_type === 'chat')
  const attendanceEvents = roomEvents.filter((event) => event.event_type === 'joined' || event.event_type === 'left')
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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <button type="button" style={buttonStyle} onClick={() => setWhiteboardTool('pen')}>Pen</button>
                        <button type="button" style={buttonStyle} onClick={() => setWhiteboardTool('eraser')}>Eraser</button>
                        <button type="button" style={buttonStyle} onClick={() => setWhiteboardTool('line')}>Line</button>
                        <button type="button" style={buttonStyle} onClick={() => setWhiteboardTool('rectangle')}>Rectangle</button>
                        <button type="button" style={buttonStyle} onClick={() => setWhiteboardTool('circle')}>Circle</button>
                        <button type="button" style={buttonStyle} onClick={() => setWhiteboardTool('text')}>Text</button>
                        <button type="button" style={buttonStyle} onClick={() => setWhiteboardTool('sticky')}>Sticky</button>
                        <button type="button" style={buttonStyle} onClick={undoWhiteboard} disabled={!canUndo}>Undo</button>
                        <button type="button" style={buttonStyle} onClick={redoWhiteboard} disabled={!canRedo}>Redo</button>
                        <button type="button" style={buttonStyle} onClick={exportWhiteboardImage}>Export PNG</button>
                        <button type="button" style={buttonStyle} onClick={clearWhiteboard}>Clear</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          Ink
                          <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          Sticky
                          <input type="color" value={stickyColor} onChange={(e) => setStickyColor(e.target.value)} />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          Stroke
                          <input
                            type="range"
                            min="1"
                            max="18"
                            value={penSize}
                            onChange={(e) => setPenSize(Number(e.target.value))}
                          />
                          <span>{penSize}px</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          Text
                          <input
                            type="range"
                            min="12"
                            max="48"
                            value={textSize}
                            onChange={(e) => setTextSize(Number(e.target.value))}
                          />
                          <span>{textSize}px</span>
                        </label>
                        <span style={{ fontSize: '0.9rem', color: '#374151' }}>
                          Active tool: <strong>{whiteboardTool}</strong>
                        </span>
                      </div>
                      <div
                        style={{ position: 'relative', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}
                        onPointerMove={(event) => {
                          handleWhiteboardPointerMove(event)
                          handleOverlayPointerMove(event)
                        }}
                        onPointerUp={() => {
                          handleWhiteboardPointerUp()
                          handleOverlayPointerUp()
                        }}
                        onPointerLeave={() => {
                          handleWhiteboardPointerUp()
                          handleOverlayPointerUp()
                        }}
                      >
                        <canvas
                          ref={canvasRef}
                          width={1280}
                          height={420}
                          aria-label="Whiteboard Canvas"
                          style={{ width: '100%', display: 'block', background: '#ffffff', touchAction: 'none' }}
                          onPointerDown={handleWhiteboardPointerDown}
                        />

                        {textItems.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              position: 'absolute',
                              left: `${item.x}px`,
                              top: `${item.y}px`,
                              color: item.color,
                              fontSize: `${item.size}px`,
                              lineHeight: 1.2,
                              maxWidth: '320px',
                              cursor: 'move',
                              userSelect: 'none',
                              background: 'rgba(255, 255, 255, 0.65)',
                              padding: '2px 4px',
                              borderRadius: '4px'
                            }}
                            onPointerDown={(event) => handleOverlayPointerDown('text', item.id, event)}
                            onDoubleClick={() => {
                              const nextText = window.prompt('Edit text', item.text)
                              if (nextText === null) return
                              updateTextItem(item.id, (current) => ({ ...current, text: nextText }), true)
                            }}
                          >
                            {item.text}
                          </div>
                        ))}

                        {stickyNotes.map((note) => (
                          <div
                            key={note.id}
                            style={{
                              position: 'absolute',
                              left: `${note.x}px`,
                              top: `${note.y}px`,
                              width: '180px',
                              minHeight: '140px',
                              background: note.color,
                              border: '1px solid #9ca3af',
                              borderRadius: '8px',
                              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.15)',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                          >
                            <div
                              style={{
                                padding: '0.3rem 0.45rem',
                                borderBottom: '1px solid rgba(17, 24, 39, 0.2)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'move'
                              }}
                              onPointerDown={(event) => handleOverlayPointerDown('sticky', note.id, event)}
                            >
                              <strong style={{ fontSize: '0.75rem' }}>Note</strong>
                              <button
                                type="button"
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#111827' }}
                                onClick={() => deleteStickyNote(note.id)}
                              >
                                x
                              </button>
                            </div>
                            <textarea
                              value={note.text}
                              onChange={(event) => updateStickyNote(note.id, (current) => ({ ...current, text: event.target.value }))}
                              onBlur={() => pushWhiteboardHistory(textItemsRef.current, stickyNotesRef.current)}
                              style={{
                                width: '100%',
                                minHeight: '108px',
                                resize: 'vertical',
                                border: 'none',
                                background: 'transparent',
                                color: '#111827',
                                padding: '0.45rem',
                                outline: 'none',
                                fontFamily: 'inherit',
                                fontSize: '0.95rem'
                              }}
                            />
                          </div>
                        ))}
                      </div>
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
                  {roomPendingAdmissions.length === 0 ? (
                    <p>No pending requests.</p>
                  ) : (
                    roomPendingAdmissions.map((admission) => (
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
