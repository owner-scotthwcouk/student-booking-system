-- Run this in Supabase SQL editor to add homework hub tables

-- 1. Create homework_assignments table
CREATE TABLE homework_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  due_date DATE NOT NULL,
  due_time TIME DEFAULT '23:59:00',
  max_score DECIMAL(5, 2),
  instructions TEXT,
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  attachment_size INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add columns to homework_submissions
ALTER TABLE homework_submissions 
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES homework_assignments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS grade DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS grading_rubric JSONB,
ADD COLUMN IF NOT EXISTS submission_notes TEXT,
ADD COLUMN IF NOT EXISTS draft_saved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- 3. Create assignment_students table
CREATE TABLE assignment_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- 4. Create homework_resources table
CREATE TABLE homework_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  access_level VARCHAR(20) DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create assignment_resources table
CREATE TABLE assignment_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES homework_resources(id) ON DELETE CASCADE,
  UNIQUE(assignment_id, resource_id)
);

-- 6. Create homework_analytics table
CREATE TABLE homework_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES homework_assignments(id) ON DELETE CASCADE,
  submitted_count INTEGER DEFAULT 0,
  on_time_count INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  average_grade DECIMAL(5, 2),
  completion_rate DECIMAL(3, 2),
  last_submission_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create homework_comments table
CREATE TABLE homework_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_tutor_feedback BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create indexes
CREATE INDEX idx_assignments_tutor ON homework_assignments(tutor_id);
CREATE INDEX idx_assignments_due_date ON homework_assignments(due_date);
CREATE INDEX idx_assignments_status ON homework_assignments(status);
CREATE INDEX idx_assignment_students_assignment ON assignment_students(assignment_id);
CREATE INDEX idx_assignment_students_student ON assignment_students(student_id);
CREATE INDEX idx_submissions_assignment ON homework_submissions(assignment_id);
CREATE INDEX idx_submissions_draft ON homework_submissions(is_draft);
CREATE INDEX idx_resources_tutor ON homework_resources(tutor_id);
CREATE INDEX idx_resources_type ON homework_resources(resource_type);
CREATE INDEX idx_analytics_tutor_student ON homework_analytics(tutor_id, student_id);
CREATE INDEX idx_comments_submission ON homework_comments(submission_id);

-- 9. Enable RLS on new tables
ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_comments ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies
CREATE POLICY "Tutors can manage assignments"
  ON homework_assignments FOR ALL
  USING (tutor_id = auth.uid());

CREATE POLICY "Students can view assigned assignments"
  ON homework_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM assignment_students
    WHERE assignment_students.assignment_id = homework_assignments.id
    AND assignment_students.student_id = auth.uid()
  ));

-- Similar policies for other tables...
