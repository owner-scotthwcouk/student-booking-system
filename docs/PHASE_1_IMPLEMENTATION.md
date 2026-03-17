# Phase 1 MVP Implementation Guide

**Status:** In Progress  
**Branch:** `feature/video-chat-room`  
**Commits:** 4 commits ahead of main  
**Last Updated:** 2026-02-04  

## Phase 1 Goals

✅ **Completed:**
- Database schema and migrations created
- Row Level Security (RLS) policies implemented
- Utility functions for meeting ID and passcode generation
- Meeting URL generation and validation

🔄 **In Progress:**
- Backend API endpoints for video meeting management
- Frontend VideoRoom component with WebRTC setup

⏳ **Not Started:**
- Advanced participant controls
- Full WebRTC peer connection handling
- Integration with booking system

## Completed Work

### 1. Database Migration (Commit: 3412842)
**File:** `supabase/migrations/20260204_create_video_meetings_tables.sql`

- Created `video_meetings` table with all required fields
- Created `video_participants` table for tracking meeting participants
- Added comprehensive indexes for performance
- Implemented Row Level Security (RLS) policies
- Added constraints for data integrity

**Key Fields:**
- `meeting_id`: Unique meeting identifier (MID-XXXXXXXXXXXXXXXX)
- `passcode`: 6-digit access code
- `status`: pending, active, completed, cancelled
- `recording_url`: URL to recorded session (future Phase 2)

### 2. Utility Functions (Commit: 1032d0d)
**File:** `services/videoChatUtils.js`

**Functions Implemented:**

```javascript
// Core Generation
generate MeetingId()          // Creates unique MID-XXXXXXXXXXXXXXXX
generate Passcode()           // Creates 6-digit passcode
generate MeetingCredentials() // Both ID and passcode together

// Validation
isValidMeetingId()       // Validates MID format
isValidPasscode()        // Validates 6-digit format

// URL Handling
generate MeetingUrl()             // Creates full meeting URL
extractCredentialsFromUrl()       // Extracts ID/passcode from URL

// Utilities
generate SessionId()              // For WebRTC session tracking
format Timestamp()                // For display formatting
check MeetingAccessibility()      // Validates meeting is accessible
```

## Next Steps for Phase 1

### 1. Backend API Endpoints
**Location:** `app/api/video/` or similar API route  
**Required Endpoints:**

```
POST /api/video/meetings
  - Create new video meeting
  - Input: bookingId, tutorId, studentId, scheduledStart, scheduledEnd
  - Returns: { meetingId, passcode, url }

GET /api/video/meetings/:meetingId
  - Retrieve meeting details
  - Validates passcode if required
  - Returns: meeting data + participants

GET /api/video/meetings/:meetingId/participants
  - Get list of participants
  - Returns: array of participants with muted status

POST /api/video/meetings/:meetingId/join
  - Record participant joining
  - Input: { userId, userType, sessionId }
  - Returns: { sessionId, turn_servers }

POST /api/video/meetings/:meetingId/leave
  - Record participant leaving
  - Input: { userId, sessionId }

POST /api/video/meetings/:meetingId/mute
  - Update participant mute status
  - Input: { userId, isMuted }
  - Returns: updated participant status
```

### 2. Frontend Components
**Location:** `src/components/VideoRoom/`

**VideoRoom.jsx**
- Main video room container
- Handles route params (meetingId, passcode)
- Initializes WebRTC peer connections
- Manages participant list

**VideoDisplay.jsx**
- Renders video grid
- Shows local and remote video streams
- Handles video element lifecycle

**Controls.jsx**
- Mute/unmute button
- Camera on/off button
- Leave meeting button
- Share screen button (Phase 2)

**ParticipantList.jsx**
- Shows connected participants
- Displays mute status
- Shows participant names

### 3. WebRTC Setup
**Library:** Simple Peer or native WebRTC API

**Flow:**
1. User joins with valid passcode
2. Client requests turn servers from backend
3. Establish peer connections with other participants
4. Exchange SDP offers/answers via WebSocket
5. Stream video/audio through established connections
6. Record participant state locally

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│       Student Booking System                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │   Frontend (React/Vite)              │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │ VideoRoom Component            │  │  │
│  │  │ - WebRTC Peer Connection       │  │  │
│  │  │ - Local/Remote Video Display   │  │  │
│  │  │ - Participant Controls         │  │  │
│  │  └────────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │   Backend API (Next.js/Express)      │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │ Video Meeting Endpoints        │  │  │
│  │  │ - Create/Join Meeting          │  │  │
│  │  │ - Manage Participants          │  │  │
│  │  │ - Update Status                │  │  │
│  │  └────────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │   Database (Supabase)                │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │ video_meetings table           │  │  │
│  │  │ video_participants table       │  │  │
│  │  │ RLS Policies                   │  │  │
│  │  └────────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

## Testing Checklist

- [ ] Meeting ID generation produces unique IDs
- [ ] Passcode validation works correctly
- [ ] Meeting URL encoding/decoding works
- [ ] RLS policies prevent unauthorized access
- [ ] API endpoints return correct responses
- [ ] WebRTC peer connection established
- [ ] Local video displays correctly
- [ ] Remote video received and displayed
- [ ] Audio streams properly
- [ ] Mute toggle updates state
- [ ] Participant join/leave recorded
- [ ] Meeting accessibility check works

## Dependencies (To Be Added)

```json
{
  "simple-peer": "^9.11.0",
  "get-stun-servers": "^1.0.2",
  "wrtc": "^0.4.x" // For Node.js WebRTC
}
```

## Configuration

**Environment Variables Needed:**
```
VITE_API_URL=http://localhost:5173/api
VITE_STUN_SERVERS=stun.l.google.com:19302,stun1.l.google.com:19302
VITE_TURN_SERVER_URL=https://your-turn-server.com
```

## Notes

- All meeting IDs are unique and persist in database
- Passcodes are 6-digit codes for simplicity (can upgrade to longer/complex codes)
- RLS policies ensure only relevant participants can access meeting data
- WebRTC uses ICE servers (STUN/TURN) for NAT traversal
- Phase 1 uses basic peer-to-peer for 2-3 participants (scalability Phase 2)

## Resources

- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Simple Peer Library](https://github.com/feross/simple-peer)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [TURN Server Setup](https://github.com/coturn/coturn)
