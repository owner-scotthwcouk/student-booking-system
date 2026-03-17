/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})
const useE2EAuthBypass = import.meta.env.VITE_E2E_AUTH_BYPASS === 'true'
const e2eUserId = import.meta.env.VITE_E2E_USER_ID || '00000000-0000-0000-0000-000000000123'
const e2eUserRole = import.meta.env.VITE_E2E_USER_ROLE || 'student'
const e2eUserName = import.meta.env.VITE_E2E_USER_NAME || 'E2E User'
const e2eUserEmail = import.meta.env.VITE_E2E_USER_EMAIL || 'e2e@example.com'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (useE2EAuthBypass) {
      setUser({
        id: e2eUserId,
        email: e2eUserEmail,
        user_metadata: {
          full_name: e2eUserName
        }
      })
      setProfile({
        id: e2eUserId,
        role: e2eUserRole,
        full_name: e2eUserName,
        email: e2eUserEmail
      })
      setLoading(false)
      return () => {}
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    }).catch((error) => {
      console.error('Error getting session:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const value = {
    user,
    profile,
    loading,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
