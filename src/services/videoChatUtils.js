/**
 * Video Chat Utilities for Phase 1 MVP
 * Handles meeting ID and passcode generation for video meetings
 */

/**
 * Extract meeting ID and passcode from URL
 * @param {string} url - Meeting URL
 * @returns {Object|null} Object with meetingId and passcode, or null if invalid
 */
export const extractCredentialsFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const passcode = urlObj.searchParams.get('passcode');
    
    // Extract meeting ID from /video-room/{meetingId}
    const match = pathname.match(/\/video-room\/([A-Z0-9-]+)/);
    if (!match || !match[1] || !passcode) {
      return null;
    }
    
    const meetingId = match[1];
    
    // Basic validation
    if (meetingId && passcode) {
      return { meetingId, passcode };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if meeting is within acceptable time window
 * (within 5 minutes before scheduled start and ongoing)
 * @param {Date} scheduledStart - Scheduled start time
 * @param {Date} scheduledEnd - Scheduled end time
 * @returns {Object} Object with isAccessible, minutesUntilStart, status
 */
export const checkMeetingAccessibility = (scheduledStart, scheduledEnd) => {
  const now = new Date();
  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);
  
  const minutesUntilStart = Math.round((start - now) / 60000);
  const minutesUntilEnd = Math.round((end - now) / 60000);
  
  let status = 'scheduled';
  let isAccessible = false;
  
  // Meeting hasn't started, but accessible within 5 minutes before
  if (minutesUntilStart > 0 && minutesUntilStart <= 5) {
    status = 'pre-start';
    isAccessible = true;
  }
  // Meeting is ongoing
  else if (minutesUntilStart <= 0 && minutesUntilEnd >= 0) {
    status = 'active';
    isAccessible = true;
  }
  // Meeting has ended
  else if (minutesUntilEnd < 0) {
    status = 'ended';
    isAccessible = false;
  }
  // Meeting hasn't started yet (more than 5 minutes away)
  else if (minutesUntilStart > 5) {
    status = 'scheduled';
    isAccessible = false;
  }
  
  return {
    isAccessible,
    minutesUntilStart,
    minutesUntilEnd,
    status,
  };
};

export default {
  extractCredentialsFromUrl,
  checkMeetingAccessibility,
};
