# Video Chat Room Feature

## Overview
This document outlines the specifications for the video chat room feature that will be integrated into the Student Booking System. When a student makes a booking, they will receive a unique link to join a video chat room with their tutor.

## Core Features

### 1. Video and Audio Communication
- Real-time bidirectional video and audio streaming
- Support for multiple participants (tutor and student(s))
- HD video quality
- Audio control (mute/unmute)

### 2. Whiteboard
- Digital whiteboard for collaborative note-taking and demonstrations
- Drawing tools (pen, eraser, shapes)
- Ability to save and export whiteboard content
- Support for writing, drawing, and mathematical expressions

### 3. Code/Screen Sharing
- Tutor and students can share their screens
- Code editor integration for live coding demonstrations
- Syntax highlighting support
- Real-time code execution capability

### 4. Session Recording
- Automatic recording of all video chat sessions
- Recordings stored securely for future reference
- Student access to recorded sessions
- Option to pause/resume recording

### 5. Participant Management
- Mute/unmute participants
- Remove participants from session
- Host (tutor) controls
- Participant list display

### 6. Meeting Identification & Access Control
- Each meeting has a unique Meeting ID
- Each meeting has a unique Passcode
- Meeting URL is generated and sent to students upon booking
- Format: `https://student-booking-system.com/video-room/{meetingId}?passcode={passcode}`
- Passcode required to join meeting

## Technical Architecture

### Backend Components
- Meeting creation and management API
- Meeting ID and passcode generation
- Recording management and storage
- Session persistence in database

### Frontend Components
- Video chat room UI component
- Meeting controls and settings
- Screen share interface
- Whiteboard interface
- Code editor integration

### Database Schema
```sql
-- Video meetings table
CREATE TABLE video_meetings (
  id UUID PRIMARY KEY,
  meeting_id VARCHAR(50) UNIQUE NOT NULL,
  passcode VARCHAR(50) NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  tutor_id UUID REFERENCES tutors(id),
  student_id UUID REFERENCES students(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scheduled_start TIMESTAMP,
  scheduled_end TIMESTAMP,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  status VARCHAR(20), -- pending, active, completed, cancelled
  recording_url TEXT,
  is_recorded BOOLEAN DEFAULT true
);

-- Video participants table
CREATE TABLE video_participants (
  id UUID PRIMARY KEY,
  meeting_id UUID REFERENCES video_meetings(id),
  user_id UUID,
  user_type VARCHAR(20), -- tutor, student
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  is_muted BOOLEAN DEFAULT false
);
```

## User Flow

1. **Booking Creation**
   - Student books a lesson
   - System generates unique meeting ID and passcode
   - Video meeting record created in database

2. **Link Generation**
   - Meeting link with URL structure: `/video-room/{meetingId}?passcode={passcode}`
   - Link sent to student via email/in-app notification
   - Link also available in booking details

3. **Meeting Join**
   - Student clicks link
   - Passcode verification required
   - Video room loads with webcam/microphone permissions
   - Tutor joins room

4. **Meeting Interaction**
   - Video/audio exchange
   - Whiteboard collaboration
   - Screen sharing
   - Real-time recording

5. **Meeting End**
   - Either participant can end the meeting
   - Recording automatically finalized
   - Session data saved
   - Participants notified

## Integration Points

### With Booking System
- Create video meeting when booking is confirmed
- Send meeting link to student in confirmation email
- Display meeting link in booking details
- Link expiration with booking time

### With Notifications
- Email notification with meeting link
- In-app reminder before meeting starts
- Notification when recording is ready

## Security Considerations
- Passcode-protected access
- End-to-end encryption for video/audio
- Secure storage of recordings
- Access control: only tutor and booked student(s) can access
- Automatic session timeout

## Technology Stack (Proposed)
- WebRTC for video/audio streaming
- Socket.io for real-time communication
- Canvas API for whiteboard functionality
- Monaco Editor or similar for code editor
- Recording service (e.g., Agora, Jitsi, or custom)

## Implementation Phases

### Phase 1: MVP
- Basic video/audio communication
- Meeting ID and passcode generation
- Simple participant list
- Basic mute controls

### Phase 2: Enhanced Features
- Screen sharing
- Whiteboard
- Recording functionality

### Phase 3: Advanced Features
- Code editor integration
- Advanced whiteboard tools
- Session analytics
- Multi-session support

## Future Enhancements
- Virtual backgrounds
- Noise cancellation
- Chat messaging within video room
- Meeting transcripts
- Performance analytics
