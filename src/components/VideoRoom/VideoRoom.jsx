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
          userName: `User ${userIdRef.current.slice(0, 8)}`,
          passcode: passcode,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to join');
      setMeetingActive(true);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    }
  };


  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/video/meetings/${meetingId}/participants`);
      const data = await response.json();
      if (data.success) {
        setParticipants(data.participants);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
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
    await fetch(`/api/video/meetings/${meetingId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userIdRef.current }),
    });
    // Clean up local streams and redirect
  } catch (error) {
    console.error('Error leaving:', error);
   } }
};

export default VideoRoom;
