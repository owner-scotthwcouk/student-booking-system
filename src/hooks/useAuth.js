// src/hooks/useAuth.js
import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const context = useContext(AuthContext)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const signOut = async () => {
    await supabase.auth.signOut()
  }
  
  return {
    user,
    profile,
    loading,
    signOut,
    isStudent: profile?.role === 'student',
    isTutor: profile?.role === 'tutor'
  }
}