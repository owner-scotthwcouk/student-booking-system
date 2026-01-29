import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/auth'
import { closeVideoRoom, getVideoRoomById, setVideoRoomLocked } from '../../lib/videoRoomAPI'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

function formatRoomStatus(room) {
  if (!room) return 'Loading...'
  if (room.status === 'closed') return 'Closed'
  if (room.locked) return 'Open (Locked)'
  return 'Open'
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatTimestampForFilename(d) {
  const yyyy = d.getFullYear()
  const mm = pad2(d.getMonth() + 1)
  const dd = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const mi = pad2(d.getMinutes())
  const ss = pad2(d.getSeconds())
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`
}

function pickSupportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ]
  for (const t of candidates) {
    // MediaRecorder.isTypeSupported may not exist in some browsers
    if (window.MediaRecorder && typeof window.MediaRecorder.isTypeSupported === 'function') {
      if (window.MediaRecorder.isTypeSupported(t)) return t
    }
  }
  return ''
}

export default function VideoRoom({ roomId, role, onExit }) {
  const { user } = useAuth()

  const isTutor = role === 'tutor'
  const myUserId = user?.id

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [micEnabled, setMicEnabled] = useState(true)
  const [camEnabled, setCamEnabled] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [includeShareAudio, setIncludeShareAudio] = useState(false)
  const [connected, setConnected] = useState(false)

  // Recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const recordingTimerRef = useRef(null)
  const recorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recordingCanvasRef = useRef(null)
  const recordingCanvasStreamRef = useRef(null)
  const recordingDrawRafRef = useRef(null)

  const recordingAudioCtxRef = useRef(null)
  const recordingAudioDestRef = useRef(null)
  const recordingAudioLocalConnectedRef = useRef(false)
  const recordingAudioRemoteConnectedRef = useRef(false)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  const pcRef = useRef(null)
  const rtcChannelRef = useRef(null)
  const dbChannelRef = useRef(null)

  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(new MediaStream())
  const cameraVideoTrackRef = useRef(null)

  const startedCallRef = useRef(false)

  const canJoin = useMemo(() => {
    if (!room) return false
    if (room.status !== 'open') return false
    if (!isTutor && room.locked) return false
    return true
  }, [room, isTutor])

  const loadRoom = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await getVideoRoomById(roomId)
    if (err) setError(err.message || 'Failed to load room')
    setRoom(data || null)
    setLoading(false)
  }, [roomId])

  const stopRecordingInternal = useCallback(
    async ({ download = true } = {}) => {
      try {
        // Stop timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        setRecordingSeconds(0)

        // Stop draw loop
        if (recordingDrawRafRef.current) {
          cancelAnimationFrame(recordingDrawRafRef.current)
          recordingDrawRafRef.current = null
        }

        // Stop recorder (triggers onstop)
        const rec = recorderRef.current
        if (rec && rec.state !== 'inactive') {
          rec.stop()
        }

        // Stop canvas stream tracks
        if (recordingCanvasStreamRef.current) {
          recordingCanvasStreamRef.current.getTracks().forEach((t) => t.stop())
          recordingCanvasStreamRef.current = null
        }

        // Close audio context
        if (recordingAudioCtxRef.current) {
          try {
            await recordingAudioCtxRef.current.close()
          } catch {
            // ignore
          }
          recordingAudioCtxRef.current = null
          recordingAudioDestRef.current = null
          recordingAudioLocalConnectedRef.current = false
          recordingAudioRemoteConnectedRef.current = false
        }

        // Clear recorder ref
        recorderRef.current = null

        if (!download) {
          recordedChunksRef.current = []
        }
      } catch {
        // ignore
      } finally {
        setIsRecording(false)
      }
    },
    []
  )

  const downloadRecording = useCallback(() => {
    try {
      const chunks = recordedChunksRef.current || []
      if (chunks.length === 0) return

      const mime = recorderRef.current?.mimeType || 'video/webm'
      const blob = new Blob(chunks, { type: mime })
      recordedChunksRef.current = []

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meeting-${roomId}-${formatTimestampForFilename(new Date())}.webm`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      // fallback: do nothing
    }
  }, [roomId])

  const ensureRecordingCanvas = useCallback(() => {
    if (recordingCanvasRef.current) return recordingCanvasRef.current

    const canvas = document.createElement('canvas')
    // 720p composite
    canvas.width = 1280
    canvas.height = 720
    recordingCanvasRef.current = canvas
    return canvas
  }, [])

  const drawCompositeFrame = useCallback(() => {
    const canvas = recordingCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const halfW = Math.floor(W / 2)

    // Background
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)

    const localVideo = localVideoRef.current
    const remoteVideo = remoteVideoRef.current

    // Helper draw with cover-like behaviour
    const drawVideoCover = (video, x, y, w, h) => {
      if (!video || video.readyState < 2) {
        ctx.fillStyle = '#111'
        ctx.fillRect(x, y, w, h)
        return
      }

      const vw = video.videoWidth || w
      const vh = video.videoHeight || h
      if (!vw || !vh) {
        ctx.fillStyle = '#111'
        ctx.fillRect(x, y, w, h)
        return
      }

      const videoAR = vw / vh
      const boxAR = w / h

      let sx = 0
      let sy = 0
      let sw = vw
      let sh = vh

      if (videoAR > boxAR) {
        // wider than box: crop sides
        sw = Math.floor(vh * boxAR)
        sx = Math.floor((vw - sw) / 2)
      } else {
        // taller than box: crop top/bottom
        sh = Math.floor(vw / boxAR)
        sy = Math.floor((vh - sh) / 2)
      }

      try {
        ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h)
      } catch {
        ctx.fillStyle = '#111'
        ctx.fillRect(x, y, w, h)
      }
    }

    // Left: tutor/local
    drawVideoCover(localVideo, 0, 0, halfW, H)

    // Right: remote
    drawVideoCover(remoteVideo, halfW, 0, W - halfW, H)

    // Divider
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(halfW - 1, 0, 2, H)

    // Labels
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(16, 16, 110, 28)
    ctx.fillRect(halfW + 16, 16, 160, 28)

    ctx.fillStyle = '#fff'
    ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial'
    ctx.fillText('You', 26, 36)
    ctx.fillText('Other participant', halfW + 26, 36)

    // Recording indicator
    if (isRecording) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(W - 150, 16, 134, 28)
      ctx.fillStyle = '#ff3b30'
      ctx.beginPath()
      ctx.arc(W - 132, 30, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText('REC', W - 118, 36)
    }
  }, [isRecording])

  const startRecordingDrawLoop = useCallback(() => {
    const loop = () => {
      drawCompositeFrame()
      recordingDrawRafRef.current = requestAnimationFrame(loop)
    }
    recordingDrawRafRef.current = requestAnimationFrame(loop)
  }, [drawCompositeFrame])

  const ensureRecordingAudioMix = useCallback(async () => {
    if (recordingAudioCtxRef.current && recordingAudioDestRef.current) {
      // try resume if needed (autoplay policies)
      try {
        if (recordingAudioCtxRef.current.state === 'suspended') {
          await recordingAudioCtxRef.current.resume()
        }
      } catch {
        // ignore
      }
      return { ctx: recordingAudioCtxRef.current, dest: recordingAudioDestRef.current }
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextCtor) return { ctx: null, dest: null }

    const ctx = new AudioContextCtor()
    const dest = ctx.createMediaStreamDestination()

    recordingAudioCtxRef.current = ctx
    recordingAudioDestRef.current = dest
    recordingAudioLocalConnectedRef.current = false
    recordingAudioRemoteConnectedRef.current = false

    // Connect local audio if present
    try {
      const local = localStreamRef.current
      if (local && local.getAudioTracks().length > 0) {
        const src = ctx.createMediaStreamSource(new MediaStream([local.getAudioTracks()[0]]))
        src.connect(dest)
        recordingAudioLocalConnectedRef.current = true
      }
    } catch {
      // ignore
    }

    // Connect remote audio if present (may arrive later; we'll also attempt ontrack)
    try {
      const remote = remoteStreamRef.current
      if (remote && remote.getAudioTracks().length > 0) {
        const src = ctx.createMediaStreamSource(new MediaStream([remote.getAudioTracks()[0]]))
        src.connect(dest)
        recordingAudioRemoteConnectedRef.current = true
      }
    } catch {
      // ignore
    }

    try {
      if (ctx.state === 'suspended') await ctx.resume()
    } catch {
      // ignore
    }

    return { ctx, dest }
  }, [])

  const maybeAttachRemoteAudioToRecording = useCallback(() => {
    try {
      if (!isRecording) return
      if (recordingAudioRemoteConnectedRef.current) return

      const ctx = recordingAudioCtxRef.current
      const dest = recordingAudioDestRef.current
      if (!ctx || !dest) return

      const remote = remoteStreamRef.current
      if (!remote) return

      const tracks = remote.getAudioTracks()
      if (!tracks || tracks.length === 0) return

      const src = ctx.createMediaStreamSource(new MediaStream([tracks[0]]))
      src.connect(dest)
      recordingAudioRemoteConnectedRef.current = true
    } catch {
      // ignore
    }
  }, [isRecording])

  const startRecording = useCallback(async () => {
    if (!isTutor) return
    setError('')

    if (!window.MediaRecorder) {
      setError('Recording is not supported in this browser.')
      return
    }

    if (isRecording) return

    try {
      // Ensure there is local media
      if (!localStreamRef.current) {
        setError('Start the call before recording.')
        return
      }

      // Ensure canvas
      const canvas = ensureRecordingCanvas()

      // Start drawing loop
      drawCompositeFrame()
      startRecordingDrawLoop()

      // Create capture stream
      const canvasStream = canvas.captureStream(30)
      recordingCanvasStreamRef.current = canvasStream

      // Mix audio (local + remote, if present)
      const { dest } = await ensureRecordingAudioMix()

      const combined = new MediaStream()
      // Video track from canvas
      const canvasVideoTrack = canvasStream.getVideoTracks()[0]
      if (canvasVideoTrack) combined.addTrack(canvasVideoTrack)

      // Audio track from mixed destination
      const mixedAudioTrack = dest?.stream?.getAudioTracks?.()[0]
      if (mixedAudioTrack) combined.addTrack(mixedAudioTrack)

      const mimeType = pickSupportedMimeType()
      const recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined)

      recordedChunksRef.current = []

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          recordedChunksRef.current.push(evt.data)
        }
      }

      recorder.onerror = () => {
        setError('Recording failed.')
        // stop without download (chunks likely unusable)
        stopRecordingInternal({ download: false })
      }

      recorder.onstop = () => {
        // Auto-download immediately (no Supabase storage)
        downloadRecording()
      }

      recorderRef.current = recorder
      recorder.start(1000) // gather chunks every 1s
      setIsRecording(true)
      setRecordingSeconds(0)

      // Timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1)
      }, 1000)

      // If remote audio arrives after recording starts, attach it
      maybeAttachRemoteAudioToRecording()
    } catch (e) {
      setError(e?.message || 'Failed to start recording.')
      try {
        await stopRecordingInternal({ download: false })
      } catch {
        // ignore
      }
    }
  }, [
    downloadRecording,
    drawCompositeFrame,
    ensureRecordingAudioMix,
    ensureRecordingCanvas,
    isRecording,
    isTutor,
    maybeAttachRemoteAudioToRecording,
    startRecordingDrawLoop,
    stopRecordingInternal
  ])

  const stopRecording = useCallback(async () => {
    if (!isTutor) return
    if (!isRecording) return
    await stopRecordingInternal({ download: true })
  }, [isRecording, isTutor, stopRecordingInternal])

  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        rtcChannelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            from: myUserId,
            kind: 'candidate',
            candidate: event.candidate
          }
        })
      }
    }

    pc.ontrack = (event) => {
      for (const track of event.streams[0].getTracks()) {
        remoteStreamRef.current.addTrack(track)
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
      }

      // If we’re recording and remote audio arrives late, attach it to the recording mix
      maybeAttachRemoteAudioToRecording()
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      setConnected(state === 'connected')
    }

    pcRef.current = pc
    return pc
  }, [maybeAttachRemoteAudioToRecording, myUserId])

  const stopAllMedia = useCallback(() => {
    try {
      if (localVideoRef.current) localVideoRef.current.srcObject = null
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
      }

      remoteStreamRef.current = new MediaStream()
      cameraVideoTrackRef.current = null
    } catch {
      // ignore
    }
  }, [])

  const hangupWebRTC = useCallback(() => {
    try {
      const pc = pcRef.current
      if (pc) {
        pc.onicecandidate = null
        pc.ontrack = null
        pc.onconnectionstatechange = null
        pc.close()
      }
      pcRef.current = null
      startedCallRef.current = false
      setConnected(false)
    } catch {
      // ignore
    }
  }, [])

  const cleanupChannels = useCallback(async () => {
    try {
      if (rtcChannelRef.current) {
        await supabase.removeChannel(rtcChannelRef.current)
        rtcChannelRef.current = null
      }
      if (dbChannelRef.current) {
        await supabase.removeChannel(dbChannelRef.current)
        dbChannelRef.current = null
      }
    } catch {
      // ignore
    }
  }, [])

  const startLocalMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })

    localStreamRef.current = stream

    const videoTrack = stream.getVideoTracks()[0] || null
    cameraVideoTrackRef.current = videoTrack

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }

    setMicEnabled(stream.getAudioTracks()[0]?.enabled ?? true)
    setCamEnabled(stream.getVideoTracks()[0]?.enabled ?? true)

    return stream
  }, [])

  const attachTracksToPeer = useCallback((pc, stream) => {
    const senders = pc.getSenders()
    const existingTrackIds = new Set(senders.map((s) => s.track?.id).filter(Boolean))

    stream.getTracks().forEach((track) => {
      if (!existingTrackIds.has(track.id)) {
        pc.addTrack(track, stream)
      }
    })
  }, [])

  const tutorStartOffer = useCallback(async () => {
    const pc = ensurePeerConnection()
    if (!localStreamRef.current) {
      const stream = await startLocalMedia()
      attachTracksToPeer(pc, stream)
    } else {
      attachTracksToPeer(pc, localStreamRef.current)
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    rtcChannelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        from: myUserId,
        kind: 'offer',
        sdp: pc.localDescription
      }
    })
  }, [attachTracksToPeer, ensurePeerConnection, myUserId, startLocalMedia])

  const handleSignal = useCallback(
    async (payload) => {
      if (!payload || payload.from === myUserId) return

      const pc = ensurePeerConnection()

      if (!localStreamRef.current) {
        const stream = await startLocalMedia()
        attachTracksToPeer(pc, stream)
      } else {
        attachTracksToPeer(pc, localStreamRef.current)
      }

      if (payload.kind === 'ready') {
        // Student says "ready" => Tutor sends offer
        if (isTutor && !startedCallRef.current) {
          startedCallRef.current = true
          await tutorStartOffer()
        }
        return
      }

      if (payload.kind === 'offer') {
        if (isTutor) return

        await pc.setRemoteDescription(payload.sdp)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        rtcChannelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            from: myUserId,
            kind: 'answer',
            sdp: pc.localDescription
          }
        })
        return
      }

      if (payload.kind === 'answer') {
        if (!isTutor) return
        await pc.setRemoteDescription(payload.sdp)
        return
      }

      if (payload.kind === 'candidate') {
        try {
          await pc.addIceCandidate(payload.candidate)
        } catch {
          // ignore
        }
        return
      }

      if (payload.kind === 'hangup') {
        // If we are recording, stop and download immediately
        if (isTutor && isRecording) {
          await stopRecordingInternal({ download: true })
        }
        hangupWebRTC()
        stopAllMedia()
      }
    },
    [
      attachTracksToPeer,
      ensurePeerConnection,
      hangupWebRTC,
      isRecording,
      isTutor,
      myUserId,
      startLocalMedia,
      stopAllMedia,
      stopRecordingInternal,
      tutorStartOffer
    ]
  )

  const joinRealtimeRoom = useCallback(async () => {
    if (!myUserId) return

    const rtcChannel = supabase
      .channel(`video-room:${roomId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        handleSignal(payload)
      })

    rtcChannelRef.current = rtcChannel
    await rtcChannel.subscribe()

    const dbChannel = supabase
      .channel(`video-room-db:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'video_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new)
        }
      )

    dbChannelRef.current = dbChannel
    await dbChannel.subscribe()

    if (!isTutor) {
      rtcChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { from: myUserId, kind: 'ready' }
      })
    }
  }, [handleSignal, isTutor, myUserId, roomId])

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const track = stream.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMicEnabled(track.enabled)
  }, [])

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setCamEnabled(track.enabled)
  }, [])

  const startScreenShare = useCallback(
    async (withAudio) => {
      if (!isTutor) return
      if (!pcRef.current) ensurePeerConnection()

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: withAudio
      })

      const displayVideoTrack = displayStream.getVideoTracks()[0]
      if (!displayVideoTrack) return

      displayVideoTrack.onended = () => {
        stopScreenShare()
      }

      const pc = pcRef.current
      const sender = pc
        ?.getSenders()
        ?.find((s) => s.track && s.track.kind === 'video')

      if (sender) {
        await sender.replaceTrack(displayVideoTrack)
        setSharing(true)
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream
      }
    },
    [ensurePeerConnection, isTutor]
  )

  const stopScreenShare = useCallback(async () => {
    if (!isTutor) return

    const pc = pcRef.current
    const cameraTrack = cameraVideoTrackRef.current
    if (!pc || !cameraTrack) return

    const sender = pc
      .getSenders()
      .find((s) => s.track && s.track.kind === 'video')

    if (sender) {
      await sender.replaceTrack(cameraTrack)
    }

    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }

    setSharing(false)
  }, [isTutor])

  const tutorToggleLock = useCallback(async () => {
    if (!isTutor || !room) return
    setBusy(true)
    setError('')
    const { data, error: err } = await setVideoRoomLocked(room.id, !room.locked)
    if (err) setError(err.message || 'Failed to update lock')
    if (data) setRoom(data)
    setBusy(false)
  }, [isTutor, room])

  const exitRoom = useCallback(async () => {
    setBusy(true)
    setError('')

    try {
      // If tutor is recording, stop and download before closing
      if (isTutor && isRecording) {
        await stopRecordingInternal({ download: true })
      }

      if (isTutor && room?.status === 'open') {
        rtcChannelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: myUserId, kind: 'hangup' }
        })
        await closeVideoRoom(room.id)
      } else {
        rtcChannelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: myUserId, kind: 'hangup' }
        })
      }
    } catch (e) {
      setError(e?.message || 'Failed to exit room')
    } finally {
      hangupWebRTC()
      stopAllMedia()
      await cleanupChannels()
      setBusy(false)
      onExit?.()
    }
  }, [
    cleanupChannels,
    hangupWebRTC,
    isRecording,
    isTutor,
    myUserId,
    onExit,
    room,
    stopAllMedia,
    stopRecordingInternal
  ])

  useEffect(() => {
    if (!roomId) return
    loadRoom()
  }, [loadRoom, roomId])

  useEffect(() => {
    if (loading) return
    if (!room) return

    if (room.status === 'closed') {
      // Stop recording immediately if room closes
      if (isTutor && isRecording) {
        stopRecordingInternal({ download: true })
      }
      hangupWebRTC()
      stopAllMedia()
      return
    }

    if (!isTutor && room.locked) {
      hangupWebRTC()
      stopAllMedia()
      return
    }
  }, [hangupWebRTC, isRecording, isTutor, loading, room, stopAllMedia, stopRecordingInternal])

  useEffect(() => {
    if (loading) return
    if (!room) return
    if (!myUserId) return
    if (!canJoin) return

    let cancelled = false

    async function init() {
      try {
        setError('')

        await startLocalMedia()
        if (cancelled) return

        ensurePeerConnection()
        if (cancelled) return

        await joinRealtimeRoom()
      } catch (e) {
        setError(e?.message || 'Failed to start video')
      }
    }

    init()

    return () => {
      cancelled = true
      ;(async () => {
        // If tutor closes tab while recording, stop and download
        if (isTutor && isRecording) {
          await stopRecordingInternal({ download: true })
        }
        hangupWebRTC()
        stopAllMedia()
        await cleanupChannels()
      })()
    }
  }, [
    canJoin,
    cleanupChannels,
    ensurePeerConnection,
    hangupWebRTC,
    isRecording,
    isTutor,
    joinRealtimeRoom,
    loading,
    myUserId,
    room,
    startLocalMedia,
    stopAllMedia,
    stopRecordingInternal
  ])

  if (loading) return <div>Loading video room...</div>

  if (!room) {
    return (
      <div className="video-room">
        <p>Room not found.</p>
        <button className="btn-secondary" onClick={onExit}>Back</button>
      </div>
    )
  }

  if (!canJoin) {
    return (
      <div className="video-room">
        <h3>Video Room</h3>
        <p><strong>Status:</strong> {formatRoomStatus(room)}</p>
        {!isTutor && room.locked && <p>This room is locked by the tutor.</p>}
        {room.status === 'closed' && <p>This room has been closed by the tutor.</p>}
        <button className="btn-secondary" onClick={onExit}>Back</button>
      </div>
    )
  }

  const recMM = pad2(Math.floor(recordingSeconds / 60))
  const recSS = pad2(recordingSeconds % 60)

  return (
    <div className="video-room" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>🎥 Video Room</h3>
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            <strong>Status:</strong> {formatRoomStatus(room)}{' '}
            • <strong>Connection:</strong> {connected ? 'Connected' : 'Connecting...'}
            {isTutor && isRecording && (
              <>
                {' '}• <strong style={{ color: '#ff3b30' }}>REC</strong> {recMM}:{recSS}
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {isTutor && (
            <button className="btn-secondary" disabled={busy} onClick={tutorToggleLock}>
              {room.locked ? 'Unlock Room' : 'Lock Room'}
            </button>
          )}

          <button className="btn-secondary" onClick={toggleMic}>
            {micEnabled ? 'Mute Mic' : 'Unmute Mic'}
          </button>

          <button className="btn-secondary" onClick={toggleCam}>
            {camEnabled ? 'Stop Camera' : 'Start Camera'}
          </button>

          {isTutor && (
            <>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={includeShareAudio}
                  onChange={(e) => setIncludeShareAudio(e.target.checked)}
                />
                Share audio
              </label>

              {!sharing ? (
                <button
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => startScreenShare(includeShareAudio)}
                  title="Use the picker to choose Tab/Window/Entire Screen"
                >
                  Share Screen
                </button>
              ) : (
                <button className="btn-secondary" disabled={busy} onClick={stopScreenShare}>
                  Stop Sharing
                </button>
              )}

              {!isRecording ? (
                <button
                  className="btn-secondary"
                  disabled={busy || !connected}
                  onClick={startRecording}
                  title={!connected ? 'Wait until connected to start recording' : 'Start recording (downloads on stop)'}
                >
                  ⏺ Record
                </button>
              ) : (
                <button
                  className="btn-secondary"
                  disabled={busy}
                  onClick={stopRecording}
                  title="Stop recording and download automatically"
                >
                  ⏹ Stop
                </button>
              )}
            </>
          )}

          <button className={isTutor ? 'btn-danger' : 'btn-secondary'} disabled={busy} onClick={exitRoom}>
            {isTutor ? 'End & Close' : 'Leave'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {isTutor && (
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Recording note: recording is saved locally and auto-downloads as <strong>.webm</strong> when you stop. Nothing is stored in Supabase.
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12
        }}
      >
        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 14, marginBottom: 6, opacity: 0.85 }}>You</div>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', borderRadius: 8, background: '#111' }}
          />
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 14, marginBottom: 6, opacity: 0.85 }}>Other participant</div>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', borderRadius: 8, background: '#111' }}
          />
        </div>
      </div>
    </div>
  )
}
