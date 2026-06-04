# 📚 Homework Hub - Complete Implementation Plan

## Overview
This document provides a complete roadmap to transform your existing homework submission system into a comprehensive **Homework Hub** with assignment management, tracking, resources, and analytics.

---

## 📋 Table of Contents
1. [Phase 1: Database Schema](#phase-1-database-schema)
2. [Phase 2: API Layer](#phase-2-api-layer)
3. [Phase 3: UI Components](#phase-3-ui-components)
4. [Phase 4: Features & Integration](#phase-4-features--integration)

---

## Phase 1: Database Schema

### New Tables Required

#### 1. **homework_assignments** (Standalone assignments - not tied to lessons)
```sql
CREATE TABLE homework_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'homework', 'quiz', 'project', 'extra-credit'
  due_date DATE NOT NULL,
  due_time TIME DEFAULT '23:59:00',
  max_score DECIMAL(5, 2),
  instructions TEXT,
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  attachment_size INTEGER,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track which students are assigned to which assignments
CREATE TABLE assignment_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);
```

#### 2. **homework_submissions** - UPDATED
```sql
-- Add these columns to existing homework_submissions table:
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES homework_assignments(id) ON DELETE CASCADE;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS grade DECIMAL(5, 2);
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS grading_rubric JSONB; -- Store rubric scores
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submission_notes TEXT; -- Student notes/comments
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS draft_saved_at TIMESTAMP WITH TIME ZONE; -- For draft saves
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1; -- Track resubmissions
```

#### 3. **homework_resources** (Study materials & rubrics)
```sql
CREATE TABLE homework_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(50) NOT NULL, -- 'study-guide', 'rubric', 'example', 'reference'
  category VARCHAR(100), -- Subject/topic tag
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  access_level VARCHAR(20) DEFAULT 'private' CHECK (access_level IN ('private', 'public')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link resources to assignments
CREATE TABLE assignment_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES homework_resources(id) ON DELETE CASCADE,
  UNIQUE(assignment_id, resource_id)
);
```

#### 4. **homework_analytics** (Track metrics)
```sql
CREATE TABLE homework_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES homework_assignments(id) ON DELETE CASCADE,
  submitted_count INTEGER DEFAULT 0,
  on_time_count INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  average_grade DECIMAL(5, 2),
  completion_rate DECIMAL(3, 2), -- 0-1 (0-100%)
  last_submission_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. **homework_comments** (Discussions on submissions)
```sql
CREATE TABLE homework_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_tutor_feedback BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes for New Tables
```sql
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
```

### Row Level Security (RLS) Policies
```sql
-- Enable RLS on new tables
ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_comments ENABLE ROW LEVEL SECURITY;

-- Homework Assignments Policies
CREATE POLICY "Tutors can manage their assignments"
  ON homework_assignments FOR ALL
  USING (tutor_id = auth.uid());

CREATE POLICY "Students can view assigned assignments"
  ON homework_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignment_students
      WHERE assignment_students.assignment_id = homework_assignments.id
      AND assignment_students.student_id = auth.uid()
    )
  );

-- Assignment Students Policies
CREATE POLICY "Tutors can manage student assignments"
  ON assignment_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM homework_assignments
      WHERE homework_assignments.id = assignment_students.assignment_id
      AND homework_assignments.tutor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their assignments"
  ON assignment_students FOR SELECT
  USING (student_id = auth.uid());

-- Homework Resources Policies
CREATE POLICY "Tutors can manage their resources"
  ON homework_resources FOR ALL
  USING (tutor_id = auth.uid());

CREATE POLICY "Students can view resources"
  ON homework_resources FOR SELECT
  USING (access_level = 'public' OR tutor_id = auth.uid());

-- Analytics Policies
CREATE POLICY "Tutors can view their analytics"
  ON homework_analytics FOR SELECT
  USING (tutor_id = auth.uid());

CREATE POLICY "Students can view their analytics"
  ON homework_analytics FOR SELECT
  USING (student_id = auth.uid());

-- Comments Policies
CREATE POLICY "Users can view comments on submissions they have access to"
  ON homework_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM homework_submissions
      WHERE homework_submissions.id = homework_comments.submission_id
      AND (
        homework_submissions.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM lessons
          WHERE lessons.id = homework_submissions.lesson_id
          AND lessons.tutor_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create comments"
  ON homework_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

---

## Phase 2: API Layer

Create new API functions in `src/lib/homeworkHubAPI.js`:

### Core Functions

```javascript
// =====================================================
// HOMEWORK ASSIGNMENTS API
// =====================================================

export async function createAssignment(assignmentData) {
  try {
    const { data, error } = await supabase
      .from('homework_assignments')
      .insert([assignmentData])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating assignment:', error)
    return { data: null, error }
  }
}

export async function getAssignmentsByTutor(tutorId) {
  try {
    const { data, error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('tutor_id', tutorId)
      .order('due_date', { ascending: true })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching tutor assignments:', error)
    return { data: null, error }
  }
}

export async function getAssignmentsForStudent(studentId) {
  try {
    const { data, error } = await supabase
      .from('assignment_students')
      .select(`
        assignment_id,
        assigned_date,
        homework_assignments (*)
      `)
      .eq('student_id', studentId)
      .order('assigned_date', { ascending: false })
    
    if (error) throw error
    
    return {
      data: data?.map(item => ({
        ...item.homework_assignments,
        assignedDate: item.assigned_date
      })) || [],
      error: null
    }
  } catch (error) {
    console.error('Error fetching student assignments:', error)
    return { data: null, error }
  }
}

export async function updateAssignment(assignmentId, updates) {
  try {
    const { data, error } = await supabase
      .from('homework_assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating assignment:', error)
    return { data: null, error }
  }
}

export async function deleteAssignment(assignmentId) {
  try {
    const { error } = await supabase
      .from('homework_assignments')
      .delete()
      .eq('id', assignmentId)
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return { error }
  }
}

// =====================================================
// ASSIGNMENT STUDENT MANAGEMENT
// =====================================================

export async function assignStudentsToAssignment(assignmentId, studentIds) {
  try {
    const rows = studentIds.map(studentId => ({
      assignment_id: assignmentId,
      student_id: studentId
    }))
    
    const { data, error } = await supabase
      .from('assignment_students')
      .insert(rows)
      .select()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error assigning students:', error)
    return { data: null, error }
  }
}

export async function removeStudentFromAssignment(assignmentId, studentId) {
  try {
    const { error } = await supabase
      .from('assignment_students')
      .delete()
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error removing student:', error)
    return { error }
  }
}

export async function getStudentsByAssignment(assignmentId) {
  try {
    const { data, error } = await supabase
      .from('assignment_students')
      .select(`
        student_id,
        assigned_date,
        profiles (*)
      `)
      .eq('assignment_id', assignmentId)
    
    if (error) throw error
    
    return {
      data: data?.map(item => ({
        ...item.profiles,
        assignedDate: item.assigned_date
      })) || [],
      error: null
    }
  } catch (error) {
    console.error('Error fetching assigned students:', error)
    return { data: null, error }
  }
}

// =====================================================
// HOMEWORK SUBMISSIONS (Enhanced)
// =====================================================

export async function submitAssignmentWork(submissionData) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .insert([submissionData])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error submitting work:', error)
    return { data: null, error }
  }
}

export async function saveAssignmentDraft(submissionData) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .insert([{
        ...submissionData,
        is_draft: true,
        draft_saved_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error saving draft:', error)
    return { data: null, error }
  }
}

export async function getSubmissionsForAssignment(assignmentId) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .select(`
        *,
        profiles (full_name, email)
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return { data: null, error }
  }
}

export async function gradeSubmission(submissionId, grade, rubricScores) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .update({
        grade,
        grading_rubric: rubricScores,
        status: 'marked',
        marked_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error grading submission:', error)
    return { data: null, error }
  }
}

// =====================================================
// RESOURCES MANAGEMENT
// =====================================================

export async function uploadResource(file, resourceData) {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${resourceData.tutor_id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('homework-resources')
      .upload(fileName, file)
    
    if (uploadError) throw uploadError
    
    const { data: { publicUrl } } = supabase.storage
      .from('homework-resources')
      .getPublicUrl(fileName)
    
    const { data, error } = await supabase
      .from('homework_resources')
      .insert([{
        ...resourceData,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size
      }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error uploading resource:', error)
    return { data: null, error }
  }
}

export async function getResourcesByTutor(tutorId) {
  try {
    const { data, error } = await supabase
      .from('homework_resources')
      .select('*')
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching resources:', error)
    return { data: null, error }
  }
}

export async function linkResourceToAssignment(assignmentId, resourceId) {
  try {
    const { data, error } = await supabase
      .from('assignment_resources')
      .insert([{ assignment_id: assignmentId, resource_id: resourceId }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error linking resource:', error)
    return { data: null, error }
  }
}

export async function getAssignmentResources(assignmentId) {
  try {
    const { data, error } = await supabase
      .from('assignment_resources')
      .select(`
        resource_id,
        homework_resources (*)
      `)
      .eq('assignment_id', assignmentId)
    
    if (error) throw error
    
    return {
      data: data?.map(item => item.homework_resources) || [],
      error: null
    }
  } catch (error) {
    console.error('Error fetching assignment resources:', error)
    return { data: null, error }
  }
}

// =====================================================
// ANALYTICS
// =====================================================

export async function getStudentAnalytics(tutorId, studentId) {
  try {
    const { data, error } = await supabase
      .from('homework_analytics')
      .select('*')
      .eq('tutor_id', tutorId)
      .eq('student_id', studentId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return { data: data || null, error: null }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return { data: null, error }
  }
}

export async function getTutorAnalytics(tutorId) {
  try {
    const { data, error } = await supabase
      .from('homework_analytics')
      .select('*')
      .eq('tutor_id', tutorId)
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching tutor analytics:', error)
    return { data: null, error }
  }
}

// =====================================================
// COMMENTS
// =====================================================

export async function addComment(submissionId, content, isTutorFeedback = false) {
  try {
    const { data, error } = await supabase
      .from('homework_comments')
      .insert([{
        submission_id: submissionId,
        user_id: auth.currentUser.id,
        content,
        is_tutor_feedback: isTutorFeedback
      }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error adding comment:', error)
    return { data: null, error }
  }
}

export async function getSubmissionComments(submissionId) {
  try {
    const { data, error } = await supabase
      .from('homework_comments')
      .select(`
        *,
        profiles (full_name, role)
      `)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching comments:', error)
    return { data: null, error }
  }
}
```

---

## Phase 3: UI Components

### File Structure
```
src/components/
├── homework/
│   ├── TutorAssignmentCreator.jsx
│   ├── TutorAssignmentManager.jsx
│   ├── TutorSubmissionReview.jsx
│   ├── TutorHomeworkHub.jsx
│   ├── HomeworkHub.jsx
│   ├── StudentAssignmentList.jsx
│   ├── StudentAssignmentDetail.jsx
│   ├── SubmissionPanel.jsx
│   ├── ResourceLibrary.jsx
│   ├── GradingRubric.jsx
│   ├── HomeworkAnalytics.jsx
│   └── homework-hub.css
```

### Component Details Below (Phase 3 Section)

---

## Phase 4: Features & Integration

### Feature Checklist

**Tutor Features:**
- [ ] Create standalone homework assignments
- [ ] Assign homework to specific students or groups
- [ ] Set due dates and deadlines
- [ ] Upload assignment attachments/instructions
- [ ] Upload study resources and rubrics
- [ ] Link resources to assignments
- [ ] View all submissions per assignment
- [ ] Grade submissions with rubric scoring
- [ ] Provide detailed feedback
- [ ] Track submission rates and trends
- [ ] Export analytics/reports

**Student Features:**
- [ ] View assigned homework
- [ ] See due dates and deadlines
- [ ] Download assignment details and resources
- [ ] Submit homework for assignments
- [ ] Save drafts before final submission
- [ ] Resubmit after feedback
- [ ] View grades and feedback
- [ ] See submission history
- [ ] Track performance analytics
- [ ] Comment on feedback

**Dashboard Updates:**
- Tutor: Add "Homework Hub" tab with assignment manager
- Student: Add "Homework Hub" tab with assignment list

### Database Migration Script

Create `migrations/add_homework_hub.sql`:
```sql
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
```

### Deployment Steps

1. **Database Migration**
   - Run migration script in Supabase SQL editor
   - Verify all tables created successfully

2. **Storage Bucket**
   - Create new Supabase storage bucket: `homework-resources`
   - Set bucket to private

3. **Deploy Components**
   - Create new components in `src/components/homework/`
   - Update routes in `src/App.jsx`
   - Add navigation links

4. **Update Dashboards**
   - Add "Homework Hub" tabs to `TutorDashboard.jsx` and `StudentDashboard.jsx`
   - Link to new homework hub routes

5. **Testing**
   - Create test assignments
   - Test student submissions
   - Verify grading and analytics

---

## Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1** | 1-2 days | Database schema setup, migration testing |
| **Phase 2** | 2-3 days | API functions development, testing |
| **Phase 3** | 3-5 days | UI components creation, styling |
| **Phase 4** | 2-3 days | Feature integration, testing, deployment |
| **Total** | 8-13 days | Complete homework hub |

---

## Next Steps

1. Run the database migration script
2. Implement API layer in `src/lib/homeworkHubAPI.js`
3. Create components (see Phase 3 for detailed component specs)
4. Test end-to-end workflow
5. Deploy to production

