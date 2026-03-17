/**
 * Video Chat Utilities for Phase 1 MVP
 * Handles meeting ID and passcode generation for video meetings
 */

import crypto from 'crypto';

/**
 * Generate a unique meeting ID
 * Format: MID-XXXXXXXXXXXXXXXX (20 characters total)
 * @returns {string} Unique meeting ID
 */
export const generateMeetingId = () => {
  const randomBytes = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `MID-${randomBytes}`;
};

/**
 * Generate a secure passcode for meeting access
 * Format: 6 random digits (000000-999999)
 * @returns {string} 6-digit passcode
 */
export const generatePasscode = () => {
  return Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
};

/**
 * Generate both meeting ID and passcode together
 * @returns {Object} Object containing meetingId and passcode
 */
export const generateMeetingCredentials = () => {
  return {
    meetingId: generateMeetingId(),
    passcode: generatePasscode(),
  };
};

/**
 * Validate meeting ID format
 * @param {string} meetingId - Meeting ID to validate
 * @returns {boolean} True if valid format
 */
export const isValidMeetingId = (meetingId) => {
  // Format: MID-XXXXXXXXXXXXXXXX
  const pattern = /^MID-[A-F0-9]{16}$/;
  return pattern.test(meetingId);
};

/**
 * Validate passcode format
 * @param {string} passcode - Passcode to validate
 * @returns {boolean} True if valid format
 */
export const isValidPasscode = (passcode) => {
  // Format: 6 digits
  const pattern = /^\d{6}$/;
  return pattern.test(passcode);
};

/**
 * Generate meeting room URL
 * @param {string} meetingId - Meeting ID
 * @param {string} passcode - Meeting passcode
 * @param {string} baseUrl - Base URL of the application
 * @returns {string} Complete meeting URL
 */
export const generateMeetingUrl = (meetingId, passcode, baseUrl = '') => {
  const base = baseUrl || window?.location?.origin || 'http://localhost:3000';
  return `${base}/video-room/${meetingId}?passcode=${passcode}`;
};

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
    
    if (isValidMeetingId(meetingId) && isValidPasscode(passcode)) {
      return { meetingId, passcode };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Generate meeting session ID for WebRTC
 * Used internally for tracking WebRTC sessions
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @returns {string} Session ID
 */
export const generateSessionId = (meetingId, userId) => {
  return `${meetingId}-${userId}-${Date.now()}`;
};

/**
 * Format timestamp for display
 * @param {Date} date - Date object
 * @returns {string} Formatted timestamp
 */
export const formatTimestamp = (date) => {
  return new Date(date).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
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
  generateMeetingId,
  generatePasscode,
  generateMeetingCredentials,
  isValidMeetingId,
  isValidPasscode,
  generateMeetingUrl,
  extractCredentialsFromUrl,
  generateSessionId,
  formatTimestamp,
  checkMeetingAccessibility,
};
