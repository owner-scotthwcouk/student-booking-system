import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * POST /api/video/meetings/:meetingId/leave - Record participant leaving
 * Body: { userId, sessionId }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;
    const body = await req.json();
    const { userId, sessionId } = body;

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update participant record to mark as left
    const { data: participant, error } = await supabase
      .from('video_participants')
      .update({
        left_at: new Date().toISOString(),
      })
      .eq('meeting_id', meetingId)
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error recording participant leave:', error);
      return NextResponse.json(
        { error: 'Failed to leave meeting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      participant,
    });
  } catch (error) {
    console.error('Error in POST /api/video/meetings/:meetingId/leave:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
