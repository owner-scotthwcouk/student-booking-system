-- Create video_meetings table
CREATE TABLE IF NOT EXISTS public.video_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id VARCHAR(50) UNIQUE NOT NULL,
  passcode VARCHAR(50) NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  tutor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  recording_url TEXT,
  is_recorded BOOLEAN DEFAULT true,
  CONSTRAINT valid_times CHECK (actual_end IS NULL OR actual_start IS NULL OR actual_start <= actual_end),
  CONSTRAINT valid_scheduled_times CHECK (scheduled_end IS NULL OR scheduled_start IS NULL OR scheduled_start <= scheduled_end)
);

-- Create video_participants table
CREATE TABLE IF NOT EXISTS public.video_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.video_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('tutor', 'student')),
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_participant_times CHECK (left_at IS NULL OR joined_at IS NULL OR joined_at <= left_at),
  UNIQUE(meeting_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_meetings_booking_id ON public.video_meetings(booking_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_tutor_id ON public.video_meetings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_student_id ON public.video_meetings(student_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_status ON public.video_meetings(status);
CREATE INDEX IF NOT EXISTS idx_video_meetings_meeting_id ON public.video_meetings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_video_participants_meeting_id ON public.video_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_video_participants_user_id ON public.video_participants(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_meetings
-- Users can view their own meetings
CREATE POLICY "Users can view their own video meetings" ON public.video_meetings
  FOR SELECT USING (auth.uid() = tutor_id OR auth.uid() = student_id);

-- Tutors can insert meetings they're hosting
CREATE POLICY "Tutors can create video meetings" ON public.video_meetings
  FOR INSERT WITH CHECK (auth.uid() = tutor_id);

-- Tutors can update their own meetings
CREATE POLICY "Tutors can update their video meetings" ON public.video_meetings
  FOR UPDATE USING (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

-- RLS Policies for video_participants
-- Users can view participants in meetings they're part of
CREATE POLICY "Users can view meeting participants" ON public.video_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.video_meetings vm
      WHERE vm.id = video_participants.meeting_id
      AND (auth.uid() = vm.tutor_id OR auth.uid() = vm.student_id)
    )
  );

-- Tutors can insert participants (when they create the meeting)
CREATE POLICY "Tutors can add participants" ON public.video_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.video_meetings vm
      WHERE vm.id = meeting_id AND auth.uid() = vm.tutor_id
    )
  );

-- Tutors can update participants in their meetings
CREATE POLICY "Tutors can update participants" ON public.video_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.video_meetings vm
      WHERE vm.id = meeting_id AND auth.uid() = vm.tutor_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.video_meetings vm
      WHERE vm.id = meeting_id AND auth.uid() = vm.tutor_id
    )
  );
