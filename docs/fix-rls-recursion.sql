-- Fix infinite recursion in RLS policies for profiles table
-- The policies "Tutors can view student profiles" and "Students can view tutor profiles"
-- were causing recursion because they query the profiles table within the policy check.

-- Drop the problematic policies
DROP POLICY IF EXISTS "Tutors can view student profiles" ON profiles;
DROP POLICY IF EXISTS "Students can view tutor profiles" ON profiles;

-- Create a helper function to check user role without recursion
-- This function uses auth.jwt() to check the user's role from their token metadata
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
BEGIN
  -- Try to get role from JWT claims first (set during login/registration)
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role')::text,
    -- Fallback: check if user exists in profiles (but with security definer to bypass RLS)
    (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Alternative approach: Use a helper function that directly checks auth.users metadata
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

-- Recreate policies using the helper functions (which bypass RLS)
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

