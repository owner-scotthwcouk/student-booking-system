import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import VideoDisplay from './VideoDisplay';
import Controls from './Controls';
import ParticipantList from './ParticipantList';
import { extractCredentialsFromUrl, checkMeetingAccessibility } from '../../services/videoChatUtils';

const VideoRoom = () => {
  const { meetingId } = useParams();
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [meetingActive, setMeetingActive] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const peerConnectionsRef = useRef({});
  const localVideoRef = useRef(null);
  const userIdRef = useRef(null);
  const sessionIdRef = useRef(null);
  const passcodeRef = useRef(null);

  // Initialize meeting and get user credentials from URL
  useEffect(() => {
    const initializeMeeting = async () => {
      try {
        const url = window.location.href;
        const credentials = extractCredentialsFromUrl(url);
        
        if (!credentials) {
          setError('Invalid meeting link');
          setLoading(false);
          return;
        }

        passcodeRef.current = credentials.passcode;
        userIdRef.current = localStorage.getItem('userId') || `user-${Date.now()}`;
        localStorage.setItem('userId', userIdRef.current);

        // Request access to camera and microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Join the meeting
        await joinMeeting(meetingId, credentials.passcode, stream);
        setMeetingActive(true);
        setLoading(false);
      } catch (err) {
        console.error('Error initializing meeting:', err);
        setError(err.message || 'Failed to initialize meeting');
        setLoading(false);
      }
    };

    initializeMeeting();
  }, [meetingId]);

  const joinMeeting = async (meetingId, passcode, stream) => {
    try {
      const response = await fetch(`/api/video/meetings/${meetingId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userIdRef.current,
          userName: localStorage.getItem('userName') || 'Guest',
          userType: localStorage.getItem('userType') || 'student',
          passcode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to join meeting');
      }

      const data = await response.json();
      sessionIdRef.current = data.sessionId;

      // Fetch current participants
      fetchParticipants(meetingId);
    } catch (err) {
      console.error('Error joining meeting:', err);
      throw err;
    }
  };

  const fetchParticipants = async (meetingId) => {
    try {
      const response = await fetch(
        `/api/video/meetings/${meetingId}/participants?passcode=${passcodeRef.current}`
      );
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants || []);
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
    }
  };

  const handleToggleMute = async () => {
    try {
      const newMutedState = !isMuted;
      
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = !newMutedState;
        });
      }

      await fetch(`/api/video/meetings/${meetingId}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userIdRef.current,
          isMuted: newMutedState,
        }),
      });

      setIsMuted(newMutedState);
    } catch (err) {
      console.error('Error toggling mute:', err);
    }
  };

  const handleToggleCamera = async () => {
    try {
      const newCameraState = !cameraOff;
      
      if (localStream) {
        localStream.getVideoTracks().forEach(track => {
          track.enabled = newCameraState;
        });
      }

      await fetch(`/api/video/meetings/${meetingId}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userIdRef.current,
          cameraOff: newCameraState,
        }),
      });

      setCameraOff(newCameraState);
    } catch (err) {
      console.error('Error toggling camera:', err);
    }
  };

  const handleLeaveMeeting = async () => {
    try {
      if (sessionIdRef.current) {
        await fetch(`/api/video/meetings/${meetingId}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userIdRef.current,
            sessionId: sessionIdRef.current,
          }),
        });
      }

      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      window.location.href = '/';
    } catch (err) {
      console.error('Error leaving meeting:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">Connecting to meeting...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex gap-4 p-4">
        <div className="flex-1">
          <VideoDisplay
            localStream={localStream}
            localVideoRef={localVideoRef}
            participants={participants}
          />
        </div>
        <div className="w-64 bg-gray-800 rounded-lg overflow-hidden flex flex-col">
          <ParticipantList participants={participants} />
        </div>
      </div>
      <Controls
        isMuted={isMuted}
        cameraOff={cameraOff}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onLeaveMeeting={handleLeaveMeeting}
      />
    </div>
  );
};

export default VideoRoom;
