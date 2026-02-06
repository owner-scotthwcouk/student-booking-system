const express = require('express');
const router = express.Router();

// Store active meetings and participants (in production, use database)
const activeMeetings = new Map();
const meetingParticipants = new Map();

// POST /api/video/meetings/:meetingId/join
router.post('/:meetingId/join', (req, res) => {
  try {
    const { meetingId } = req.params;
    const { userId, userName, passcode } = req.body;

    // Validate input
    if (!userId || !userName || !passcode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, userName, passcode',
      });
    }

    // Initialize meeting if it doesn't exist
    if (!activeMeetings.has(meetingId)) {
      activeMeetings.set(meetingId, {
        id: meetingId,
        createdAt: new Date(),
        participants: [],
      });
      meetingParticipants.set(meetingId, []);
    }

    // Add participant to meeting
    const participant = {
      id: userId,
      name: userName,
      isAudio: true,
      isVideo: true,
      joinedAt: new Date(),
    };

    const participants = meetingParticipants.get(meetingId) || [];
    participants.push(participant);
    meetingParticipants.set(meetingId, participants);

    res.json({
      success: true,
      sessionId: `session-${meetingId}-${userId}-${Date.now()}`,
      participants: participants.filter(p => p.id !== userId),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/video/meetings/:meetingId/participants
router.get('/:meetingId/participants', (req, res) => {
  try {
    const { meetingId } = req.params;

    const participants = meetingParticipants.get(meetingId) || [];

    res.json({
      success: true,
      participants: participants,
      count: participants.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/video/meetings/:meetingId/mute
router.post('/:meetingId/mute', (req, res) => {
  try {
    const { meetingId } = req.params;
    const { userId, isMuted } = req.body;

    const participants = meetingParticipants.get(meetingId) || [];
    const participant = participants.find(p => p.id === userId);

    if (participant) {
      participant.isAudio = !isMuted;
    }

    res.json({
      success: true,
      message: isMuted ? 'Muted' : 'Unmuted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/video/meetings/:meetingId/camera
router.post('/:meetingId/camera', (req, res) => {
  try {
    const { meetingId } = req.params;
    const { userId, cameraOff } = req.body;

    const participants = meetingParticipants.get(meetingId) || [];
    const participant = participants.find(p => p.id === userId);

    if (participant) {
      participant.isVideo = !cameraOff;
    }

    res.json({
      success: true,
      message: cameraOff ? 'Camera off' : 'Camera on',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/video/meetings/:meetingId/leave
router.post('/:meetingId/leave', (req, res) => {
  try {
    const { meetingId } = req.params;
    const { userId } = req.body;

    const participants = meetingParticipants.get(meetingId) || [];
    const filteredParticipants = participants.filter(p => p.id !== userId);
    
    meetingParticipants.set(meetingId, filteredParticipants);

    // Delete meeting if no participants left
    if (filteredParticipants.length === 0) {
      activeMeetings.delete(meetingId);
      meetingParticipants.delete(meetingId);
    }

    res.json({
      success: true,
      message: 'Left meeting',
      remainingParticipants: filteredParticipants.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/video/meetings - List all active meetings
router.get('/', (req, res) => {
  try {
    const meetings = Array.from(activeMeetings.values());
    res.json({
      success: true,
      meetings: meetings,
      count: meetings.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
