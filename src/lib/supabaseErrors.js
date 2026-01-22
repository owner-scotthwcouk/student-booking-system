// src/lib/supabaseErrors.js

export function normaliseSupabaseError(error) {
  if (!error) return null

  const message =
    typeof error === 'string'
      ? error
      : error.message || 'An unknown error occurred.'

  return {
    message,
    code: error.code || null,
    details: error.details || null,
    hint: error.hint || null,
    raw: error,
  }
}
