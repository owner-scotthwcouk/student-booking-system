-- Create missing profile for existing user
-- This will create a profile for the user ID: a97ac15b-037c-4eca-9b80-c63a90291ec4
-- Replace the UUID below if you need to create a profile for a different user

-- Option 1: Create profile for a specific user ID
INSERT INTO public.profiles (id, email, full_name, role, date_of_birth)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'User'),
  COALESCE(u.raw_user_meta_data->>'role', 'student'),
  CASE 
    WHEN u.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
    THEN (u.raw_user_meta_data->>'date_of_birth')::date 
    ELSE NULL 
  END
FROM auth.users u
WHERE u.id = 'a97ac15b-037c-4eca-9b80-c63a90291ec4'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- Option 2: Create profiles for ALL users without profiles (uncomment to use)
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
-- WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id)
-- ON CONFLICT (id) DO NOTHING;

