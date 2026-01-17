-- Student Booking System - Supabase Database Schema
-- Deploy at edu.scott-hw.online
-- Created: January 17, 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'tutor')),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  phone_number VARCHAR(20),
  address TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- BOOKINGS TABLE
-- =============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  lesson_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- LESSONS TABLE
-- =============================================
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  lesson_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  title VARCHAR(255) NOT NULL,
  covered_in_previous_lesson TEXT,
  covered_in_current_lesson TEXT,
  next_lesson_description TEXT,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- LESSON ACTIVITIES TABLE
-- =============================================
CREATE TABLE lesson_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- HOMEWORK SUBMISSIONS TABLE
-- =============================================
CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_file_url TEXT NOT NULL,
  submission_file_name VARCHAR(255) NOT NULL,
  submission_file_size INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'marked', 'returned')),
  tutor_feedback TEXT,
  marked_at TIMESTAMP WITH TIME ZONE,
  marked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  payment_method VARCHAR(50) DEFAULT 'paypal',
  paypal_transaction_id VARCHAR(255),
  paypal_order_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TUTOR AVAILABILITY TABLE
-- =============================================
CREATE TABLE tutor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tutor_id, day_of_week, start_time)
);

-- =============================================
-- BLOCKED TIME SLOTS TABLE
-- =============================================
CREATE TABLE blocked_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_tutor ON bookings(tutor_id);
CREATE INDEX idx_bookings_date ON bookings(lesson_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_lessons_student ON lessons(student_id);
CREATE INDEX idx_lessons_tutor ON lessons(tutor_id);
CREATE INDEX idx_lessons_date ON lessons(lesson_date);
CREATE INDEX idx_homework_lesson ON homework_submissions(lesson_id);
CREATE INDEX idx_homework_student ON homework_submissions(student_id);
CREATE INDEX idx_homework_status ON homework_submissions(status);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_availability_tutor ON tutor_availability(tutor_id);
CREATE INDEX idx_blocked_slots_tutor ON blocked_time_slots(tutor_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_time_slots ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create helper functions to check user role without recursion
-- These use SECURITY DEFINER to bypass RLS when checking the current user's role
CREATE OR REPLACE FUNCTION public.is_user_tutor()
RETURNS boolean AS $$
BEGIN
  -- Check if current user's role is 'tutor' by checking profiles with security definer
  -- This bypasses RLS to prevent recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'tutor'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_user_student()
RETURNS boolean AS $$
BEGIN
  -- Check if current user's role is 'student' by checking profiles with security definer
  -- This bypasses RLS to prevent recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'student'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE POLICY "Tutors can view student profiles" 
  ON profiles FOR SELECT 
  USING (
    role = 'student' AND 
    public.is_user_tutor() = true
  );

CREATE POLICY "Students can view tutor profiles" 
  ON profiles FOR SELECT 
  USING (
    role = 'tutor' AND 
    public.is_user_student() = true
  );

-- Bookings policies
CREATE POLICY "Students can view their own bookings" 
  ON bookings FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can view their bookings" 
  ON bookings FOR SELECT 
  USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can create bookings" 
  ON bookings FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'tutor'
    )
  );

CREATE POLICY "Students can create their own bookings" 
  ON bookings FOR INSERT 
  WITH CHECK (student_id = auth.uid());

-- Lessons policies
CREATE POLICY "Students can view their lessons" 
  ON lessons FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can view their lessons" 
  ON lessons FOR SELECT 
  USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can manage lessons" 
  ON lessons FOR ALL 
  USING (tutor_id = auth.uid());

-- Homework submissions policies
CREATE POLICY "Students can view their homework" 
  ON homework_submissions FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "Students can submit homework" 
  ON homework_submissions FOR INSERT 
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Tutors can view all homework" 
  ON homework_submissions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM lessons 
      WHERE lessons.id = homework_submissions.lesson_id 
      AND lessons.tutor_id = auth.uid()
    )
  );

CREATE POLICY "Tutors can update homework feedback" 
  ON homework_submissions FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM lessons 
      WHERE lessons.id = homework_submissions.lesson_id 
      AND lessons.tutor_id = auth.uid()
    )
  );

-- Payments policies
CREATE POLICY "Students can view their payments" 
  ON payments FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can view related payments" 
  ON payments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = payments.booking_id 
      AND bookings.tutor_id = auth.uid()
    )
  );

-- Tutor availability policies
CREATE POLICY "Everyone can view tutor availability" 
  ON tutor_availability FOR SELECT 
  USING (true);

CREATE POLICY "Tutors can manage their availability" 
  ON tutor_availability FOR ALL 
  USING (tutor_id = auth.uid());

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, date_of_birth)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'date_of_birth')::date 
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON homework_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON tutor_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- =============================================
-- These need to be created in the Supabase dashboard:
-- 1. Bucket: 'profile-pictures' (public)
-- 2. Bucket: 'homework-submissions' (private)
-- 3. Bucket: 'lesson-activities' (private)

-- Storage policies example:
-- CREATE POLICY "Users can upload their own profile picture"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'profile-pictures' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );
