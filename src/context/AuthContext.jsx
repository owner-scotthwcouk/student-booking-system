// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { normaliseSupabaseError } from '../lib/supabaseErrors'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  // Distinguish between "initial auth resolution" and general UI loading
  const [initialising, setInitialising] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const [authError, setAuthError] = useState(null)
  const lastProfileUserIdRef = useRef(null)

  const fetchProfile = async (userId) => {
    if (!userId) return null

    // Prevent duplicate fetches for the same user in rapid succession
    if (lastProfileUserIdRef.current === userId && profile?.id === userId) {
      return profile
    }

    setLoadingProfile(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        setAuthError(normaliseSupabaseError(error))
        setProfile(null)
        return null
      }

      lastProfileUserIdRef.current = userId
      setProfile(data ?? null)
      return data ?? null
    } catch (err) {
      setAuthError(normaliseSupabaseError(err))
      setProfile(null)
      return null
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    let alive = true

    const init = async () => {
      setAuthError(null)
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!alive) return

        if (error) {
          setAuthError(normaliseSupabaseError(error))
        }

        const sessionUser = data?.session?.user ?? null
        setUser(sessionUser)

        if (sessionUser) {
          await fetchProfile(sessionUser.id)
        } else {
          setProfile(null)
        }
      } catch (err) {
        if (!alive) return
        setAuthError(normaliseSupabaseError(err))
        setUser(null)
        setProfile(null)
      } finally {
        if (!alive) return
        setInitialising(false)
      }
    }

    init()

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!alive) return

      setAuthError(null)

      const sessionUser = session?.user ?? null
      setUser(sessionUser)

      if (sessionUser) {
        await fetchProfile(sessionUser.id)
      } else {
        lastProfileUserIdRef.current = null
        setProfile(null)
      }
    })

    return () => {
      alive = false
      data?.subscription?.unsubscribe?.()
    }
    // Intentionally omit profile from deps; fetchProfile internally manages caching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = async ({ email, password }) => {
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        const norm = normaliseSupabaseError(error)
        setAuthError(norm)
        return { user: null, error: norm }
      }

      const sessionUser = data?.user ?? data?.session?.user ?? null
      setUser(sessionUser)

      if (sessionUser) {
        await fetchProfile(sessionUser.id)
      }

      return { user: sessionUser, error: null }
    } catch (err) {
      const norm = normaliseSupabaseError(err)
      setAuthError(norm)
      return { user: null, error: norm }
    }
  }

  const signUp = async ({ email, password, profileData }) => {
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: profileData || {},
        },
      })

      if (error) {
        const norm = normaliseSupabaseError(error)
        setAuthError(norm)
        return { user: null, error: norm }
      }

      // If email confirmation is enabled, session may be null
      const createdUser = data?.user ?? null
      return { user: createdUser, error: null }
    } catch (err) {
      const norm = normaliseSupabaseError(err)
      setAuthError(norm)
      return { user: null, error: norm }
    }
  }

  const signOut = async () => {
    setAuthError(null)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        const norm = normaliseSupabaseError(error)
        setAuthError(norm)
        return { error: norm }
      }
      lastProfileUserIdRef.current = null
      setProfile(null)
      setUser(null)
      return { error: null }
    } catch (err) {
      const norm = normaliseSupabaseError(err)
      setAuthError(norm)
      return { error: norm }
    }
  }

  const refreshProfile = async () => {
    if (!user?.id) return null
    // Force refresh by clearing cache marker
    lastProfileUserIdRef.current = null
    return fetchProfile(user.id)
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      initialising,
      loading: initialising || loadingProfile, // preserve your existing "loading" usage
      authError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      isStudent: profile?.role === 'student',
      isTutor: profile?.role === 'tutor',
    }),
    [user, profile, initialising, loadingProfile, authError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
