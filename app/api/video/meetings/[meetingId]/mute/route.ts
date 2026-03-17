import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * POST /api/video/meetings/:meetingId/mute - Update participant mute status
 * Body: { userId, isMuted, cameraOff? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;
    const body = await req.json();
    const { userId, isMuted, cameraOff } = body;

    if (userId === undefined || isMuted === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, isMuted' },
        { status: 400 }
      );
    }

    const updateData: any = { is_muted: isMuted };
    if (cameraOff !== undefined) {
      updateData.camera_off = cameraOff;
    }

    const { data: participant, error } = await supabase
      .from('video_participants')
      .update(updateData)
      .eq('meeting_id', meetingId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating participant mute status:', error);
      return NextResponse.json(
        { error: 'Failed to update mute status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      participant,
    });
  } catch (error) {
    console.error('Error in POST /api/video/meetings/:meetingId/mute:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
