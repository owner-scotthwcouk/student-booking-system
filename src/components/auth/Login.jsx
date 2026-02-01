import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { getSystemSetting } from '../../lib/settingsAPI'
import { Mail, Lock, LogIn, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      if (!data.user?.id) {
        throw new Error('Login failed')
      }

      // Fetch user profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError) throw profileError

      // --- MAINTENANCE MODE CHECK START ---
      // If the user is a student, check if maintenance mode is active
      if (profile.role === 'student') {
        try {
          const { data: setting } = await getSystemSetting('maintenance_mode')
          if (setting && setting.value === 'true') {
            await supabase.auth.signOut()
            throw new Error("⚠️ Maintenance: We are currently upgrading the system. Please try again later.")
          }
        } catch (maintenanceError) {
           // If the setting is missing or call fails, we proceed (fail open) or block (fail closed)
           // Here we just log it and proceed to be safe unless we explicitly know it's maintenance.
           console.error("Maintenance check skipped:", maintenanceError)
        }
      }
      // --- MAINTENANCE MODE CHECK END ---

      // Redirect based on role
      if (profile.role === 'tutor') {
        navigate('/tutor')
      } else if (profile.role === 'student') {
        navigate('/student')
      } else {
        navigate('/')
      }
    } catch (error) {
      setError(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="header-icon">
            <ShieldCheck size={32} />
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to continue to Edumaxim</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail className="input-icon" size={18} />
            </div>
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock className="input-icon" size={18} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-auth">
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Sign In <LogIn size={18} />
              </>
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Create Account</Link></p>
        </div>
      </div>
    </div>
  )
}
