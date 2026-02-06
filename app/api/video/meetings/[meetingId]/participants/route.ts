import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * GET /api/video/meetings/:meetingId/participants - Get list of participants
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;
    const { searchParams } = new URL(req.url);
    const passcode = searchParams.get('passcode');

    if (!passcode) {
      return NextResponse.json(
        { error: 'Passcode required' },
        { status: 401 }
      );
    }

    // Verify meeting exists and passcode is correct
    const { data: meeting, error: meetingError } = await supabase
      .from('video_meetings')
      .select('id')
      .eq('meeting_id', meetingId)
      .eq('passcode', passcode)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Invalid meeting or passcode' },
        { status: 401 }
      );
    }

    // Get all participants for this meeting
    const { data: participants, error } = await supabase
      .from('video_participants')
      .select(
        `
        id,
        user_id,
        user_name,
        user_type,
        is_muted,
        camera_off,
        joined_at,
        left_at
      `
      )
      .eq('meeting_id', meetingId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching participants:', error);
      return NextResponse.json(
        { error: 'Failed to fetch participants' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      meetingId,
      participants: participants || [],
      count: participants?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/video/meetings/:meetingId/participants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
