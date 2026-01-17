-- Fix existing user profile - Run this if you get 500 errors
-- Replace the UUID below with your actual user ID (a97ac15b-037c-4eca-9b80-c63a90291ec4)

-- First, ensure the function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create profile for existing user if it doesn't exist
-- Replace 'a97ac15b-037c-4eca-9b80-c63a90291ec4' with your actual user ID
-- Replace 'user@example.com' and 'User Name' with actual values from auth.users
INSERT INTO public.profiles (id, email, full_name, role, date_of_birth)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'User', u.email),
  COALESCE(u.raw_user_meta_data->>'role', 'student'),
  CASE 
    WHEN u.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
    THEN (u.raw_user_meta_data->>'date_of_birth')::date 
    ELSE NULL 
  END
FROM auth.users u
WHERE u.id = 'a97ac15b-037c-4eca-9b80-c63a90291ec4'::uuid
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- Or create profiles for ALL users without profiles:
-- INSERT INTO public.profiles (id, email, full_name, role, date_of_birth)
-- SELECT 
--   u.id,
--   u.email,
--   COALESCE(u.raw_user_meta_data->>'full_name', u.email),
--   COALESCE(u.raw_user_meta_data->>'role', 'student'),
--   CASE 
--     WHEN u.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
--     THEN (u.raw_user_meta_data->>'date_of_birth')::date 
--     ELSE NULL 
--   END
-- FROM auth.users u
-- WHERE u.id NOT IN (SELECT id FROM public.profiles)
-- ON CONFLICT (id) DO NOTHING;

