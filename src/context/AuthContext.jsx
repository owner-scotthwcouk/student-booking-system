import { createContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (!session?.user) setLoading(false)
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
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
    isStudent: profile?.role === 'student',
    isTutor: profile?.role === 'tutor'
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}