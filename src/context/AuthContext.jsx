import { createContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      const sessionUser = session?.user ?? null
      setUser(sessionUser)

      if (sessionUser) {
        // fetch profile and clear loading after done
        fetchProfile(sessionUser.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    }).catch((err) => {
      console.error('Error getting session:', err)
      if (mounted) setLoading(false)
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      setLoading(false)
      if (sessionUser) {
        fetchProfile(sessionUser.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
      mounted = false
    }
  }, [])

  // 3. Fetch Profile SEPARATELY (Prevents loops)
  useEffect(() => {
    if (user) {
      fetchProfile(user.id)
    } else {
      setProfile(null)
    }
  }, [user])

  async function fetchProfile(userId) {
    try {
      // Use maybeSingle() to avoid 406 error if profile doesn't exist
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  // New: signIn helper used by Login component
  const signIn = async ({ email, password }) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { error }
      }

      // Supabase v2 returns data.session and/or data.user
      const sessionUser = data?.user ?? data?.session?.user ?? null
      setUser(sessionUser)
      if (sessionUser) {
        await fetchProfile(sessionUser.id)
      }

      return { user: sessionUser, error: null }
    } catch (err) {
      console.error('signIn error:', err)
      return { error: err }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setUser(null)
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
    signIn, // <-- exposed for Login component
    isStudent: profile?.role === 'student',
    isTutor: profile?.role === 'tutor'
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}