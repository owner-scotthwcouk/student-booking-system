import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { Lock, Loader2, AlertCircle, KeyRound } from 'lucide-react'
import BrandLogo from '../shared/BrandLogo'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canReset, setCanReset] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkRecoverySession() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        const hasSession = Boolean(data?.session?.user)
        setCanReset(hasSession)
        if (!hasSession) {
          setError('Reset link is invalid or expired. Request a new one.')
        }
      } catch {
        if (mounted) setError('Unable to validate reset session.')
      } finally {
        if (mounted) setCheckingSession(false)
      }
    }

    checkRecoverySession()

    return () => {
      mounted = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setSuccess('Password updated successfully. Redirecting to login...')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <BrandLogo size={52} wordmarkSize={26} />
            <h2>Checking reset session...</h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <BrandLogo size={52} wordmarkSize={26} />
          <div className="header-icon">
            <KeyRound size={32} />
          </div>
          <h2>Reset Password</h2>
          <p>Set your new account password</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-error" style={{ background: 'rgba(34, 197, 94, 0.12)', borderColor: 'rgba(34, 197, 94, 0.35)', color: '#86efac' }}>
            <span>{success}</span>
          </div>
        )}

        {canReset ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="password">New Password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="input-icon" size={18} />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Lock className="input-icon" size={18} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-auth">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Update Password'}
            </button>
          </form>
        ) : (
          <div className="auth-footer" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <p><Link to="/forgot-password">Request a new reset link</Link></p>
          </div>
        )}
      </div>
    </div>
  )
}
