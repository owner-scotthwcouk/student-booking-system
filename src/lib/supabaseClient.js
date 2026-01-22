// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail fast if env is misconfigured (prevents confusing runtime errors)
if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    [
      '[Supabase] Missing required environment variables.',
      'Expected:',
      ' - VITE_SUPABASE_URL',
      ' - VITE_SUPABASE_ANON_KEY',
      '',
      'Fix:',
      '1) Create a .env file at project root (or set Vercel env vars)',
      '2) Ensure keys are prefixed with VITE_ (Vite requirement)',
      '3) Restart the dev server',
    ].join('\n'),
  )
  throw new Error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'student-booking-system-auth',
  },
  global: {
    headers: {
      'X-Client-Info': 'student-booking-system',
    },
  },
})
