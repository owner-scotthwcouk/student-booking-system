import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateMeetingId,
  generatePasscode,
  generateMeetingUrl,
} from '@/services/videoChatUtils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * POST /api/video/meetings - Create a new video meeting
 * Body: { bookingId, tutorId, studentId, scheduledStart, scheduledEnd }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, tutorId, studentId, scheduledStart, scheduledEnd } = body;

    if (!bookingId || !tutorId || !studentId || !scheduledStart || !scheduledEnd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const meetingId = generateMeetingId();
    const passcode = generatePasscode();
    const meetingUrl = generateMeetingUrl(meetingId, passcode);

    const { data, error } = await supabase
      .from('video_meetings')
      .insert([
        {
          meeting_id: meetingId,
          booking_id: bookingId,
          tutor_id: tutorId,
          student_id: studentId,
          passcode,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Error creating meeting:', error);
      return NextResponse.json(
        { error: 'Failed to create meeting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      meetingId,
      passcode,
      url: meetingUrl,
      meeting: data?.[0],
    });
  } catch (error) {
    console.error('Error in POST /api/video/meetings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/meetings?meetingId={id}&passcode={code} - Retrieve meeting details
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');
    const passcode = searchParams.get('passcode');

    if (!meetingId || !passcode) {
      return NextResponse.json(
        { error: 'Missing meetingId or passcode' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('video_meetings')
      .select(
        `
        *,
        video_participants(*)
      `
      )
      .eq('meeting_id', meetingId)
      .eq('passcode', passcode)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/video/meetings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
