import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSessionId } from '@/services/videoChatUtils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * POST /api/video/meetings/:meetingId/join - Record participant joining
 * Body: { userId, userName, userType, passcode }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;
    const body = await req.json();
    const { userId, userName, userType, passcode } = body;

    if (!userId || !userName || !userType || !passcode) {
      return NextResponse.json(
        success: false, { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: meeting, error: meetingError } = await supabase
      .from('video_meetings')
      .select('id')
      .eq('meeting_id', meetingId)
      .eq('passcode', passcode)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json(
        success: false, { error: 'Invalid meeting or passcode' },
        { status: 401 }
      );
    }

    const sessionId = generateSessionId(meetingId, userId);

    const { data: participant, error } = await supabase
      .from('video_participants')
      .insert([
        {
          meeting_id: meetingId,
          user_id: userId,
          user_name: userName,
          user_type: userType,
          session_id: sessionId,
          joined_at: new Date().toISOString(),
          is_muted: false,
          camera_off: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error recording participant join:', error);
      return NextResponse.json(
{ success: false, error: 'Failed to join meeting' }        { status: 500 }
      );
    }

    return NextResponse.json({
          success: true,
      sessionId,
      participant,
      turn_servers: [
        { urls: ['stun.l.google.com:19302'], },
        { urls: ['stun1.l.google.com:19302'], },
      ],
    });
  } catch (error) {
    console.error('Error in POST /api/video/meetings/:meetingId/join:', error);
    return NextResponse.json(
      success: false, { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
