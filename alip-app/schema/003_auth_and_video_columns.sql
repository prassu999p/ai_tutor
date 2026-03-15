-- Migration 003: Auth linkage, video URLs, and LLM audit column
-- Run in Supabase SQL editor AFTER 001 and 002

-- Auth linkage for students table
-- Note: parent_email already exists from migration 001; auth_user_id and dashboard_token are new
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS dashboard_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Create unique index on dashboard_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_dashboard_token ON students(dashboard_token);

-- Create unique index on auth_user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_auth_user_id ON students(auth_user_id);

-- Auto-create student record when a new auth user signs up
-- The trigger reads metadata passed during signup: name, grade, parent_email
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  new_student_id UUID;
BEGIN
  -- Insert the student record
  INSERT INTO students (
    name,
    grade,
    parent_email,
    auth_user_id
  ) VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', 'Student'),
    COALESCE((NEW.raw_user_meta_data->>'grade')::INTEGER, 5),
    NEW.raw_user_meta_data->>'parent_email',
    NEW.id
  )
  RETURNING id INTO new_student_id;

  -- Initialise skill states for fractions
  PERFORM init_student_skills(new_student_id, 'FRAC');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Helper function: get student record from auth user id
CREATE OR REPLACE FUNCTION get_student_by_auth_user(p_auth_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  grade INTEGER,
  parent_email TEXT,
  dashboard_token UUID,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.grade, s.parent_email, s.dashboard_token, s.is_active
  FROM students s
  WHERE s.auth_user_id = p_auth_user_id
    AND s.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Video URL columns for intro and remediation videos
ALTER TABLE micro_skills
  ADD COLUMN IF NOT EXISTS intro_video_url TEXT,
  ADD COLUMN IF NOT EXISTS intro_video_length_sec INTEGER;

ALTER TABLE misconception_types
  ADD COLUMN IF NOT EXISTS remediation_video_url TEXT,
  ADD COLUMN IF NOT EXISTS remediation_video_length_sec INTEGER;

-- LLM explanation audit column on interactions
ALTER TABLE interactions
  ADD COLUMN IF NOT EXISTS llm_explanation TEXT;

-- Distractors JSONB column on questions
-- Maps wrong answers to misconception IDs for rule-based classifier
-- Format: [{"answer": "2/7", "misconception_id": "M1"}, ...]
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS distractors JSONB DEFAULT '[]'::JSONB;

-- Visual type for rendering (fraction_bar, number_line, none)
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS visual_type TEXT DEFAULT 'none';
