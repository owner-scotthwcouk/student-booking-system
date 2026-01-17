-- Fix infinite recursion in RLS policies for profiles table
-- IMPORTANT: This only fixes the RLS policies, it does NOT recreate the table
-- Run this if you already have the profiles table and just need to fix the recursion error

-- Step 1: Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Tutors can view student profiles" ON profiles;
DROP POLICY IF EXISTS "Students can view tutor profiles" ON profiles;

-- Step 2: Create helper functions to check user role without recursion
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

-- Step 3: Recreate the policies using the helper functions (which bypass RLS)
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

